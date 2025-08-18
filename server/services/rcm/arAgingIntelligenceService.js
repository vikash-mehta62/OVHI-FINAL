const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');

class ARAgingIntelligenceService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
    }

    /**
     * Analyze AR accounts and categorize into aging buckets
     */
    async analyzeARAccounts(filters = {}) {
        try {
            const connection = await this.pool.getConnection();
            
            // Get AR aging data with filters
            const query = `
                SELECT 
                    pa.id as account_id,
                    pa.patient_id,
                    pa.current_balance,
                    pa.last_payment_date,
                    DATEDIFF(CURDATE(), COALESCE(pa.last_payment_date, c.created_at)) as days_outstanding,
                    p.first_name,
                    p.last_name,
                    ins.insurance_name,
                    CASE 
                        WHEN DATEDIFF(CURDATE(), COALESCE(pa.last_payment_date, c.created_at)) <= 30 THEN '0-30'
                        WHEN DATEDIFF(CURDATE(), COALESCE(pa.last_payment_date, c.created_at)) <= 60 THEN '31-60'
                        WHEN DATEDIFF(CURDATE(), COALESCE(pa.last_payment_date, c.created_at)) <= 90 THEN '61-90'
                        WHEN DATEDIFF(CURDATE(), COALESCE(pa.last_payment_date, c.created_at)) <= 120 THEN '91-120'
                        ELSE '120+'
                    END as aging_bucket
                FROM patient_accounts pa
                LEFT JOIN patients p ON pa.patient_id = p.id
                LEFT JOIN claims c ON pa.patient_id = c.patient_id
                LEFT JOIN insurance ins ON c.primary_insurance_id = ins.id
                WHERE pa.current_balance > 0
                ${filters.providerId ? 'AND c.provider_id = ?' : ''}
                ${filters.payerId ? 'AND c.primary_insurance_id = ?' : ''}
                ${filters.minBalance ? 'AND pa.current_balance >= ?' : ''}
                GROUP BY pa.id
                ORDER BY pa.current_balance DESC
            `;

            const params = [];
            if (filters.providerId) params.push(filters.providerId);
            if (filters.payerId) params.push(filters.payerId);
            if (filters.minBalance) params.push(filters.minBalance);

            const [accounts] = await connection.execute(query, params);

            // Calculate aging bucket totals
            const agingBuckets = {
                '0-30': { count: 0, amount: 0 },
                '31-60': { count: 0, amount: 0 },
                '61-90': { count: 0, amount: 0 },
                '91-120': { count: 0, amount: 0 },
                '120+': { count: 0, amount: 0 }
            };

            let totalOutstanding = 0;

            accounts.forEach(account => {
                const bucket = account.aging_bucket;
                agingBuckets[bucket].count++;
                agingBuckets[bucket].amount += parseFloat(account.current_balance);
                totalOutstanding += parseFloat(account.current_balance);
            });

            // Generate collection probability predictions
            const collectionProbability = await this.calculateCollectionProbability(accounts);

            // Store analysis results
            await this.storeAnalysisResults({
                totalOutstanding,
                agingBuckets,
                collectionProbability,
                accountCount: accounts.length
            });

            connection.release();

            return {
                totalOutstanding,
                agingBuckets,
                collectionProbability,
                accounts: accounts.slice(0, 100), // Limit for performance
                riskDistribution: this.calculateRiskDistribution(accounts)
            };

        } catch (error) {
            console.error('Error analyzing AR accounts:', error);
            throw error;
        }
    }

    /**
     * Predict collection probability using ML algorithms
     */
    async predictCollectionProbability(accountId) {
        try {
            const connection = await this.pool.getConnection();

            // Get account details for prediction
            const [accountData] = await connection.execute(`
                SELECT 
                    pa.*,
                    p.age,
                    p.gender,
                    ins.insurance_type,
                    COUNT(py.id) as payment_count,
                    AVG(py.amount) as avg_payment,
                    MAX(py.payment_date) as last_payment,
                    DATEDIFF(CURDATE(), MAX(py.payment_date)) as days_since_payment
                FROM patient_accounts pa
                LEFT JOIN patients p ON pa.patient_id = p.id
                LEFT JOIN claims c ON pa.patient_id = c.patient_id
                LEFT JOIN insurance ins ON c.primary_insurance_id = ins.id
                LEFT JOIN payments py ON pa.patient_id = py.patient_id
                WHERE pa.id = ?
                GROUP BY pa.id
            `, [accountId]);

            if (!accountData.length) {
                throw new Error('Account not found');
            }

            const account = accountData[0];

            // Calculate prediction factors
            const factors = {
                balanceAmount: parseFloat(account.current_balance),
                daysOutstanding: account.days_since_payment || 0,
                paymentHistory: account.payment_count || 0,
                avgPaymentAmount: parseFloat(account.avg_payment) || 0,
                patientAge: account.age || 0,
                insuranceType: account.insurance_type || 'unknown'
            };

            // Simple ML-like scoring algorithm
            let score = 100; // Start with 100% probability

            // Adjust based on balance amount
            if (factors.balanceAmount > 5000) score -= 20;
            else if (factors.balanceAmount > 1000) score -= 10;

            // Adjust based on days outstanding
            if (factors.daysOutstanding > 120) score -= 30;
            else if (factors.daysOutstanding > 90) score -= 20;
            else if (factors.daysOutstanding > 60) score -= 10;

            // Adjust based on payment history
            if (factors.paymentHistory === 0) score -= 25;
            else if (factors.paymentHistory < 3) score -= 15;
            else score += 10;

            // Adjust based on insurance type
            if (factors.insuranceType === 'medicaid') score -= 15;
            else if (factors.insuranceType === 'medicare') score -= 5;
            else if (factors.insuranceType === 'commercial') score += 5;

            // Ensure score is between 0 and 100
            score = Math.max(0, Math.min(100, score));

            const predictionResult = {
                accountId,
                predictionScore: score,
                confidenceLevel: this.calculateConfidenceLevel(factors),
                riskFactors: this.identifyRiskFactors(factors),
                recommendedActions: this.generateRecommendedActions(score, factors)
            };

            // Store prediction result
            await connection.execute(`
                INSERT INTO rcm_collection_predictions 
                (account_id, patient_id, prediction_score, confidence_level, risk_factors, recommended_actions)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                prediction_score = VALUES(prediction_score),
                confidence_level = VALUES(confidence_level),
                risk_factors = VALUES(risk_factors),
                recommended_actions = VALUES(recommended_actions),
                prediction_date = CURRENT_TIMESTAMP
            `, [
                accountId,
                account.patient_id,
                score,
                predictionResult.confidenceLevel,
                JSON.stringify(predictionResult.riskFactors),
                JSON.stringify(predictionResult.recommendedActions)
            ]);

            connection.release();
            return predictionResult;

        } catch (error) {
            console.error('Error predicting collection probability:', error);
            throw error;
        }
    }

    /**
     * Generate risk scores for accounts
     */
    async generateRiskScores(accounts) {
        try {
            const connection = await this.pool.getConnection();
            const riskScores = [];

            for (const account of accounts) {
                const riskScore = await this.calculateRiskScore(account);
                riskScores.push(riskScore);

                // Store risk score
                await connection.execute(`
                    INSERT INTO rcm_risk_scores 
                    (account_id, patient_id, risk_score, risk_category, contributing_factors)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    risk_score = VALUES(risk_score),
                    risk_category = VALUES(risk_category),
                    contributing_factors = VALUES(contributing_factors)
                `, [
                    account.account_id,
                    account.patient_id,
                    riskScore.score,
                    riskScore.category,
                    JSON.stringify(riskScore.factors)
                ]);
            }

            connection.release();
            return riskScores;

        } catch (error) {
            console.error('Error generating risk scores:', error);
            throw error;
        }
    }

    /**
     * Trigger automated actions based on thresholds
     */
    async triggerAutomatedActions(thresholds) {
        try {
            const connection = await this.pool.getConnection();
            const triggeredActions = [];

            // Get accounts that meet threshold criteria
            const [accounts] = await connection.execute(`
                SELECT 
                    pa.id as account_id,
                    pa.patient_id,
                    pa.current_balance,
                    rs.risk_score,
                    rs.risk_category,
                    DATEDIFF(CURDATE(), pa.last_payment_date) as days_outstanding
                FROM patient_accounts pa
                LEFT JOIN rcm_risk_scores rs ON pa.id = rs.account_id
                WHERE pa.current_balance > 0
                AND (
                    (rs.risk_score >= ? AND rs.risk_category = 'high')
                    OR pa.current_balance >= ?
                    OR DATEDIFF(CURDATE(), pa.last_payment_date) >= ?
                )
            `, [
                thresholds.riskScoreThreshold || 80,
                thresholds.balanceThreshold || 1000,
                thresholds.daysOutstandingThreshold || 90
            ]);

            for (const account of accounts) {
                const actions = await this.determineAutomatedActions(account, thresholds);
                
                for (const action of actions) {
                    // Schedule the action
                    const [result] = await connection.execute(`
                        INSERT INTO rcm_automated_actions 
                        (account_id, action_type, trigger_condition, action_data, scheduled_date)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        account.account_id,
                        action.type,
                        action.triggerCondition,
                        JSON.stringify(action.data),
                        action.scheduledDate
                    ]);

                    triggeredActions.push({
                        actionId: result.insertId,
                        accountId: account.account_id,
                        actionType: action.type,
                        scheduledDate: action.scheduledDate
                    });
                }
            }

            connection.release();
            return triggeredActions;

        } catch (error) {
            console.error('Error triggering automated actions:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    async calculateCollectionProbability(accounts) {
        if (!accounts.length) return 0;

        let totalProbability = 0;
        for (const account of accounts) {
            const prediction = await this.predictCollectionProbability(account.account_id);
            totalProbability += prediction.predictionScore;
        }

        return totalProbability / accounts.length;
    }

    calculateRiskDistribution(accounts) {
        const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
        
        accounts.forEach(account => {
            const daysOutstanding = account.days_outstanding || 0;
            const balance = parseFloat(account.current_balance);

            if (daysOutstanding > 120 || balance > 10000) {
                distribution.critical++;
            } else if (daysOutstanding > 90 || balance > 5000) {
                distribution.high++;
            } else if (daysOutstanding > 60 || balance > 1000) {
                distribution.medium++;
            } else {
                distribution.low++;
            }
        });

        return distribution;
    }

    calculateConfidenceLevel(factors) {
        let confidence = 70; // Base confidence

        if (factors.paymentHistory > 5) confidence += 15;
        if (factors.avgPaymentAmount > 100) confidence += 10;
        if (factors.daysOutstanding < 60) confidence += 10;
        if (factors.insuranceType === 'commercial') confidence += 5;

        return Math.min(95, confidence);
    }

    identifyRiskFactors(factors) {
        const riskFactors = [];

        if (factors.balanceAmount > 5000) {
            riskFactors.push('High balance amount');
        }
        if (factors.daysOutstanding > 90) {
            riskFactors.push('Extended days outstanding');
        }
        if (factors.paymentHistory === 0) {
            riskFactors.push('No payment history');
        }
        if (factors.insuranceType === 'medicaid') {
            riskFactors.push('Medicaid insurance');
        }

        return riskFactors;
    }

    generateRecommendedActions(score, factors) {
        const actions = [];

        if (score < 30) {
            actions.push('Consider external collection agency');
            actions.push('Offer significant payment plan discount');
        } else if (score < 50) {
            actions.push('Initiate payment plan discussion');
            actions.push('Send final notice');
        } else if (score < 70) {
            actions.push('Send payment reminder');
            actions.push('Offer payment plan options');
        } else {
            actions.push('Standard follow-up call');
            actions.push('Send statement');
        }

        return actions;
    }

    async calculateRiskScore(account) {
        let score = 0;
        const factors = [];

        // Balance factor
        const balance = parseFloat(account.current_balance);
        if (balance > 10000) {
            score += 40;
            factors.push('Very high balance');
        } else if (balance > 5000) {
            score += 30;
            factors.push('High balance');
        } else if (balance > 1000) {
            score += 20;
            factors.push('Moderate balance');
        }

        // Days outstanding factor
        const daysOutstanding = account.days_outstanding || 0;
        if (daysOutstanding > 120) {
            score += 35;
            factors.push('Very old debt');
        } else if (daysOutstanding > 90) {
            score += 25;
            factors.push('Old debt');
        } else if (daysOutstanding > 60) {
            score += 15;
            factors.push('Aging debt');
        }

        // Determine category
        let category = 'low';
        if (score >= 70) category = 'critical';
        else if (score >= 50) category = 'high';
        else if (score >= 30) category = 'medium';

        return {
            accountId: account.account_id,
            score,
            category,
            factors
        };
    }

    async determineAutomatedActions(account, thresholds) {
        const actions = [];
        const now = new Date();

        if (account.risk_category === 'critical' || account.current_balance > 10000) {
            actions.push({
                type: 'escalate_to_manager',
                triggerCondition: 'Critical risk or high balance',
                data: { priority: 'urgent', reason: 'High risk account' },
                scheduledDate: now
            });
        }

        if (account.days_outstanding > 90) {
            actions.push({
                type: 'send_final_notice',
                triggerCondition: 'Days outstanding > 90',
                data: { noticeType: 'final', template: 'final_notice_template' },
                scheduledDate: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
            });
        }

        if (account.current_balance > 1000 && account.days_outstanding > 60) {
            actions.push({
                type: 'schedule_collection_call',
                triggerCondition: 'Balance > $1000 and days outstanding > 60',
                data: { callType: 'collection', priority: 'high' },
                scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // Day after tomorrow
            });
        }

        return actions;
    }

    async storeAnalysisResults(results) {
        try {
            const connection = await this.pool.getConnection();

            await connection.execute(`
                INSERT INTO rcm_ar_aging_analysis 
                (analysis_date, total_outstanding, bucket_0_30, bucket_31_60, bucket_61_90, bucket_91_120, bucket_120_plus, collection_probability, risk_distribution)
                VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                results.totalOutstanding,
                results.agingBuckets['0-30'].amount,
                results.agingBuckets['31-60'].amount,
                results.agingBuckets['61-90'].amount,
                results.agingBuckets['91-120'].amount,
                results.agingBuckets['120+'].amount,
                results.collectionProbability,
                JSON.stringify(results.riskDistribution || {})
            ]);

            connection.release();
        } catch (error) {
            console.error('Error storing analysis results:', error);
            throw error;
        }
    }

    /**
     * Get AR aging dashboard data
     */
    async getARAgingDashboard(filters = {}) {
        try {
            const connection = await this.pool.getConnection();

            // Get latest analysis
            const [latestAnalysis] = await connection.execute(`
                SELECT * FROM rcm_ar_aging_analysis 
                ORDER BY analysis_date DESC 
                LIMIT 1
            `);

            // Get top risk accounts
            const [topRiskAccounts] = await connection.execute(`
                SELECT 
                    rs.account_id,
                    rs.risk_score,
                    rs.risk_category,
                    pa.current_balance,
                    p.first_name,
                    p.last_name
                FROM rcm_risk_scores rs
                JOIN patient_accounts pa ON rs.account_id = pa.id
                JOIN patients p ON pa.patient_id = p.id
                WHERE rs.risk_category IN ('high', 'critical')
                ORDER BY rs.risk_score DESC
                LIMIT 10
            `);

            // Get recent automated actions
            const [recentActions] = await connection.execute(`
                SELECT 
                    aa.*,
                    p.first_name,
                    p.last_name
                FROM rcm_automated_actions aa
                JOIN patient_accounts pa ON aa.account_id = pa.id
                JOIN patients p ON pa.patient_id = p.id
                WHERE aa.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                ORDER BY aa.created_at DESC
                LIMIT 20
            `);

            connection.release();

            return {
                latestAnalysis: latestAnalysis[0] || null,
                topRiskAccounts,
                recentActions,
                summary: {
                    totalAccounts: topRiskAccounts.length,
                    totalOutstanding: latestAnalysis[0]?.total_outstanding || 0,
                    avgCollectionProbability: latestAnalysis[0]?.collection_probability || 0
                }
            };

        } catch (error) {
            console.error('Error getting AR aging dashboard:', error);
            throw error;
        }
    }
}

module.exports = ARAgingIntelligenceService;