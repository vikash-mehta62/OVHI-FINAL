const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

// Get RPM dashboard data
const getRPMDashboard = async (req, res) => {
  try {
    const providerId = req.headers['userid'];

    // Get RPM patients for this provider
    const patients = await db.query(`
      SELECT 
        up.user_id,
        up.first_name,
        up.last_name,
        up.date_of_birth,
        COUNT(rd.id) as device_count,
        MAX(rr.reading_timestamp) as last_reading,
        COUNT(CASE WHEN ra.severity = 'high' OR ra.severity = 'critical' THEN 1 END) as active_alerts
      FROM user_profiles up
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      LEFT JOIN rpm_devices rd ON up.user_id = rd.patient_id AND rd.status = 'active'
      LEFT JOIN rpm_readings rr ON rd.id = rr.device_id
      LEFT JOIN rpm_alerts ra ON up.user_id = ra.patient_id AND ra.status = 'active'
      WHERE rpe.provider_id = ? AND rpe.status = 'active'
      GROUP BY up.user_id
      ORDER BY last_reading DESC
    `, [providerId]);

    // Get device summary
    const deviceSummary = await db.query(`
      SELECT 
        rd.device_type,
        COUNT(*) as count,
        COUNT(CASE WHEN rd.status = 'active' THEN 1 END) as active_count
      FROM rpm_devices rd
      INNER JOIN rpm_patient_enrollments rpe ON rd.patient_id = rpe.patient_id
      WHERE rpe.provider_id = ?
      GROUP BY rd.device_type
    `, [providerId]);

    // Get recent readings
    const recentReadings = await db.query(`
      SELECT 
        rr.*,
        rd.device_type,
        up.first_name,
        up.last_name
      FROM rpm_readings rr
      INNER JOIN rpm_devices rd ON rr.device_id = rd.id
      INNER JOIN user_profiles up ON rr.patient_id = up.user_id
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      WHERE rpe.provider_id = ?
      ORDER BY rr.reading_timestamp DESC
      LIMIT 20
    `, [providerId]);

    // Get active alerts
    const activeAlerts = await db.query(`
      SELECT 
        ra.*,
        up.first_name,
        up.last_name
      FROM rpm_alerts ra
      INNER JOIN user_profiles up ON ra.patient_id = up.user_id
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      WHERE rpe.provider_id = ? AND ra.status = 'active'
      ORDER BY ra.created_at DESC
      LIMIT 10
    `, [providerId]);

    // Calculate metrics
    const totalPatients = patients.length;
    const activeDevices = deviceSummary.reduce((sum, device) => sum + device.active_count, 0);
    const totalAlerts = activeAlerts.length;
    const patientsWithRecentReadings = patients.filter(p => {
      const lastReading = new Date(p.last_reading);
      const daysSinceReading = (Date.now() - lastReading.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceReading <= 7;
    }).length;

    res.json({
      success: true,
      data: {
        metrics: {
          totalPatients,
          activeDevices,
          totalAlerts,
          patientsWithRecentReadings,
          complianceRate: totalPatients > 0 ? (patientsWithRecentReadings / totalPatients * 100).toFixed(1) : 0
        },
        patients: patients.map(p => ({
          id: p.user_id,
          name: `${p.first_name} ${p.last_name}`,
          dateOfBirth: p.date_of_birth,
          deviceCount: p.device_count,
          lastReading: p.last_reading,
          activeAlerts: p.active_alerts,
          status: p.last_reading && (Date.now() - new Date(p.last_reading).getTime()) < 7 * 24 * 60 * 60 * 1000 ? 'compliant' : 'overdue'
        })),
        deviceSummary,
        recentReadings: recentReadings.map(r => ({
          id: r.id,
          patientName: `${r.first_name} ${r.last_name}`,
          deviceType: r.device_type,
          readingType: r.reading_type,
          value: r.value,
          unit: r.unit,
          timestamp: r.reading_timestamp,
          isAlert: r.is_alert
        })),
        activeAlerts: activeAlerts.map(a => ({
          id: a.id,
          patientName: `${a.first_name} ${a.last_name}`,
          alertType: a.alert_type,
          severity: a.severity,
          message: a.message,
          createdAt: a.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching RPM dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RPM dashboard data'
    });
  }
};

// Get RPM patients
const getRPMPatients = async (req, res) => {
  try {
    const providerId = req.headers['userid'];
    const { status = 'active' } = req.query;

    const patients = await db.query(`
      SELECT 
        up.user_id,
        up.first_name,
        up.last_name,
        up.date_of_birth,
        up.phone,
        rpe.enrollment_date,
        rpe.status as enrollment_status,
        COUNT(rd.id) as device_count,
        MAX(rr.reading_timestamp) as last_reading
      FROM user_profiles up
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      LEFT JOIN rpm_devices rd ON up.user_id = rd.patient_id
      LEFT JOIN rpm_readings rr ON rd.id = rr.device_id
      WHERE rpe.provider_id = ? AND rpe.status = ?
      GROUP BY up.user_id
      ORDER BY rpe.enrollment_date DESC
    `, [providerId, status]);

    res.json({
      success: true,
      data: {
        patients: patients.map(p => ({
          id: p.user_id,
          name: `${p.first_name} ${p.last_name}`,
          dateOfBirth: p.date_of_birth,
          phone: p.phone,
          enrollmentDate: p.enrollment_date,
          enrollmentStatus: p.enrollment_status,
          deviceCount: p.device_count,
          lastReading: p.last_reading,
          complianceStatus: p.last_reading && (Date.now() - new Date(p.last_reading).getTime()) < 7 * 24 * 60 * 60 * 1000 ? 'compliant' : 'overdue'
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching RPM patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RPM patients'
    });
  }
};

// Get RPM devices
const getRPMDevices = async (req, res) => {
  try {
    const providerId = req.headers['userid'];
    const { patientId } = req.query;

    let query = `
      SELECT 
        rd.*,
        up.first_name,
        up.last_name,
        COUNT(rr.id) as reading_count,
        MAX(rr.reading_timestamp) as last_reading
      FROM rpm_devices rd
      INNER JOIN user_profiles up ON rd.patient_id = up.user_id
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      LEFT JOIN rpm_readings rr ON rd.id = rr.device_id
      WHERE rpe.provider_id = ?
    `;
    
    const queryParams = [providerId];

    if (patientId) {
      query += ' AND rd.patient_id = ?';
      queryParams.push(patientId);
    }

    query += ' GROUP BY rd.id ORDER BY rd.created_at DESC';

    const devices = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        devices: devices.map(d => ({
          id: d.id,
          patientId: d.patient_id,
          patientName: `${d.first_name} ${d.last_name}`,
          deviceType: d.device_type,
          deviceModel: d.device_model,
          serialNumber: d.serial_number,
          status: d.status,
          readingCount: d.reading_count,
          lastReading: d.last_reading,
          createdAt: d.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching RPM devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RPM devices'
    });
  }
};

// Add RPM device
const addRPMDevice = async (req, res) => {
  try {
    const {
      patientId,
      deviceType,
      deviceModel,
      serialNumber
    } = req.body;
    const providerId = req.headers['userid'];

    // Validate required fields
    if (!patientId || !deviceType || !serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, device type, and serial number are required'
      });
    }

    // Check if patient is enrolled in RPM
    const enrollment = await db.query(
      'SELECT id FROM rpm_patient_enrollments WHERE patient_id = ? AND provider_id = ? AND status = "active"',
      [patientId, providerId]
    );

    if (enrollment.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient is not enrolled in RPM program'
      });
    }

    // Check for duplicate serial number
    const existingDevice = await db.query(
      'SELECT id FROM rpm_devices WHERE serial_number = ?',
      [serialNumber]
    );

    if (existingDevice.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Device with this serial number already exists'
      });
    }

    // Insert device
    const result = await db.query(
      `INSERT INTO rpm_devices 
       (patient_id, device_type, device_model, serial_number, status) 
       VALUES (?, ?, ?, ?, 'active')`,
      [patientId, deviceType, deviceModel, serialNumber]
    );

    // Log the device addition
    await logAudit(providerId, 'CREATE', 'rpm_device', result.insertId, {
      patientId,
      deviceType,
      serialNumber
    });

    res.status(201).json({
      success: true,
      message: 'RPM device added successfully',
      data: {
        deviceId: result.insertId,
        patientId,
        deviceType,
        serialNumber,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error adding RPM device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add RPM device'
    });
  }
};

// Get RPM readings
const getRPMReadings = async (req, res) => {
  try {
    const providerId = req.headers['userid'];
    const { patientId, deviceId, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT 
        rr.*,
        rd.device_type,
        rd.device_model,
        up.first_name,
        up.last_name
      FROM rpm_readings rr
      INNER JOIN rpm_devices rd ON rr.device_id = rd.id
      INNER JOIN user_profiles up ON rr.patient_id = up.user_id
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      WHERE rpe.provider_id = ?
    `;
    
    const queryParams = [providerId];

    if (patientId) {
      query += ' AND rr.patient_id = ?';
      queryParams.push(patientId);
    }

    if (deviceId) {
      query += ' AND rr.device_id = ?';
      queryParams.push(deviceId);
    }

    if (startDate) {
      query += ' AND rr.reading_timestamp >= ?';
      queryParams.push(startDate);
    }

    if (endDate) {
      query += ' AND rr.reading_timestamp <= ?';
      queryParams.push(endDate);
    }

    query += ' ORDER BY rr.reading_timestamp DESC LIMIT ?';
    queryParams.push(parseInt(limit));

    const readings = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        readings: readings.map(r => ({
          id: r.id,
          patientId: r.patient_id,
          patientName: `${r.first_name} ${r.last_name}`,
          deviceType: r.device_type,
          deviceModel: r.device_model,
          readingType: r.reading_type,
          value: r.value,
          unit: r.unit,
          timestamp: r.reading_timestamp,
          isAlert: r.is_alert,
          notes: r.notes
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching RPM readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RPM readings'
    });
  }
};

// Add RPM reading
const addRPMReading = async (req, res) => {
  try {
    const {
      deviceId,
      patientId,
      readingType,
      value,
      unit,
      readingTimestamp,
      notes
    } = req.body;
    const providerId = req.headers['userid'];

    // Validate required fields
    if (!deviceId || !patientId || !readingType || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Device ID, patient ID, reading type, and value are required'
      });
    }

    // Verify device belongs to patient and provider
    const deviceCheck = await db.query(`
      SELECT rd.id 
      FROM rpm_devices rd
      INNER JOIN rpm_patient_enrollments rpe ON rd.patient_id = rpe.patient_id
      WHERE rd.id = ? AND rd.patient_id = ? AND rpe.provider_id = ?
    `, [deviceId, patientId, providerId]);

    if (deviceCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or access denied'
      });
    }

    // Check if reading triggers an alert
    const isAlert = checkForAlert(readingType, value);

    // Insert reading
    const result = await db.query(
      `INSERT INTO rpm_readings 
       (device_id, patient_id, reading_type, value, unit, reading_timestamp, is_alert, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, patientId, readingType, value, unit, readingTimestamp || new Date(), isAlert, notes]
    );

    // Update device last reading timestamp
    await db.query(
      'UPDATE rpm_devices SET last_reading_at = ? WHERE id = ?',
      [readingTimestamp || new Date(), deviceId]
    );

    // Create alert if needed
    if (isAlert) {
      await createRPMAlert(patientId, readingType, value, result.insertId);
    }

    // Log the reading
    await logAudit(providerId, 'CREATE', 'rpm_reading', result.insertId, {
      patientId,
      deviceId,
      readingType,
      value,
      isAlert
    });

    res.status(201).json({
      success: true,
      message: 'RPM reading recorded successfully',
      data: {
        readingId: result.insertId,
        isAlert,
        value,
        unit,
        timestamp: readingTimestamp || new Date()
      }
    });

  } catch (error) {
    console.error('Error adding RPM reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record RPM reading'
    });
  }
};

// Get RPM alerts
const getRPMAlerts = async (req, res) => {
  try {
    const providerId = req.headers['userid'];
    const { status = 'active', severity, limit = 50 } = req.query;

    let query = `
      SELECT 
        ra.*,
        up.first_name,
        up.last_name,
        rd.device_type
      FROM rpm_alerts ra
      INNER JOIN user_profiles up ON ra.patient_id = up.user_id
      INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
      LEFT JOIN rpm_devices rd ON ra.device_id = rd.id
      WHERE rpe.provider_id = ?
    `;
    
    const queryParams = [providerId];

    if (status !== 'all') {
      query += ' AND ra.status = ?';
      queryParams.push(status);
    }

    if (severity) {
      query += ' AND ra.severity = ?';
      queryParams.push(severity);
    }

    query += ' ORDER BY ra.created_at DESC LIMIT ?';
    queryParams.push(parseInt(limit));

    const alerts = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        alerts: alerts.map(a => ({
          id: a.id,
          patientId: a.patient_id,
          patientName: `${a.first_name} ${a.last_name}`,
          deviceType: a.device_type,
          alertType: a.alert_type,
          severity: a.severity,
          message: a.message,
          status: a.status,
          createdAt: a.created_at,
          acknowledgedAt: a.acknowledged_at
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching RPM alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RPM alerts'
    });
  }
};

// Helper functions
const checkForAlert = (readingType, value) => {
  const alertThresholds = {
    'blood_pressure_systolic': { high: 140, low: 90 },
    'blood_pressure_diastolic': { high: 90, low: 60 },
    'heart_rate': { high: 100, low: 60 },
    'blood_glucose': { high: 180, low: 70 },
    'weight': { change: 3 }, // 3 lb change from baseline
    'oxygen_saturation': { low: 95 }
  };

  const threshold = alertThresholds[readingType];
  if (!threshold) return false;

  if (threshold.high && value > threshold.high) return true;
  if (threshold.low && value < threshold.low) return true;

  return false;
};

const createRPMAlert = async (patientId, readingType, value, readingId) => {
  const alertMessage = generateAlertMessage(readingType, value);
  const severity = determineSeverity(readingType, value);

  await db.query(
    `INSERT INTO rpm_alerts 
     (patient_id, reading_id, alert_type, severity, message, status) 
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [patientId, readingId, readingType, severity, alertMessage]
  );
};

const generateAlertMessage = (readingType, value) => {
  const messages = {
    'blood_pressure_systolic': `High systolic blood pressure: ${value} mmHg`,
    'blood_pressure_diastolic': `High diastolic blood pressure: ${value} mmHg`,
    'heart_rate': value > 100 ? `High heart rate: ${value} bpm` : `Low heart rate: ${value} bpm`,
    'blood_glucose': value > 180 ? `High blood glucose: ${value} mg/dL` : `Low blood glucose: ${value} mg/dL`,
    'oxygen_saturation': `Low oxygen saturation: ${value}%`
  };

  return messages[readingType] || `Abnormal ${readingType}: ${value}`;
};

const determineSeverity = (readingType, value) => {
  // Critical thresholds
  if (readingType === 'blood_pressure_systolic' && value > 180) return 'critical';
  if (readingType === 'blood_pressure_diastolic' && value > 110) return 'critical';
  if (readingType === 'heart_rate' && (value > 120 || value < 50)) return 'critical';
  if (readingType === 'blood_glucose' && (value > 250 || value < 50)) return 'critical';
  if (readingType === 'oxygen_saturation' && value < 90) return 'critical';

  // High thresholds
  if (readingType === 'blood_pressure_systolic' && value > 160) return 'high';
  if (readingType === 'blood_pressure_diastolic' && value > 100) return 'high';
  if (readingType === 'heart_rate' && (value > 110 || value < 55)) return 'high';
  if (readingType === 'blood_glucose' && (value > 200 || value < 60)) return 'high';
  if (readingType === 'oxygen_saturation' && value < 93) return 'high';

  return 'medium';
};

module.exports = {
  getRPMDashboard,
  getRPMPatients,
  getRPMDevices,
  addRPMDevice,
  getRPMReadings,
  addRPMReading,
  getRPMAlerts
};