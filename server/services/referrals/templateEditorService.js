const db = require('../../config/db');
const templateService = require('./templateService');

/**
 * Template Editor Service
 * Advanced template editing, validation, and management capabilities
 */

class TemplateEditorService {
  constructor() {
    this.editorSessions = new Map();
    this.autoSaveInterval = 30000; // 30 seconds
    this.versionHistory = new Map();
    this.collaborativeEditing = new Map();
  }

  /**
   * Create new template editor session
   */
  async createEditorSession(userId, templateId = null, options = {}) {
    try {
      const sessionId = this.generateSessionId();
      
      let templateData = null;
      if (templateId) {
        templateData = await templateService.getTemplateById(templateId);
        if (!templateData) {
          throw new Error('Template not found');
        }
      }

      const session = {
        sessionId,
        userId,
        templateId,
        templateData,
        isNew: !templateId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        autoSaveEnabled: options.autoSave !== false,
        collaborators: new Set([userId]),
        changes: [],
        currentContent: templateData?.content_template || '',
        isDirty: false
      };

      this.editorSessions.set(sessionId, session);

      // Start auto-save if enabled
      if (session.autoSaveEnabled) {
        this.startAutoSave(sessionId);
      }

      return {
        success: true,
        sessionId,
        session: this.getSessionInfo(session),
        message: 'Editor session created successfully'
      };

    } catch (error) {
      console.error('Error creating editor session:', error);
      throw error;
    }
  }

  /**
   * Update template content in editor session
   */
  async updateSessionContent(sessionId, content, userId, options = {}) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      // Verify user has access to session
      if (!session.collaborators.has(userId)) {
        throw new Error('Access denied to editor session');
      }

      // Record change
      const change = {
        timestamp: new Date().toISOString(),
        userId,
        type: 'content_update',
        oldContent: session.currentContent,
        newContent: content,
        changeSize: Math.abs(content.length - session.currentContent.length)
      };

      session.changes.push(change);
      session.currentContent = content;
      session.lastModified = new Date().toISOString();
      session.isDirty = true;

      // Validate content if requested
      let validationResult = null;
      if (options.validate) {
        validationResult = await this.validateSessionContent(sessionId);
      }

      // Notify other collaborators
      await this.notifyCollaborators(sessionId, userId, 'content_updated', {
        changeSize: change.changeSize,
        timestamp: change.timestamp
      });

