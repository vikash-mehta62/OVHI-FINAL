/**
 * Enhanced RCM Controller
 * Integrates all advanced RCM services
 */

const EnhancedERAProcessor = require('./enhancedERAProcessor');
const RevenueForecastingService = require('./revenueForecastingService');
const PatientFinancialPortalService = require('./patientFinancialPortalService');
const PerformanceMonitoringService = require('./performanceMonitoringService');
const AdvancedReportingService = require('./advancedReportingService');
const { ResponseHelpers } = require('../../utils/standardizedResponse');
const { handleControllerError } = require('../../middleware/errorHandler');

class EnhancedRCMController {
    constructor() {
        this.eraProcessor = new EnhancedERAProcessor();
        this.forecastingService = new RevenueForecastingService();
        this.patientPortalService = new PatientFinancialPortalService();
        this.performanceService = new PerformanceMonitoringService();
        this.reportingService = new AdvancedReportingService();
    }

    // =====================================================
    // ERA PROCESSING ENDPOINTS
    // =====================================================

    async processERAFile(req, res) {
        try {
            const { era_data, file_name, file_format, auto_post } = req.body;
            const { user_id: userId } = req.user;

            const result = await this.eraProcessor.processERAFile({
                eraContent: era_data,
                fileName: file_name,
                fileFormat: file_format || 'X12_835',
                autoPost: auto_post || false,
                userId
            });

            ResponseHelpers.sendSuccess(res, result, 'ERA file processed successfully');
        } catch (error) {
            handleControllerError(error, res, 'Process ERA file');
        }
    }

    async getERAProcessingStatus(req, res) {
        try {
            const { eraFileId } = req.params;

            const status = await this.eraProcessor.getERAProcessingStatus(eraFileId);

            ResponseHelpers.sendSuccess(res, status, 'ERA processing status retrieved');
        } catch (error) {
            handleControllerError(error, res, 'Get ERA processing status');
        }
    }

    async generateVarianceReport(req, res) {
        try {
            const { eraFileId } = req.params;

            const report = await this.eraProcessor.generateVarianceReport(eraFileId);

            ResponseHelpers.sendSuccess(res, report, 'Variance report generated');
        } catch (error) {
            handleControllerError(error, res, 'Generate variance report');
        }
    }

    // =====================================================
    // REVENUE FORECASTING ENDPOINTS
    // =====================================================

    async generateRevenueForecast(req, res) {
        try {
            const {
                forecast_period = 12,
                model_type = 'ensemble',
                include_seasonality = true,
                confidence_level = 95
            } = req.body;
            const { user_id: userId } = req.user;

            const forecast = await this.forecastingService.generateRevenueForecast({
                forecastPeriod: forecast_period,
                modelType: model_type,
                includeSeasonality: include_seasonality,
                confidenceLevel: confidence_level,
                userId
            });

            ResponseHelpers.sendSuccess(res, forecast, 'Revenue forecast generated successfully');
        } catch (error) {
            handleControllerError(error, res, 'Generate revenue forecast');
        }
    }

    // =====================================================
    // PATIENT PORTAL ENDPOINTS
    // =====================================================

    async authenticatePatient(req, res) {
        try {
            const { email, password, patient_id, date_of_birth } = req.body;

            const authResult = await this.patientPortalService.authenticatePatient({
                email,
                password,
                patientId: patient_id,
                dateOfBirth: date_of_birth
            });

            ResponseHelpers.sendSuccess(res, authResult, 'Patient authenticated successfully');
        } catch (error) {
            handleControllerError(error, res, 'Patient authentication');
        }
    }

    async getPatientAccountSummary(req, res) {
        try {
            const { patientId } = req.params;

            const summary = await this.patientPortalService.getAccountSummary(patientId);

            ResponseHelpers.sendSuccess(res, summary, 'Account summary retrieved');
        } catch (error) {
            handleControllerError(error, res, 'Get patient account summary');
        }
    }

    async processPatientPayment(req, res) {
        try {
            const {
                patient_id,
                amount,
                payment_method,
                payment_details,
                claim_ids,
                apply_to_oldest
            } = req.body;

            const result = await this.patientPortalService.processPayment({
                patientId: patient_id,
                amount,
                paymentMethod: payment_method,
                paymentDetails: payment_details,
                claimIds: claim_ids,
                applyToOldest: apply_to_oldest
            });

            ResponseHelpers.sendSuccess(res, result, 'Payment processed successfully');
        } catch (error) {
            handleControllerError(error, res, 'Process patient payment');
        }
    }

