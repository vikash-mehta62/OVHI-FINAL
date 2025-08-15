const connection = require('../../config/database');
const { validationResult } = require('express-validator');

// Get specialty configuration for a provider
const getSpecialtyConfiguration = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get provider's specialty information
    const [providerInfo] = await connection.query(`
      SELECT 
        up.specialty,
        up.subspecialty,
        ps.practice_type,
        ps.services_offered
      FROM user_profiles up
      LEFT JOIN practice_settings ps ON ps.provider_id = up.fk_userid
      WHERE up.fk_userid = ?
    `, [user_id]);

    if (providerInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider information not found'
      });
    }

    const provider = providerInfo[0];

    // Get specialty configuration
    const [specialtyConfig] = await connection.query(`
      SELECT * FROM specialty_template_config 
      WHERE user_id = ? AND specialty = ?
    `, [user_id, provider.specialty]);

    // If no config exists, create default configuration
    if (specialtyConfig.length === 0) {
      const defaultConfig = await createDefaultSpecialtyConfig(user_id, provider.specialty);
      return res.json({
        success: true,
        data: {
          provider_specialty: provider.specialty,
          subspecialty: provider.subspecialty,
          config: defaultConfig,
          available_templates: await getAvailableTemplatesForSpecialty(provider.specialty)
        }
      });
    }

    const config = specialtyConfig[0];
    
    // Get available templates for this specialty
    const availableTemplates = await getAvailableTemplatesForSpecialty(provider.specialty);

    res.json({
      success: true,
      data: {
        provider_specialty: provider.specialty,
        subspecialty: provider.subspecialty,
        config: {
          ...config,
          default_templates: JSON.parse(config.default_templates || '[]'),
          custom_templates: JSON.parse(config.custom_templates || '[]'),
          template_preferences: JSON.parse(config.template_preferences || '{}'),
          ai_settings: JSON.parse(config.ai_settings || '{}')
        },
        available_templates: availableTemplates
      }
    });

  } catch (error) {
    console.error('Error fetching specialty configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specialty configuration',
      error: error.message
    });
  }
};

// Update specialty configuration
const updateSpecialtyConfiguration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id } = req.user;
    const {
      specialty,
      auto_template_assignment,
      default_templates,
      custom_templates,
      ai_suggestions_enabled,
      template_preferences,
      ai_settings
    } = req.body;

    // Check if configuration exists
    const [existing] = await connection.query(`
      SELECT id FROM specialty_template_config 
      WHERE user_id = ? AND specialty = ?
    `, [user_id, specialty]);

    const configData = {
      auto_template_assignment: auto_template_assignment ?? true,
      default_templates: JSON.stringify(default_templates || []),
      custom_templates: JSON.stringify(custom_templates || []),
      ai_suggestions_enabled: ai_suggestions_enabled ?? true,
      template_preferences: JSON.stringify(template_preferences || {}),
      ai_settings: JSON.stringify(ai_settings || {}),
      updated_at: new Date()
    };

    if (existing.length > 0) {
      // Update existing configuration
      await connection.query(`
        UPDATE specialty_template_config 
        SET ? WHERE user_id = ? AND specialty = ?
      `, [configData, user_id, specialty]);
    } else {
      // Create new configuration
      configData.user_id = user_id;
      configData.specialty = specialty;
      configData.created_at = new Date();
      
      await connection.query(`
        INSERT INTO specialty_template_config SET ?
      `, [configData]);
    }

    // If auto-assignment is enabled, update user's template assignments
    if (auto_template_assignment) {
      await updateAutoTemplateAssignments(user_id, specialty, default_templates);
    }

    res.json({
      success: true,
      message: 'Specialty configuration updated successfully',
      data: configData
    });

  } catch (error) {
    console.error('Error updating specialty configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update specialty configuration',
      error: error.message
    });
  }
};

// Get auto-assigned templates for provider
const getAutoAssignedTemplates = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { visit_type, chief_complaint, patient_context } = req.query;

    // Get provider's specialty
    const [providerInfo] = await connection.query(`
      SELECT specialty, subspecialty FROM user_profiles WHERE fk_userid = ?
    `, [user_id]);

    if (providerInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const specialty = providerInfo[0].specialty;

    // Get specialty configuration
    const [config] = await connection.query(`
      SELECT * FROM specialty_template_config 
      WHERE user_id = ? AND specialty = ?
    `, [user_id, specialty]);

    if (config.length === 0 || !config[0].auto_template_assignment) {
      return res.json({
        success: true,
        data: {
          auto_assignment_enabled: false,
          templates: []
        }
      });
    }

    // Get auto-assigned templates based on context
    const templates = await getContextualTemplates(
      specialty,
      visit_type,
      chief_complaint,
      patient_context,
      user_id
    );

    res.json({
      success: true,
      data: {
        auto_assignment_enabled: true,
        specialty: specialty,
        templates: templates,
        context: {
          visit_type,
          chief_complaint,
          patient_context
        }
      }
    });

  } catch (error) {
    console.error('Error getting auto-assigned templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get auto-assigned templates',
      error: error.message
    });
  }
};