      return {
        success: true,
        session: this.getSessionInfo(session),
        validation: validationResult,
        message: 'Content updated successfully'
      };

    } catch (error) {
      console.error('Error updating session content:', error);
      throw error;
    }
  }

  /**
   * Validate template content in session
   */
  async validateSessionContent(sessionId) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      // Get template specialty for validation context
      const specialty = session.templateData?.specialty || 'General';

      // Validate using template service
      const validationResult = await templateService.validateTemplate(
        session.currentContent, 
        specialty
      );

      // Add session-specific validation
      const sessionValidation = await this.validateSessionSpecific(session);
      
      return {
        ...validationResult,
        sessionValidation,
        validatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error validating session content:', error);
      throw error;
    }
  }

  /**
   * Save template from editor session
   */
  async saveTemplate(sessionId, saveData, userId) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      // Verify user has access
      if (!session.collaborators.has(userId)) {
        throw new Error('Access denied to save template');
      }

      // Validate content before saving
      const validationResult = await this.validateSessionContent(sessionId);
      if (!validationResult.isValid) {
        throw new Error(`Template validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Prepare template data
      const templateData = {
        name: saveData.name || session.templateData?.name || 'Untitled Template',
        specialty: saveData.specialty || session.templateData?.specialty || 'General',
        templateType: saveData.templateType || session.templateData?.template_type || 'letter',
        contentTemplate: session.currentContent,
        formattingOptions: saveData.formattingOptions || session.templateData?.formatting_options || {},
        letterheadConfig: saveData.letterheadConfig || session.templateData?.letterhead_config || {},
        signatureConfig: saveData.signatureConfig || session.templateData?.signature_config || {},
        isDefault: saveData.isDefault || false,
        ipAddress: saveData.ipAddress,
        userAgent: saveData.userAgent
      };

      let result;
      if (session.isNew) {
        // Create new template
        result = await templateService.createTemplate(templateData, userId);
        session.templateId = result.template.id;
        session.isNew = false;
      } else {
        // Update existing template
        result = await templateService.updateTemplate(session.templateId, templateData, userId);
      }

      // Update session
      session.templateData = result.template;
      session.isDirty = false;
      session.lastSaved = new Date().toISOString();

      // Create version snapshot
      await this.createVersionSnapshot(sessionId, userId, 'manual_save');

      return {
        success: true,
        template: result.template,
        session: this.getSessionInfo(session),
        message: 'Template saved successfully'
      };

    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Preview template from editor session
   */
  async previewTemplate(sessionId, sampleData = null) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      // Create temporary template object for preview
      const tempTemplate = {
        id: 'preview',
        name: 'Preview',
        specialty: session.templateData?.specialty || 'General',
        template_type: 'letter',
        content_template: session.currentContent,
        variables: '[]',
        formatting_options: session.templateData?.formatting_options || '{}',
        letterhead_config: session.templateData?.letterhead_config || '{}',
        signature_config: session.templateData?.signature_config || '{}',
        version: '1.0'
      };

      // Generate preview using template service
      const previewResult = await templateService.previewTemplate(tempTemplate.id, sampleData);

      // Override with our temporary template
      previewResult.template = tempTemplate;
      previewResult.content = await templateService.populateTemplate(tempTemplate, sampleData || await templateService.generateSampleData(tempTemplate.specialty), { preview: true });

      return {
        success: true,
        preview: previewResult,
        sessionId
      };

    } catch (error) {
      console.error('Error previewing template:', error);
      throw error;
    }
  }

  /**
   * Add collaborator to editor session
   */
  async addCollaborator(sessionId, collaboratorUserId, invitedBy) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      // Verify inviter has access
      if (!session.collaborators.has(invitedBy)) {
        throw new Error('Access denied to invite collaborators');
      }

      // Add collaborator
      session.collaborators.add(collaboratorUserId);

      // Log collaboration event
      const collaborationEvent = {
        timestamp: new Date().toISOString(),
        type: 'collaborator_added',
        userId: collaboratorUserId,
        invitedBy: invitedBy
      };

      session.changes.push(collaborationEvent);

      // Notify all collaborators
      await this.notifyCollaborators(sessionId, invitedBy, 'collaborator_added', {
        newCollaborator: collaboratorUserId
      });

      return {
        success: true,
        collaborators: Array.from(session.collaborators),
        message: 'Collaborator added successfully'
      };

    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  }

  /**
   * Get template suggestions based on content
   */
  async getTemplateSuggestions(sessionId, context = {}) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      const suggestions = {
        variables: await this.suggestVariables(session, context),
        content: await this.suggestContent(session, context),
        formatting: await this.suggestFormatting(session, context),
        improvements: await this.suggestImprovements(session, context)
      };

      return {
        success: true,
        suggestions,
        sessionId
      };

    } catch (error) {
      console.error('Error getting template suggestions:', error);
      throw error;
    }
  }

  /**
   * Auto-save template content
   */
  async autoSaveTemplate(sessionId) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session || !session.isDirty || !session.autoSaveEnabled) {
        return;
      }

      // Create auto-save version
      await this.createVersionSnapshot(sessionId, session.userId, 'auto_save');

      session.isDirty = false;
      session.lastAutoSave = new Date().toISOString();

      console.log(`Auto-saved template session: ${sessionId}`);

    } catch (error) {
      console.error('Error auto-saving template:', error);
    }
  }

  /**
   * Close editor session
   */
  async closeEditorSession(sessionId, userId, options = {}) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      // Check if user has unsaved changes
      if (session.isDirty && options.force !== true) {
        return {
          success: false,
          hasUnsavedChanges: true,
          message: 'Session has unsaved changes. Use force=true to close anyway.'
        };
      }

      // Stop auto-save
      this.stopAutoSave(sessionId);

      // Create final version snapshot if there are changes
      if (session.changes.length > 0) {
        await this.createVersionSnapshot(sessionId, userId, 'session_close');
      }

      // Remove session
      this.editorSessions.delete(sessionId);

      return {
        success: true,
        message: 'Editor session closed successfully'
      };

    } catch (error) {
      console.error('Error closing editor session:', error);
      throw error;
    }
  }

  /**
   * Get editor session history
   */
  async getSessionHistory(sessionId, options = {}) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) {
        throw new Error('Editor session not found');
      }

      const {
        limit = 50,
        offset = 0,
        changeType = null
      } = options;

      let changes = session.changes;

      // Filter by change type if specified
      if (changeType) {
        changes = changes.filter(change => change.type === changeType);
      }

      // Apply pagination
      const paginatedChanges = changes
        .slice(offset, offset + limit)
        .reverse(); // Most recent first

      return {
        success: true,
        sessionId,
        changes: paginatedChanges,
        total: changes.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < changes.length
        }
      };

    } catch (error) {
      console.error('Error getting session history:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `EDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session info for client
   */
  getSessionInfo(session) {
    return {
      sessionId: session.sessionId,
      templateId: session.templateId,
      isNew: session.isNew,
      createdAt: session.createdAt,
      lastModified: session.lastModified,
      lastSaved: session.lastSaved,
      lastAutoSave: session.lastAutoSave,
      isDirty: session.isDirty,
      collaborators: Array.from(session.collaborators),
      changeCount: session.changes.length,
      contentLength: session.currentContent.length,
      autoSaveEnabled: session.autoSaveEnabled
    };
  }

  /**
   * Validate session-specific requirements
   */
  async validateSessionSpecific(session) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // Check content length
    if (session.currentContent.length < 50) {
      validation.warnings.push('Template content is very short');
    }

    if (session.currentContent.length > 10000) {
      validation.warnings.push('Template content is very long and may affect performance');
    }

    // Check for common issues
    if (!session.currentContent.includes('{{patient_name}}')) {
      validation.warnings.push('Template does not include patient name variable');
    }

    if (!session.currentContent.includes('{{referral_reason}}')) {
      validation.warnings.push('Template does not include referral reason variable');
    }

    // Check for potential formatting issues
    const lines = session.currentContent.split('\n');
    if (lines.some(line => line.length > 120)) {
      validation.warnings.push('Some lines are very long and may not format well');
    }

    return validation;
  }

  /**
   * Suggest variables based on content and context
   */
  async suggestVariables(session, context) {
    const suggestions = [];
    const content = session.currentContent.toLowerCase();
    const specialty = session.templateData?.specialty || context.specialty || 'General';

    // Suggest common variables based on content analysis
    if (content.includes('patient') && !content.includes('{{patient_name}}')) {
      suggestions.push({
        variable: 'patient_name',
        reason: 'Content mentions patient but no patient name variable found',
        priority: 'high'
      });
    }

    if (content.includes('doctor') || content.includes('provider')) {
      if (!content.includes('{{provider_name}}')) {
        suggestions.push({
          variable: 'provider_name',
          reason: 'Content mentions provider but no provider name variable found',
          priority: 'high'
        });
      }
    }

    // Specialty-specific suggestions
    const specialtyVariables = this.getSpecialtySpecificVariables(specialty);
    for (const variable of specialtyVariables) {
      if (!content.includes(`{{${variable}}}`)) {
        suggestions.push({
          variable: variable,
          reason: `Commonly used in ${specialty} referrals`,
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * Suggest content improvements
   */
  async suggestContent(session, context) {
    const suggestions = [];
    const content = session.currentContent;

    // Analyze content structure
    if (!content.includes('Dear ')) {
      suggestions.push({
        type: 'greeting',
        suggestion: 'Consider adding a greeting like "Dear {{specialist_name}}"',
        priority: 'medium'
      });
    }

    if (!content.includes('Sincerely') && !content.includes('Best regards')) {
      suggestions.push({
        type: 'closing',
        suggestion: 'Consider adding a professional closing',
        priority: 'low'
      });
    }

    // Check for medical necessity documentation
    if (!content.includes('medical necessity') && !content.includes('clinically indicated')) {
      suggestions.push({
        type: 'medical_necessity',
        suggestion: 'Consider adding medical necessity justification',
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Suggest formatting improvements
   */
  async suggestFormatting(session, context) {
    const suggestions = [];
    const content = session.currentContent;

    // Check paragraph structure
    const paragraphs = content.split('\n\n');
    if (paragraphs.length < 3) {
      suggestions.push({
        type: 'paragraphs',
        suggestion: 'Consider breaking content into more paragraphs for better readability',
        priority: 'low'
      });
    }

    // Check for proper spacing
    if (content.includes('\n\n\n')) {
      suggestions.push({
        type: 'spacing',
        suggestion: 'Remove excessive line breaks for cleaner formatting',
        priority: 'low'
      });
    }

    return suggestions;
  }

  /**
   * Suggest general improvements
   */
  async suggestImprovements(session, context) {
    const suggestions = [];

    // Analyze template usage patterns
    if (session.templateData?.id) {
      const usage = await templateService.getTemplateUsageStatistics(session.templateData.id);
      
      if (usage.summary.total_usage === 0) {
        suggestions.push({
          type: 'usage',
          suggestion: 'This template has not been used yet. Consider testing with sample data.',
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get specialty-specific variables
   */
  getSpecialtySpecificVariables(specialty) {
    const specialtyVars = {
      'Cardiology': ['vital_signs', 'medications', 'cardiac_history', 'ecg_results'],
      'Orthopedics': ['injury_details', 'pain_level', 'mobility_status', 'imaging_results'],
      'Mental Health': ['mental_status', 'risk_assessment', 'current_medications', 'therapy_history'],
      'Surgery': ['procedure_requested', 'surgical_history', 'anesthesia_notes', 'pre_op_clearance']
    };

    return specialtyVars[specialty] || ['clinical_notes', 'medications', 'allergies'];
  }

  /**
   * Create version snapshot
   */
  async createVersionSnapshot(sessionId, userId, snapshotType) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) return;

      const snapshot = {
        sessionId,
        userId,
        snapshotType,
        content: session.currentContent,
        timestamp: new Date().toISOString(),
        changeCount: session.changes.length
      };

      // Store in version history
      if (!this.versionHistory.has(sessionId)) {
        this.versionHistory.set(sessionId, []);
      }
      
      this.versionHistory.get(sessionId).push(snapshot);

      // Keep only last 50 versions
      const versions = this.versionHistory.get(sessionId);
      if (versions.length > 50) {
        versions.splice(0, versions.length - 50);
      }

    } catch (error) {
      console.error('Error creating version snapshot:', error);
    }
  }

  /**
   * Start auto-save for session
   */
  startAutoSave(sessionId) {
    const intervalId = setInterval(() => {
      this.autoSaveTemplate(sessionId);
    }, this.autoSaveInterval);

    // Store interval ID for cleanup
    const session = this.editorSessions.get(sessionId);
    if (session) {
      session.autoSaveIntervalId = intervalId;
    }
  }

  /**
   * Stop auto-save for session
   */
  stopAutoSave(sessionId) {
    const session = this.editorSessions.get(sessionId);
    if (session && session.autoSaveIntervalId) {
      clearInterval(session.autoSaveIntervalId);
      delete session.autoSaveIntervalId;
    }
  }

  /**
   * Notify collaborators of changes
   */
  async notifyCollaborators(sessionId, excludeUserId, eventType, eventData) {
    try {
      const session = this.editorSessions.get(sessionId);
      if (!session) return;

      // This would integrate with real-time notification system (WebSocket, etc.)
      console.log(`Notifying collaborators of ${eventType} in session ${sessionId}`);

    } catch (error) {
      console.error('Error notifying collaborators:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.editorSessions) {
      const sessionAge = now - new Date(session.createdAt);
      
      if (sessionAge > maxAge) {
        this.stopAutoSave(sessionId);
        this.editorSessions.delete(sessionId);
        this.versionHistory.delete(sessionId);
        console.log(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }
}

module.exports = new TemplateEditorService();