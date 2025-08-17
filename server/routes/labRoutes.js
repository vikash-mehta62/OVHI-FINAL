const express = require('express');
const router = express.Router();
const labFacilityService = require('../services/labs/labFacilityService');
const labCompendiumService = require('../services/labs/labCompendiumService');
const labOrderService = require('../services/labs/labOrderService');
const abnService = require('../services/labs/abnService');
const digitalSignatureService = require('../services/labs/digitalSignatureService');

/**
 * Lab Integration API Routes
 * Handles lab facility management and compendium operations
 */

// ============================================================================
// LAB FACILITY ROUTES
// ============================================================================

/**
 * @swagger
 * /api/labs/facilities:
 *   get:
 *     summary: Get all lab facilities
 *     tags: [Lab Facilities]
 *     responses:
 *       200:
 *         description: List of lab facilities
 *       500:
 *         description: Server error
 */
router.get('/facilities', async (req, res) => {
    try {
        const facilities = await labFacilityService.getAllFacilities();
        res.json({
            success: true,
            data: facilities
        });
    } catch (error) {
        console.error('Error fetching lab facilities:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/facilities/{id}:
 *   get:
 *     summary: Get lab facility by ID
 *     tags: [Lab Facilities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lab facility details
 *       404:
 *         description: Facility not found
 *       500:
 *         description: Server error
 */
router.get('/facilities/:id', async (req, res) => {
    try {
        const facilityId = parseInt(req.params.id);
        const includeAuth = req.query.include_auth === 'true';
        
        const facility = await labFacilityService.getFacilityById(facilityId, includeAuth);
        res.json({
            success: true,
            data: facility
        });
    } catch (error) {
        console.error('Error fetching lab facility:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/facilities:
 *   post:
 *     summary: Create new lab facility
 *     tags: [Lab Facilities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - transport_type
 *             properties:
 *               name:
 *                 type: string
 *               transport_type:
 *                 type: string
 *                 enum: [fax, sftp, mllp, fhir]
 *               clia_number:
 *                 type: string
 *               endpoint_url:
 *                 type: string
 *               auth_config:
 *                 type: object
 *               contact_info:
 *                 type: object
 *     responses:
 *       201:
 *         description: Facility created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/facilities', async (req, res) => {
    try {
        const facility = await labFacilityService.createFacility(req.body);
        res.status(201).json({
            success: true,
            data: facility,
            message: 'Lab facility created successfully'
        });
    } catch (error) {
        console.error('Error creating lab facility:', error);
        const statusCode = error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/facilities/{id}:
 *   put:
 *     summary: Update lab facility
 *     tags: [Lab Facilities]
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
 *     responses:
 *       200:
 *         description: Facility updated successfully
 *       404:
 *         description: Facility not found
 *       500:
 *         description: Server error
 */
router.put('/facilities/:id', async (req, res) => {
    try {
        const facilityId = parseInt(req.params.id);
        const facility = await labFacilityService.updateFacility(facilityId, req.body);
        res.json({
            success: true,
            data: facility,
            message: 'Lab facility updated successfully'
        });
    } catch (error) {
        console.error('Error updating lab facility:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/facilities/{id}:
 *   delete:
 *     summary: Delete (deactivate) lab facility
 *     tags: [Lab Facilities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Facility deleted successfully
 *       404:
 *         description: Facility not found
 *       500:
 *         description: Server error
 */
router.delete('/facilities/:id', async (req, res) => {
    try {
        const facilityId = parseInt(req.params.id);
        await labFacilityService.deleteFacility(facilityId);
        res.json({
            success: true,
            message: 'Lab facility deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting lab facility:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/facilities/{id}/test-connection:
 *   post:
 *     summary: Test facility connection
 *     tags: [Lab Facilities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Connection test result
 *       500:
 *         description: Server error
 */
router.post('/facilities/:id/test-connection', async (req, res) => {
    try {
        const facilityId = parseInt(req.params.id);
        const testResult = await labFacilityService.testFacilityConnection(facilityId);
        res.json({
            success: true,
            data: testResult
        });
    } catch (error) {
        console.error('Error testing facility connection:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/facilities/transport/{type}:
 *   get:
 *     summary: Get facilities by transport type
 *     tags: [Lab Facilities]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fax, sftp, mllp, fhir]
 *     responses:
 *       200:
 *         description: Filtered facilities
 *       500:
 *         description: Server error
 */
router.get('/facilities/transport/:type', async (req, res) => {
    try {
        const transportType = req.params.type;
        const facilities = await labFacilityService.getFacilitiesByTransportType(transportType);
        res.json({
            success: true,
            data: facilities
        });
    } catch (error) {
        console.error('Error fetching facilities by transport type:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// LAB COMPENDIUM ROUTES
// ============================================================================

/**
 * @swagger
 * /api/labs/{labId}/compendium:
 *   get:
 *     summary: Get lab compendium for facility
 *     tags: [Lab Compendium]
 *     parameters:
 *       - in: path
 *         name: labId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: specimen_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lab compendium data
 *       404:
 *         description: Lab facility not found
 *       500:
 *         description: Server error
 */
router.get('/:labId/compendium', async (req, res) => {
    try {
        const labId = parseInt(req.params.labId);
        const filters = {
            search: req.query.search,
            specimen_type: req.query.specimen_type,
            loinc_code: req.query.loinc_code,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };

        const compendium = await labCompendiumService.getCompendiumByFacility(labId, filters);
        res.json(compendium);
    } catch (error) {
        console.error('Error fetching lab compendium:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/compendium/{id}:
 *   get:
 *     summary: Get compendium item by ID
 *     tags: [Lab Compendium]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compendium item details
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.get('/compendium/:id', async (req, res) => {
    try {
        const compendiumId = parseInt(req.params.id);
        const item = await labCompendiumService.getCompendiumItemById(compendiumId);
        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error fetching compendium item:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/compendium:
 *   post:
 *     summary: Create new compendium item
 *     tags: [Lab Compendium]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lab_facility_id
 *               - lab_test_code
 *               - display_name
 *             properties:
 *               lab_facility_id:
 *                 type: integer
 *               lab_test_code:
 *                 type: string
 *               display_name:
 *                 type: string
 *               loinc_code:
 *                 type: string
 *               specimen_type:
 *                 type: string
 *               units:
 *                 type: string
 *               reference_range:
 *                 type: string
 *               collection_instructions:
 *                 type: string
 *               patient_prep_instructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Compendium item created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/compendium', async (req, res) => {
    try {
        const item = await labCompendiumService.createCompendiumItem(req.body);
        res.status(201).json({
            success: true,
            data: item,
            message: 'Compendium item created successfully'
        });
    } catch (error) {
        console.error('Error creating compendium item:', error);
        const statusCode = error.message.includes('required') || 
                          error.message.includes('Invalid') || 
                          error.message.includes('already exists') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/compendium/{id}:
 *   put:
 *     summary: Update compendium item
 *     tags: [Lab Compendium]
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
 *     responses:
 *       200:
 *         description: Compendium item updated successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.put('/compendium/:id', async (req, res) => {
    try {
        const compendiumId = parseInt(req.params.id);
        const item = await labCompendiumService.updateCompendiumItem(compendiumId, req.body);
        res.json({
            success: true,
            data: item,
            message: 'Compendium item updated successfully'
        });
    } catch (error) {
        console.error('Error updating compendium item:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/compendium/{id}:
 *   delete:
 *     summary: Delete (deactivate) compendium item
 *     tags: [Lab Compendium]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compendium item deleted successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.delete('/compendium/:id', async (req, res) => {
    try {
        const compendiumId = parseInt(req.params.id);
        await labCompendiumService.deleteCompendiumItem(compendiumId);
        res.json({
            success: true,
            message: 'Compendium item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting compendium item:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/compendium/search:
 *   get:
 *     summary: Search compendium across all facilities
 *     tags: [Lab Compendium]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: facility_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: transport_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: specimen_type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing search term
 *       500:
 *         description: Server error
 */
router.get('/compendium/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const filters = {
            facility_id: req.query.facility_id ? parseInt(req.query.facility_id) : undefined,
            transport_type: req.query.transport_type,
            specimen_type: req.query.specimen_type
        };

        const results = await labCompendiumService.searchCompendium(searchTerm, filters);
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error searching compendium:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/compendium/specimen-types:
 *   get:
 *     summary: Get unique specimen types
 *     tags: [Lab Compendium]
 *     responses:
 *       200:
 *         description: List of specimen types
 *       500:
 *         description: Server error
 */
router.get('/compendium/specimen-types', async (req, res) => {
    try {
        const specimenTypes = await labCompendiumService.getSpecimenTypes();
        res.json({
            success: true,
            data: specimenTypes
        });
    } catch (error) {
        console.error('Error fetching specimen types:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/{labId}/compendium/bulk-import:
 *   post:
 *     summary: Bulk import compendium items
 *     tags: [Lab Compendium]
 *     parameters:
 *       - in: path
 *         name: labId
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
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bulk import results
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/:labId/compendium/bulk-import', async (req, res) => {
    try {
        const labId = parseInt(req.params.labId);
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required and must not be empty'
            });
        }

        const results = await labCompendiumService.bulkImportCompendium(labId, items);
        res.json({
            success: true,
            data: results,
            message: `Bulk import completed: ${results.imported} imported, ${results.skipped} skipped`
        });
    } catch (error) {
        console.error('Error bulk importing compendium:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// LAB ORDER ROUTES
// ============================================================================

/**
 * @swagger
 * /api/lab-orders:
 *   post:
 *     summary: Create new lab order
 *     tags: [Lab Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - lab_facility_id
 *               - requester_provider_id
 *               - tests
 *             properties:
 *               patient_id:
 *                 type: integer
 *               encounter_id:
 *                 type: integer
 *               lab_facility_id:
 *                 type: integer
 *               requester_provider_id:
 *                 type: integer
 *               tests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     compendium_id:
 *                       type: integer
 *                     test_notes:
 *                       type: string
 *               icd10_codes:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         code:
 *                           type: string
 *                         description:
 *                           type: string
 *               priority:
 *                 type: string
 *                 enum: [routine, urgent, stat]
 *               clinical_notes:
 *                 type: string
 *               collection_datetime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Lab order created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/orders', async (req, res) => {
    try {
        const order = await labOrderService.createOrder(req.body);
        res.status(201).json({
            success: true,
            data: order,
            message: 'Lab order created successfully'
        });
    } catch (error) {
        console.error('Error creating lab order:', error);
        const statusCode = error.message.includes('required') || 
                          error.message.includes('Invalid') || 
                          error.message.includes('not found') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}:
 *   get:
 *     summary: Get lab order by ID
 *     tags: [Lab Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lab order details
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/orders/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await labOrderService.getOrderById(orderId);
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching lab order:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}:
 *   put:
 *     summary: Update lab order
 *     tags: [Lab Orders]
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
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.put('/orders/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await labOrderService.updateOrder(orderId, req.body);
        res.json({
            success: true,
            data: order,
            message: 'Lab order updated successfully'
        });
    } catch (error) {
        console.error('Error updating lab order:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}/status:
 *   put:
 *     summary: Update lab order status
 *     tags: [Lab Orders]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, signed, sent, ack, in_progress, partial, final, corrected, canceled]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.put('/orders/:id/status', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const order = await labOrderService.updateOrderStatus(orderId, status, req.body);
        res.json({
            success: true,
            data: order,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}/cancel:
 *   post:
 *     summary: Cancel lab order
 *     tags: [Lab Orders]
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               canceled_by:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Order canceled successfully
 *       400:
 *         description: Cannot cancel order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/orders/:id/cancel', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { reason, canceled_by } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        const order = await labOrderService.cancelOrder(orderId, reason, canceled_by);
        res.json({
            success: true,
            data: order,
            message: 'Lab order canceled successfully'
        });
    } catch (error) {
        console.error('Error canceling lab order:', error);
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('Cannot cancel') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}/timeline:
 *   get:
 *     summary: Get lab order timeline/events
 *     tags: [Lab Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order timeline
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/orders/:id/timeline', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const timeline = await labOrderService.getOrderTimeline(orderId);
        res.json({
            success: true,
            data: timeline
        });
    } catch (error) {
        console.error('Error fetching order timeline:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/patient/{patientId}:
 *   get:
 *     summary: Get orders for a patient
 *     tags: [Lab Orders]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: lab_facility_id
 *         schema:
 *           type: integer
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
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Patient orders
 *       500:
 *         description: Server error
 */
router.get('/orders/patient/:patientId', async (req, res) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const filters = {
            status: req.query.status,
            lab_facility_id: req.query.lab_facility_id ? parseInt(req.query.lab_facility_id) : undefined,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };

        const orders = await labOrderService.getOrdersByPatient(patientId, filters);
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching patient orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/provider/{providerId}:
 *   get:
 *     summary: Get orders for a provider
 *     tags: [Lab Orders]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Provider orders
 *       500:
 *         description: Server error
 */
router.get('/orders/provider/:providerId', async (req, res) => {
    try {
        const providerId = parseInt(req.params.providerId);
        const filters = {
            status: req.query.status,
            lab_facility_id: req.query.lab_facility_id ? parseInt(req.query.lab_facility_id) : undefined,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };

        const orders = await labOrderService.getOrdersByProvider(providerId, filters);
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching provider orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// ABN (ADVANCE BENEFICIARY NOTICE) ROUTES
// ============================================================================

/**
 * @swagger
 * /api/lab-orders/{id}/abn/check:
 *   post:
 *     summary: Check ABN requirement for order
 *     tags: [ABN]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ABN requirement details
 *       500:
 *         description: Server error
 */
router.post('/orders/:id/abn/check', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        // Get order details first
        const order = await labOrderService.getOrderById(orderId);
        
        // Check ABN requirement
        const abnRequirement = await abnService.checkABNRequirement(
            order.patient_id,
            order.tests,
            order.lab_facility_id
        );

        res.json({
            success: true,
            data: abnRequirement
        });
    } catch (error) {
        console.error('Error checking ABN requirement:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}/abn/form:
 *   get:
 *     summary: Generate ABN form for order
 *     tags: [ABN]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ABN form data
 *       500:
 *         description: Server error
 */
router.get('/orders/:id/abn/form', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        // Get order details
        const order = await labOrderService.getOrderById(orderId);
        
        // Check ABN requirement
        const abnRequirement = await abnService.checkABNRequirement(
            order.patient_id,
            order.tests,
            order.lab_facility_id
        );

        if (!abnRequirement.abnRequired) {
            return res.status(400).json({
                success: false,
                message: 'ABN is not required for this order'
            });
        }

        // Generate ABN form
        const abnForm = await abnService.generateABNForm(orderId, abnRequirement);

        res.json({
            success: true,
            data: abnForm
        });
    } catch (error) {
        console.error('Error generating ABN form:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}/abn/sign:
 *   post:
 *     summary: Process ABN signature
 *     tags: [ABN]
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
 *             required:
 *               - signature
 *               - selectedOption
 *               - patientName
 *             properties:
 *               signature:
 *                 type: string
 *                 description: Base64 encoded signature image
 *               selectedOption:
 *                 type: string
 *                 enum: [A, B]
 *               patientName:
 *                 type: string
 *     responses:
 *       200:
 *         description: ABN signature processed
 *       400:
 *         description: Invalid signature data
 *       500:
 *         description: Server error
 */
router.post('/orders/:id/abn/sign', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        // Add request metadata to signature data
        const signatureData = {
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await abnService.processABNSignature(orderId, signatureData);

        res.json({
            success: true,
            data: result,
            message: 'ABN signature processed successfully'
        });
    } catch (error) {
        console.error('Error processing ABN signature:', error);
        const statusCode = error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/lab-orders/{id}/abn/status:
 *   get:
 *     summary: Get ABN status for order
 *     tags: [ABN]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ABN status
 *       500:
 *         description: Server error
 */
router.get('/orders/:id/abn/status', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const abnStatus = await abnService.getABNStatus(orderId);

        res.json({
            success: true,
            data: abnStatus
        });
    } catch (error) {
        console.error('Error getting ABN status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// DIGITAL SIGNATURE ROUTES
// ============================================================================

/**
 * @swagger
 * /api/labs/auth/provider:
 *   post:
 *     summary: Authenticate provider for signing
 *     tags: [Digital Signature]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_id
 *               - password
 *             properties:
 *               provider_id:
 *                 type: integer
 *               password:
 *                 type: string
 *                 description: Provider password or PIN
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Authentication failed
 *       429:
 *         description: Too many failed attempts
 *       500:
 *         description: Server error
 */
router.post('/auth/provider', async (req, res) => {
    try {
        const { provider_id, password } = req.body;
        
        if (!provider_id || !password) {
            return res.status(400).json({
                success: false,
                message: 'Provider ID and password are required'
            });
        }

        const authResult = await digitalSignatureService.authenticateProvider(
            provider_id,
            password,
            req.ip
        );

        res.json({
            success: true,
            data: authResult,
            message: 'Provider authenticated successfully'
        });
    } catch (error) {
        console.error('Error authenticating provider:', error);
        const statusCode = error.message.includes('Too many failed attempts') ? 429 :
                          error.message.includes('Invalid credentials') || 
                          error.message.includes('not found') ? 401 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/orders/{id}/sign:
 *   post:
 *     summary: Sign lab order with digital signature
 *     tags: [Digital Signature]
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
 *             required:
 *               - auth_token
 *               - signature
 *               - provider_id
 *             properties:
 *               auth_token:
 *                 type: string
 *                 description: Authentication token from provider auth
 *               signature:
 *                 type: string
 *                 description: Base64 encoded signature image
 *               provider_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Order signed successfully
 *       400:
 *         description: Invalid signature data or order cannot be signed
 *       401:
 *         description: Invalid or expired authentication token
 *       403:
 *         description: Provider not authorized to sign this order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/orders/:id/sign', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        // Add request metadata to signature data
        const signatureData = {
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await digitalSignatureService.signLabOrder(orderId, signatureData);

        res.json({
            success: true,
            data: result,
            message: 'Lab order signed successfully'
        });
    } catch (error) {
        console.error('Error signing lab order:', error);
        const statusCode = error.message.includes('not found') ? 404 :
                          error.message.includes('Invalid or expired') ? 401 :
                          error.message.includes('Only the requesting provider') ? 403 :
                          error.message.includes('Cannot sign') || 
                          error.message.includes('incomplete') ||
                          error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/orders/{id}/signature/verify:
 *   get:
 *     summary: Verify signature integrity for order
 *     tags: [Digital Signature]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Signature verification result
 *       500:
 *         description: Server error
 */
router.get('/orders/:id/signature/verify', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const verificationResult = await digitalSignatureService.verifySignature(orderId);

        res.json({
            success: true,
            data: verificationResult
        });
    } catch (error) {
        console.error('Error verifying signature:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/orders/{id}/signature/status:
 *   get:
 *     summary: Get signature status for order
 *     tags: [Digital Signature]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Signature status
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/orders/:id/signature/status', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const signatureStatus = await digitalSignatureService.getSignatureStatus(orderId);

        res.json({
            success: true,
            data: signatureStatus
        });
    } catch (error) {
        console.error('Error getting signature status:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/labs/orders/bulk-sign:
 *   post:
 *     summary: Bulk sign multiple orders
 *     tags: [Digital Signature]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_ids
 *               - auth_token
 *               - signature
 *               - provider_id
 *             properties:
 *               order_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 maxItems: 10
 *               auth_token:
 *                 type: string
 *               signature:
 *                 type: string
 *               provider_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Bulk signing results
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 */
router.post('/orders/bulk-sign', async (req, res) => {
    try {
        const { order_ids } = req.body;
        
        if (!Array.isArray(order_ids) || order_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs array is required'
            });
        }

        // Add request metadata to signature data
        const signatureData = {
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const results = await digitalSignatureService.bulkSignOrders(order_ids, signatureData);

        res.json({
            success: true,
            data: results,
            message: `Bulk signing completed: ${results.signed} signed, ${results.failed} failed`
        });
    } catch (error) {
        console.error('Error bulk signing orders:', error);
        const statusCode = error.message.includes('Invalid or expired') ? 401 :
                          error.message.includes('required') || 
                          error.message.includes('Maximum') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;