const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const connection = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/intake-documents');
    
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_patientId_originalname
    const timestamp = Date.now();
    const patientId = req.body.patientId || 'unknown';
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${timestamp}_${patientId}_${name}${ext}`;
    cb(null, filename);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Upload intake documents
const uploadIntakeDocuments = async (req, res) => {
  try {
    const { patientId, documentCategory } = req.body;
    const uploadedFiles = req.files;

    if (!patientId || !documentCategory) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and document category are required'
      });
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const documentRecords = [];

    // Process each uploaded file
    for (const file of uploadedFiles) {
      // Determine document type based on category and file
      const documentType = determineDocumentType(documentCategory, file.originalname);
      
      // Insert document record into database
      const insertQuery = `
        INSERT INTO patient_documents (
          patient_id, document_type, original_filename, stored_filename, 
          file_path, file_size, mime_type, uploaded_by, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
      
      const values = [
        patientId,
        documentType,
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        patientId // Patient uploaded their own document
      ];

      const [result] = await connection.query(insertQuery, values);
      
      documentRecords.push({
        id: result.insertId,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        type: documentType,
        uploadDate: new Date()
      });

      // Log the upload for audit trail
      await logAudit(
        patientId, 
        'UPLOAD_DOCUMENT', 
        'patient_documents', 
        result.insertId,
        `Document uploaded: ${file.originalname} (${documentType})`
      );
    }

    res.status(200).json({
      success: true,
      message: `${uploadedFiles.length} document(s) uploaded successfully`,
      data: {
        uploadedDocuments: documentRecords
      }
    });

  } catch (error) {
    console.error('Error uploading intake documents:', error);
    
    // Clean up uploaded files if database insertion failed
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload documents'
    });
  }
};

// Get patient documents
const getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { category } = req.query;

    let query = `
      SELECT 
        id, document_type, original_filename, file_size, 
        mime_type, upload_date, verification_status, notes
      FROM patient_documents 
      WHERE patient_id = ? AND is_active = TRUE
    `;
    
    const queryParams = [patientId];

    if (category) {
      query += ' AND document_type LIKE ?';
      queryParams.push(`%${category}%`);
    }

    query += ' ORDER BY upload_date DESC';

    const [documents] = await connection.query(query, queryParams);

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc.id,
          type: doc.document_type,
          originalName: doc.original_filename,
          size: doc.file_size,
          mimeType: doc.mime_type,
          uploadDate: doc.upload_date,
          verificationStatus: doc.verification_status,
          notes: doc.notes
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching patient documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
};

// Delete patient document
const deletePatientDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { patientId } = req.body;

    // Get document info before deletion
    const [documents] = await connection.query(
      'SELECT * FROM patient_documents WHERE id = ? AND patient_id = ?',
      [documentId, patientId]
    );

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documents[0];

    // Soft delete the document record
    await connection.query(
      'UPDATE patient_documents SET is_active = FALSE WHERE id = ?',
      [documentId]
    );

    // Optionally delete the physical file (or move to archive)
    try {
      await fs.unlink(document.file_path);
    } catch (fileError) {
      console.warn('Could not delete physical file:', fileError);
    }

    // Log the deletion
    await logAudit(
      patientId,
      'DELETE_DOCUMENT',
      'patient_documents',
      documentId,
      `Document deleted: ${document.original_filename}`
    );

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

// Save intake progress
const saveIntakeProgress = async (req, res) => {
  try {
    const {
      sessionId,
      patientEmail,
      providerId,
      progressData,
      completedSections,
      completionPercentage
    } = req.body;

    if (!sessionId || !patientEmail || !providerId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, patient email, and provider ID are required'
      });
    }

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Upsert intake progress
    const upsertQuery = `
      INSERT INTO intake_progress (
        intake_session_id, patient_email, provider_id, progress_data, 
        completed_sections, completion_percentage, expires_at, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        progress_data = VALUES(progress_data),
        completed_sections = VALUES(completed_sections),
        completion_percentage = VALUES(completion_percentage),
        last_saved_at = CURRENT_TIMESTAMP
    `;

    const values = [
      sessionId,
      patientEmail,
      providerId,
      JSON.stringify(progressData),
      JSON.stringify(completedSections),
      completionPercentage || 0,
      expiresAt,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent') || ''
    ];

    await connection.query(upsertQuery, values);

    res.json({
      success: true,
      message: 'Progress saved successfully',
      data: {
        sessionId,
        completionPercentage,
        lastSaved: new Date(),
        expiresAt
      }
    });

  } catch (error) {
    console.error('Error saving intake progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress'
    });
  }
};

// Get intake progress
const getIntakeProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [progress] = await connection.query(
      `SELECT * FROM intake_progress 
       WHERE intake_session_id = ? AND status = 'in_progress' AND expires_at > NOW()`,
      [sessionId]
    );

    if (progress.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active progress found for this session'
      });
    }

    const progressData = progress[0];

    res.json({
      success: true,
      data: {
        sessionId: progressData.intake_session_id,
        progressData: JSON.parse(progressData.progress_data || '{}'),
        completedSections: JSON.parse(progressData.completed_sections || '{}'),
        completionPercentage: progressData.completion_percentage,
        lastSaved: progressData.last_saved_at,
        expiresAt: progressData.expires_at
      }
    });

  } catch (error) {
    console.error('Error fetching intake progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
};

// Helper function to determine document type
const determineDocumentType = (category, filename) => {
  const lowerFilename = filename.toLowerCase();
  
  switch (category) {
    case 'insuranceCards':
      if (lowerFilename.includes('front') || lowerFilename.includes('primary')) {
        return 'insurance_card_primary_front';
      } else if (lowerFilename.includes('back')) {
        return 'insurance_card_primary_back';
      } else if (lowerFilename.includes('secondary')) {
        return 'insurance_card_secondary_front';
      }
      return 'insurance_card_primary_front'; // Default
      
    case 'identificationDocs':
      if (lowerFilename.includes('license') || lowerFilename.includes('dl')) {
        return 'identification_drivers_license';
      } else if (lowerFilename.includes('passport')) {
        return 'identification_passport';
      }
      return 'identification_state_id'; // Default
      
    case 'medicalRecords':
      if (lowerFilename.includes('lab') || lowerFilename.includes('test')) {
        return 'medical_record_lab_result';
      } else if (lowerFilename.includes('referral')) {
        return 'medical_record_referral';
      } else if (lowerFilename.includes('imaging') || lowerFilename.includes('xray') || lowerFilename.includes('mri')) {
        return 'medical_record_imaging';
      }
      return 'medical_record_other'; // Default
      
    default:
      return 'medical_record_other';
  }
};

module.exports = {
  upload,
  uploadIntakeDocuments,
  getPatientDocuments,
  deletePatientDocument,
  saveIntakeProgress,
  getIntakeProgress
};