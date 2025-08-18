const db = require('../../config/db');
const templateService = require('./templateService');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

/**
 * Document Generation Engine
 * Advanced document generation with PDF support, digital signatures, and multi-format output
 */

class DocumentGenerationEngine {
  constructor() {
    this.supportedFormats = ['pdf', 'html', 'text', 'docx'];
    this.outputDirectory = process.env.DOCUMENT_OUTPUT_DIR || './generated_documents';
    this.templateCache = new Map();
    this.fontPaths = new Map();
    this.initializeFonts();
  }

  /**
   * Initialize font configurations
   */
  initializeFonts() {
    this.fontPaths.set('regular', path.join(__dirname, '../../assets/fonts/regular.ttf'));
    this.fontPaths.set('bold', path.join(__dirname, '../../assets/fonts/bold.ttf'));
    this.fontPaths.set('italic', path.join(__dirname, '../../assets/fonts/italic.ttf'));
  }

  /**
   * Generate document in specified format
   */
  async generateDocument(referralId, templateId, options = {}) {
    try {
      const {
        format = 'pdf',
        includeAttachments = false,
        digitalSignature = false,
        letterhead = true,
        userId = null
      } = options;

      // Validate format
      if (!this.supportedFormats.includes(format)) {
        throw new Error(`Unsupported format: ${format}`);
      }

      // Get referral data
      const referralData = await this.getReferralData(referralId);
      if (!referralData) {
        throw new Error('Referral not found');
      }

      // Generate document content using template service
      const documentResult = await templateService.generateDocument(templateId, referralData, {
        userId,
        includeLetterhead: letterhead,
        format: format
      });

      if (!documentResult.success) {
        throw new Error('Failed to generate document content');
      }

      // Generate document in requested format
      let generatedDocument;
      switch (format) {
        case 'pdf':
          generatedDocument = await this.generatePDF(documentResult, referralData, options);
          break;
        case 'html':
          generatedDocument = await this.generateHTML(documentResult, referralData, options);
          break;
        case 'text':
          generatedDocument = await this.generateText(documentResult, referralData, options);
          break;
        case 'docx':
          generatedDocument = await this.generateDOCX(documentResult, referralData, options);
          break;
        default:
          throw new Error(`Format ${format} not implemented`);
      }

      // Save document
      const savedDocument = await this.saveDocument(generatedDocument, referralId, format, options);

      // Log document generation
      await this.logDocumentGeneration(referralId, templateId, format, savedDocument.filePath, userId);

      return {
        success: true,
        document: savedDocument,
        metadata: {
          ...documentResult.metadata,
          format: format,
          filePath: savedDocument.filePath,
          fileSize: savedDocument.fileSize
        }
      };

    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  /**
   * Generate PDF document
   */
  async generatePDF(documentResult, referralData, options = {}) {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      });

      // Add letterhead if configured
      if (options.letterhead && documentResult.template.letterhead_config) {
        await this.addLetterhead(doc, documentResult.template.letterhead_config);
      }

      // Add document content
      await this.addContentToPDF(doc, documentResult.content, documentResult.template.formatting_options);

      // Add footer
      await this.addFooter(doc, referralData, documentResult.metadata);

      // Add digital signature if requested
      if (options.digitalSignature) {
        await this.addDigitalSignature(doc, referralData.provider_id, options);
      }

      // Convert to buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {});
      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            content: buffer,
            mimeType: 'application/pdf',
            extension: 'pdf'
          });
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate HTML document
   */
  async generateHTML(documentResult, referralData, options = {}) {
    try {
      let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Referral Letter - ${referralData.referral_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .letterhead {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .content {
            white-space: pre-wrap;
            margin-bottom: 30px;
        }
        .footer {
            border-top: 1px solid #ccc;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
        }
        .signature-block {
            margin-top: 40px;
            border-top: 1px solid #333;
            width: 300px;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
`;

      // Add letterhead
      if (options.letterhead && documentResult.template.letterhead_config) {
        htmlContent += this.generateHTMLLetterhead(documentResult.template.letterhead_config);
      }

      // Add main content
      htmlContent += `
    <div class="content">
        ${this.formatHTMLContent(documentResult.content)}
    </div>
`;

      // Add signature block
      if (options.includeSignature !== false) {
        htmlContent += `
    <div class="signature-block">
        <p>Sincerely,</p>
        <br><br>
        <p>${referralData.provider_name || 'Provider Name'}</p>
        <p>${referralData.provider_title || ''}</p>
    </div>
`;
      }

      // Add footer
      htmlContent += `
    <div class="footer">
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <p>Referral ID: ${referralData.referral_number}</p>
    </div>
</body>
</html>
`;

      return {
        content: Buffer.from(htmlContent, 'utf8'),
        mimeType: 'text/html',
        extension: 'html'
      };

    } catch (error) {
      console.error('Error generating HTML:', error);
      throw error;
    }
  }

  /**
   * Generate plain text document
   */
  async generateText(documentResult, referralData, options = {}) {
    try {
      let textContent = '';

      // Add letterhead
      if (options.letterhead && documentResult.template.letterhead_config) {
        textContent += this.generateTextLetterhead(documentResult.template.letterhead_config);
        textContent += '\n\n';
      }

      // Add main content
      textContent += documentResult.content;

      // Add signature
      if (options.includeSignature !== false) {
        textContent += '\n\nSincerely,\n\n';
        textContent += `${referralData.provider_name || 'Provider Name'}\n`;
        textContent += `${referralData.provider_title || ''}\n`;
      }

      // Add footer
      textContent += '\n\n';
      textContent += '---\n';
      textContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
      textContent += `Referral ID: ${referralData.referral_number}\n`;

      return {
        content: Buffer.from(textContent, 'utf8'),
        mimeType: 'text/plain',
        extension: 'txt'
      };

    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }

  /**
   * Generate DOCX document (placeholder - would require docx library)
   */
  async generateDOCX(documentResult, referralData, options = {}) {
    try {
      // This would require the 'docx' npm package for full implementation
      // For now, return a simple text-based version
      const textResult = await this.generateText(documentResult, referralData, options);
      
      return {
        content: textResult.content,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx'
      };

    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw error;
    }
  }

  /**
   * Save generated document to file system
   */
  async saveDocument(generatedDocument, referralId, format, options = {}) {
    try {
      // Ensure output directory exists
      await this.ensureDirectoryExists(this.outputDirectory);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `referral_${referralId}_${timestamp}.${generatedDocument.extension}`;
      const filePath = path.join(this.outputDirectory, filename);

      // Write file
      await fs.writeFile(filePath, generatedDocument.content);

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        filename: filename,
        filePath: filePath,
        fileSize: stats.size,
        mimeType: generatedDocument.mimeType,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  /**
   * Generate document with attachments
   */
  async generateDocumentWithAttachments(referralId, templateId, options = {}) {
    try {
      // Generate main document
      const mainDocument = await this.generateDocument(referralId, templateId, options);

      // Get referral attachments
      const attachments = await this.getReferralAttachments(referralId);

      if (attachments.length === 0) {
        return mainDocument;
      }

      // Create combined document package
      const packageResult = await this.createDocumentPackage(mainDocument, attachments, options);

      return {
        success: true,
        document: packageResult,
        attachments: attachments.length,
        metadata: {
          ...mainDocument.metadata,
          hasAttachments: true,
          attachmentCount: attachments.length
        }
      };

    } catch (error) {
      console.error('Error generating document with attachments:', error);
      throw error;
    }
  }

  /**
   * Batch generate documents
   */
  async batchGenerateDocuments(referralIds, templateId, options = {}) {
    try {
      const results = [];
      const errors = [];

      for (const referralId of referralIds) {
        try {
          const result = await this.generateDocument(referralId, templateId, options);
          results.push({
            referralId,
            success: true,
            document: result.document,
            metadata: result.metadata
          });
        } catch (error) {
          errors.push({
            referralId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        totalProcessed: referralIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };

    } catch (error) {
      console.error('Error in batch document generation:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Get referral data for document generation
   */
  async getReferralData(referralId) {
    try {
      const [referralData] = await db.execute(`
        SELECT 
          r.*,
          -- Patient data
          p.firstname as patient_first_name,
          p.lastname as patient_last_name,
          CONCAT(p.firstname, ' ', p.lastname) as patient_name,
          p.dob as patient_dob,
          TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) as patient_age,
          p.phone as patient_phone,
          p.email as patient_email,
          -- Provider data
          pr.firstname as provider_first_name,
          pr.lastname as provider_last_name,
          CONCAT(pr.firstname, ' ', pr.lastname) as provider_name,
          pr.title as provider_title,
          pr.phone as provider_phone,
          pr.email as provider_email,
          -- Specialist data
          s.name as specialist_name,
          s.title as specialist_title,
          s.specialty_primary as specialist_specialty,
          s.practice_name as specialist_practice,
          s.phone as specialist_phone,
          s.fax as specialist_fax,
          s.email as specialist_email,
          CONCAT(s.address_line1, COALESCE(CONCAT(', ', s.address_line2), '')) as specialist_address,
          CONCAT(s.city, ', ', s.state, ' ', s.zip_code) as specialist_city_state_zip
        FROM referrals r
        LEFT JOIN user_profiles p ON r.patient_id = p.user_id
        LEFT JOIN user_profiles pr ON r.provider_id = pr.user_id
        LEFT JOIN referral_specialists s ON r.specialist_id = s.id
        WHERE r.id = ?
      `, [referralId]);

      return referralData[0] || null;

    } catch (error) {
      console.error('Error getting referral data:', error);
      throw error;
    }
  }

  /**
   * Get referral attachments
   */
  async getReferralAttachments(referralId) {
    try {
      const [attachments] = await db.execute(`
        SELECT * FROM referral_attachments 
        WHERE referral_id = ? 
        ORDER BY created_at
      `, [referralId]);

      return attachments;

    } catch (error) {
      console.error('Error getting referral attachments:', error);
      return [];
    }
  }

  /**
   * Add letterhead to PDF
   */
  async addLetterhead(doc, letterheadConfig) {
    try {
      if (letterheadConfig.logo) {
        // Add logo if configured
        doc.image(letterheadConfig.logo, 50, 50, { width: 100 });
      }

      if (letterheadConfig.organizationName) {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(letterheadConfig.organizationName, 200, 60);
      }

      if (letterheadConfig.address) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(letterheadConfig.address, 200, 85);
      }

      if (letterheadConfig.phone) {
        doc.text(`Phone: ${letterheadConfig.phone}`, 200, 100);
      }

      // Add separator line
      doc.moveTo(50, 130)
         .lineTo(550, 130)
         .stroke();

      // Move cursor down
      doc.y = 150;

    } catch (error) {
      console.error('Error adding letterhead:', error);
    }
  }

  /**
   * Add content to PDF with formatting
   */
  async addContentToPDF(doc, content, formattingOptions = {}) {
    try {
      const fontSize = formattingOptions.fontSize || 11;
      const lineHeight = formattingOptions.lineHeight || 1.5;

      doc.fontSize(fontSize)
         .font('Helvetica')
         .text(content, {
           width: 450,
           align: 'left',
           lineGap: fontSize * (lineHeight - 1)
         });

    } catch (error) {
      console.error('Error adding content to PDF:', error);
    }
  }

  /**
   * Add footer to PDF
   */
  async addFooter(doc, referralData, metadata) {
    try {
      const bottomMargin = 50;
      const pageHeight = doc.page.height;

      doc.fontSize(8)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, pageHeight - bottomMargin)
         .text(`Referral ID: ${referralData.referral_number}`, 300, pageHeight - bottomMargin)
         .text(`Page 1`, 500, pageHeight - bottomMargin);

    } catch (error) {
      console.error('Error adding footer:', error);
    }
  }

  /**
   * Add digital signature to PDF
   */
  async addDigitalSignature(doc, providerId, options = {}) {
    try {
      // This would integrate with digital signature service
      // For now, add a placeholder signature block
      
      const signatureY = doc.y + 40;
      
      doc.fontSize(10)
         .text('Electronically signed by:', 50, signatureY)
         .text(`Provider ID: ${providerId}`, 50, signatureY + 15)
         .text(`Signed on: ${new Date().toLocaleString()}`, 50, signatureY + 30);

      // Add signature line
      doc.moveTo(50, signatureY + 50)
         .lineTo(250, signatureY + 50)
         .stroke();

    } catch (error) {
      console.error('Error adding digital signature:', error);
    }
  }

  /**
   * Generate HTML letterhead
   */
  generateHTMLLetterhead(letterheadConfig) {
    let letterheadHTML = '<div class="letterhead">';
    
    if (letterheadConfig.organizationName) {
      letterheadHTML += `<h1>${letterheadConfig.organizationName}</h1>`;
    }
    
    if (letterheadConfig.address) {
      letterheadHTML += `<p>${letterheadConfig.address}</p>`;
    }
    
    if (letterheadConfig.phone) {
      letterheadHTML += `<p>Phone: ${letterheadConfig.phone}</p>`;
    }
    
    letterheadHTML += '</div>';
    return letterheadHTML;
  }

  /**
   * Generate text letterhead
   */
  generateTextLetterhead(letterheadConfig) {
    let letterhead = '';
    
    if (letterheadConfig.organizationName) {
      letterhead += letterheadConfig.organizationName + '\n';
    }
    
    if (letterheadConfig.address) {
      letterhead += letterheadConfig.address + '\n';
    }
    
    if (letterheadConfig.phone) {
      letterhead += `Phone: ${letterheadConfig.phone}\n`;
    }
    
    letterhead += '='.repeat(50);
    return letterhead;
  }

  /**
   * Format HTML content
   */
  formatHTMLContent(content) {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }

  /**
   * Create document package with attachments
   */
  async createDocumentPackage(mainDocument, attachments, options = {}) {
    try {
      // This would create a ZIP package or combined PDF
      // For now, return the main document with attachment metadata
      
      return {
        ...mainDocument.document,
        attachments: attachments.map(att => ({
          filename: att.file_name,
          type: att.attachment_type,
          size: att.file_size
        }))
      };

    } catch (error) {
      console.error('Error creating document package:', error);
      throw error;
    }
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Log document generation activity
   */
  async logDocumentGeneration(referralId, templateId, format, filePath, userId) {
    try {
      await db.execute(`
        INSERT INTO referral_audit_logs (
          referral_id, user_id, action, entity_type, entity_id,
          new_values, created_at
        ) VALUES (?, ?, 'DOCUMENT_GENERATED', 'document', ?, ?, NOW())
      `, [
        referralId,
        userId,
        referralId,
        JSON.stringify({
          templateId,
          format,
          filePath,
          generatedAt: new Date().toISOString()
        })
      ]);
    } catch (error) {
      console.error('Error logging document generation:', error);
    }
  }

  /**
   * Get document generation statistics
   */
  async getGenerationStatistics(dateRange = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
      } = dateRange;

      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as total_generated,
          COUNT(DISTINCT referral_id) as unique_referrals,
          COUNT(DISTINCT user_id) as unique_users,
          JSON_EXTRACT(new_values, '$.format') as format,
          COUNT(*) as format_count
        FROM referral_audit_logs 
        WHERE action = 'DOCUMENT_GENERATED'
        AND created_at BETWEEN ? AND ?
        GROUP BY JSON_EXTRACT(new_values, '$.format')
      `, [startDate, endDate]);

      return {
        dateRange: { startDate, endDate },
        statistics: stats,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting generation statistics:', error);
      throw error;
    }
  }
}

module.exports = new DocumentGenerationEngine();