const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { default: axios } = require("axios")
// Import all route files
const authRoutes = require('./auth/authRoute');
const patientRoutes = require('./patients/patientRoute');
const enhancedPatientRoutes = require('./patients/enhancedPatientRoutes');
const patientMedicalRecordsRoutes = require('./patients/patientMedicalRecordsRoutes');
const settingsRoutes = require('./settings/settingsRoutes');
const providerRoutes = require('./providers/providerRoutes');
const ringCentralRoute = require('./ring-central/ringCentralRoute');
const appointmentRoutes = require('./appointment/appointmentRoutes');
const awsRoute = require('./aws/awsUpload');
const workFlowRoutes = require('./workflow-templates/workFlowRoutes');
const mioRoutes = require('./mio/mioConnectProxyRoutes');
const locationRoute = require('./locations/location');
const twilioRoutes = require("./twilio/twilioRoutes");
const documentRoutes = require("./documents/documentRoute");
const billingRoutes = require("./billings/billingRoutes");
const ccmRoutes = require("./ccm/ccmRoutes");
const encountersRoutes = require("./encounters/encounterRoutes");
const devicesRoutes = require("./devices/devicesRoutes");
const { getConsentDetails, submitConsentForm,uploadConsentForms } = require("./patients/patientCtrl2");
const thirdPartyApiRoutes = require("./third-party-apis/api-routes");
const generalRoutes = require("./general-apis/generalRoutes");
const rcmRoutes = require("./rcm/rcmRoutes");
const rcmAdvancedWorkflowRoutes = require("../routes/rcmAdvancedWorkflowRoutes");
const paymentRoutes = require("./payments/paymentRoutes");
const analyticsRoutes = require("./analytics/analyticsRoutes");
const rpmRoutes = require("./rpm/rpmRoutes");
const mipsRoutes = require("../routes/mipsRoutes");



// Public routes (no auth required)
router.use('/auth', authRoutes);
router.use('/ring-central', ringCentralRoute);
router.use('/aws', awsRoute);

// Protected routes (require auth)
router.use('/patient', verifyToken, patientRoutes);
router.use('/patients', verifyToken, enhancedPatientRoutes);
router.use('/patients', verifyToken, require('./patients/patientPortalRoutes'));
router.use('/intake', require("./intake/intakeRoute"));
router.use('/settings', verifyToken, settingsRoutes);
router.use('/physician', verifyToken, providerRoutes);
router.use('/appointment', verifyToken, appointmentRoutes);
router.use('/location', verifyToken, locationRoute);
router.use('/work-flow', verifyToken, workFlowRoutes);
router.use('/mio', mioRoutes);
router.use("/twilio",verifyToken, twilioRoutes);
router.use("/documents",verifyToken, documentRoutes);
router.use("/billing",verifyToken, billingRoutes);
router.use("/ccm",verifyToken, ccmRoutes);
router.use("/encounters",verifyToken, encountersRoutes);
router.use("/devices",verifyToken, devicesRoutes);
router.get("/ehr/consent-form", getConsentDetails);
router.post('/ehr/consent-form', submitConsentForm);
router.post('/ehr/upload-consent-form', uploadConsentForms);
//for third Party APIs !IMPORTANT
router.use("/client",thirdPartyApiRoutes);
//for Testing
router.use("/general",generalRoutes);
// RCM Routes
router.use("/rcm", verifyToken, rcmRoutes);

// RCM Advanced Workflow Routes
router.use("/rcm-advanced", verifyToken, rcmAdvancedWorkflowRoutes);

// Payment Routes
router.use("/payments", verifyToken, paymentRoutes);

// Analytics Routes
router.use("/analytics", verifyToken, analyticsRoutes);

// RPM Routes
router.use("/rpm", verifyToken, rpmRoutes);

// Smart Template Routes
router.use("/encounters/smart-templates", verifyToken, require("./encounters/smartTemplateRoutes"));

// MIPS Routes
router.use("/mips", verifyToken, mipsRoutes);

// RCM Critical Features Routes
router.use("/rcm", verifyToken, require("../routes/rcmCriticalRoutes"));



router.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('Image URL is required');
    }
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error('Proxy image error:', error);
        res.status(500).send('Failed to fetch image');
    }
});



// Export the combined router
module.exports = router;
