const pool = require('../../config/db');
const axios = require('axios');
const hl7 = require('simple-hl7');

class EHRIntegrationService {
  constructor() {
    this.supportedEHRs = ['epic', 'cerner', 'allscripts', 'athenahealth', 'nextgen'];
    this.fhirBaseUrl = process.env.FHIR_BASE_URL || 'http://localhost:8080/fhir';
    this.hl7Processor = new HL7Processor();
  }

  /**
   * Configure EHR integration
   */
  async configureEHRIntegration(providerId, ehrConfig) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        INSERT INTO ehr_integrations (
          provider_id, ehr_system, endpoint_url, client_id, client_secret,
          api_version, authentication_type, configuration_data, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          endpoint_url = VALUES(endpoint_url),
          client_id = VALUES(client_id),
          client_secret = VALUES(client_secret),
          api_version = VALUES(api_version),
          authentication_type = VALUES(authentication_type),
          configuration_data = VALUES(configuration_data),
          updated_at = NOW()
      `, [
        providerId,
        ehrConfig.ehr_system,
        ehrConfig.endpoint_url,
        ehrConfig.client_id,
        ehrConfig.client_secret,
        ehrConfig.api_version || 'R4',
        ehrConfig.authentication_type || 'oauth2',
        JSON.stringify(ehrConfig.additional_config || {})
      ]);
      
      // Test the connection
      const testResult = await this.testEHRConnection(providerId, ehrConfig.ehr_system);
      
      return {
        success: true,
        integration_id: result.insertId,
        connection_test: testResult
      };
    } catch (error) {
      console.error('Error configuring EHR integration:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Test EHR connection
   */
  async testEHRConnection(providerId, ehrSystem) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [configs] = await connection.query(`
        SELECT * FROM ehr_integrations 
        WHERE provider_id = ? AND ehr_system = ? AND is_active = TRUE
      `, [providerId, ehrSystem]);
      
      if (configs.length === 0) {
        throw new Error('EHR integration not configured');
      }
      
      const config = configs[0];
      
      // Test connection based on EHR system
      let testResult;
      switch (ehrSystem.toLowerCase()) {
        case 'epic':
          testResult = await this.testEpicConnection(config);
          break;
        case 'cerner':
          testResult = await this.testCernerConnection(config);
          break;
        case 'fhir':
          testResult = await this.testFHIRConnection(config);
          break;
        default:
          testResult = await this.testGenericFHIRConnection(config);
      }
      
      // Update test status
      await connection.query(`
        UPDATE ehr_integrations 
        SET last_test_date = NOW(), test_status = ?, test_result = ?
        WHERE id = ?
      `, [
        testResult.success ? 'success' : 'failed',
        JSON.stringify(testResult),
        config.id
      ]);
      
      return testResult;
    } catch (error) {
      console.error('Error testing EHR connection:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Sync telehealth session to EHR
   */
  async syncSessionToEHR(sessionId, ehrSystem) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get session data
      const [sessions] = await connection.query(`
        SELECT ts.*, p.firstname, p.lastname, p.dob, p.gender, p.work_email
        FROM telehealth_sessions ts
        JOIN user_profiles p ON ts.patient_id = p.fk_userid
        WHERE ts.id = ?
      `, [sessionId]);
      
      if (sessions.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessions[0];
      
      // Get EHR configuration
      const [configs] = await connection.query(`
        SELECT * FROM ehr_integrations 
        WHERE provider_id = ? AND ehr_system = ? AND is_active = TRUE
      `, [session.provider_id, ehrSystem]);
      
      if (configs.length === 0) {
        throw new Error('EHR integration not configured');
      }
      
      const config = configs[0];
      
      // Create FHIR Encounter resource
      const fhirEncounter = this.createFHIREncounter(session);
      
      // Sync to EHR
      const syncResult = await this.sendToEHR(config, fhirEncounter, 'Encounter');
      
      // Log sync result
      await connection.query(`
        INSERT INTO ehr_sync_log (
          session_id, ehr_system, sync_type, sync_status, 
          ehr_resource_id, sync_data, error_message, synced_at
        ) VALUES (?, ?, 'encounter', ?, ?, ?, ?, NOW())
      `, [
        sessionId,
        ehrSystem,
        syncResult.success ? 'success' : 'failed',
        syncResult.resource_id || null,
        JSON.stringify(syncResult.data || {}),
        syncResult.error || null
      ]);
      
      return syncResult;
    } catch (error) {
      console.error('Error syncing session to EHR:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Create FHIR Encounter resource from telehealth session
   */
  createFHIREncounter(session) {
    return {
      resourceType: 'Encounter',
      id: `telehealth-${session.session_id}`,
      status: this.mapSessionStatusToFHIR(session.session_status),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'VR',
        display: 'virtual'
      },
      type: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '185317003',
          display: 'Telemedicine consultation'
        }]
      }],
      subject: {
        reference: `Patient/${session.patient_id}`,
        display: `${session.firstname} ${session.lastname}`
      },
      participant: [{
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
            code: 'PPRF',
            display: 'primary performer'
          }]
        }],
        individual: {
          reference: `Practitioner/${session.provider_id}`
        }
      }],
      period: {
        start: session.actual_start_time,
        end: session.end_time
      },
      reasonCode: session.chief_complaint ? [{
        text: session.chief_complaint
      }] : undefined,
      location: [{
        location: {
          reference: 'Location/telehealth-virtual',
          display: 'Virtual Telehealth Location'
        }
      }],
      serviceProvider: {
        reference: `Organization/${session.provider_id}`
      }
    };
  }

  /**
   * Retrieve patient data from EHR
   */
  async getPatientFromEHR(patientId, ehrSystem) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get EHR configuration
      const [configs] = await connection.query(`
        SELECT * FROM ehr_integrations 
        WHERE ehr_system = ? AND is_active = TRUE
        LIMIT 1
      `, [ehrSystem]);
      
      if (configs.length === 0) {
        throw new Error('EHR integration not configured');
      }
      
      const config = configs[0];
      
      // Retrieve patient data
      const patientData = await this.retrieveFromEHR(config, `Patient/${patientId}`);
      
      return this.mapFHIRPatientToLocal(patientData);
    } catch (error) {
      console.error('Error retrieving patient from EHR:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Send data to EHR system
   */
  async sendToEHR(config, resource, resourceType) {
    try {
      const accessToken = await this.getEHRAccessToken(config);
      
      const response = await axios.post(
        `${config.endpoint_url}/${resourceType}`,
        resource,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json'
          }
        }
      );
      
      return {
        success: true,
        resource_id: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending to EHR:', error);
      return {
        success: false,
        error: error.message,
        data: error.response?.data
      };
    }
  }

  /**
   * Retrieve data from EHR system
   */
  async retrieveFromEHR(config, resourcePath) {
    try {
      const accessToken = await this.getEHRAccessToken(config);
      
      const response = await axios.get(
        `${config.endpoint_url}/${resourcePath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/fhir+json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error retrieving from EHR:', error);
      throw error;
    }
  }

