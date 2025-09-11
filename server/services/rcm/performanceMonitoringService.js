/**
 * Performance Monitoring Service
 * System health monitoring and optimization
 */

const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');
const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');

class PerformanceMonitoringService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.metrics = {
            responseTime: [],
            throughput: [],
            errorRate: [],
            systemHealth: {}
        };
        this.alertThresholds = {
            responseTime: 5000, // 5 seconds
            errorRate: 5, // 5%
            cpuUsage: 80, // 80%
            memoryUsage: 85, // 85%
            diskUsage: 90 // 90%
        };
        this.startTime = Date.now();
    }

    /**
     * Get comprehensive system performance metrics
     */
    async getPerformanceMetrics(timeframe = '1h') {
        try {
            const connection = await this.pool.getConnection();

            // Get database performance metrics
            const dbMetrics = await this.getDatabaseMetrics(connection);
            
            // Get API performance metrics
            const apiMetrics = await this.getAPIMetrics(connection, timeframe);
            
            // Get RCM-specific performance metrics
            const rcmMetrics = await this.getRCMMetrics(connection, timeframe);
            
            // Get system resource metrics
            const systemMetrics = await this.getSystemMetrics();
            
            // Get error and alert metrics
            const errorMetrics = await this.getErrorMetrics(connection, timeframe);
            
            // Calculate performance scores
            const performanceScores = this.calculatePerformanceScores({
                dbMetrics,
                apiMetrics,
                rcmMetrics,
                systemMetrics,
                errorMetrics
            });

            connection.release();

            return {
                timestamp: new Date(),
                timeframe,
                database: dbMetrics,
                api: apiMetrics,
                rcm: rcmMetrics,
                system: systemMetrics,
                errors: errorMetrics,
                scores: performanceScores,
                alerts: await this.getActiveAlerts(),
                recommendations: this.generateRecommendations(performanceScores)
            };

        } catch (error) {
            console.error('Error getting performance metrics:', error);
            throw error;
        }
    }

    /**
     * Get database performance metrics
     */
    async getDatabaseMetrics(connection) {
        try {
            // Get connection pool status
            const poolStats = this.pool.pool._allConnections.length;
            const activeConnections = this.pool.pool._acquiringConnections.length;
            
            // Get query performance stats
            const [queryStats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_queries,
                    AVG(TIMER_WAIT/1000000000) as avg_query_time_seconds,
                    MAX(TIMER_WAIT/1000000000) as max_query_time_seconds,
                    SUM(CASE WHEN TIMER_WAIT > 5000000000 THEN 1 ELSE 0 END) as slow_queries
                FROM performance_schema.events_statements_history_long 
                WHERE EVENT_NAME LIKE 'statement/sql/%'
                AND TIMER_START > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 HOUR)) * 1000000000
            `);

            // Get table sizes and row counts
            const [tableStats] = await connection.execute(`
                SELECT 
                    table_name,
                    table_rows,
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
                AND table_name IN ('claims', 'payments', 'patients', 'rcm_era_files', 'rcm_denial_categories')
                ORDER BY (data_length + index_length) DESC
            `);

            // Get index usage statistics
            const [indexStats] = await connection.execute(`
                SELECT 
                    object_schema,
                    object_name,
                    index_name,
                    count_read,
                    count_write,
                    count_fetch,
                    sum_timer_wait/1000000000 as total_latency_seconds
                FROM performance_schema.table_io_waits_summary_by_index_usage
                WHERE object_schema = DATABASE()
                ORDER BY sum_timer_wait DESC
                LIMIT 10
            `);

            return {
                connectionPool: {
                    totalConnections: poolStats,
                    activeConnections: activeConnections,
                    utilizationRate: (activeConnections / poolStats) * 100
                },
                queryPerformance: queryStats[0] || {},
                tableStatistics: tableStats,
                indexUsage: indexStats,
                healthScore: this.calculateDatabaseHealthScore(queryStats[0], poolStats, activeConnections)
            };

        } catch (error) {
            console.error('Error getting database metrics:', error);
            return {
                connectionPool: { error: error.message },
                queryPerformance: {},
                tableStatistics: [],
                indexUsage: [],
                healthScore: 0
            };
        }
    }

    /**
     * Get API performance metrics
     */
    async getAPIMetrics(connection, timeframe) {
        try {
            const timeframeHours = this.parseTimeframe(timeframe);

            // Get API endpoint performance from logs (if logging is implemented)
            const [apiStats] = await connection.execute(`
                SELECT 
                    endpoint,
                    COUNT(*) as request_count,
                    AVG(response_time_ms) as avg_response_time,
                    MAX(response_time_ms) as max_response_time,
                    MIN(response_time_ms) as min_response_time,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
                    SUM(CASE WHEN response_time_ms > 5000 THEN 1 ELSE 0 END) as slow_requests
                FROM api_request_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                GROUP BY endpoint
                ORDER BY request_count DESC
                LIMIT 20
            `, [timeframeHours]);

            // Calculate throughput and error rates
            const totalRequests = apiStats.reduce((sum, stat) => sum + parseInt(stat.request_count), 0);
            const totalErrors = apiStats.reduce((sum, stat) => sum + parseInt(stat.error_count), 0);
            const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
            const throughput = totalRequests / timeframeHours; // requests per hour

            // Get most used endpoints
            const topEndpoints = apiStats.slice(0, 10);

            // Get slowest endpoints
            const slowestEndpoints = [...apiStats]
                .sort((a, b) => parseFloat(b.avg_response_time) - parseFloat(a.avg_response_time))
                .slice(0, 5);

            return {
                summary: {
                    totalRequests,
                    totalErrors,
                    errorRate,
                    throughput,
                    avgResponseTime: apiStats.length > 0 ? 
                        apiStats.reduce((sum, stat) => sum + parseFloat(stat.avg_response_time), 0) / apiStats.length : 0
                },
                topEndpoints,
                slowestEndpoints,
                healthScore: this.calculateAPIHealthScore(errorRate, throughput, apiStats)
            };

        } catch (error) {
            console.error('Error getting API metrics:', error);
            return {
                summary: { error: error.message },
                topEndpoints: [],
                slowestEndpoints: [],
                healthScore: 0
            };
        }
    }

    /**
     * Get RCM-specific performance metrics
     */
    async getRCMMetrics(connection, timeframe) {
        try {
            const timeframeHours = this.parseTimeframe(timeframe);

            // Claims processing metrics
            const [claimsMetrics] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_claims,
                    SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as paid_claims,
                    SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as denied_claims,
                    AVG(total_amount) as avg_claim_amount,
                    AVG(DATEDIFF(COALESCE(last_payment_date, NOW()), created_at)) as avg_processing_days
                FROM claims 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `, [timeframeHours]);

            // Payment processing metrics
            const [paymentMetrics] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_payments,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_payment_amount,
                    COUNT(DISTINCT patient_id) as unique_patients,
                    AVG(DATEDIFF(payment_date, (SELECT created_at FROM claims WHERE id = payments.claim_id))) as avg_payment_delay_days
                FROM payments 
                WHERE payment_date >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `, [timeframeHours]);

            // ERA processing metrics
            const [eraMetrics] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_era_files,
                    SUM(total_payments) as total_era_payments,
                    AVG(matched_payments) as avg_matched_payments,
                    AVG(unmatched_payments) as avg_unmatched_payments,
                    AVG((matched_payments / (matched_payments + unmatched_payments)) * 100) as avg_match_rate
                FROM rcm_era_files 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                AND processing_status = 'completed'
            `, [timeframeHours]);

            // Denial management metrics
            const [denialMetrics] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_denials,
                    SUM(estimated_recovery_amount) as total_denied_amount,
                    AVG(estimated_recovery_amount) as avg_denial_amount,
                    COUNT(DISTINCT category) as unique_denial_categories,
                    SUM(CASE WHEN priority_level = 'high' THEN 1 ELSE 0 END) as high_priority_denials
                FROM rcm_denial_categories 
                WHERE categorized_date >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `, [timeframeHours]);

            // Calculate RCM KPIs
            const claimsData = claimsMetrics[0] || {};
            const paymentData = paymentMetrics[0] || {};
            const eraData = eraMetrics[0] || {};
            const denialData = denialMetrics[0] || {};

            const collectionRate = claimsData.total_claims > 0 ? 
                (claimsData.paid_claims / claimsData.total_claims) * 100 : 0;
            const denialRate = claimsData.total_claims > 0 ? 
                (claimsData.denied_claims / claimsData.total_claims) * 100 : 0;

            return {
                claims: {
                    ...claimsData,
                    collectionRate,
                    denialRate
                },
                payments: paymentData,
                era: eraData,
                denials: denialData,
                kpis: {
                    collectionRate,
                    denialRate,
                    avgProcessingDays: claimsData.avg_processing_days || 0,
                    avgPaymentDelayDays: paymentData.avg_payment_delay_days || 0,
                    eraMatchRate: eraData.avg_match_rate || 0
                },
                healthScore: this.calculateRCMHealthScore({
                    collectionRate,
                    denialRate,
                    avgProcessingDays: claimsData.avg_processing_days,
                    eraMatchRate: eraData.avg_match_rate
                })
            };

        } catch (error) {
            console.error('Error getting RCM metrics:', error);
            return {
                claims: {},
                payments: {},
                era: {},
                denials: {},
                kpis: {},
                healthScore: 0
            };
        }
    }

    /**
     * Get system resource metrics
     */
    async getSystemMetrics() {
        try {
            const process = require('process');
            const os = require('os');

            // Memory usage
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;

            // CPU usage (simplified)
            const cpuUsage = os.loadavg()[0]; // 1-minute load average
            const cpuCount = os.cpus().length;

            // Process uptime
            const uptime = process.uptime();
            const systemUptime = os.uptime();

            // Disk usage (mock - would need actual disk monitoring)
            const diskUsage = {
                total: 100 * 1024 * 1024 * 1024, // 100GB mock
                used: 45 * 1024 * 1024 * 1024,   // 45GB mock
                free: 55 * 1024 * 1024 * 1024    // 55GB mock
            };

            return {
                memory: {
                    total: totalMemory,
                    used: usedMemory,
                    free: freeMemory,
                    usagePercentage: (usedMemory / totalMemory) * 100,
                    process: {
                        rss: memoryUsage.rss,
                        heapTotal: memoryUsage.heapTotal,
                        heapUsed: memoryUsage.heapUsed,
                        external: memoryUsage.external
                    }
                },
                cpu: {
                    loadAverage: cpuUsage,
                    coreCount: cpuCount,
                    usagePercentage: (cpuUsage / cpuCount) * 100
                },
                disk: {
                    ...diskUsage,
                    usagePercentage: (diskUsage.used / diskUsage.total) * 100
                },
                uptime: {
                    process: uptime,
                    system: systemUptime,
                    processUptimeHours: uptime / 3600,
                    systemUptimeHours: systemUptime / 3600
                },
                healthScore: this.calculateSystemHealthScore({
                    memoryUsage: (usedMemory / totalMemory) * 100,
                    cpuUsage: (cpuUsage / cpuCount) * 100,
                    diskUsage: (diskUsage.used / diskUsage.total) * 100
                })
            };

        } catch (error) {
            console.error('Error getting system metrics:', error);
            return {
                memory: {},
                cpu: {},
                disk: {},
                uptime: {},
                healthScore: 0
            };
        }
    }

    /**
     * Get error and alert metrics
     */
    async getErrorMetrics(connection, timeframe) {
        try {
            const timeframeHours = this.parseTimeframe(timeframe);

            // Get error logs (if error logging is implemented)
            const [errorStats] = await connection.execute(`
                SELECT 
                    error_type,
                    COUNT(*) as error_count,
                    MAX(created_at) as last_occurrence
                FROM error_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                GROUP BY error_type
                ORDER BY error_count DESC
                LIMIT 10
            `, [timeframeHours]);

            // Get critical alerts
            const [criticalAlerts] = await connection.execute(`
                SELECT 
                    alert_type,
                    alert_message,
                    severity,
                    created_at,
                    resolved_at
                FROM system_alerts 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                AND severity IN ('critical', 'high')
                ORDER BY created_at DESC
                LIMIT 20
            `, [timeframeHours]);

            const totalErrors = errorStats.reduce((sum, stat) => sum + parseInt(stat.error_count), 0);
            const activeAlerts = criticalAlerts.filter(alert => !alert.resolved_at).length;

            return {
                totalErrors,
                activeAlerts,
                errorsByType: errorStats,
                criticalAlerts,
                errorRate: totalErrors / timeframeHours, // errors per hour
                healthScore: this.calculateErrorHealthScore(totalErrors, activeAlerts)
            };

        } catch (error) {
            console.error('Error getting error metrics:', error);
            return {
                totalErrors: 0,
                activeAlerts: 0,
                errorsByType: [],
                criticalAlerts: [],
                errorRate: 0,
                healthScore: 100
            };
        }
    }

    /**
     * Calculate overall performance scores
     */
    calculatePerformanceScores(metrics) {
        const scores = {
            database: metrics.dbMetrics.healthScore || 0,
            api: metrics.apiMetrics.healthScore || 0,
            rcm: metrics.rcmMetrics.healthScore || 0,
            system: metrics.systemMetrics.healthScore || 0,
            errors: metrics.errorMetrics.healthScore || 0
        };

        // Calculate weighted overall score
        const weights = {
            database: 0.25,
            api: 0.20,
            rcm: 0.30,
            system: 0.15,
            errors: 0.10
        };

        const overallScore = Object.keys(scores).reduce((total, key) => {
            return total + (scores[key] * weights[key]);
        }, 0);

        return {
            ...scores,
            overall: Math.round(overallScore),
            grade: this.getPerformanceGrade(overallScore)
        };
    }

    /**
     * Get active alerts
     */
    async getActiveAlerts() {
        try {
            const connection = await this.pool.getConnection();

            const [alerts] = await connection.execute(`
                SELECT * FROM system_alerts 
                WHERE resolved_at IS NULL
                ORDER BY severity DESC, created_at DESC
                LIMIT 50
            `);

            connection.release();

            return alerts.map(alert => ({
                ...alert,
                duration: Date.now() - new Date(alert.created_at).getTime()
            }));

        } catch (error) {
            console.error('Error getting active alerts:', error);
            return [];
        }
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations(scores) {
        const recommendations = [];

        if (scores.database < 70) {
            recommendations.push({
                category: 'Database',
                priority: 'High',
                issue: 'Database performance is below optimal',
                recommendation: 'Optimize slow queries and consider connection pool tuning',
                expectedImpact: 'Improve response times by 20-30%'
            });
        }

        if (scores.api < 70) {
            recommendations.push({
                category: 'API',
                priority: 'High',
                issue: 'API performance is degraded',
                recommendation: 'Implement caching and optimize endpoint response times',
                expectedImpact: 'Reduce API response times by 15-25%'
            });
        }

        if (scores.rcm < 80) {
            recommendations.push({
                category: 'RCM',
                priority: 'Medium',
                issue: 'RCM processes need optimization',
                recommendation: 'Review denial management and ERA processing workflows',
                expectedImpact: 'Improve collection rates by 5-10%'
            });
        }

        if (scores.system < 75) {
            recommendations.push({
                category: 'System',
                priority: 'Medium',
                issue: 'System resources are under pressure',
                recommendation: 'Monitor memory usage and consider scaling resources',
                expectedImpact: 'Improve overall system stability'
            });
        }

        if (scores.errors < 90) {
            recommendations.push({
                category: 'Error Management',
                priority: 'High',
                issue: 'High error rate detected',
                recommendation: 'Investigate and resolve recurring errors',
                expectedImpact: 'Reduce system errors by 50-70%'
            });
        }

        return recommendations;
    }

    // Helper methods for health score calculations
    calculateDatabaseHealthScore(queryStats, totalConnections, activeConnections) {
        let score = 100;

        if (queryStats) {
            if (queryStats.avg_query_time_seconds > 2) score -= 20;
            if (queryStats.slow_queries > 10) score -= 15;
        }

        const connectionUtilization = (activeConnections / totalConnections) * 100;
        if (connectionUtilization > 80) score -= 25;

        return Math.max(0, score);
    }

    calculateAPIHealthScore(errorRate, throughput, apiStats) {
        let score = 100;

        if (errorRate > 5) score -= 30;
        if (errorRate > 10) score -= 20;

        const avgResponseTime = apiStats.length > 0 ? 
            apiStats.reduce((sum, stat) => sum + parseFloat(stat.avg_response_time), 0) / apiStats.length : 0;
        
        if (avgResponseTime > 3000) score -= 25;
        if (avgResponseTime > 5000) score -= 15;

        return Math.max(0, score);
    }

    calculateRCMHealthScore(kpis) {
        let score = 100;

        if (kpis.collectionRate < 85) score -= 20;
        if (kpis.denialRate > 10) score -= 25;
        if (kpis.avgProcessingDays > 30) score -= 15;
        if (kpis.eraMatchRate < 80) score -= 20;

        return Math.max(0, score);
    }

    calculateSystemHealthScore(usage) {
        let score = 100;

        if (usage.memoryUsage > 85) score -= 25;
        if (usage.cpuUsage > 80) score -= 20;
        if (usage.diskUsage > 90) score -= 30;

        return Math.max(0, score);
    }

    calculateErrorHealthScore(totalErrors, activeAlerts) {
        let score = 100;

        if (totalErrors > 50) score -= 30;
        if (totalErrors > 100) score -= 20;
        if (activeAlerts > 5) score -= 25;
        if (activeAlerts > 10) score -= 25;

        return Math.max(0, score);
    }

    getPerformanceGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    parseTimeframe(timeframe) {
        const timeframeMap = {
            '15m': 0.25,
            '30m': 0.5,
            '1h': 1,
            '6h': 6,
            '12h': 12,
            '24h': 24,
            '7d': 168
        };
        return timeframeMap[timeframe] || 1;
    }

    /**
     * Create performance alert
     */
    async createAlert(alertData) {
        try {
            const connection = await this.pool.getConnection();

            const [result] = await connection.execute(`
                INSERT INTO system_alerts 
                (alert_type, alert_message, severity, metric_value, threshold_value, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                alertData.type,
                alertData.message,
                alertData.severity,
                alertData.metricValue,
                alertData.thresholdValue
            ]);

            connection.release();
            return result.insertId;

        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    /**
     * Start performance monitoring
     */
    startMonitoring(intervalMinutes = 5) {
        setInterval(async () => {
            try {
                const metrics = await this.getPerformanceMetrics('15m');
                
                // Check for alert conditions
                await this.checkAlertConditions(metrics);
                
                // Store metrics for historical analysis
                await this.storeMetrics(metrics);
                
            } catch (error) {
                console.error('Performance monitoring error:', error);
            }
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Check for alert conditions
     */
    async checkAlertConditions(metrics) {
        const alerts = [];

        // Check response time alerts
        if (metrics.api.summary.avgResponseTime > this.alertThresholds.responseTime) {
            alerts.push({
                type: 'HIGH_RESPONSE_TIME',
                message: `Average API response time (${metrics.api.summary.avgResponseTime}ms) exceeds threshold`,
                severity: 'high',
                metricValue: metrics.api.summary.avgResponseTime,
                thresholdValue: this.alertThresholds.responseTime
            });
        }

        // Check error rate alerts
        if (metrics.api.summary.errorRate > this.alertThresholds.errorRate) {
            alerts.push({
                type: 'HIGH_ERROR_RATE',
                message: `API error rate (${metrics.api.summary.errorRate}%) exceeds threshold`,
                severity: 'critical',
                metricValue: metrics.api.summary.errorRate,
                thresholdValue: this.alertThresholds.errorRate
            });
        }

        // Check system resource alerts
        if (metrics.system.memory.usagePercentage > this.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'HIGH_MEMORY_USAGE',
                message: `Memory usage (${metrics.system.memory.usagePercentage.toFixed(1)}%) exceeds threshold`,
                severity: 'high',
                metricValue: metrics.system.memory.usagePercentage,
                thresholdValue: this.alertThresholds.memoryUsage
            });
        }

        // Create alerts
        for (const alert of alerts) {
            await this.createAlert(alert);
        }
    }

    /**
     * Store metrics for historical analysis
     */
    async storeMetrics(metrics) {
        try {
            const connection = await this.pool.getConnection();

            await connection.execute(`
                INSERT INTO performance_metrics_history 
                (timestamp, database_score, api_score, rcm_score, system_score, 
                 overall_score, response_time, error_rate, memory_usage, cpu_usage)
                VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                metrics.scores.database,
                metrics.scores.api,
                metrics.scores.rcm,
                metrics.scores.system,
                metrics.scores.overall,
                metrics.api.summary.avgResponseTime || 0,
                metrics.api.summary.errorRate || 0,
                metrics.system.memory.usagePercentage || 0,
                metrics.system.cpu.usagePercentage || 0
            ]);

            connection.release();

        } catch (error) {
            console.error('Error storing metrics:', error);
        }
    }
}

module.exports = PerformanceMonitoringService;