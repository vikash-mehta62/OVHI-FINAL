const express = require('express');
const router = express.Router();

// Import services
const ARAgingIntelligenceService = require('../services/rcm/arAgingIntelligenceService');
const ClaimMDConnectorService = require('../services/rcm/claimMdConnectorService');
const CollectionWorkflowManagerService = require('../services/rcm/collectionWorkflowManagerService');
const DenialManagementWorkflowService = require('../services/rcm/denialManagementWorkflowService');

// Initialize services
const arAgingService = new ARAgingIntelligenceService();
const claimMDService = new ClaimMDConnectorService();
const collectionService = new CollectionWorkflowManagerService();
const denialService = new DenialManagementWorkflowService();

// AR Aging Intelligence Routes
router.get('/ar-aging/analyze', async (req, res) => {
    try {
        const filters = {
            providerId: req.query.providerId,
            payerId: req.query.payerId,
            minBalance: req.query.minBalance
        };
        
        const analysis = await arAgingService.analyzeARAccounts(filters);
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error in AR aging analysis:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/ar-aging/predict/:accountId', async (req, res) => {
    try {
        const prediction = await arAgingService.predictCollectionProbability(req.params.accountId);
        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('Error in collection prediction:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/ar-aging/generate-risk-scores', async (req, res) => {
    try {
        const { accounts } = req.body;
        const riskScores = await arAgingService.generateRiskScores(accounts);
        res.json({
            success: true,
            data: riskScores
        });
    } catch (error) {
        console.error('Error generating risk scores:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/ar-aging/trigger-actions', async (req, res) => {
    try {
        const thresholds = req.body;
        const actions = await arAgingService.triggerAutomatedActions(thresholds);
        res.json({
            success: true,
            data: actions
        });
    } catch (error) {
        console.error('Error triggering automated actions:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/ar-aging/dashboard', async (req, res) => {
    try {
        const dashboard = await arAgingService.getARAgingDashboard();
        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Error getting AR aging dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ClaimMD Connector Routes
router.post('/claimmd/submit', async (req, res) => {
    try {
        const claim = req.body;
        const result = await claimMDService.submitClaim(claim);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error submitting claim to ClaimMD:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/claimmd/status/:claimMDId', async (req, res) => {
    try {
        const status = await claimMDService.getClaimStatus(req.params.claimMDId);
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting claim status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/claimmd/era/:eraId/download', async (req, res) => {
    try {
        const era = await claimMDService.downloadERA(req.params.eraId);
        res.json({
            success: true,
            data: era
        });
    } catch (error) {
        console.error('Error downloading ERA:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/claimmd/validate', async (req, res) => {
    try {
        const claimData = req.body;
        const validation = await claimMDService.validateClaim(claimData);
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('Error validating claim:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/claimmd/sync-statuses', async (req, res) => {
    try {
        const results = await claimMDService.syncClaimStatuses();
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error syncing claim statuses:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/claimmd/dashboard', async (req, res) => {
    try {
        const dashboard = await claimMDService.getClaimMDDashboard();
        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Error getting ClaimMD dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Collection Workflow Manager Routes
router.post('/collection/initiate', async (req, res) => {
    try {
        const { accountId, workflowType } = req.body;
        const workflow = await collectionService.initiateWorkflow(accountId, workflowType);
        res.json({
            success: true,
            data: workflow
        });
    } catch (error) {
        console.error('Error initiating collection workflow:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/collection/statement/:accountId', async (req, res) => {
    try {
        const { templateType } = req.body;
        const statement = await collectionService.generateStatement(req.params.accountId, templateType);
        res.json({
            success: true,
            data: statement
        });
    } catch (error) {
        console.error('Error generating statement:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/collection/schedule-followup', async (req, res) => {
    try {
        const { accountId, actionType, scheduledDate } = req.body;
        const followUp = await collectionService.scheduleFollowUp(accountId, actionType, scheduledDate);
        res.json({
            success: true,
            data: followUp
        });
    } catch (error) {
        console.error('Error scheduling follow-up:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/collection/payment-plan', async (req, res) => {
    try {
        const { accountId, planDetails } = req.body;
        const paymentPlan = await collectionService.setupPaymentPlan(accountId, planDetails);
        res.json({
            success: true,
            data: paymentPlan
        });
    } catch (error) {
        console.error('Error setting up payment plan:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/collection/process-actions', async (req, res) => {
    try {
        const results = await collectionService.processWorkflowActions();
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error processing workflow actions:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/collection/dashboard', async (req, res) => {
    try {
        const dashboard = await collectionService.getCollectionDashboard();
        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Error getting collection dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Denial Management Workflow Routes
router.post('/denial/categorize', async (req, res) => {
    try {
        const denialData = req.body;
        const category = await denialService.categorizeDenial(denialData);
        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error categorizing denial:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/denial/suggest-resolution/:categoryId', async (req, res) => {
    try {
        const suggestions = await denialService.suggestResolution(req.params.categoryId);
        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        console.error('Error suggesting resolution:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/denial/generate-appeal', async (req, res) => {
    try {
        const { categoryId, appealType } = req.body;
        const appeal = await denialService.generateAppeal(categoryId, appealType);
        res.json({
            success: true,
            data: appeal
        });
    } catch (error) {
        console.error('Error generating appeal:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/denial/track-outcome/:appealId', async (req, res) => {
    try {
        const outcomeData = req.body;
        const result = await denialService.trackOutcome(req.params.appealId, outcomeData);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error tracking appeal outcome:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/denial/analyze-patterns', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || 30;
        const analysis = await denialService.analyzeDenialPatterns(timeframe);
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error analyzing denial patterns:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/denial/dashboard', async (req, res) => {
    try {
        const dashboard = await denialService.getDenialDashboard();
        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Error getting denial dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'RCM Advanced Workflow API is running',
        timestamp: new Date().toISOString(),
        services: {
            arAging: 'active',
            claimMD: 'active',
            collection: 'active',
            denial: 'active'
        }
    });
});

module.exports = router;