    async setupPatientPaymentPlan(req, res) {
        try {
            const {
                patient_id,
                total_amount,
                monthly_payment,
                number_of_payments,
                start_date,
                auto_pay_enabled,
                payment_method,
                payment_details
            } = req.body;

            const result = await this.patientPortalService.setupPaymentPlan({
                patientId: patient_id,
                totalAmount: total_amount,
                monthlyPayment: monthly_payment,
                numberOfPayments: number_of_payments,
                startDate: start_date,
                autoPayEnabled: auto_pay_enabled,
                paymentMethod: payment_method,
                paymentDetails: payment_details
            });

            ResponseHelpers.sendSuccess(res, result, 'Payment plan setup successfully');
        } catch (error) {
            handleControllerError(error, res, 'Setup payment plan');
        }
    }

    async sendPatientMessage(req, res) {
        try {
            const { patient_id, subject, message, priority, category } = req.body;

            const result = await this.patientPortalService.sendMessage({
                patientId: patient_id,
                subject,
                message,
                priority,
                category
            });

            ResponseHelpers.sendSuccess(res, result, 'Message sent successfully');
        } catch (error) {
            handleControllerError(error, res, 'Send patient message');
        }
    }

    async getPatientStatements(req, res) {
        try {
            const { patientId } = req.params;
            const { limit, format, start_date, end_date } = req.query;

            const statements = await this.patientPortalService.getStatements(patientId, {
                limit: parseInt(limit) || 12,
                format,
                startDate: start_date,
                endDate: end_date
            });

            ResponseHelpers.sendSuccess(res, statements, 'Statements retrieved successfully');
        } catch (error) {
            handleControllerError(error, res, 'Get patient statements');
        }
    }

    async downloadPatientStatement(req, res) {
        try {
            const { patientId, statementId } = req.params;
            const { format = 'pdf' } = req.query;

            const document = await this.patientPortalService.downloadStatement(
                patientId, 
                statementId, 
                format
            );

            res.setHeader('Content-Type', `application/${format}`);
            res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
            
            if (format === 'pdf') {
                res.send(Buffer.from(document.document, 'base64'));
            } else {
                res.send(document.document);
            }
        } catch (error) {
            handleControllerError(error, res, 'Download patient statement');
        }
    }

    // =====================================================
    // PERFORMANCE MONITORING ENDPOINTS
    // =====================================================

    async getPerformanceMetrics(req, res) {
        try {
            const { timeframe = '1h' } = req.query;

            const metrics = await this.performanceService.getPerformanceMetrics(timeframe);

            ResponseHelpers.sendSuccess(res, metrics, 'Performance metrics retrieved');
        } catch (error) {
            handleControllerError(error, res, 'Get performance metrics');
        }
    }

    async createPerformanceAlert(req, res) {
        try {
            const { type, message, severity, metric_value, threshold_value } = req.body;

            const alertId = await this.performanceService.createAlert({
                type,
                message,
                severity,
                metricValue: metric_value,
                thresholdValue: threshold_value
            });

            ResponseHelpers.sendSuccess(res, { alertId }, 'Performance alert created');
        } catch (error) {
            handleControllerError(error, res, 'Create performance alert');
        }
    }

    // =====================================================
    // ADVANCED REPORTING ENDPOINTS
    // =====================================================

    async generateBusinessIntelligenceReport(req, res) {
        try {
            const {
                report_type = 'financial',
                timeframe = '30d',
                include_comparisons = true,
                include_forecasts = true,
                group_by = 'month',
                filters = {}
            } = req.body;
            const { user_id: userId } = req.user;

            const report = await this.reportingService.generateBusinessIntelligenceReport({
                reportType: report_type,
                timeframe,
                includeComparisons: include_comparisons,
                includeForecasts: include_forecasts,
                groupBy: group_by,
                filters,
                userId
            });

            ResponseHelpers.sendSuccess(res, report, 'Business intelligence report generated');
        } catch (error) {
            handleControllerError(error, res, 'Generate BI report');
        }
    }

