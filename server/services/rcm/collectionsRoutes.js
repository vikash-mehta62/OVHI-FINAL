const express = require('express');
const router = express.Router();
const collectionsCtrl = require('./collectionsCtrl');
const { verifyToken } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/rcm/collections/accounts:
 *   get:
 *     summary: Get patient accounts for collections
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient accounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       patientId:
 *                         type: integer
 *                       patientName:
 *                         type: string
 *                       totalBalance:
 *                         type: number
 *                       aging30:
 *                         type: number
 *                       aging60:
 *                         type: number
 *                       aging90:
 *                         type: number
 *                       aging120Plus:
 *                         type: number
 *                       collectionStatus:
 *                         type: string
 *                       priority:
 *                         type: string
 */
router.get('/accounts', collectionsCtrl.getPatientAccounts);

/**
 * @swagger
 * /api/v1/rcm/collections/payment-plans:
 *   get:
 *     summary: Get payment plans
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment plans retrieved successfully
 *   post:
 *     summary: Create payment plan
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - totalAmount
 *               - monthlyPayment
 *               - startDate
 *             properties:
 *               patientId:
 *                 type: integer
 *               totalAmount:
 *                 type: number
 *               monthlyPayment:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               autoPayEnabled:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment plan created successfully
 */
router.get('/payment-plans', collectionsCtrl.getPaymentPlans);
router.post('/payment-plans', collectionsCtrl.createPaymentPlan);

/**
 * @swagger
 * /api/v1/rcm/collections/payment-plans/{id}:
 *   put:
 *     summary: Update payment plan
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monthlyPayment:
 *                 type: number
 *               nextPaymentDate:
 *                 type: string
 *                 format: date
 *               autoPayEnabled:
 *                 type: boolean
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment plan updated successfully
 */
router.put('/payment-plans/:id', collectionsCtrl.updatePaymentPlan);

/**
 * @swagger
 * /api/v1/rcm/collections/activities:
 *   get:
 *     summary: Get collection activities
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *         description: Filter by patient ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: Collection activities retrieved successfully
 *   post:
 *     summary: Log collection activity
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - activityType
 *               - description
 *             properties:
 *               patientId:
 *                 type: integer
 *               activityType:
 *                 type: string
 *                 enum: [phone_call, email, letter, in_person, payment_received, payment_plan_setup]
 *               description:
 *                 type: string
 *               outcome:
 *                 type: string
 *               nextAction:
 *                 type: string
 *               nextActionDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Collection activity logged successfully
 */
router.get('/activities', collectionsCtrl.getCollectionActivities);
router.post('/activities', collectionsCtrl.logCollectionActivity);

/**
 * @swagger
 * /api/v1/rcm/collections/analytics:
 *   get:
 *     summary: Get collections analytics
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collections analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     aging:
 *                       type: object
 *                     performance:
 *                       type: array
 *                     paymentPlans:
 *                       type: array
 *                     recentActivity:
 *                       type: array
 */
router.get('/analytics', collectionsCtrl.getCollectionsAnalytics);

module.exports = router;