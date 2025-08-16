const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');

// Get all document sequences for an organization
const getDocumentSequences = async (req, res) => {
  let connection;
  
  try {
    const organizationId = req.query.organizationId || 1; // Default to 1 for now
    
    connection = await mysql.createConnection(dbConfig);
    
    const [sequences] = await connection.execute(`
      SELECT 
        id,
        document_type,
        prefix,
        current_number,
        number_length,
        suffix,
        format_template,
        reset_frequency,
        last_reset_date,
        is_active
      FROM document_sequences 
      WHERE organization_id = ?
      ORDER BY document_type
    `, [organizationId]);
    
    res.json({
      success: true,
      data: sequences
    });
    
  } catch (error) {
    console.error('Error fetching document sequences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document sequences',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Update document sequence configuration
const updateDocumentSequence = async (req, res) => {
  let connection;
  
  try {
    const { id } = req.params;
    const {
      prefix,
      current_number,
      number_length,
      suffix,
      format_template,
      reset_frequency,
      is_active
    } = req.body;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      UPDATE document_sequences 
      SET 
        prefix = ?,
        current_number = ?,
        number_length = ?,
        suffix = ?,
        format_template = ?,
        reset_frequency = ?,
        is_active = ?,
        updated_date = NOW()
      WHERE id = ?
    `, [
      prefix || '',
      current_number || 1,
      number_length || 6,
      suffix || '',
      format_template || '{prefix}{number}{suffix}',
      reset_frequency || 'yearly',
      is_active !== undefined ? is_active : true,
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document sequence not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Document sequence updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating document sequence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document sequence',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Generate next document number
const generateDocumentNumber = async (req, res) => {
  let connection;
  
  try {
    const { documentType, documentId, organizationId = 1 } = req.body;
    const generatedBy = req.user?.id || null;
    
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    // Call stored procedure to generate next number
    const [result] = await connection.execute(`
      CALL GetNextDocumentNumber(?, ?, ?, ?, @document_number)
    `, [organizationId, documentType, documentId, generatedBy]);
    
    // Get the generated document number
    const [numberResult] = await connection.execute('SELECT @document_number as document_number');
    const documentNumber = numberResult[0].document_number;
    
    res.json({
      success: true,
      data: {
        documentNumber,
        documentType,
        organizationId
      }
    });
    
  } catch (error) {
    console.error('Error generating document number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate document number',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Preview next document number without incrementing
const previewDocumentNumber = async (req, res) => {
  let connection;
  
  try {
    const { documentType, organizationId = 1 } = req.query;
    
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    // Use function to preview next number
    const [result] = await connection.execute(`
      SELECT PreviewNextDocumentNumber(?, ?) as preview_number
    `, [organizationId, documentType]);
    
    const previewNumber = result[0].preview_number;
    
    res.json({
      success: true,
      data: {
        previewNumber,
        documentType,
        organizationId
      }
    });
    
  } catch (error) {
    console.error('Error previewing document number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview document number',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get document number history
const getDocumentNumberHistory = async (req, res) => {
  let connection;
  
  try {
    const { organizationId = 1, documentType, limit = 50 } = req.query;
    
    connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT 
        id,
        document_type,
        document_id,
        generated_number,
        full_document_number,
        generated_by,
        generated_date
      FROM document_number_history 
      WHERE organization_id = ?
    `;
    
    const params = [organizationId];
    
    if (documentType) {
      query += ' AND document_type = ?';
      params.push(documentType);
    }
    
    query += ' ORDER BY generated_date DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [history] = await connection.execute(query, params);
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Error fetching document number history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document number history',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Reset document sequence
const resetDocumentSequence = async (req, res) => {
  let connection;
  
  try {
    const { id } = req.params;
    const { newStartNumber = 1 } = req.body;
    
    connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      UPDATE document_sequences 
      SET 
        current_number = ?,
        last_reset_date = CURDATE(),
        updated_date = NOW()
      WHERE id = ?
    `, [newStartNumber, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document sequence not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Document sequence reset successfully'
    });
    
  } catch (error) {
    console.error('Error resetting document sequence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset document sequence',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Utility function to generate document number (for use in other controllers)
const generateDocumentNumberUtil = async (documentType, documentId = null, organizationId = 1, generatedBy = null) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Call stored procedure to generate next number
    await connection.execute(`
      CALL GetNextDocumentNumber(?, ?, ?, ?, @document_number)
    `, [organizationId, documentType, documentId, generatedBy]);
    
    // Get the generated document number
    const [result] = await connection.execute('SELECT @document_number as document_number');
    return result[0].document_number;
    
  } catch (error) {
    console.error('Error generating document number:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = {
  getDocumentSequences,
  updateDocumentSequence,
  generateDocumentNumber,
  previewDocumentNumber,
  getDocumentNumberHistory,
  resetDocumentSequence,
  generateDocumentNumberUtil
};