// Create custom template for specialty
const createCustomTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id } = req.user;
    const {
      template_name,
      specialty,
      visit_type,
      soap_structure,
      billing_codes,
      custom_fields,
      is_default,
      ai_enhanced,
      tags
    } = req.body;

    // Create the template
    const templateData = {
      template_name,
      specialty,
      visit_type,
      soap_structure: JSON.stringify(soap_structure),
      billing_codes: JSON.stringify(billing_codes || {}),
      custom_fields: JSON.stringify(custom_fields || {}),
      created_by: user_id,
      is_active: true,
      is_private: true, // Custom templates are private by default
      is_default: is_default || false,
      ai_enhanced: ai_enhanced || false,
      tags: JSON.stringify(tags || []),
      created_at: new Date(),
      updated_at: new Date()
    };

    const [result] = await connection.query(`
      INSERT INTO encounter_templates SET ?
    `, [templateData]);

    const templateId = result.insertId;

    // If this is set as default, update specialty configuration
    if (is_default) {
      await addTemplateToDefaults(user_id, specialty, templateId);
    }

    // Create template analytics entry
    await connection.query(`
      INSERT INTO template_analytics (
        template_id, created_by, specialty, visit_type, created_at
      ) VALUES (?, ?, ?, ?, NOW())
    `, [templateId, user_id, specialty, visit_type]);

    res.json({
      success: true,
      message: 'Custom template created successfully',
      data: {
        template_id: templateId,
        template_name,
        specialty,
        visit_type
      }
    });

  } catch (error) {
    console.error('Error creating custom template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom template',
      error: error.message
    });
  }
};

// Get template recommendations based on AI
const getAITemplateRecommendations = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      specialty,
      visit_type,
      chief_complaint,
      patient_age,
      patient_gender,
      patient_history
    } = req.query;

    // Check if AI suggestions are enabled
    const [config] = await connection.query(`
      SELECT ai_suggestions_enabled, ai_settings 
      FROM specialty_template_config 
      WHERE user_id = ? AND specialty = ?
    `, [user_id, specialty]);

    if (config.length === 0 || !config[0].ai_suggestions_enabled) {
      return res.json({
        success: true,
        data: {
          ai_enabled: false,
          recommendations: []
        }
      });
    }

    // Generate AI-powered recommendations
    const recommendations = await generateAIRecommendations({
      specialty,
      visit_type,
      chief_complaint,
      patient_age,
      patient_gender,
      patient_history,
      user_id
    });

    res.json({
      success: true,
      data: {
        ai_enabled: true,
        recommendations,
        context: {
          specialty,
          visit_type,
          chief_complaint
        }
      }
    });

  } catch (error) {
    console.error('Error getting AI template recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI recommendations',
      error: error.message
    });
  }
};

