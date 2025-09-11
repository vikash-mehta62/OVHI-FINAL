/**
 * Advanced Reporting Service
 * Business intelligence and custom report generation
 */

const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');
const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');

class AdvancedReportingService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.reportTypes = {
            financial: 'Financial Performance',
            operational: 'Operational Metrics',
            compliance: 'Compliance Reports',
            analytics: 'Advanced Analytics',
            custom: 'Custom Reports'
        };
        this.exportFormats = ['pdf', 'excel', 'csv', 'json'];
    }

    /**
     * Generate comprehensive business intelligence report
     */
    async generateBusinessIntelligenceReport(parameters) {
        try {
            const connection = await this.pool.getConnection();
            
            const {
                reportType = 'financial',
                timeframe = '30d',
                includeComparisons = true,
                includeForecasts = true,
                groupBy = 'month',
                filters = {},
                userId
            } = parameters;

            // Get base data for the report
            const reportData = await this.getReportBaseData(
                connection, 
                reportType, 
                timeframe, 
                filters
            );

            // Add comparative analysis if requested
            let comparativeData = null;
            if (includeComparisons) {
                comparativeData = await this.getComparativeAnalysis(
                    connection, 
                    reportType, 
                    timeframe, 
                    filters
                );
            }

            // Add forecasting if requested
            let forecastData = null;
            if (includeForecasts) {
                forecastData = await this.generateForecastAnalysis(
                    connection, 
                    reportData, 
                    timeframe
                );
            }

            // Generate insights and recommendations
            const insights = this.generateBusinessInsights(
                reportData, 
                comparativeData, 
                forecastData
            );

            // Create executive summary
            const executiveSummary = this.createExecutiveSummary(
                reportData, 
                insights, 
                reportType
            );

            connection.release();

            return {
                reportId: await this.saveReport(parameters, userId),
                reportType,
                timeframe,
                generatedAt: new Date(),
                executiveSummary,
                reportData,
                comparativeData,
                forecastData,
                insights,
                metadata: {
                    dataPoints: this.countDataPoints(reportData),
                    accuracy: this.calculateDataAccuracy(reportData),
                    completeness: this.calculateDataCompleteness(reportData)
                }
            };

        } catch (error) {
            console.error('Error generating BI report:', error);
            throw error;
        }
    }

    /**
     * Create custom report with flexible parameters
     */
    async createCustomReport(reportDefinition) {
        try {
            const connection = await this.pool.getConnection();
            
            const {
                name,
                description,
                dataSource,
                metrics,
                dimensions,
                filters,
                visualizations,
                schedule,
                userId
            } = reportDefinition;

            // Validate report definition
            this.validateReportDefinition(reportDefinition);

            // Build dynamic query based on definition
            const query = this.buildDynamicQuery(dataSource, metrics, dimensions, filters);

            // Execute query and get data
            const [reportData] = await connection.execute(query.sql, query.params);

            // Apply aggregations and calculations
            const processedData = this.processReportData(reportData, metrics, dimensions);

            // Generate visualizations
            const charts = this.generateVisualizations(processedData, visualizations);

            // Save custom report definition
            const reportId = await this.saveCustomReportDefinition(
                connection, 
                reportDefinition, 
                userId
            );

            connection.release();

            return {
                reportId,
                name,
                description,
                data: processedData,
                charts,
                metadata: {
                    recordCount: reportData.length,
                    generatedAt: new Date(),
                    queryExecutionTime: Date.now() - new Date().getTime()
                }
            };

        } catch (error) {
            console.error('Error creating custom report:', error);
            throw error;
        }
    }
} 
   /**
     * Generate scheduled reports
     */
    async generateScheduledReports() {
        try {
            const connection = await this.pool.getConnection();

            // Get scheduled reports that are due
            const [scheduledReports] = await connection.execute(`
                SELECT sr.*, crd.report_definition
                FROM scheduled_reports sr
                JOIN custom_report_definitions crd ON sr.report_definition_id = crd.id
                WHERE sr.is_active = 1
                AND sr.next_run_date <= NOW()
            `);

            const results = [];

            for (const scheduledReport of scheduledReports) {
                try {
                    const reportDefinition = JSON.parse(scheduledReport.report_definition);
                    
                    // Generate the report
                    const report = await this.createCustomReport(reportDefinition);
                    
                    // Export in requested format
                    const exportedReport = await this.exportReport(
                        report, 
                        scheduledReport.export_format
                    );

                    // Send to recipients if configured
                    if (scheduledReport.recipients) {
                        await this.sendReportToRecipients(
                            exportedReport, 
                            JSON.parse(scheduledReport.recipients)
                        );
                    }

                    // Update next run date
                    await this.updateNextRunDate(connection, scheduledReport.id);

                    results.push({
                        reportId: scheduledReport.id,
                        status: 'success',
                        generatedAt: new Date()
                    });

                } catch (reportError) {
                    console.error(`Error generating scheduled report ${scheduledReport.id}:`, reportError);
                    results.push({
                        reportId: scheduledReport.id,
                        status: 'failed',
                        error: reportError.message
                    });
                }
            }

            connection.release();
            return results;

        } catch (error) {
            console.error('Error generating scheduled reports:', error);
            throw error;
        }
    }

    /**
     * Export report in specified format
     */
    async exportReport(reportData, format) {
        switch (format.toLowerCase()) {
            case 'pdf':
                return this.exportToPDF(reportData);
            case 'excel':
                return this.exportToExcel(reportData);
            case 'csv':
                return this.exportToCSV(reportData);
            case 'json':
                return this.exportToJSON(reportData);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    // Helper methods for report generation
    async getReportBaseData(connection, reportType, timeframe, filters) {
        const timeframeHours = this.parseTimeframe(timeframe);
        
        switch (reportType) {
            case 'financial':
                return this.getFinancialData(connection, timeframeHours, filters);
            case 'operational':
                return this.getOperationalData(connection, timeframeHours, filters);
            case 'compliance':
                return this.getComplianceData(connection, timeframeHours, filters);
            case 'analytics':
                return this.getAnalyticsData(connection, timeframeHours, filters);
            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }
    }

    async getFinancialData(connection, timeframeHours, filters) {
        const [revenueData] = await connection.execute(`
            SELECT 
                DATE_FORMAT(p.payment_date, '%Y-%m') as period,
                SUM(p.amount) as total_revenue,
                COUNT(DISTINCT c.id) as claim_count,
                AVG(p.amount) as avg_payment,
                SUM(CASE WHEN c.status = 3 THEN p.amount ELSE 0 END) as collected_revenue,
                COUNT(DISTINCT p.patient_id) as unique_patients
            FROM payments p
            JOIN claims c ON p.claim_id = c.id
            WHERE p.payment_date >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ${filters.providerId ? 'AND c.provider_id = ?' : ''}
            ${filters.payerId ? 'AND c.primary_insurance_id = ?' : ''}
            GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
            ORDER BY period ASC
        `, [timeframeHours, ...(filters.providerId ? [filters.providerId] : []), ...(filters.payerId ? [filters.payerId] : [])]);

        return { revenue: revenueData };
    }

    generateBusinessInsights(reportData, comparativeData, forecastData) {
        const insights = [];

        // Revenue trend analysis
        if (reportData.revenue && reportData.revenue.length > 1) {
            const latestRevenue = parseFloat(reportData.revenue[reportData.revenue.length - 1].total_revenue);
            const previousRevenue = parseFloat(reportData.revenue[reportData.revenue.length - 2].total_revenue);
            const growthRate = ((latestRevenue - previousRevenue) / previousRevenue) * 100;

            insights.push({
                category: 'Revenue Growth',
                insight: `Revenue ${growthRate > 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate).toFixed(1)}% compared to previous period`,
                impact: growthRate > 5 ? 'positive' : growthRate < -5 ? 'negative' : 'neutral',
                recommendation: growthRate < 0 ? 'Review collection processes and payer mix' : 'Continue current strategies'
            });
        }

        return insights;
    }

    createExecutiveSummary(reportData, insights, reportType) {
        return {
            title: `${this.reportTypes[reportType]} Executive Summary`,
            keyMetrics: this.extractKeyMetrics(reportData, reportType),
            topInsights: insights.slice(0, 5),
            recommendations: insights.map(i => i.recommendation).slice(0, 3),
            riskFactors: this.identifyRiskFactors(reportData),
            opportunities: this.identifyOpportunities(reportData)
        };
    }

    // Export format implementations
    exportToPDF(reportData) {
        // Mock PDF export - integrate with actual PDF library
        return {
            format: 'pdf',
            content: Buffer.from(JSON.stringify(reportData)).toString('base64'),
            filename: `report_${Date.now()}.pdf`
        };
    }

    exportToExcel(reportData) {
        // Mock Excel export - integrate with actual Excel library
        return {
            format: 'excel',
            content: Buffer.from(JSON.stringify(reportData)).toString('base64'),
            filename: `report_${Date.now()}.xlsx`
        };
    }

    exportToCSV(reportData) {
        // Convert data to CSV format
        const csvContent = this.convertToCSV(reportData.data || []);
        return {
            format: 'csv',
            content: csvContent,
            filename: `report_${Date.now()}.csv`
        };
    }

    exportToJSON(reportData) {
        return {
            format: 'json',
            content: JSON.stringify(reportData, null, 2),
            filename: `report_${Date.now()}.json`
        };
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    parseTimeframe(timeframe) {
        const timeframeMap = {
            '7d': 168,
            '30d': 720,
            '90d': 2160,
            '1y': 8760
        };
        return timeframeMap[timeframe] || 720;
    }

    async saveReport(parameters, userId) {
        // Mock save - implement actual database save
        return `RPT_${Date.now()}`;
    }

    validateReportDefinition(definition) {
        if (!definition.name) throw new Error('Report name is required');
        if (!definition.dataSource) throw new Error('Data source is required');
        if (!definition.metrics || !definition.metrics.length) throw new Error('At least one metric is required');
    }

    buildDynamicQuery(dataSource, metrics, dimensions, filters) {
        // Mock query builder - implement actual dynamic query building
        return {
            sql: 'SELECT * FROM claims WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
            params: []
        };
    }

    processReportData(data, metrics, dimensions) {
        // Mock data processing - implement actual data processing
        return data;
    }

    generateVisualizations(data, visualizations) {
        // Mock visualization generation
        return visualizations || [];
    }

    async saveCustomReportDefinition(connection, definition, userId) {
        const [result] = await connection.execute(`
            INSERT INTO custom_report_definitions 
            (name, description, report_definition, created_by, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [
            definition.name,
            definition.description,
            JSON.stringify(definition),
            userId
        ]);
        
        return result.insertId;
    }

    extractKeyMetrics(reportData, reportType) {
        // Extract key metrics based on report type
        const metrics = {};
        
        if (reportData.revenue) {
            const totalRevenue = reportData.revenue.reduce((sum, r) => sum + parseFloat(r.total_revenue), 0);
            metrics.totalRevenue = totalRevenue;
            metrics.avgMonthlyRevenue = totalRevenue / reportData.revenue.length;
        }
        
        return metrics;
    }

    identifyRiskFactors(reportData) {
        const risks = [];
        
        // Example risk identification
        if (reportData.revenue) {
            const recentRevenue = reportData.revenue.slice(-3);
            const isDecreasing = recentRevenue.every((r, i) => 
                i === 0 || parseFloat(r.total_revenue) < parseFloat(recentRevenue[i-1].total_revenue)
            );
            
            if (isDecreasing) {
                risks.push('Declining revenue trend over recent periods');
            }
        }
        
        return risks;
    }

    identifyOpportunities(reportData) {
        const opportunities = [];
        
        // Example opportunity identification
        if (reportData.revenue) {
            const avgRevenue = reportData.revenue.reduce((sum, r) => sum + parseFloat(r.total_revenue), 0) / reportData.revenue.length;
            const latestRevenue = parseFloat(reportData.revenue[reportData.revenue.length - 1].total_revenue);
            
            if (latestRevenue > avgRevenue * 1.1) {
                opportunities.push('Current revenue exceeds historical average - consider scaling successful strategies');
            }
        }
        
        return opportunities;
    }

    countDataPoints(reportData) {
        return Object.values(reportData).reduce((count, data) => {
            return count + (Array.isArray(data) ? data.length : 1);
        }, 0);
    }

    calculateDataAccuracy(reportData) {
        // Mock accuracy calculation
        return 95.5;
    }

    calculateDataCompleteness(reportData) {
        // Mock completeness calculation
        return 98.2;
    }
}

module.exports = AdvancedReportingService;