const express = require('express');
const router = express.Router();
const servicesService = require('../services/services/servicesService');
const { authenticateToken } = require('../middleware/auth');

// Get all services
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await servicesService.getAllServices();
    res.json(result);
  } catch (error) {
    console.error('Error in GET /services:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get service by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await servicesService.getServiceById(id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in GET /services/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new service
router.post('/', authenticateToken, async (req, res) => {
  try {
    const serviceData = req.body;
    
    // Validate required fields
    const requiredFields = ['service_name', 'service_code', 'unit_price'];
    const missingFields = requiredFields.filter(field => !serviceData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const result = await servicesService.createService(serviceData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in POST /services:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update service
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const serviceData = req.body;
    
    // Validate required fields
    const requiredFields = ['service_name', 'service_code', 'unit_price'];
    const missingFields = requiredFields.filter(field => !serviceData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const result = await servicesService.updateService(id, serviceData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in PUT /services/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete service
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await servicesService.deleteService(id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /services/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});



module.exports = router;