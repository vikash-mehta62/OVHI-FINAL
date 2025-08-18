const express = require('express');
const router = express.Router();
const telehealthService = require('../services/telehealth/telehealthService');
const ringCentralIntegration = require('../services/telehealth/ringCentralIntegration');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/v1/telehealth/sessions:
 *   post:
 *     summary: Create a new telehealth session
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - scheduled_start_time
 *             properties:
 *               patient_id:
 *                 type: integer
 *               appointment_id:
 *                 type: integer
 *               session_type:
 *                 type: string
 *                 enum: [video, audio, phone]
 *               scheduled_start_time:
 *                 type: string
 *                 format: date-time
 *               chief_complaint:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session created successfully
 */
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const providerId = req.user.user_id;
    const sessionData = {
      ...req.body,
      provider_id: providerId
    };

    // Create RingCentral meeting if video session
    if (sessionData.session_type === 'video') {
      const meetingResult = await ringCentralIntegration.createMeeting(providerId, {
        topic: `Consultation with Patient ${sessionData.patient_id}`,
        password: null // Will be auto-generated
      });

      if (meetingResult.success) {
        sessionData.ringcentral_meeting_id = meetingResult.meeting.id;
        sessionData.ringcentral_join_url = meetingResult.meeting.join_url;
        sessionData.ringcentral_host_url = meetingResult.meeting.host_url;
      }
    }

    const session = await telehealthService.createSession(sessionData);
    
    res.status(201).json({
      success: true,
      message: 'Telehealth session created successfully',
      data: session
    });
  } catch (error) {
    console.error('Error creating telehealth session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create telehealth session',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/sessions/{sessionId}:
 *   get:
 *     summary: Get telehealth session details
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 */
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await telehealthService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error getting telehealth session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get telehealth session',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/sessions/{sessionId}/status:
 *   put:
 *     summary: Update session status
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, waiting, in_progress, completed, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put('/sessions/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, ...additionalData } = req.body;
    
    const updated = await telehealthService.updateSessionStatus(sessionId, status, additionalData);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session status updated successfully'
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session status',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/provider/sessions:
 *   get:
 *     summary: Get provider's telehealth sessions
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 */
router.get('/provider/sessions', authenticateToken, async (req, res) => {
  try {
    const providerId = req.user.user_id;
    const filters = req.query;
    
    const sessions = await telehealthService.getProviderSessions(providerId, filters);
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error getting provider sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provider sessions',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/waiting-room:
 *   get:
 *     summary: Get waiting room queue
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting room queue retrieved successfully
 */
router.get('/waiting-room', authenticateToken, async (req, res) => {
  try {
    const providerId = req.user.user_id;
    const queue = await telehealthService.getWaitingRoom(providerId);
    
    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    console.error('Error getting waiting room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waiting room',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/waiting-room/{sessionId}:
 *   post:
 *     summary: Add patient to waiting room
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Patient added to waiting room successfully
 */
router.post('/waiting-room/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { priority = 'medium' } = req.body;
    const patientId = req.user.user_id; // Assuming patient is making the request
    
    const waitingRoomId = await telehealthService.addToWaitingRoom(sessionId, patientId, priority);
    
    res.status(201).json({
      success: true,
      message: 'Added to waiting room successfully',
      data: { waiting_room_id: waitingRoomId }
    });
  } catch (error) {
    console.error('Error adding to waiting room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to waiting room',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/sessions/{sessionId}/notes:
 *   put:
 *     summary: Save session clinical notes
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consultation_notes:
 *                 type: string
 *               diagnosis_codes:
 *                 type: array
 *                 items:
 *                   type: string
 *               treatment_plan:
 *                 type: string
 *               prescriptions_issued:
 *                 type: array
 *                 items:
 *                   type: object
 *               follow_up_required:
 *                 type: boolean
 *               follow_up_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Notes saved successfully
 */
router.put('/sessions/:sessionId/notes', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const clinicalData = req.body;
    
    const saved = await telehealthService.saveSessionNotes(sessionId, clinicalData);
    
    if (!saved) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session notes saved successfully'
    });
  } catch (error) {
    console.error('Error saving session notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save session notes',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/sessions/{sessionId}/transcript:
 *   post:
 *     summary: Save session transcript
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - speaker_type
 *               - transcript_text
 *             properties:
 *               speaker_type:
 *                 type: string
 *                 enum: [patient, provider, system]
 *               speaker_id:
 *                 type: integer
 *               transcript_text:
 *                 type: string
 *               confidence_score:
 *                 type: number
 *               timestamp_start:
 *                 type: string
 *               timestamp_end:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transcript saved successfully
 */
router.post('/sessions/:sessionId/transcript', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const transcriptData = req.body;
    
    const transcriptId = await telehealthService.saveTranscript(sessionId, transcriptData);
    
    res.status(201).json({
      success: true,
      message: 'Transcript saved successfully',
      data: { transcript_id: transcriptId }
    });
  } catch (error) {
    console.error('Error saving transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save transcript',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/analytics:
 *   get:
 *     summary: Get provider telehealth analytics
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const providerId = req.user.user_id;
    const { start_date, end_date } = req.query;
    
    const analytics = await telehealthService.getProviderAnalytics(providerId, {
      start: start_date,
      end: end_date
    });
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/ringcentral/test:
 *   post:
 *     summary: Test RingCentral connection
 *     tags: [Telehealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection test completed
 */
router.post('/ringcentral/test', authenticateToken, async (req, res) => {
  try {
    const providerId = req.user.user_id;
    const result = await ringCentralIntegration.testConnection(providerId);
    
    res.json(result);
  } catch (error) {
    console.error('Error testing RingCentral connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test RingCentral connection',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/telehealth/ringcentral/webhook:
 *   post:
 *     summary: Handle RingCentral webhook events
 *     tags: [Telehealth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/ringcentral/webhook', async (req, res) => {
  try {
    const eventData = req.body;
    await ringCentralIntegration.handleWebhookEvent(eventData);
    
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

module.exports = router;