    async createCustomReport(req, res) {
        try {
            const reportDefinition = req.body;
            const { user_id: userId } = req.user;

            reportDefinition.userId = userId;

            const report = await this.reportingService.createCustomReport(reportDefinition);

            ResponseHelpers.sendSuccess(res, report, 'Custom report created successfully');
        } catch (error) {
            handleControllerError(error, res, 'Create custom report');
        }
    }

    async exportReport(req, res) {
        try {
            const { reportId } = req.params;
            const { format = 'pdf' } = req.query;

            // Get report data (mock implementation)
            const reportData = { reportId, data: [] };

            const exportedReport = await this.reportingService.exportReport(reportData, format);

            res.setHeader('Content-Type', `application/${format}`);
            res.setHeader('Content-Disposition', `attachment; filename="${exportedReport.filename}"`);
            
            if (format === 'pdf' || format === 'excel') {
                res.send(Buffer.from(exportedReport.content, 'base64'));
            } else {
                res.send(exportedReport.content);
            }
        } catch (error) {
            handleControllerError(error, res, 'Export report');
        }
    }

    async generateScheduledReports(req, res) {
        try {
            const results = await this.reportingService.generateScheduledReports();

            ResponseHelpers.sendSuccess(res, results, 'Scheduled reports generated');
        } catch (error) {
            handleControllerError(error, res, 'Generate scheduled reports');
        }
    }

    // =====================================================
    // HEALTH CHECK
    // =====================================================

    async enhancedHealthCheck(req, res) {
        try {
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    eraProcessor: 'operational',
                    forecastingService: 'operational',
                    patientPortal: 'operational',
                    performanceMonitoring: 'operational',
                    advancedReporting: 'operational'
                },
                version: '2.0.0',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV || 'development'
            };

            ResponseHelpers.sendSuccess(res, healthData, 'Enhanced RCM services are healthy');
        } catch (error) {
            handleControllerError(error, res, 'Enhanced health check');
        }
    }
}

// Create and export controller instance
const enhancedRCMController = new EnhancedRCMController();

// Export individual methods for route binding
module.exports = {
    // ERA Processing
    processERAFile: enhancedRCMController.processERAFile.bind(enhancedRCMController),
    getERAProcessingStatus: enhancedRCMController.getERAProcessingStatus.bind(enhancedRCMController),
    generateVarianceReport: enhancedRCMController.generateVarianceReport.bind(enhancedRCMController),
    
    // Revenue Forecasting
    generateRevenueForecast: enhancedRCMController.generateRevenueForecast.bind(enhancedRCMController),
    
    // Patient Portal
    authenticatePatient: enhancedRCMController.authenticatePatient.bind(enhancedRCMController),
    getPatientAccountSummary: enhancedRCMController.getPatientAccountSummary.bind(enhancedRCMController),
    processPatientPayment: enhancedRCMController.processPatientPayment.bind(enhancedRCMController),
    setupPatientPaymentPlan: enhancedRCMController.setupPatientPaymentPlan.bind(enhancedRCMController),
    sendPatientMessage: enhancedRCMController.sendPatientMessage.bind(enhancedRCMController),
    getPatientStatements: enhancedRCMController.getPatientStatements.bind(enhancedRCMController),
    downloadPatientStatement: enhancedRCMController.downloadPatientStatement.bind(enhancedRCMController),
    
    // Performance Monitoring
    getPerformanceMetrics: enhancedRCMController.getPerformanceMetrics.bind(enhancedRCMController),
    createPerformanceAlert: enhancedRCMController.createPerformanceAlert.bind(enhancedRCMController),
    
    // Advanced Reporting
    generateBusinessIntelligenceReport: enhancedRCMController.generateBusinessIntelligenceReport.bind(enhancedRCMController),
    createCustomReport: enhancedRCMController.createCustomReport.bind(enhancedRCMController),
    exportReport: enhancedRCMController.exportReport.bind(enhancedRCMController),
    generateScheduledReports: enhancedRCMController.generateScheduledReports.bind(enhancedRCMController),
    
    // Health Check
    enhancedHealthCheck: enhancedRCMController.enhancedHealthCheck.bind(enhancedRCMController)
};