  /**
   * Get access token for EHR system
   */
  async getEHRAccessToken(config) {
    try {
      if (config.authentication_type === 'oauth2') {
        const response = await axios.post(config.token_endpoint || `${config.endpoint_url}/oauth2/token`, {
          grant_type: 'client_credentials',
          client_id: config.client_id,
          client_secret: config.client_secret,
          scope: 'system/*.read system/*.write'
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        return response.data.access_token;
      } else if (config.authentication_type === 'api_key') {
        return config.api_key;
      }
      
      throw new Error('Unsupported authentication type');
    } catch (error) {
      console.error('Error getting EHR access token:', error);
      throw error;
    }
  }

  /**
   * Configure medical device integration
   */
  async configureMedicalDevice(providerId, deviceConfig) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        INSERT INTO medical_device_integrations (
          provider_id, device_type, device_name, manufacturer,
          model, serial_number, api_endpoint, authentication_data,
          data_format, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [
        providerId,
        deviceConfig.device_type,
        deviceConfig.device_name,
        deviceConfig.manufacturer,
        deviceConfig.model,
        deviceConfig.serial_number,
        deviceConfig.api_endpoint,
        JSON.stringify(deviceConfig.authentication_data || {}),
        deviceConfig.data_format || 'json'
      ]);
      
      return {
        success: true,
        device_integration_id: result.insertId
      };
    } catch (error) {
      console.error('Error configuring medical device:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Receive data from medical device
   */
  async receiveDeviceData(deviceId, sessionId, deviceData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Validate device
      const [devices] = await connection.query(`
        SELECT * FROM medical_device_integrations 
        WHERE id = ? AND is_active = TRUE
      `, [deviceId]);
      
      if (devices.length === 0) {
        throw new Error('Device not found or inactive');
      }
      
      const device = devices[0];
      
      // Process and store device data
      const processedData = await this.processDeviceData(device, deviceData);
      
      // Store in database
      await connection.query(`
        INSERT INTO device_readings (
          device_id, session_id, reading_type, reading_value,
          unit_of_measure, reading_timestamp, raw_data, processed_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        deviceId,
        sessionId,
        processedData.reading_type,
        processedData.value,
        processedData.unit,
        processedData.timestamp || new Date(),
        JSON.stringify(deviceData),
        JSON.stringify(processedData)
      ]);
      
      // Check for alerts
      const alerts = await this.checkDeviceAlerts(processedData, sessionId);
      
      return {
        success: true,
        processed_data: processedData,
        alerts: alerts
      };
    } catch (error) {
      console.error('Error receiving device data:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Process raw device data
   */
  async processDeviceData(device, rawData) {
    const processed = {
      device_type: device.device_type,
      timestamp: new Date(),
      readings: []
    };
    
    switch (device.device_type) {
      case 'blood_pressure_monitor':
        processed.readings.push({
          reading_type: 'systolic_bp',
          value: rawData.systolic,
          unit: 'mmHg'
        });
        processed.readings.push({
          reading_type: 'diastolic_bp',
          value: rawData.diastolic,
          unit: 'mmHg'
        });
        break;
        
      case 'pulse_oximeter':
        processed.readings.push({
          reading_type: 'oxygen_saturation',
          value: rawData.spo2,
          unit: '%'
        });
        processed.readings.push({
          reading_type: 'heart_rate',
          value: rawData.heart_rate,
          unit: 'bpm'
        });
        break;
        
      case 'digital_stethoscope':
        processed.readings.push({
          reading_type: 'heart_sounds',
          value: rawData.audio_file_url,
          unit: 'audio'
        });
        break;
        
      case 'digital_thermometer':
        processed.readings.push({
          reading_type: 'body_temperature',
          value: rawData.temperature,
          unit: rawData.unit || 'F'
        });
        break;
        
      default:
        processed.readings.push({
          reading_type: 'generic',
          value: rawData.value,
          unit: rawData.unit || 'unknown'
        });
    }
    
    return processed;
  }

  /**
   * Check for device reading alerts
   */
  async checkDeviceAlerts(processedData, sessionId) {
    const alerts = [];
    
    for (const reading of processedData.readings) {
      switch (reading.reading_type) {
        case 'systolic_bp':
          if (reading.value > 180) {
            alerts.push({
              type: 'critical',
              message: 'Hypertensive crisis - Systolic BP > 180 mmHg',
              action_required: 'Immediate medical attention'
            });
          } else if (reading.value > 140) {
            alerts.push({
              type: 'warning',
              message: 'Elevated blood pressure',
              action_required: 'Monitor closely'
            });
          }
          break;
          
        case 'oxygen_saturation':
          if (reading.value < 90) {
            alerts.push({
              type: 'critical',
              message: 'Severe hypoxemia - SpO2 < 90%',
              action_required: 'Immediate oxygen therapy consideration'
            });
          } else if (reading.value < 95) {
            alerts.push({
              type: 'warning',
              message: 'Mild hypoxemia',
              action_required: 'Monitor respiratory status'
            });
          }
          break;
          
        case 'heart_rate':
          if (reading.value > 100) {
            alerts.push({
              type: 'warning',
              message: 'Tachycardia detected',
              action_required: 'Assess for underlying causes'
            });
          } else if (reading.value < 60) {
            alerts.push({
              type: 'warning',
              message: 'Bradycardia detected',
              action_required: 'Assess for underlying causes'
            });
          }
          break;
      }
    }
    
    return alerts;
  }

  /**
   * Map FHIR patient to local format
   */
  mapFHIRPatientToLocal(fhirPatient) {
    return {
      patient_id: fhirPatient.id,
      firstname: fhirPatient.name?.[0]?.given?.[0],
      lastname: fhirPatient.name?.[0]?.family,
      dob: fhirPatient.birthDate,
      gender: fhirPatient.gender,
      email: fhirPatient.telecom?.find(t => t.system === 'email')?.value,
      phone: fhirPatient.telecom?.find(t => t.system === 'phone')?.value,
      address: fhirPatient.address?.[0]
    };
  }

  /**
   * Map session status to FHIR encounter status
   */
  mapSessionStatusToFHIR(sessionStatus) {
    const statusMap = {
      'scheduled': 'planned',
      'waiting': 'arrived',
      'in_progress': 'in-progress',
      'completed': 'finished',
      'cancelled': 'cancelled',
      'no_show': 'cancelled'
    };
    
    return statusMap[sessionStatus] || 'unknown';
  }

  /**
   * Test Epic connection
   */
  async testEpicConnection(config) {
    try {
      const response = await axios.get(`${config.endpoint_url}/metadata`, {
        headers: {
          'Accept': 'application/fhir+json'
        }
      });
      
      return {
        success: true,
        message: 'Epic connection successful',
        fhir_version: response.data.fhirVersion
      };
    } catch (error) {
      return {
        success: false,
        message: 'Epic connection failed',
        error: error.message
      };
    }
  }

  /**
   * Test Cerner connection
   */
  async testCernerConnection(config) {
    try {
      const response = await axios.get(`${config.endpoint_url}/metadata`, {
        headers: {
          'Accept': 'application/fhir+json'
        }
      });
      
      return {
        success: true,
        message: 'Cerner connection successful',
        fhir_version: response.data.fhirVersion
      };
    } catch (error) {
      return {
        success: false,
        message: 'Cerner connection failed',
        error: error.message
      };
    }
  }

  /**
   * Test generic FHIR connection
   */
  async testGenericFHIRConnection(config) {
    try {
      const response = await axios.get(`${config.endpoint_url}/metadata`, {
        headers: {
          'Accept': 'application/fhir+json'
        }
      });
      
      return {
        success: true,
        message: 'FHIR connection successful',
        fhir_version: response.data.fhirVersion
      };
    } catch (error) {
      return {
        success: false,
        message: 'FHIR connection failed',
        error: error.message
      };
    }
  }
}

/**
 * HL7 Message Processor
 */
class HL7Processor {
  /**
   * Process incoming HL7 message
   */
  processHL7Message(hl7Message) {
    try {
      const message = hl7.parse(hl7Message);
      
      const messageType = message.header.messageType;
      
      switch (messageType) {
        case 'ADT^A08': // Update patient information
          return this.processPatientUpdate(message);
        case 'ORU^R01': // Lab results
          return this.processLabResults(message);
        case 'MDM^T02': // Medical document management
          return this.processDocument(message);
        default:
          return { success: false, error: 'Unsupported message type' };
      }
    } catch (error) {
      console.error('Error processing HL7 message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process patient update message
   */
  processPatientUpdate(message) {
    const pid = message.segments.find(s => s.name === 'PID');
    
    return {
      success: true,
      type: 'patient_update',
      data: {
        patient_id: pid.fields[3],
        name: pid.fields[5],
        dob: pid.fields[7],
        gender: pid.fields[8]
      }
    };
  }

  /**
   * Process lab results message
   */
  processLabResults(message) {
    const obx = message.segments.filter(s => s.name === 'OBX');
    
    const results = obx.map(segment => ({
      test_name: segment.fields[3],
      value: segment.fields[5],
      unit: segment.fields[6],
      reference_range: segment.fields[7],
      status: segment.fields[11]
    }));
    
    return {
      success: true,
      type: 'lab_results',
      data: { results }
    };
  }

  /**
   * Process document message
   */
  processDocument(message) {
    const txa = message.segments.find(s => s.name === 'TXA');
    
    return {
      success: true,
      type: 'document',
      data: {
        document_type: txa.fields[2],
        document_id: txa.fields[12],
        status: txa.fields[19]
      }
    };
  }
}

module.exports = new EHRIntegrationService();