// Get template usage analytics for specialty
const getSpecialtyTemplateAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { specialty, timeframe = '30d' } = req.query;

    let dateFilter = '';
    switch (timeframe) {
      case '7d':
        dateFilter = 'AND eu.last_used >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND eu.last_used >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND eu.last_used >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
    }

    // Get template usage statistics
    const [usageStats] = await connection.query(`
      SELECT 
        et.id,
        et.template_name,
        et.visit_type,
        COUNT(eu.id) as usage_count,
        AVG(eu.rating) as avg_rating,
        MAX(eu.last_used) as last_used,
        et.is_default,
        et.ai_enhanced
      FROM encounter_templates et
      LEFT JOIN encounter_usage eu ON et.id = eu.template_id
      WHERE et.specialty = ? 
        AND (et.created_by = ? OR et.is_private = 0)
        ${dateFilter}
      GROUP BY et.id
      ORDER BY usage_count DESC, avg_rating DESC
    `, [specialty, user_id]);

    // Get visit type distribution
    const [visitTypeStats] = await connection.query(`
      SELECT 
        et.visit_type,
        COUNT(eu.id) as usage_count,
        AVG(eu.rating) as avg_rating
      FROM encounter_templates et
      JOIN encounter_usage eu ON et.id = eu.template_id
      WHERE et.specialty = ? 
        AND eu.provider_id = ?
        ${dateFilter}
      GROUP BY et.visit_type
      ORDER BY usage_count DESC
    `, [specialty, user_id]);

    // Get AI enhancement impact
    const [aiImpactStats] = await connection.query(`
      SELECT 
        et.ai_enhanced,
        COUNT(eu.id) as usage_count,
        AVG(eu.rating) as avg_rating,
        AVG(TIMESTAMPDIFF(SECOND, eu.created_at, eu.last_used)) as avg_completion_time
      FROM encounter_templates et
      JOIN encounter_usage eu ON et.id = eu.template_id
      WHERE et.specialty = ? 
        AND eu.provider_id = ?
        ${dateFilter}
      GROUP BY et.ai_enhanced
    `, [specialty, user_id]);

    res.json({
      success: true,
      data: {
        specialty,
        timeframe,
        template_usage: usageStats,
        visit_type_distribution: visitTypeStats,
        ai_impact: aiImpactStats,
        summary: {
          total_templates: usageStats.length,
          total_usage: usageStats.reduce((sum, stat) => sum + stat.usage_count, 0),
          avg_rating: usageStats.reduce((sum, stat) => sum + (stat.avg_rating || 0), 0) / usageStats.length,
          ai_enhanced_count: usageStats.filter(stat => stat.ai_enhanced).length
        }
      }
    });

  } catch (error) {
    console.error('Error getting specialty template analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get template analytics',
      error: error.message
    });
  }
};

// Helper Functions

async function createDefaultSpecialtyConfig(userId, specialty) {
  const defaultConfig = {
    user_id: userId,
    specialty: specialty,
    auto_template_assignment: true,
    default_templates: JSON.stringify([]),
    custom_templates: JSON.stringify([]),
    ai_suggestions_enabled: true,
    template_preferences: JSON.stringify({
      visit_types: getDefaultVisitTypes(specialty),
      required_fields: ['chief_complaint', 'history_present_illness', 'physical_exam'],
      billing_integration: true
    }),
    ai_settings: JSON.stringify({
      content_suggestions: true,
      billing_code_suggestions: true,
      contextual_recommendations: true,
      learning_enabled: true
    }),
    created_at: new Date(),
    updated_at: new Date()
  };

  await connection.query(`
    INSERT INTO specialty_template_config SET ?
  `, [defaultConfig]);

  return defaultConfig;
}

async function getAvailableTemplatesForSpecialty(specialty) {
  const [templates] = await connection.query(`
    SELECT 
      et.*,
      COUNT(eu.id) as usage_count,
      AVG(eu.rating) as avg_rating,
      MAX(eu.last_used) as last_used
    FROM encounter_templates et
    LEFT JOIN encounter_usage eu ON et.id = eu.template_id
    WHERE et.specialty = ? OR et.specialty = 'General' OR et.is_universal = 1
      AND et.is_active = 1
    GROUP BY et.id
    ORDER BY usage_count DESC, avg_rating DESC
  `, [specialty]);

  return templates.map(template => ({
    ...template,
    soap_structure: JSON.parse(template.soap_structure || '{}'),
    billing_codes: JSON.parse(template.billing_codes || '{}'),
    custom_fields: JSON.parse(template.custom_fields || '{}'),
    tags: JSON.parse(template.tags || '[]'),
    usage_count: parseInt(template.usage_count) || 0,
    avg_rating: parseFloat(template.avg_rating) || 0
  }));
}

async function updateAutoTemplateAssignments(userId, specialty, defaultTemplates) {
  // Update user's template assignments based on specialty configuration
  await connection.query(`
    DELETE FROM user_template_assignments WHERE user_id = ? AND specialty = ?
  `, [userId, specialty]);

  if (defaultTemplates && defaultTemplates.length > 0) {
    const assignments = defaultTemplates.map(templateId => [
      userId, templateId, specialty, true, new Date()
    ]);

    await connection.query(`
      INSERT INTO user_template_assignments (user_id, template_id, specialty, is_auto_assigned, created_at)
      VALUES ?
    `, [assignments]);
  }
}

