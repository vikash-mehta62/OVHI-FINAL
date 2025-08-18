const db = require('../../config/db');
const crypto = require('crypto');

/**
 * Template Management Service
 * Comprehensive referral letter template management with dynamic content generation
 */

class TemplateService {
  constructor() {
    this.validTemplateTypes = ['letter', 'form', 'summary', 'authorization'];
    this.validVariableTypes = ['text', 'date', 'number', 'boolean', 'list', 'patient_data', 'provider_data', 'specialist_data'];
    this.systemVariables = new Map();
    this.initializeSystemVariables();
  }

  /**
   * Initialize system-wide template variables
   */
  initializeSystemVariables() {
    // Patient variables
    this.systemVariables.set('patient_variables', [
      'patient_name', 'patient_first_name', 'patient_last_name', 'patient_dob',
      'patient_age', 'patient_gender', 'patient_phone', 'patient_email',
      'patient_address', 'patient_city', 'patient_state', 'patient_zip',
      'patient_mrn', 'patient_insurance', 'patient_id'
    ]);

    // Provider variables
    this.systemVariables.set('provider_variables', [
      'provider_name', 'provider_first_name', 'provider_last_name', 'provider_title',
      'provider_specialty', 'provider_npi', 'provider_phone', 'provider_fax',
      'provider_email', 'provider_license', 'provider_signature'
    ]);

    // Specialist variables
    this.systemVariables.set('specialist_variables', [
      'specialist_name', 'specialist_title', 'specialist_specialty', 'specialist_practice',
      'specialist_phone', 'specialist_fax', 'specialist_email', 'specialist_address',
      'specialist_npi'
    ]);

    // Organization variables
    this.systemVariables.set('organization_variables', [
      'organization_name', 'organization_address', 'organization_phone', 'organization_fax',
      'organization_email', 'organization_logo', 'organization_letterhead'
    ]);

    // Referral variables
    this.systemVariables.set('referral_variables', [
      'referral_number', 'referral_date', 'referral_reason', 'clinical_notes',
      'urgency_level', 'appointment_type', 'diagnosis_codes', 'procedure_codes',
      'medications', 'allergies', 'vital_signs', 'lab_results'
    ]);

    // System variables
    this.systemVariables.set('system_variables', [
      'current_date', 'current_time', 'current_datetime', 'current_year',
      'current_month', 'current_day'
    ]);
  }

