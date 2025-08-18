const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');

class DenialManagementWorkflowService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.denialCodeMappings = {
            // Common denial reason codes and their categories
            'CO-1': { category: 'Deductible', subcategory: 'Patient Responsibility', priority: 'low' },
            'CO-2': { category: 'Coinsurance', subcategory: 'Patient Responsibility', priority: 'low' },
            'CO-3': { category: 'Copayment', subcategory: 'Patient Responsibility', priority: 'low' },
            'CO-4': { category: 'Procedure Code', subcategory: 'Coding Error', priority: 'medium' },
            'CO-11': { category: 'Diagnosis Code', subcategory: 'Coding Error', priority: 'medium' },
            'CO-16': { category: 'Claim Frequency', subcategory: 'Duplicate Claim', priority: 'high' },
            'CO-18': { category: 'Duplicate Claim', subcategory: 'Billing Error', priority: 'high' },
            'CO-22': { category: 'Reimbursement', subcategory: 'Payment Policy', priority: 'medium' },
            'CO-23': { category: 'Prior Authorization', subcategory: 'Authorization Required', priority: 'high' },
            'CO-24': { category: 'Insurance Coverage', subcategory: 'Coverage Issue', priority: 'high' },
            'CO-26': { category: 'Expenses', subcategory: 'Not Covered', priority: 'medium' },
            'CO-27': { category: 'Expenses', subcategory: 'Not Covered', priority: 'medium' },
            'CO-29': { category: 'Time Limit', subcategory: 'Timely Filing', priority: 'high' },
            'CO-31': { category: 'Patient Coverage', subcategory: 'Coverage Terminated', priority: 'high' },
            'CO-50': { category: 'Non-Covered', subcategory: 'Service Not Covered', priority: 'medium' },
            'CO-96': { category: 'Non-Covered', subcategory: 'Service Not Covered', priority: 'medium' },
            'CO-97': { category: 'Payment', subcategory: 'Bundled Payment', priority: 'low' },
            'CO-109': { category: 'Prior Authorization', subcategory: 'Authorization Required', priority: 'high' },
            'CO-119': { category: 'Benefit Maximum', subcategory: 'Benefit Exhausted', priority: 'medium' },
            'CO-151': { category: 'Deductible', subcategory: 'Patient Responsibility', priority: 'low' },
            'CO-167': { category: 'Diagnosis Code', subcategory: 'Diagnosis Not Covered', priority: 'medium' },
            'CO-197': { category: 'Precertification', subcategory: 'Authorization Required', priority: 'high' },
            'CO-204': { category: 'Service', subcategory: 'Service Not Covered', priority: 'medium' },
            'CO-236': { category: 'Procedure Code', subcategory: 'Invalid Code', priority: 'high' }
        };
    }

    /**
     * Categorize denial automatically
     */
    async categorizeDenial(denialData) {
        try {
            const connection = await this.pool.getConnection();

            // Extract denial information
            const denialCode = denialData.denial_code || denialData.reasonCode;
            const denialReason = denialData.denial_reason || denialData.reasonText;
            const deniedAmount = parseFloat(denialData.denied_amount || denialData.amount);

            // Get claim details for context
            const [claimData] = await connection.execute(`
                SELECT 
                    c.*,
                    p.first_name,
                    p.last_name,
                    pr.practice_name,
                    ins.insurance_name
                FROM claims c
                LEFT JOIN patients p ON c.patient_id = p.id
                LEFT JOIN providers pr ON c.provider_id = pr.id
                LEFT JOIN insurance ins ON c.primary_insurance_id = ins.id
                WHERE c.id = ?
            `, [denialData.claim_id]);

            if (!claimData.length) {
                throw new Error('Claim not found');
            }

            const claim = claimData[0];

            // Determine category and priority
            const mapping = this.denialCodeMappings[denialCode] || {
                category: 'Other',
                subcategory: 'Unknown',
                priority: 'medium'
            };

            // Calculate complexity and estimated recovery
            const complexity = this.calculateResolutionComplexity(denialCode, deniedAmount, claim);
            const estimatedRecovery = this.estimateRecoveryAmount(deniedAmount, mapping.category);

            // Store categorization
            const [result] = await connection.execute(`
                INSERT INTO rcm_denial_categories 
                (denial_id, claim_id, denial_code, denial_reason, category, subcategory, 
                 priority_level, resolution_complexity, estimated_recovery_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                denialData.denial_id,
                denialData.claim_id,
                denialCode,
                denialReason,
                mapping.category,
                mapping.subcategory,
                mapping.priority,
                complexity,
                estimatedRecovery
            ]);

            const categoryId = result.insertId;

            // Generate resolution suggestions
            const resolutionSuggestions = await this.generateResolutionSuggestions(categoryId, mapping, claim);

            connection.release();

            return {
                categoryId,
                category: mapping.category,
                subcategory: mapping.subcategory,
                priority: mapping.priority,
                complexity,
                estimatedRecovery,
                resolutionSuggestions
            };

        } catch (error) {
            console.error('Error categorizing denial:', error);
            throw error;
        }
    }

    /**
     * Suggest resolution actions based on denial type
     */
    async suggestResolution(denialCategoryId) {
        try {
            const connection = await this.pool.getConnection();

            // Get denial category details
            const [categoryData] = await connection.execute(`
                SELECT 
                    dc.*,
                    c.claim_number,
                    c.total_amount,
                    c.service_date
                FROM rcm_denial_categories dc
                JOIN claims c ON dc.claim_id = c.id
                WHERE dc.id = ?
            `, [denialCategoryId]);

            if (!categoryData.length) {
                throw new Error('Denial category not found');
            }

            const category = categoryData[0];

            // Get historical success rates for similar denials
            const [historicalData] = await connection.execute(`
                SELECT 
                    suggested_action,
                    success_rate,
                    average_recovery_time,
                    historical_success_count,
                    historical_attempt_count
                FROM rcm_denial_resolutions 
                WHERE denial_category_id IN (
                    SELECT id FROM rcm_denial_categories 
                    WHERE category = ? AND subcategory = ?
                )
                ORDER BY success_rate DESC
            `, [category.category, category.subcategory]);

            // Generate specific resolution suggestions
            const suggestions = await this.generateSpecificResolutions(category, historicalData);

            // Store resolution suggestions
            for (const suggestion of suggestions) {
                await connection.execute(`
                    INSERT INTO rcm_denial_resolutions 
                    (denial_category_id, suggested_action, action_priority, success_rate, 
                     average_recovery_time, required_documents, resolution_steps)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    success_rate = VALUES(success_rate),
                    average_recovery_time = VALUES(average_recovery_time)
                `, [
                    denialCategoryId,
                    suggestion.action,
                    suggestion.priority,
                    suggestion.successRate,
                    suggestion.avgRecoveryTime,
                    JSON.stringify(suggestion.requiredDocuments),
                    JSON.stringify(suggestion.steps)
                ]);
            }

            connection.release();
            return suggestions;

        } catch (error) {
            console.error('Error suggesting resolution:', error);
            throw error;
        }
    }

    /**
     * Generate appeal letter with supporting documentation
     */
    async generateAppeal(denialCategoryId, appealType = 'standard') {
        try {
            const connection = await this.pool.getConnection();

            // Get denial and claim details
            const [denialData] = await connection.execute(`
                SELECT 
                    dc.*,
                    c.*,
                    p.first_name,
                    p.last_name,
                    p.date_of_birth,
                    pr.practice_name,
                    pr.npi,
                    ins.insurance_name,
                    ins.payer_id
                FROM rcm_denial_categories dc
                JOIN claims c ON dc.claim_id = c.id
                JOIN patients p ON c.patient_id = p.id
                JOIN providers pr ON c.provider_id = pr.id
                JOIN insurance ins ON c.primary_insurance_id = ins.id
                WHERE dc.id = ?
            `, [denialCategoryId]);

            if (!denialData.length) {
                throw new Error('Denial category not found');
            }

            const denial = denialData[0];

            // Get claim line items
            const [lineItems] = await connection.execute(`
                SELECT * FROM claim_line_items WHERE claim_id = ?
            `, [denial.claim_id]);

            // Generate appeal content based on denial type
            const appealContent = await this.generateAppealContent(denial, lineItems, appealType);

            // Calculate submission deadline (typically 60-90 days from denial date)
            const submissionDeadline = new Date();
            submissionDeadline.setDate(submissionDeadline.getDate() + 60);

            // Store appeal document
            const [result] = await connection.execute(`
                INSERT INTO rcm_appeal_documents 
                (denial_category_id, appeal_type, document_template, generated_document, 
                 supporting_documents, submission_deadline, status)
                VALUES (?, ?, ?, ?, ?, ?, 'draft')
            `, [
                denialCategoryId,
                appealType,
                appealContent.template,
                appealContent.document,
                JSON.stringify(appealContent.supportingDocuments),
                submissionDeadline
            ]);

            const appealId = result.insertId;

            connection.release();

            return {
                appealId,
                appealType,
                submissionDeadline,
                document: appealContent.document,
                supportingDocuments: appealContent.supportingDocuments,
                status: 'draft'
            };

        } catch (error) {
            console.error('Error generating appeal:', error);
            throw error;
        }
    }

    /**
     * Track appeal outcome
     */
    async trackOutcome(appealId, outcomeData) {
        try {
            const connection = await this.pool.getConnection();

            // Store appeal outcome
            await connection.execute(`
                INSERT INTO rcm_appeal_outcomes 
                (appeal_document_id, outcome, recovered_amount, response_date, response_details, lessons_learned)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                appealId,
                outcomeData.outcome,
                outcomeData.recoveredAmount || 0,
                outcomeData.responseDate,
                outcomeData.responseDetails,
                outcomeData.lessonsLearned
            ]);

            // Update appeal document status
            await connection.execute(`
                UPDATE rcm_appeal_documents 
                SET status = 'responded'
                WHERE id = ?
            `, [appealId]);

            // Update historical success rates
            await this.updateHistoricalSuccessRates(appealId, outcomeData);

            connection.release();

            return {
                appealId,
                outcome: outcomeData.outcome,
                recoveredAmount: outcomeData.recoveredAmount,
                updated: true
            };

        } catch (error) {
            console.error('Error tracking appeal outcome:', error);
            throw error;
        }
    }

    /**
     * Analyze denial patterns and suggest improvements
     */
    async analyzeDenialPatterns(timeframe = 30) {
        try {
            const connection = await this.pool.getConnection();

            // Get denial patterns by category
            const [categoryPatterns] = await connection.execute(`
                SELECT 
                    category,
                    subcategory,
                    COUNT(*) as denial_count,
                    SUM(estimated_recovery_amount) as total_denied_amount,
                    AVG(estimated_recovery_amount) as avg_denied_amount,
                    priority_level
                FROM rcm_denial_categories 
                WHERE categorized_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY category, subcategory, priority_level
                ORDER BY denial_count DESC
            `, [timeframe]);

            // Get denial patterns by provider
            const [providerPatterns] = await connection.execute(`
                SELECT 
                    pr.practice_name,
                    pr.npi,
                    COUNT(dc.id) as denial_count,
                    SUM(dc.estimated_recovery_amount) as total_denied_amount
                FROM rcm_denial_categories dc
                JOIN claims c ON dc.claim_id = c.id
                JOIN providers pr ON c.provider_id = pr.id
                WHERE dc.categorized_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY pr.id, pr.practice_name, pr.npi
                ORDER BY denial_count DESC
                LIMIT 10
            `, [timeframe]);

            // Get denial patterns by payer
            const [payerPatterns] = await connection.execute(`
                SELECT 
                    ins.insurance_name,
                    ins.payer_id,
                    COUNT(dc.id) as denial_count,
                    SUM(dc.estimated_recovery_amount) as total_denied_amount
                FROM rcm_denial_categories dc
                JOIN claims c ON dc.claim_id = c.id
                JOIN insurance ins ON c.primary_insurance_id = ins.id
                WHERE dc.categorized_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY ins.id, ins.insurance_name, ins.payer_id
                ORDER BY denial_count DESC
                LIMIT 10
            `, [timeframe]);

            // Get resolution success rates
            const [resolutionStats] = await connection.execute(`
                SELECT 
                    dr.suggested_action,
                    COUNT(ao.id) as total_appeals,
                    SUM(CASE WHEN ao.outcome = 'approved' THEN 1 ELSE 0 END) as successful_appeals,
                    AVG(ao.recovered_amount) as avg_recovery,
                    AVG(DATEDIFF(ao.response_date, ad.created_at)) as avg_resolution_days
                FROM rcm_denial_resolutions dr
                LEFT JOIN rcm_appeal_documents ad ON dr.denial_category_id = ad.denial_category_id
                LEFT JOIN rcm_appeal_outcomes ao ON ad.id = ao.appeal_document_id
                WHERE ad.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY dr.suggested_action
                HAVING total_appeals > 0
                ORDER BY successful_appeals DESC
            `, [timeframe]);

            // Generate improvement suggestions
            const improvements = this.generateImprovementSuggestions(categoryPatterns, providerPatterns, payerPatterns);

            connection.release();

            return {
                timeframe,
                categoryPatterns,
                providerPatterns,
                payerPatterns,
                resolutionStats,
                improvements,
                summary: {
                    totalDenials: categoryPatterns.reduce((sum, p) => sum + p.denial_count, 0),
                    totalDeniedAmount: categoryPatterns.reduce((sum, p) => sum + (p.total_denied_amount || 0), 0),
                    topDenialCategory: categoryPatterns[0]?.category || 'N/A'
                }
            };

        } catch (error) {
            console.error('Error analyzing denial patterns:', error);
            throw error;
        }
    }

    /**
     * Get denial management dashboard data
     */
    async getDenialDashboard() {
        try {
            const connection = await this.pool.getConnection();

            // Get recent denials
            const [recentDenials] = await connection.execute(`
                SELECT 
                    dc.*,
                    c.claim_number,
                    p.first_name,
                    p.last_name,
                    pr.practice_name
                FROM rcm_denial_categories dc
                JOIN claims c ON dc.claim_id = c.id
                JOIN patients p ON c.patient_id = p.id
                JOIN providers pr ON c.provider_id = pr.id
                ORDER BY dc.categorized_date DESC
                LIMIT 20
            `);

            // Get pending appeals
            const [pendingAppeals] = await connection.execute(`
                SELECT 
                    ad.*,
                    dc.category,
                    dc.denial_code,
                    c.claim_number,
                    DATEDIFF(ad.submission_deadline, NOW()) as days_until_deadline
                FROM rcm_appeal_documents ad
                JOIN rcm_denial_categories dc ON ad.denial_category_id = dc.id
                JOIN claims c ON dc.claim_id = c.id
                WHERE ad.status IN ('draft', 'ready', 'submitted')
                ORDER BY ad.submission_deadline ASC
            `);

            // Get denial statistics
            const [denialStats] = await connection.execute(`
                SELECT 
                    priority_level,
                    COUNT(*) as count,
                    SUM(estimated_recovery_amount) as total_amount
                FROM rcm_denial_categories 
                WHERE categorized_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY priority_level
            `);

            // Get appeal success rates
            const [appealStats] = await connection.execute(`
                SELECT 
                    ao.outcome,
                    COUNT(*) as count,
                    SUM(ao.recovered_amount) as total_recovered
                FROM rcm_appeal_outcomes ao
                JOIN rcm_appeal_documents ad ON ao.appeal_document_id = ad.id
                WHERE ao.response_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY ao.outcome
            `);

            connection.release();

            return {
                recentDenials,
                pendingAppeals,
                denialStats,
                appealStats,
                summary: {
                    totalDenials: denialStats.reduce((sum, s) => sum + s.count, 0),
                    totalDeniedAmount: denialStats.reduce((sum, s) => sum + (s.total_amount || 0), 0),
                    pendingAppealsCount: pendingAppeals.length,
                    successRate: this.calculateAppealSuccessRate(appealStats)
                }
            };

        } catch (error) {
            console.error('Error getting denial dashboard:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    calculateResolutionComplexity(denialCode, deniedAmount, claim) {
        let complexity = 'moderate';

        // High complexity factors
        if (deniedAmount > 5000 || 
            denialCode.includes('CO-23') || // Prior auth
            denialCode.includes('CO-29') || // Timely filing
            denialCode.includes('CO-197')) { // Precertification
            complexity = 'complex';
        }
        // Low complexity factors
        else if (deniedAmount < 500 || 
                 denialCode.includes('CO-1') || // Deductible
                 denialCode.includes('CO-2') || // Coinsurance
                 denialCode.includes('CO-3')) { // Copayment
            complexity = 'simple';
        }

        return complexity;
    }

    estimateRecoveryAmount(deniedAmount, category) {
        const recoveryRates = {
            'Deductible': 0.1, // Usually patient responsibility
            'Coinsurance': 0.1,
            'Copayment': 0.1,
            'Procedure Code': 0.8, // High recovery if corrected
            'Diagnosis Code': 0.8,
            'Prior Authorization': 0.6, // Moderate if obtained retroactively
            'Duplicate Claim': 0.9, // High if legitimate
            'Timely Filing': 0.3, // Low recovery rate
            'Coverage Issue': 0.5,
            'Other': 0.5
        };

        const rate = recoveryRates[category] || 0.5;
        return deniedAmount * rate;
    }

    async generateResolutionSuggestions(categoryId, mapping, claim) {
        const suggestions = [];

        switch (mapping.category) {
            case 'Procedure Code':
                suggestions.push({
                    action: 'Verify and correct procedure code',
                    priority: 1,
                    successRate: 85,
                    avgRecoveryTime: 14,
                    requiredDocuments: ['Medical records', 'Procedure documentation'],
                    steps: [
                        'Review medical records',
                        'Verify correct CPT code',
                        'Submit corrected claim',
                        'Follow up in 14 days'
                    ]
                });
                break;

            case 'Prior Authorization':
                suggestions.push({
                    action: 'Obtain retroactive authorization',
                    priority: 1,
                    successRate: 60,
                    avgRecoveryTime: 21,
                    requiredDocuments: ['Medical necessity documentation', 'Clinical notes'],
                    steps: [
                        'Contact payer for retroactive auth process',
                        'Submit medical necessity documentation',
                        'Follow up weekly until resolved'
                    ]
                });
                break;

            case 'Diagnosis Code':
                suggestions.push({
                    action: 'Review and correct diagnosis coding',
                    priority: 1,
                    successRate: 80,
                    avgRecoveryTime: 10,
                    requiredDocuments: ['Medical records', 'ICD-10 documentation'],
                    steps: [
                        'Review diagnosis in medical record',
                        'Verify ICD-10 code accuracy',
                        'Submit corrected claim'
                    ]
                });
                break;

            case 'Timely Filing':
                suggestions.push({
                    action: 'Appeal with good cause documentation',
                    priority: 2,
                    successRate: 30,
                    avgRecoveryTime: 45,
                    requiredDocuments: ['Good cause documentation', 'Original claim proof'],
                    steps: [
                        'Document reason for late filing',
                        'Prepare formal appeal letter',
                        'Submit with supporting documentation'
                    ]
                });
                break;

            default:
                suggestions.push({
                    action: 'Standard appeal process',
                    priority: 2,
                    successRate: 50,
                    avgRecoveryTime: 30,
                    requiredDocuments: ['Medical records', 'Claim documentation'],
                    steps: [
                        'Review denial reason',
                        'Gather supporting documentation',
                        'Submit formal appeal'
                    ]
                });
        }

        return suggestions;
    }

    async generateSpecificResolutions(category, historicalData) {
        const suggestions = [];

        // Use historical data to inform suggestions
        if (historicalData.length > 0) {
            for (const historical of historicalData) {
                suggestions.push({
                    action: historical.suggested_action,
                    priority: suggestions.length + 1,
                    successRate: historical.success_rate || 50,
                    avgRecoveryTime: historical.average_recovery_time || 30,
                    requiredDocuments: JSON.parse(historical.required_documents || '[]'),
                    steps: JSON.parse(historical.resolution_steps || '[]')
                });
            }
        } else {
            // Generate default suggestions based on category
            suggestions.push(...await this.generateResolutionSuggestions(category.id, category, null));
        }

        return suggestions;
    }

    async generateAppealContent(denial, lineItems, appealType) {
        const template = `
APPEAL LETTER

Date: ${new Date().toLocaleDateString()}

To: ${denial.insurance_name}
Payer ID: ${denial.payer_id}

Re: Appeal for Claim Number: ${denial.claim_number}
Patient: ${denial.first_name} ${denial.last_name}
Date of Birth: ${denial.date_of_birth}
Provider: ${denial.practice_name}
NPI: ${denial.npi}

Dear Claims Review Department,

We are formally appealing the denial of the above-referenced claim for the following reason(s):

Denial Code: ${denial.denial_code}
Denial Reason: ${denial.denial_reason}
Denied Amount: $${denial.estimated_recovery_amount}

[APPEAL CONTENT BASED ON DENIAL TYPE]

We respectfully request that you reconsider this claim and process payment accordingly.

Sincerely,
[Provider Name]
[Contact Information]
        `;

        const supportingDocuments = [
            'Original claim form',
            'Medical records',
            'Provider notes',
            'Insurance verification'
        ];

        // Add specific documents based on denial type
        if (denial.category === 'Prior Authorization') {
            supportingDocuments.push('Medical necessity documentation');
        }
        if (denial.category === 'Procedure Code') {
            supportingDocuments.push('CPT code documentation');
        }

        return {
            template: appealType,
            document: template,
            supportingDocuments
        };
    }

    async updateHistoricalSuccessRates(appealId, outcomeData) {
        try {
            const connection = await this.pool.getConnection();

            // Get appeal details
            const [appealData] = await connection.execute(`
                SELECT 
                    ad.denial_category_id,
                    dr.id as resolution_id,
                    dr.suggested_action
                FROM rcm_appeal_documents ad
                JOIN rcm_denial_resolutions dr ON ad.denial_category_id = dr.denial_category_id
                WHERE ad.id = ?
            `, [appealId]);

            if (appealData.length > 0) {
                const resolution = appealData[0];
                const isSuccess = outcomeData.outcome === 'approved';

                // Update success counts
                await connection.execute(`
                    UPDATE rcm_denial_resolutions 
                    SET 
                        historical_attempt_count = historical_attempt_count + 1,
                        historical_success_count = historical_success_count + ?,
                        success_rate = (historical_success_count + ?) / (historical_attempt_count + 1) * 100
                    WHERE id = ?
                `, [isSuccess ? 1 : 0, isSuccess ? 1 : 0, resolution.resolution_id]);
            }

            connection.release();

        } catch (error) {
            console.error('Error updating historical success rates:', error);
        }
    }

    generateImprovementSuggestions(categoryPatterns, providerPatterns, payerPatterns) {
        const suggestions = [];

        // Analyze category patterns
        if (categoryPatterns.length > 0) {
            const topCategory = categoryPatterns[0];
            if (topCategory.category === 'Procedure Code' || topCategory.category === 'Diagnosis Code') {
                suggestions.push({
                    type: 'training',
                    priority: 'high',
                    suggestion: `Provide additional coding training - ${topCategory.category} denials are the highest`,
                    impact: 'Could reduce denials by 20-30%'
                });
            }
        }

        // Analyze provider patterns
        if (providerPatterns.length > 0) {
            const topProvider = providerPatterns[0];
            if (topProvider.denial_count > 10) {
                suggestions.push({
                    type: 'provider_focus',
                    priority: 'medium',
                    suggestion: `Focus on ${topProvider.practice_name} - highest denial count`,
                    impact: 'Provider-specific training could reduce overall denials'
                });
            }
        }

        // Analyze payer patterns
        if (payerPatterns.length > 0) {
            const topPayer = payerPatterns[0];
            suggestions.push({
                type: 'payer_relationship',
                priority: 'medium',
                suggestion: `Review relationship with ${topPayer.insurance_name} - highest denial volume`,
                impact: 'Improved payer communication could reduce denials'
            });
        }

        return suggestions;
    }

    calculateAppealSuccessRate(appealStats) {
        const total = appealStats.reduce((sum, stat) => sum + stat.count, 0);
        const successful = appealStats
            .filter(stat => stat.outcome === 'approved')
            .reduce((sum, stat) => sum + stat.count, 0);
        
        return total > 0 ? (successful / total) * 100 : 0;
    }
}

module.exports = DenialManagementWorkflowService;