async function getContextualTemplates(specialty, visitType, chiefComplaint, patientContext, userId) {
  let query = `
    SELECT 
      et.*,
      COUNT(eu.id) as usage_count,
      AVG(eu.rating) as avg_rating,
      uta.is_auto_assigned
    FROM encounter_templates et
    LEFT JOIN encounter_usage eu ON et.id = eu.template_id
    LEFT JOIN user_template_assignments uta ON et.id = uta.template_id AND uta.user_id = ?
    WHERE (et.specialty = ? OR et.specialty = 'General' OR et.is_universal = 1)
      AND et.is_active = 1
  `;

  const queryParams = [userId, specialty];

  // Add visit type filter if provided
  if (visitType && visitType !== 'all') {
    query += ` AND (et.visit_type = ? OR et.visit_type = 'Any')`;
    queryParams.push(visitType);
  }

  // Add contextual filtering based on chief complaint
  if (chiefComplaint) {
    query += ` AND (et.tags LIKE ? OR et.soap_structure LIKE ?)`;
    const searchPattern = `%${chiefComplaint}%`;
    queryParams.push(searchPattern, searchPattern);
  }

  query += `
    GROUP BY et.id
    ORDER BY 
      uta.is_auto_assigned DESC,
      et.is_default DESC,
      avg_rating DESC,
      usage_count DESC
    LIMIT 10
  `;

  const [templates] = await connection.query(query, queryParams);

  return templates.map(template => ({
    ...template,
    soap_structure: JSON.parse(template.soap_structure || '{}'),
    billing_codes: JSON.parse(template.billing_codes || '{}'),
    custom_fields: JSON.parse(template.custom_fields || '{}'),
    tags: JSON.parse(template.tags || '[]'),
    usage_count: parseInt(template.usage_count) || 0,
    avg_rating: parseFloat(template.avg_rating) || 0,
    is_auto_assigned: Boolean(template.is_auto_assigned)
  }));
}

async function addTemplateToDefaults(userId, specialty, templateId) {
  const [config] = await connection.query(`
    SELECT default_templates FROM specialty_template_config 
    WHERE user_id = ? AND specialty = ?
  `, [userId, specialty]);

  if (config.length > 0) {
    const defaultTemplates = JSON.parse(config[0].default_templates || '[]');
    if (!defaultTemplates.includes(templateId.toString())) {
      defaultTemplates.push(templateId.toString());
      
      await connection.query(`
        UPDATE specialty_template_config 
        SET default_templates = ? 
        WHERE user_id = ? AND specialty = ?
      `, [JSON.stringify(defaultTemplates), userId, specialty]);
    }
  }
}

async function generateAIRecommendations(context) {
  // This would integrate with an AI service for real recommendations
  // For now, returning structured mock recommendations
  
  const recommendations = [];
  
  // Basic recommendations based on specialty and context
  if (context.specialty === 'Primary Care') {
    if (context.chief_complaint?.toLowerCase().includes('headache')) {
      recommendations.push({
        template_name: 'Headache Evaluation',
        confidence: 0.85,
        reasoning: 'Chief complaint matches headache evaluation template',
        suggested_modifications: {
          subjective: 'Include headache characteristics: onset, duration, quality, severity',
          objective: 'Focus on neurological examination and vital signs',
          assessment: 'Consider tension headache vs migraine differential',
          plan: 'Include pain management and follow-up recommendations'
        }
      });
    }
    
    if (context.visit_type === 'Annual/Preventive') {
      recommendations.push({
        template_name: 'Annual Physical Exam',
        confidence: 0.95,
        reasoning: 'Visit type matches preventive care template',
        suggested_modifications: {
          subjective: 'Include age-appropriate screening questions',
          objective: 'Complete physical examination with vital signs',
          assessment: 'Overall health assessment with risk factors',
          plan: 'Preventive care recommendations and immunizations'
        }
      });
    }
  }
  
  return recommendations;
}

function getDefaultVisitTypes(specialty) {
  const visitTypeMap = {
    'Primary Care': ['New Patient', 'Established Patient', 'Annual/Preventive', 'Sick Visit', 'Follow-up'],
    'Cardiology': ['New Consultation', 'Follow-up', 'Procedure', 'Emergency'],
    'Mental Health': ['Initial Evaluation', 'Therapy Session', 'Medication Check', 'Crisis Intervention'],
    'Neurology': ['New Consultation', 'Follow-up', 'Diagnostic', 'Treatment Planning'],
    'Urgent Care': ['Acute Visit', 'Injury Assessment', 'Diagnostic', 'Follow-up'],
    'Dermatology': ['New Patient', 'Follow-up', 'Screening', 'Procedure']
  };
  
  return visitTypeMap[specialty] || ['New Patient', 'Established Patient', 'Follow-up'];
}

module.exports = {
  getSpecialtyConfiguration,
  updateSpecialtyConfiguration,
  getAutoAssignedTemplates,
  createCustomTemplate,
  getAITemplateRecommendations,
  getSpecialtyTemplateAnalytics
};