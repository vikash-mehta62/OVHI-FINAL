const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');

// Get CLIA certificates for an organization
const getCLIACertificates = async (req, res) => {
  let connection;
  
  try {
    const organizationId = req.query.organizationId || 1;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [certificates] = await connection.execute(`
      SELECT 
        id,
        clia_number,
        certificate_type,
        laboratory_name,
        laboratory_director,
        director_license_number,
        director_license_state,
        effective_date,
        expiry_date,
        status,
        laboratory_address,
        specialties,
        created_date,
        updated_date
      FROM organization_clia_certificates 
      WHERE organization_id = ?
      ORDER BY created_date DESC
    `, [organizationId]);
    
    res.json({
      success: true,
      data: certificates
    });
    
  } catch (error) {
    console.error('Error fetching CLIA certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CLIA certificates',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Add or update CLIA certificate
const saveCLIACertificate = async (req, res) => {
  let connection;
  
  try {
    const {
      id,
      clia_number,
      certificate_type,
      laboratory_name,
      laboratory_director,
      director_license_number,
      director_license_state,
      effective_date,
      expiry_date,
      status,
      laboratory_address,
      specialties,
      organization_id = 1
    } = req.body;
    
    // Validate CLIA number format
    if (!clia_number || clia_number.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'CLIA number must be 10 characters (format: 12D3456789)'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    // Validate CLIA number format using stored function
    const [validation] = await connection.execute(`
      SELECT ValidateCLIANumber(?) as is_valid
    `, [clia_number]);
    
    if (!validation[0].is_valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CLIA number format. Must be 2 digits + 1 letter + 7 digits (e.g., 12D3456789)'
      });
    }
    
    if (id) {
      // Update existing certificate
      const [result] = await connection.execute(`
        UPDATE organization_clia_certificates 
        SET 
          clia_number = ?,
          certificate_type = ?,
          laboratory_name = ?,
          laboratory_director = ?,
          director_license_number = ?,
          director_license_state = ?,
          effective_date = ?,
          expiry_date = ?,
          status = ?,
          laboratory_address = ?,
          specialties = ?,
          updated_date = NOW()
        WHERE id = ? AND organization_id = ?
      `, [
        clia_number,
        certificate_type,
        laboratory_name,
        laboratory_director,
        director_license_number,
        director_license_state,
        effective_date,
        expiry_date,
        status,
        laboratory_address,
        JSON.stringify(specialties),
        id,
        organization_id
      ]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'CLIA certificate not found'
        });
      }
    } else {
      // Insert new certificate
      await connection.execute(`
        INSERT INTO organization_clia_certificates (
          organization_id,
          clia_number,
          certificate_type,
          laboratory_name,
          laboratory_director,
          director_license_number,
          director_license_state,
          effective_date,
          expiry_date,
          status,
          laboratory_address,
          specialties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        organization_id,
        clia_number,
        certificate_type,
        laboratory_name,
        laboratory_director,
        director_license_number,
        director_license_state,
        effective_date,
        expiry_date,
        status,
        laboratory_address,
        JSON.stringify(specialties)
      ]);
    }
    
    res.json({
      success: true,
      message: 'CLIA certificate saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving CLIA certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save CLIA certificate',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get DEA registrations for a provider
const getDEARegistrations = async (req, res) => {
  let connection;
  
  try {
    const providerId = req.query.providerId;
    
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    const [registrations] = await connection.execute(`
      SELECT 
        id,
        dea_number,
        registration_type,
        schedule_authority,
        business_activity,
        expiry_date,
        status,
        registered_address,
        created_date,
        updated_date
      FROM provider_dea_registrations 
      WHERE provider_id = ?
      ORDER BY created_date DESC
    `, [providerId]);
    
    res.json({
      success: true,
      data: registrations
    });
    
  } catch (error) {
    console.error('Error fetching DEA registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DEA registrations',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Add or update DEA registration
const saveDEARegistration = async (req, res) => {
  let connection;
  
  try {
    const {
      id,
      provider_id,
      dea_number,
      registration_type,
      schedule_authority,
      business_activity,
      expiry_date,
      status,
      registered_address
    } = req.body;
    
    // Validate DEA number format
    if (!dea_number || dea_number.length !== 9) {
      return res.status(400).json({
        success: false,
        message: 'DEA number must be 9 characters (format: AB1234563)'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    // Validate DEA number format and checksum using stored function
    const [validation] = await connection.execute(`
      SELECT ValidateDEANumber(?) as is_valid
    `, [dea_number]);
    
    if (!validation[0].is_valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid DEA number format or checksum. Must be 2 letters + 7 digits with valid checksum'
      });
    }
    
    if (id) {
      // Update existing registration
      const [result] = await connection.execute(`
        UPDATE provider_dea_registrations 
        SET 
          dea_number = ?,
          registration_type = ?,
          schedule_authority = ?,
          business_activity = ?,
          expiry_date = ?,
          status = ?,
          registered_address = ?,
          updated_date = NOW()
        WHERE id = ? AND provider_id = ?
      `, [
        dea_number,
        registration_type,
        schedule_authority,
        business_activity,
        expiry_date,
        status,
        registered_address,
        id,
        provider_id
      ]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'DEA registration not found'
        });
      }
    } else {
      // Insert new registration
      await connection.execute(`
        INSERT INTO provider_dea_registrations (
          provider_id,
          dea_number,
          registration_type,
          schedule_authority,
          business_activity,
          expiry_date,
          status,
          registered_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        provider_id,
        dea_number,
        registration_type,
        schedule_authority,
        business_activity,
        expiry_date,
        status,
        registered_address
      ]);
    }
    
    res.json({
      success: true,
      message: 'DEA registration saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving DEA registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save DEA registration',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get state licenses for a provider
const getStateLicenses = async (req, res) => {
  let connection;
  
  try {
    const providerId = req.query.providerId;
    
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    const [licenses] = await connection.execute(`
      SELECT 
        id,
        state_code,
        license_number,
        license_type,
        issue_date,
        expiry_date,
        status,
        issuing_board,
        created_date,
        updated_date
      FROM provider_state_licenses 
      WHERE provider_id = ?
      ORDER BY state_code, created_date DESC
    `, [providerId]);
    
    res.json({
      success: true,
      data: licenses
    });
    
  } catch (error) {
    console.error('Error fetching state licenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch state licenses',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Add or update state license
const saveStateLicense = async (req, res) => {
  let connection;
  
  try {
    const {
      id,
      provider_id,
      state_code,
      license_number,
      license_type,
      issue_date,
      expiry_date,
      status,
      issuing_board
    } = req.body;
    
    if (!state_code || !license_number) {
      return res.status(400).json({
        success: false,
        message: 'State code and license number are required'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    if (id) {
      // Update existing license
      const [result] = await connection.execute(`
        UPDATE provider_state_licenses 
        SET 
          state_code = ?,
          license_number = ?,
          license_type = ?,
          issue_date = ?,
          expiry_date = ?,
          status = ?,
          issuing_board = ?,
          updated_date = NOW()
        WHERE id = ? AND provider_id = ?
      `, [
        state_code,
        license_number,
        license_type,
        issue_date,
        expiry_date,
        status,
        issuing_board,
        id,
        provider_id
      ]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'State license not found'
        });
      }
    } else {
      // Insert new license
      await connection.execute(`
        INSERT INTO provider_state_licenses (
          provider_id,
          state_code,
          license_number,
          license_type,
          issue_date,
          expiry_date,
          status,
          issuing_board
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        provider_id,
        state_code,
        license_number,
        license_type,
        issue_date,
        expiry_date,
        status,
        issuing_board
      ]);
    }
    
    res.json({
      success: true,
      message: 'State license saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving state license:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save state license',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get compliance alerts
const getComplianceAlerts = async (req, res) => {
  let connection;
  
  try {
    const { entityType, entityId, alertType, status = 'pending' } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT 
        id,
        alert_type,
        entity_type,
        entity_id,
        identifier,
        expiry_date,
        alert_date,
        days_before_expiry,
        status,
        message,
        created_date
      FROM regulatory_compliance_alerts 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }
    
    if (entityId) {
      query += ' AND entity_id = ?';
      params.push(entityId);
    }
    
    if (alertType) {
      query += ' AND alert_type = ?';
      params.push(alertType);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY alert_date ASC, days_before_expiry ASC';
    
    const [alerts] = await connection.execute(query, params);
    
    res.json({
      success: true,
      data: alerts
    });
    
  } catch (error) {
    console.error('Error fetching compliance alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance alerts',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Generate compliance alerts
const generateComplianceAlerts = async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Call stored procedure to generate alerts
    await connection.execute('CALL GenerateComplianceAlerts()');
    
    res.json({
      success: true,
      message: 'Compliance alerts generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating compliance alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance alerts',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Validate regulatory numbers
const validateRegulatoryNumber = async (req, res) => {
  let connection;
  
  try {
    const { type, number } = req.body;
    
    if (!type || !number) {
      return res.status(400).json({
        success: false,
        message: 'Type and number are required'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    let isValid = false;
    let message = '';
    
    if (type === 'clia') {
      const [result] = await connection.execute(`
        SELECT ValidateCLIANumber(?) as is_valid
      `, [number]);
      isValid = result[0].is_valid;
      message = isValid ? 'Valid CLIA number format' : 'Invalid CLIA number format. Must be 2 digits + 1 letter + 7 digits';
    } else if (type === 'dea') {
      const [result] = await connection.execute(`
        SELECT ValidateDEANumber(?) as is_valid
      `, [number]);
      isValid = result[0].is_valid;
      message = isValid ? 'Valid DEA number format and checksum' : 'Invalid DEA number format or checksum';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation type. Must be "clia" or "dea"'
      });
    }
    
    res.json({
      success: true,
      data: {
        isValid,
        message,
        number,
        type
      }
    });
    
  } catch (error) {
    console.error('Error validating regulatory number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate regulatory number',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = {
  getCLIACertificates,
  saveCLIACertificate,
  getDEARegistrations,
  saveDEARegistration,
  getStateLicenses,
  saveStateLicense,
  getComplianceAlerts,
  generateComplianceAlerts,
  validateRegulatoryNumber
};