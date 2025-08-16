const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

// Get patient medications
const getPatientMedications = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { status = 'active' } = req.query;
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

    // Get medications
    let query = `
      SELECT 
        pm.*,
        up.first_name as prescriber_first_name,
        up.last_name as prescriber_last_name
      FROM patient_medications pm
      LEFT JOIN user_profiles up ON pm.prescribing_provider_id = up.user_id
      WHERE pm.patient_id = ?
    `;
    
    const queryParams = [patientId];

    if (status !== 'all') {
      query += ' AND pm.status = ?';
      queryParams.push(status);
    }

    query += ' ORDER BY pm.start_date DESC, pm.created_at DESC';

    const medications = await db.query(query, queryParams);

    // Check for drug allergies
    const allergies = await db.query(
      'SELECT allergy_name FROM patient_allergies WHERE patient_id = ? AND allergy_type = "drug"',
      [patientId]
    );

    // Log access for HIPAA compliance
    await logAudit(userId, 'VIEW', 'patient_medications', patientId, {
      medicationCount: medications.length,
      status
    });

    res.json({
      success: true,
      data: {
        medications: medications.map(med => ({
          id: med.id,
          medicationName: med.medication_name,
          dosage: med.dosage,
          frequency: med.frequency,
          startDate: med.start_date,
          endDate: med.end_date,
          status: med.status,
          refillsRemaining: med.refills_remaining,
          prescriber: med.prescriber_first_name && med.prescriber_last_name 
            ? `${med.prescriber_first_name} ${med.prescriber_last_name}`
            : 'Unknown Provider',
          createdAt: med.created_at
        })),
        allergies: allergies.map(a => a.allergy_name)
      }
    });

  } catch (error) {
    console.error('Error fetching patient medications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medications'
    });
  }
};

// Add new medication
const addPatientMedication = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { 
      medicationName, 
      dosage, 
      frequency, 
      startDate, 
      endDate, 
      refillsRemaining = 0 
    } = req.body;
    const providerId = req.headers['userid'];

    // Validate required fields
    if (!medicationName || !dosage || !frequency || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Medication name, dosage, frequency, and start date are required'
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

    // Check for drug allergies
    const allergyCheck = await db.query(
      'SELECT allergy_name FROM patient_allergies WHERE patient_id = ? AND allergy_type = "drug" AND LOWER(allergy_name) LIKE LOWER(?)',
      [patientId, `%${medicationName}%`]
    );

    if (allergyCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Warning: Patient has a documented allergy to ${allergyCheck[0].allergy_name}`,
        allergyWarning: true
      });
    }

    // Insert medication
    const result = await db.query(
      `INSERT INTO patient_medications 
       (patient_id, medication_name, dosage, frequency, prescribing_provider_id, start_date, end_date, refills_remaining, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [patientId, medicationName, dosage, frequency, providerId, startDate, endDate, refillsRemaining]
    );

    // Log the creation
    await logAudit(providerId, 'CREATE', 'patient_medications', result.insertId, {
      patientId,
      medicationName,
      dosage,
      frequency
    });

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: {
        id: result.insertId,
        patientId,
        medicationName,
        dosage,
        frequency,
        startDate,
        endDate,
        refillsRemaining,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add medication'
    });
  }
};

// Request medication refill
const requestMedicationRefill = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { medicationId, notes } = req.body;
    const userId = req.headers['userid'];

    // Verify medication exists and belongs to patient
    const medicationCheck = await db.query(
      'SELECT * FROM patient_medications WHERE id = ? AND patient_id = ? AND status = "active"',
      [medicationId, patientId]
    );

    if (medicationCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active medication not found'
      });
    }

    const medication = medicationCheck[0];

    if (medication.refills_remaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No refills remaining. Please contact your provider for a new prescription.'
      });
    }

    // Create refill request (you might want a separate table for this)
    const refillResult = await db.query(
      `INSERT INTO medication_refill_requests 
       (patient_id, medication_id, prescribing_provider_id, notes, status, requested_at) 
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [patientId, medicationId, medication.prescribing_provider_id, notes]
    );

    // Log the refill request
    await logAudit(userId, 'CREATE', 'medication_refill_requests', refillResult.insertId, {
      patientId,
      medicationId,
      medicationName: medication.medication_name
    });

    res.json({
      success: true,
      message: 'Refill request submitted successfully',
      data: {
        refillRequestId: refillResult.insertId,
        medicationName: medication.medication_name,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error requesting medication refill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request medication refill'
    });
  }
};

// Update medication status
const updateMedicationStatus = async (req, res) => {
  try {
    const { id: patientId, medicationId } = req.params;
    const { status, endDate } = req.body;
    const providerId = req.headers['userid'];

    // Validate status
    const validStatuses = ['active', 'discontinued', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, discontinued, or completed'
      });
    }

    // Verify medication exists and belongs to patient
    const medicationCheck = await db.query(
      'SELECT * FROM patient_medications WHERE id = ? AND patient_id = ?',
      [medicationId, patientId]
    );

    if (medicationCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    // Update medication
    let updateQuery = 'UPDATE patient_medications SET status = ?';
    let updateParams = [status];

    if (endDate && (status === 'discontinued' || status === 'completed')) {
      updateQuery += ', end_date = ?';
      updateParams.push(endDate);
    }

    updateQuery += ' WHERE id = ? AND patient_id = ?';
    updateParams.push(medicationId, patientId);

    await db.query(updateQuery, updateParams);

    // Log the update
    await logAudit(providerId, 'UPDATE', 'patient_medications', medicationId, {
      patientId,
      statusChange: status,
      endDate
    });

    res.json({
      success: true,
      message: 'Medication status updated successfully'
    });

  } catch (error) {
    console.error('Error updating medication status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication status'
    });
  }
};

module.exports = {
  getPatientMedications,
  addPatientMedication,
  requestMedicationRefill,
  updateMedicationStatus
};