  /**
   * Create new template
   */
  async createTemplate(templateData, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Validate template data
      this.validateTemplateData(templateData);

      // Generate unique template ID
      const templateId = this.generateTemplateId();

      // Parse and validate template variables
      const variables = await this.parseTemplateVariables(templateData.contentTemplate);
      const validatedVariables = await this.validateTemplateVariables(variables);

      // Insert template record
      const [result] = await connection.execute(`
        INSERT INTO referral_templates (
          id, name, specialty, template_type, content_template,
          variables, formatting_options, letterhead_config, signature_config,
          is_default, is_active, created_by, version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, '1.0', NOW())
      `, [
        templateId,
        templateData.name,
        templateData.specialty,
        templateData.templateType || 'letter',
        templateData.contentTemplate,
        JSON.stringify(validatedVariables),
        JSON.stringify(templateData.formattingOptions || {}),
        JSON.stringify(templateData.letterheadConfig || {}),
        JSON.stringify(templateData.signatureConfig || {}),
        templateData.isDefault || false,
        userId
      ]);

      // Add template variables to variables table
      await this.addTemplateVariables(templateId, validatedVariables, connection);

      // If this is set as default, unset other defaults for the same specialty
      if (templateData.isDefault) {
        await this.updateDefaultTemplate(templateData.specialty, templateId, connection);
      }

      await connection.commit();

      // Get complete template data
      const template = await this.getTemplateById(templateId);

      // Log audit trail
      await this.logTemplateAudit({
        userId,
        action: 'TEMPLATE_CREATED',
        templateId,
        newValues: template,
        ipAddress: templateData.ipAddress,
        userAgent: templateData.userAgent
      });

      return {
        success: true,
        template,
        message: 'Template created successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error creating template:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(templateId, updateData, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current template
      const currentTemplate = await this.getTemplateById(templateId, connection);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      // Validate update data
      this.validateTemplateUpdateData(updateData);

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      const fieldMappings = {
        name: 'name',
        specialty: 'specialty',
        templateType: 'template_type',
        contentTemplate: 'content_template',
        formattingOptions: 'formatting_options',
        letterheadConfig: 'letterhead_config',
        signatureConfig: 'signature_config',
        isDefault: 'is_default',
        isActive: 'is_active'
      };

      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (updateData.hasOwnProperty(key)) {
          updateFields.push(`${dbField} = ?`);
          
          // Handle JSON fields
          if (['formattingOptions', 'letterheadConfig', 'signatureConfig'].includes(key)) {
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateValues.push(updateData[key]);
          }
        }
      }

      // Handle content template and variables update
      if (updateData.contentTemplate) {
        const variables = await this.parseTemplateVariables(updateData.contentTemplate);
        const validatedVariables = await this.validateTemplateVariables(variables);
        
        updateFields.push('variables = ?');
        updateValues.push(JSON.stringify(validatedVariables));

        // Update template variables table
        await this.updateTemplateVariables(templateId, validatedVariables, connection);
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Increment version
      updateFields.push('version = CONCAT(SUBSTRING_INDEX(version, ".", 1), ".", CAST(SUBSTRING_INDEX(version, ".", -1) AS UNSIGNED) + 1)');
      updateFields.push('updated_at = NOW()');
      updateValues.push(templateId);

      // Execute update
      await connection.execute(`
        UPDATE referral_templates 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      // Handle default template update
      if (updateData.isDefault) {
        const specialty = updateData.specialty || currentTemplate.specialty;
        await this.updateDefaultTemplate(specialty, templateId, connection);
      }

      await connection.commit();

      // Get updated template data
      const updatedTemplate = await this.getTemplateById(templateId);

      // Log audit trail
      await this.logTemplateAudit({
        userId,
        action: 'TEMPLATE_UPDATED',
        templateId,
        oldValues: currentTemplate,
        newValues: updatedTemplate,
        ipAddress: updateData.ipAddress,
        userAgent: updateData.userAgent
      });

      return {
        success: true,
        template: updatedTemplate,
        message: 'Template updated successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error updating template:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get template by ID with complete details
   */
  async getTemplateById(templateId, connection = null) {
    try {
      const conn = connection || db;

      const [templates] = await conn.execute(`
        SELECT * FROM referral_templates WHERE id = ?
      `, [templateId]);

      if (templates.length === 0) {
        return null;
      }

      const template = templates[0];

      // Get template variables
      const [variables] = await conn.execute(`
        SELECT * FROM referral_template_variables 
        WHERE template_id = ? 
        ORDER BY display_order, variable_name
      `, [templateId]);

      // Parse JSON fields
      template.variables = JSON.parse(template.variables || '[]');
      template.formatting_options = JSON.parse(template.formatting_options || '{}');
      template.letterhead_config = JSON.parse(template.letterhead_config || '{}');
      template.signature_config = JSON.parse(template.signature_config || '{}');

      return {
        ...template,
        templateVariables: variables
      };

    } catch (error) {
      console.error('Error getting template by ID:', error);
      throw error;
    }
  }

  /**
   * Get templates by specialty
   */
  async getTemplatesBySpecialty(specialty, includeGeneral = true) {
    try {
      let query = `
        SELECT 
          t.*,
          COUNT(CASE WHEN r.id IS NOT NULL THEN 1 END) as usage_count
        FROM referral_templates t
        LEFT JOIN referrals r ON r.template_id = t.id
        WHERE t.is_active = TRUE
      `;

      const params = [];

      if (includeGeneral) {
        query += ` AND (t.specialty = ? OR t.specialty = 'General')`;
        params.push(specialty);
      } else {
        query += ` AND t.specialty = ?`;
        params.push(specialty);
      }

      query += ` GROUP BY t.id ORDER BY t.is_default DESC, usage_count DESC, t.name`;

      const [templates] = await db.execute(query, params);

      // Parse JSON fields for each template
      return templates.map(template => ({
        ...template,
        variables: JSON.parse(template.variables || '[]'),
        formatting_options: JSON.parse(template.formatting_options || '{}'),
        letterhead_config: JSON.parse(template.letterhead_config || '{}'),
        signature_config: JSON.parse(template.signature_config || '{}')
      }));

    } catch (error) {
      console.error('Error getting templates by specialty:', error);
      throw error;
    }
  }

  /**
   * Generate document from template
   */
  async generateDocument(templateId, referralData, options = {}) {
    try {
      // Get template
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get referral data if not provided
      let completeReferralData = referralData;
      if (referralData.referralId && !referralData.patient_name) {
        completeReferralData = await this.getReferralDataForTemplate(referralData.referralId);
      }

      // Generate document content
      const documentContent = await this.populateTemplate(template, completeReferralData, options);

      // Apply formatting
      const formattedContent = await this.applyFormatting(documentContent, template.formatting_options, options);

      // Generate metadata
      const metadata = {
        templateId: templateId,
        templateName: template.name,
        templateVersion: template.version,
        generatedAt: new Date().toISOString(),
        generatedBy: options.userId,
        referralId: completeReferralData.referralId || completeReferralData.id,
        documentType: template.template_type
      };

      return {
        success: true,
        content: formattedContent,
        metadata: metadata,
        template: template
      };

    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(templateId, sampleData = null) {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Use provided sample data or generate default sample data
      const previewData = sampleData || await this.generateSampleData(template.specialty);

      // Generate preview content
      const previewContent = await this.populateTemplate(template, previewData, { preview: true });

      return {
        success: true,
        content: previewContent,
        template: template,
        sampleData: previewData
      };

    } catch (error) {
      console.error('Error previewing template:', error);
      throw error;
    }
  }

  /**
   * Validate template syntax and variables
   */
  async validateTemplate(templateContent, specialty = 'General') {
    try {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        variables: []
      };

      // Parse variables from template
      const variables = await this.parseTemplateVariables(templateContent);
      validationResult.variables = variables;

      // Validate variable syntax
      for (const variable of variables) {
        if (!this.isValidVariableName(variable)) {
          validationResult.errors.push(`Invalid variable name: ${variable}`);
        }

        if (!this.isSystemVariable(variable) && !this.isCustomVariable(variable)) {
          validationResult.warnings.push(`Unknown variable: ${variable}. Consider defining it as a custom variable.`);
        }
      }

      // Check for required variables based on specialty
      const requiredVariables = this.getRequiredVariablesForSpecialty(specialty);
      for (const required of requiredVariables) {
        if (!variables.includes(required)) {
          validationResult.warnings.push(`Missing recommended variable for ${specialty}: ${required}`);
        }
      }

      // Validate template structure
      const structureValidation = this.validateTemplateStructure(templateContent);
      if (!structureValidation.isValid) {
        validationResult.errors.push(...structureValidation.errors);
      }

      validationResult.isValid = validationResult.errors.length === 0;

      return validationResult;

    } catch (error) {
      console.error('Error validating template:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        variables: []
      };
    }
  }

  /**
   * Clone template with modifications
   */
  async cloneTemplate(templateId, cloneData, userId) {
    try {
      // Get original template
      const originalTemplate = await this.getTemplateById(templateId);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      // Prepare clone data
      const templateData = {
        name: cloneData.name || `${originalTemplate.name} (Copy)`,
        specialty: cloneData.specialty || originalTemplate.specialty,
        templateType: cloneData.templateType || originalTemplate.template_type,
        contentTemplate: cloneData.contentTemplate || originalTemplate.content_template,
        formattingOptions: cloneData.formattingOptions || originalTemplate.formatting_options,
        letterheadConfig: cloneData.letterheadConfig || originalTemplate.letterhead_config,
        signatureConfig: cloneData.signatureConfig || originalTemplate.signature_config,
        isDefault: false, // Clones are never default
        ipAddress: cloneData.ipAddress,
        userAgent: cloneData.userAgent
      };

      // Create the cloned template
      const result = await this.createTemplate(templateData, userId);

      // Log clone activity
      await this.logTemplateAudit({
        userId,
        action: 'TEMPLATE_CLONED',
        templateId: result.template.id,
        newValues: { clonedFrom: templateId, ...result.template }
      });

      return result;

    } catch (error) {
      console.error('Error cloning template:', error);
      throw error;
    }
  }

  /**
   * Deactivate template
   */
  async deactivateTemplate(templateId, reason, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current template
      const template = await this.getTemplateById(templateId, connection);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if template is in use
      const [activeUsage] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM referrals 
        WHERE template_id = ? AND status IN ('draft', 'pending', 'sent')
      `, [templateId]);

      if (activeUsage[0].count > 0) {
        throw new Error(`Cannot deactivate template with ${activeUsage[0].count} active referrals`);
      }

      // Deactivate template
      await connection.execute(`
        UPDATE referral_templates 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ?
      `, [templateId]);

      // If this was the default template, find another to set as default
      if (template.is_default) {
        await this.assignNewDefaultTemplate(template.specialty, connection);
      }

      await connection.commit();

      // Log audit trail
      await this.logTemplateAudit({
        userId,
        action: 'TEMPLATE_DEACTIVATED',
        templateId,
        oldValues: { is_active: true },
        newValues: { is_active: false, reason }
      });

      return {
        success: true,
        message: 'Template deactivated successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error deactivating template:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStatistics(templateId, dateRange = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
      } = dateRange;

      // Get usage statistics
      const [usage] = await db.execute(`
        SELECT 
          COUNT(*) as total_usage,
          COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_referrals,
          COUNT(DISTINCT r.provider_id) as unique_providers,
          COUNT(DISTINCT r.specialist_id) as unique_specialists,
          AVG(DATEDIFF(COALESCE(r.completed_at, NOW()), r.created_at)) as avg_completion_days
        FROM referrals r
        WHERE r.template_id = ?
        AND r.created_at BETWEEN ? AND ?
      `, [templateId, startDate, endDate]);

      // Get usage by provider
      const [providerUsage] = await db.execute(`
        SELECT 
          r.provider_id,
          COUNT(*) as usage_count,
          COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_count
        FROM referrals r
        WHERE r.template_id = ?
        AND r.created_at BETWEEN ? AND ?
        GROUP BY r.provider_id
        ORDER BY usage_count DESC
        LIMIT 10
      `, [templateId, startDate, endDate]);

      // Get usage trends
      const [trends] = await db.execute(`
        SELECT 
          DATE(r.created_at) as usage_date,
          COUNT(*) as daily_usage
        FROM referrals r
        WHERE r.template_id = ?
        AND r.created_at BETWEEN ? AND ?
        GROUP BY DATE(r.created_at)
        ORDER BY usage_date
      `, [templateId, startDate, endDate]);

      return {
        templateId,
        dateRange: { startDate, endDate },
        summary: usage[0],
        providerUsage,
        trends,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting template usage statistics:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Parse template variables from content
   */
  async parseTemplateVariables(content) {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Validate template variables
   */
  async validateTemplateVariables(variables) {
    const validatedVariables = [];

    for (const variable of variables) {
      const variableInfo = {
        name: variable,
        type: this.getVariableType(variable),
        isSystem: this.isSystemVariable(variable),
        isRequired: this.isRequiredVariable(variable),
        defaultValue: this.getDefaultValue(variable)
      };

      validatedVariables.push(variableInfo);
    }

    return validatedVariables;
  }

  /**
   * Populate template with data
   */
  async populateTemplate(template, data, options = {}) {
    let content = template.content_template;

    // Get all variables from template
    const variables = JSON.parse(template.variables || '[]');

    for (const variableInfo of variables) {
      const placeholder = `{{${variableInfo.name}}}`;
      let value = '';

      // Get value from data or generate system value
      if (this.isSystemVariable(variableInfo.name)) {
        value = await this.getSystemVariableValue(variableInfo.name, data);
      } else {
        value = this.getDataValue(data, variableInfo.name) || variableInfo.defaultValue || '';
      }

      // Format value based on type
      value = this.formatVariableValue(value, variableInfo.type, options);

      // Replace placeholder with value
      content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Handle any remaining unmatched variables
    content = content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      console.warn(`Unmatched template variable: ${variable}`);
      return options.preview ? `[${variable}]` : '';
    });

    return content;
  }

  /**
   * Apply formatting to content
   */
  async applyFormatting(content, formattingOptions, options = {}) {
    let formattedContent = content;

    // Apply letterhead if configured
    if (formattingOptions.includeLetterhead && formattingOptions.letterheadTemplate) {
      formattedContent = formattingOptions.letterheadTemplate + '\n\n' + formattedContent;
    }

    // Apply signature if configured
    if (formattingOptions.includeSignature && formattingOptions.signatureTemplate) {
      formattedContent = formattedContent + '\n\n' + formattingOptions.signatureTemplate;
    }

    // Apply date formatting
    if (formattingOptions.dateFormat) {
      const dateRegex = /\d{4}-\d{2}-\d{2}/g;
      formattedContent = formattedContent.replace(dateRegex, (date) => {
        return this.formatDate(date, formattingOptions.dateFormat);
      });
    }

    // Apply line spacing
    if (formattingOptions.lineSpacing) {
      const spacing = '\n'.repeat(formattingOptions.lineSpacing - 1);
      formattedContent = formattedContent.replace(/\n/g, spacing + '\n');
    }

    return formattedContent;
  }

  /**
   * Get referral data for template population
   */
  async getReferralDataForTemplate(referralId) {
    try {
      const [referralData] = await db.execute(`
        SELECT 
          r.*,
          -- Patient data
          p.firstname as patient_first_name,
          p.lastname as patient_last_name,
          CONCAT(p.firstname, ' ', p.lastname) as patient_name,
          p.dob as patient_dob,
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
          CONCAT(s.address_line1, COALESCE(CONCAT(', ', s.address_line2), '')) as specialist_address
        FROM referrals r
        LEFT JOIN user_profiles p ON r.patient_id = p.user_id
        LEFT JOIN user_profiles pr ON r.provider_id = pr.user_id
        LEFT JOIN referral_specialists s ON r.specialist_id = s.id
        WHERE r.id = ?
      `, [referralId]);

      if (referralData.length === 0) {
        throw new Error('Referral not found');
      }

      return referralData[0];

    } catch (error) {
      console.error('Error getting referral data for template:', error);
      throw error;
    }
  }

  /**
   * Generate sample data for template preview
   */
  async generateSampleData(specialty) {
    const currentDate = new Date();
    
    return {
      // Patient data
      patient_name: 'John Doe',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      patient_dob: '1980-05-15',
      patient_age: '44',
      patient_phone: '555-123-4567',
      patient_email: 'john.doe@email.com',
      patient_mrn: 'MRN123456',
      
      // Provider data
      provider_name: 'Dr. Sarah Johnson',
      provider_first_name: 'Sarah',
      provider_last_name: 'Johnson',
      provider_title: 'MD',
      provider_specialty: 'Family Medicine',
      provider_phone: '555-987-6543',
      provider_email: 'sarah.johnson@clinic.com',
      
      // Specialist data
      specialist_name: 'Dr. Michael Specialist',
      specialist_title: 'MD',
      specialist_specialty: specialty,
      specialist_practice: 'Specialty Medical Center',
      specialist_phone: '555-456-7890',
      specialist_fax: '555-456-7891',
      specialist_email: 'michael.specialist@specialty.com',
      
      // Referral data
      referral_number: 'REF123456',
      referral_date: currentDate.toISOString().split('T')[0],
      referral_reason: `Evaluation and management of ${specialty.toLowerCase()} condition`,
      clinical_notes: 'Patient presents with symptoms requiring specialist evaluation. Please see attached records for complete history.',
      urgency_level: 'routine',
      appointment_type: 'consultation',
      
      // System data
      current_date: currentDate.toISOString().split('T')[0],
      current_time: currentDate.toTimeString().split(' ')[0],
      current_datetime: currentDate.toISOString(),
      current_year: currentDate.getFullYear().toString(),
      current_month: (currentDate.getMonth() + 1).toString().padStart(2, '0'),
      current_day: currentDate.getDate().toString().padStart(2, '0')
    };
  }

  /**
   * Get system variable value
   */
  async getSystemVariableValue(variableName, data) {
    const currentDate = new Date();
    
    switch (variableName) {
      case 'current_date':
        return currentDate.toISOString().split('T')[0];
      case 'current_time':
        return currentDate.toTimeString().split(' ')[0];
      case 'current_datetime':
        return currentDate.toISOString();
      case 'current_year':
        return currentDate.getFullYear().toString();
      case 'current_month':
        return (currentDate.getMonth() + 1).toString().padStart(2, '0');
      case 'current_day':
        return currentDate.getDate().toString().padStart(2, '0');
      default:
        return this.getDataValue(data, variableName) || '';
    }
  }

  /**
   * Get data value by path
   */
  getDataValue(data, path) {
    return data[path] || '';
  }

  /**
   * Format variable value based on type
   */
  formatVariableValue(value, type, options = {}) {
    if (!value) return '';

    switch (type) {
      case 'date':
        return this.formatDate(value, options.dateFormat || 'YYYY-MM-DD');
      case 'number':
        return parseFloat(value).toString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'list':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return value.toString();
    }
  }

  /**
   * Format date string
   */
  formatDate(dateString, format = 'YYYY-MM-DD') {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MMMM DD, YYYY':
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[date.getMonth()]} ${day}, ${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  // Validation Methods

  /**
   * Validate template data
   */
  validateTemplateData(data) {
    const required = ['name', 'specialty', 'contentTemplate'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.templateType && !this.validTemplateTypes.includes(data.templateType)) {
      throw new Error(`Invalid template type: ${data.templateType}`);
    }

    if (data.name.length < 3 || data.name.length > 200) {
      throw new Error('Template name must be between 3 and 200 characters');
    }

    if (data.contentTemplate.length < 10) {
      throw new Error('Template content is too short');
    }
  }

  /**
   * Validate template update data
   */
  validateTemplateUpdateData(data) {
    if (data.templateType && !this.validTemplateTypes.includes(data.templateType)) {
      throw new Error(`Invalid template type: ${data.templateType}`);
    }

    if (data.name && (data.name.length < 3 || data.name.length > 200)) {
      throw new Error('Template name must be between 3 and 200 characters');
    }

    if (data.contentTemplate && data.contentTemplate.length < 10) {
      throw new Error('Template content is too short');
    }
  }

  /**
   * Validate template structure
   */
  validateTemplateStructure(content) {
    const result = {
      isValid: true,
      errors: []
    };

    // Check for unmatched braces
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      result.isValid = false;
      result.errors.push('Unmatched template variable braces');
    }

    // Check for nested variables (not supported)
    if (content.includes('{{{') || content.includes('}}}')) {
      result.isValid = false;
      result.errors.push('Nested template variables are not supported');
    }

    return result;
  }

  /**
   * Check if variable name is valid
   */
  isValidVariableName(name) {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Check if variable is a system variable
   */
  isSystemVariable(name) {
    for (const [category, variables] of this.systemVariables) {
      if (variables.includes(name)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if variable is a custom variable
   */
  isCustomVariable(name) {
    // Custom variables typically start with 'custom_' or are defined in template
    return name.startsWith('custom_') || !this.isSystemVariable(name);
  }

  /**
   * Get variable type
   */
  getVariableType(name) {
    if (name.includes('date') || name.includes('dob')) return 'date';
    if (name.includes('age') || name.includes('count') || name.includes('number')) return 'number';
    if (name.includes('is_') || name.includes('has_') || name.includes('accepts_')) return 'boolean';
    if (name.includes('list') || name.includes('codes') || name.includes('medications')) return 'list';
    return 'text';
  }

  /**
   * Check if variable is required
   */
  isRequiredVariable(name) {
    const requiredVariables = [
      'patient_name', 'provider_name', 'referral_reason', 'current_date'
    ];
    return requiredVariables.includes(name);
  }

  /**
   * Get default value for variable
   */
  getDefaultValue(name) {
    const defaults = {
      'current_date': new Date().toISOString().split('T')[0],
      'urgency_level': 'routine',
      'appointment_type': 'consultation'
    };
    return defaults[name] || '';
  }

  /**
   * Get required variables for specialty
   */
  getRequiredVariablesForSpecialty(specialty) {
    const baseRequired = ['patient_name', 'provider_name', 'referral_reason', 'current_date'];
    
    const specialtyRequired = {
      'Cardiology': [...baseRequired, 'vital_signs', 'medications'],
      'Orthopedics': [...baseRequired, 'injury_details', 'pain_level'],
      'Mental Health': [...baseRequired, 'mental_status', 'risk_assessment'],
      'Surgery': [...baseRequired, 'procedure_requested', 'medical_necessity']
    };

    return specialtyRequired[specialty] || baseRequired;
  }

  // Database Helper Methods

  /**
   * Add template variables to database
   */
  async addTemplateVariables(templateId, variables, connection) {
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      await connection.execute(`
        INSERT INTO referral_template_variables (
          template_id, variable_name, variable_type, default_value,
          is_required, validation_rules, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        templateId,
        variable.name,
        variable.type,
        variable.defaultValue || null,
        variable.isRequired || false,
        JSON.stringify({}),
        i + 1
      ]);
    }
  }

  /**
   * Update template variables
   */
  async updateTemplateVariables(templateId, variables, connection) {
    // Delete existing variables
    await connection.execute(`
      DELETE FROM referral_template_variables WHERE template_id = ?
    `, [templateId]);

    // Add new variables
    await this.addTemplateVariables(templateId, variables, connection);
  }

  /**
   * Update default template for specialty
   */
  async updateDefaultTemplate(specialty, newDefaultId, connection) {
    // Unset current default
    await connection.execute(`
      UPDATE referral_templates 
      SET is_default = FALSE 
      WHERE specialty = ? AND is_default = TRUE AND id != ?
    `, [specialty, newDefaultId]);

    // Set new default
    await connection.execute(`
      UPDATE referral_templates 
      SET is_default = TRUE 
      WHERE id = ?
    `, [newDefaultId]);
  }

  /**
   * Assign new default template when current default is deactivated
   */
  async assignNewDefaultTemplate(specialty, connection) {
    const [candidates] = await connection.execute(`
      SELECT id FROM referral_templates 
      WHERE specialty = ? AND is_active = TRUE 
      ORDER BY created_at ASC 
      LIMIT 1
    `, [specialty]);

    if (candidates.length > 0) {
      await connection.execute(`
        UPDATE referral_templates 
        SET is_default = TRUE 
        WHERE id = ?
      `, [candidates[0].id]);
    }
  }

  /**
   * Generate unique template ID
   */
  generateTemplateId() {
    return `TMPL_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Log template audit trail
   */
  async logTemplateAudit(auditData) {
    try {
      await db.execute(`
        INSERT INTO referral_audit_logs (
          user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, created_at
        ) VALUES (?, ?, 'template', ?, ?, ?, ?, ?, NOW())
      `, [
        auditData.userId,
        auditData.action,
        auditData.templateId,
        JSON.stringify(auditData.oldValues || {}),
        JSON.stringify(auditData.newValues || {}),
        auditData.ipAddress || null,
        auditData.userAgent || null
      ]);
    } catch (error) {
      console.error('Error logging template audit:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

module.exports = new TemplateService();