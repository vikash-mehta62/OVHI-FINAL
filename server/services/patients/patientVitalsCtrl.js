const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

// Get patient vitals
const getPatientVitals = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;
    const userId = req.headers['userid'];

    // Verify patient access
    const patientCheck = await db.query(
      'SELECT user_id FROM user_profiles WHERE user_id = ?',
      [patientId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build query with date filters
    let query = `
      SELECT 
        pv.*,
        up.first_name as recorded_by_first_name,
        up.last_name as recorded_by_last_name
      FROM patient_vitals pv
      LEFT JOIN user_profiles up ON pv.recorded_by_id = up.user_id
      WHERE pv.patient_id = ?
    `;
    
    const queryParams = [patientId];

    if (startDate) {
      query += ' AND pv.measurement_date >= ?';
      queryParams.push(startDate);
    }

    if (endDate) {
      query += ' AND pv.measurement_date <= ?';
      queryParams.push(endDate);
    }

    query += ' ORDER BY pv.measurement_date DESC LIMIT ?';
    queryParams.push(parseInt(limit));

    const vitals = await db.query(query, queryParams);

    // Calculate trends and normal ranges
    const processedVitals = vitals.map(vital => {
      const processed = {
        id: vital.id,
        measurementDate: vital.measurement_date,
        bloodPressure: {
          systolic: vital.blood_pressure_systolic,
          diastolic: vital.blood_pressure_diastolic,
          normal: isBloodPressureNormal(vital.blood_pressure_systolic, vital.blood_pressure_diastolic)
        },
        heartRate: {
          value: vital.heart_rate,
          normal: isHeartRateNormal(vital.heart_rate)
        },
        temperature: {
          value: vital.temperature,
          normal: isTemperatureNormal(vital.temperature)
        },
        weight: vital.weight,
        height: vital.height,
        oxygenSaturation: {
          value: vital.oxygen_saturation,
          normal: isOxygenSaturationNormal(vital.oxygen_saturation)
        },
        recordedBy: vital.recorded_by_first_name && vital.recorded_by_last_name 
          ? `${vital.recorded_by_first_name} ${vital.recorded_by_last_name}`
          : 'Self-reported',
        createdAt: vital.created_at
      };

      // Calculate BMI if height and weight are available
      if (vital.height && vital.weight) {
        const heightInMeters = vital.height / 100; // Convert cm to meters
        const bmi = vital.weight / (heightInMeters * heightInMeters);
        processed.bmi = {
          value: Math.round(bmi * 10) / 10,
          category: getBMICategory(bmi)
        };
      }

      return processed;
    });

    // Log access for HIPAA compliance
    await logAudit(userId, 'VIEW', 'patient_vitals', patientId, {
      vitalsCount: vitals.length,
      dateRange: { startDate, endDate }
    });

    res.json({
      success: true,
      data: {
        vitals: processedVitals,
        summary: generateVitalsSummary(processedVitals)
      }
    });

  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vitals'
    });
  }
};

// Add new vital signs
const addPatientVitals = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { 
      measurementDate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRate,
      temperature,
      weight,
      height,
      oxygenSaturation
    } = req.body;
    const recordedById = req.headers['userid'];

    // Validate required fields
    if (!measurementDate) {
      return res.status(400).json({
        success: false,
        message: 'Measurement date is required'
      });
    }

    // Verify patient exists
    const patientCheck = await db.query(
      'SELECT user_id FROM user_profiles WHERE user_id = ?',
      [patientId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Validate vital signs ranges
    const validationErrors = [];
    
    if (bloodPressureSystolic && (bloodPressureSystolic < 60 || bloodPressureSystolic > 250)) {
      validationErrors.push('Systolic blood pressure must be between 60-250 mmHg');
    }
    
    if (bloodPressureDiastolic && (bloodPressureDiastolic < 30 || bloodPressureDiastolic > 150)) {
      validationErrors.push('Diastolic blood pressure must be between 30-150 mmHg');
    }
    
    if (heartRate && (heartRate < 30 || heartRate > 200)) {
      validationErrors.push('Heart rate must be between 30-200 bpm');
    }
    
    if (temperature && (temperature < 90 || temperature > 110)) {
      validationErrors.push('Temperature must be between 90-110°F');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: validationErrors
      });
    }

    // Insert vitals
    const result = await db.query(
      `INSERT INTO patient_vitals 
       (patient_id, measurement_date, blood_pressure_systolic, blood_pressure_diastolic, 
        heart_rate, temperature, weight, height, oxygen_saturation, recorded_by_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, measurementDate, bloodPressureSystolic, bloodPressureDiastolic, 
       heartRate, temperature, weight, height, oxygenSaturation, recordedById]
    );

    // Log the creation
    await logAudit(recordedById, 'CREATE', 'patient_vitals', result.insertId, {
      patientId,
      measurementDate,
      vitalsRecorded: {
        bloodPressure: bloodPressureSystolic && bloodPressureDiastolic,
        heartRate: !!heartRate,
        temperature: !!temperature,
        weight: !!weight,
        height: !!height,
        oxygenSaturation: !!oxygenSaturation
      }
    });

    res.status(201).json({
      success: true,
      message: 'Vitals recorded successfully',
      data: {
        id: result.insertId,
        patientId,
        measurementDate,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        heartRate,
        temperature,
        weight,
        height,
        oxygenSaturation
      }
    });

  } catch (error) {
    console.error('Error adding vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vitals'
    });
  }
};

// Helper functions for normal ranges
const isBloodPressureNormal = (systolic, diastolic) => {
  if (!systolic || !diastolic) return null;
  return systolic < 120 && diastolic < 80;
};

const isHeartRateNormal = (heartRate) => {
  if (!heartRate) return null;
  return heartRate >= 60 && heartRate <= 100;
};

const isTemperatureNormal = (temperature) => {
  if (!temperature) return null;
  return temperature >= 97.0 && temperature <= 99.5;
};

const isOxygenSaturationNormal = (oxygenSaturation) => {
  if (!oxygenSaturation) return null;
  return oxygenSaturation >= 95;
};

const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

const generateVitalsSummary = (vitals) => {
  if (vitals.length === 0) return null;

  const latest = vitals[0];
  const trends = {};

  // Calculate trends if we have multiple readings
  if (vitals.length > 1) {
    const previous = vitals[1];
    
    if (latest.bloodPressure.systolic && previous.bloodPressure.systolic) {
      trends.bloodPressure = latest.bloodPressure.systolic > previous.bloodPressure.systolic ? 'increasing' : 'decreasing';
    }
    
    if (latest.heartRate.value && previous.heartRate.value) {
      trends.heartRate = latest.heartRate.value > previous.heartRate.value ? 'increasing' : 'decreasing';
    }
    
    if (latest.weight && previous.weight) {
      trends.weight = latest.weight > previous.weight ? 'increasing' : 'decreasing';
    }
  }

  return {
    latest: {
      date: latest.measurementDate,
      bloodPressure: latest.bloodPressure,
      heartRate: latest.heartRate,
      temperature: latest.temperature,
      weight: latest.weight,
      bmi: latest.bmi
    },
    trends,
    totalReadings: vitals.length
  };
};

module.exports = {
  getPatientVitals,
  addPatientVitals
};