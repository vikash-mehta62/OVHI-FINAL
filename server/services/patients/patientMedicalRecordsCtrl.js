const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

// Get patient medical records
const getPatientMedicalRecords = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
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

    // Build query with filters
    let query = `
      SELECT 
        pmr.*,
        up.first_name as provider_first_name,
        up.last_name as provider_last_name
      FROM patient_medical_records pmr
      LEFT JOIN user_profiles up ON pmr.provider_id = up.user_id
      WHERE pmr.patient_id = ? AND pmr.is_active = 1
    `;
    
    const queryParams = [patientId];

    // Add filters
    if (type) {
      query += ' AND pmr.record_type = ?';
      queryParams.push(type);
    }

    if (startDate) {
      query += ' AND pmr.date_recorded >= ?';
      queryParams.push(startDate);
    }

    if (endDate) {
      query += ' AND pmr.date_recorded <= ?';
      queryParams.push(endDate);
    }

    // Add pagination
    query += ' ORDER BY pmr.date_recorded DESC, pmr.created_at DESC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), offset);

    const records = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM patient_medical_records pmr 
      WHERE pmr.patient_id = ? AND pmr.is_active = 1
    `;
    const countParams = [patientId];

    if (type) {
      countQuery += ' AND pmr.record_type = ?';
      countParams.push(type);
    }

    if (startDate) {
      countQuery += ' AND pmr.date_recorded >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND pmr.date_recorded <= ?';
      countParams.push(endDate);
    }

    const [{ total }] = await db.query(countQuery, countParams);

    // Log access for HIPAA compliance
    await logAudit(userId, 'VIEW', 'patient_medical_records', patientId, {
      recordCount: records.length,
      filters: { type, startDate, endDate }
    });

    res.json({
      success: true,
      data: {
        records: records.map(record => ({
          id: record.id,
          type: record.record_type,
          title: record.title,
          description: record.description,
          dateRecorded: record.date_recorded,
          provider: record.provider_first_name && record.provider_last_name 
            ? `${record.provider_first_name} ${record.provider_last_name}`
            : 'Unknown Provider',
          documentUrl: record.document_url,
          createdAt: record.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patient medical records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical records'
    });
  }
};

// Add new medical record
const addPatientMedicalRecord = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { type, title, description, dateRecorded, documentUrl } = req.body;
    const providerId = req.headers['userid'];

    // Validate required fields
    if (!type || !title || !dateRecorded) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, and date recorded are required'
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

    // Insert medical record
    const result = await db.query(
      `INSERT INTO patient_medical_records 
       (patient_id, record_type, title, description, provider_id, date_recorded, document_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patientId, type, title, description, providerId, dateRecorded, documentUrl]
    );

    // Log the creation
    await logAudit(providerId, 'CREATE', 'patient_medical_records', result.insertId, {
      patientId,
      recordType: type,
      title
    });

    res.status(201).json({
      success: true,
      message: 'Medical record added successfully',
      data: {
        id: result.insertId,
        patientId,
        type,
        title,
        description,
        dateRecorded,
        documentUrl
      }
    });

  } catch (error) {
    console.error('Error adding medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add medical record'
    });
  }
};

// Update medical record
const updatePatientMedicalRecord = async (req, res) => {
  try {
    const { id: patientId, recordId } = req.params;
    const { type, title, description, dateRecorded, documentUrl } = req.body;
    const providerId = req.headers['userid'];

    // Verify record exists and belongs to patient
    const recordCheck = await db.query(
      'SELECT * FROM patient_medical_records WHERE id = ? AND patient_id = ?',
      [recordId, patientId]
    );

    if (recordCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Update record
    await db.query(
      `UPDATE patient_medical_records 
       SET record_type = ?, title = ?, description = ?, date_recorded = ?, document_url = ?
       WHERE id = ? AND patient_id = ?`,
      [type, title, description, dateRecorded, documentUrl, recordId, patientId]
    );

    // Log the update
    await logAudit(providerId, 'UPDATE', 'patient_medical_records', recordId, {
      patientId,
      changes: { type, title, description, dateRecorded, documentUrl }
    });

    res.json({
      success: true,
      message: 'Medical record updated successfully'
    });

  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medical record'
    });
  }
};

// Delete medical record (soft delete)
const deletePatientMedicalRecord = async (req, res) => {
  try {
    const { id: patientId, recordId } = req.params;
    const providerId = req.headers['userid'];

    // Verify record exists and belongs to patient
    const recordCheck = await db.query(
      'SELECT * FROM patient_medical_records WHERE id = ? AND patient_id = ?',
      [recordId, patientId]
    );

    if (recordCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Soft delete record
    await db.query(
      'UPDATE patient_medical_records SET is_active = 0 WHERE id = ? AND patient_id = ?',
      [recordId, patientId]
    );

    // Log the deletion
    await logAudit(providerId, 'DELETE', 'patient_medical_records', recordId, {
      patientId,
      recordTitle: recordCheck[0].title
    });

    res.json({
      success: true,
      message: 'Medical record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medical record'
    });
  }
};

module.exports = {
  getPatientMedicalRecords,
  addPatientMedicalRecord,
  updatePatientMedicalRecord,
  deletePatientMedicalRecord
};