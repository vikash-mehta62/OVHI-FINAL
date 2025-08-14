const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");

// Smart Template Engine - AI-powered template suggestions
const getSmartTemplateRecommendations = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { specialty, visitType, chiefComplaint, patientAge, patientGender } = req.query;

    // Get provider's practice specialty
    const [providerInfo] = await connection.query(`
      SELECT up.specialty, up.subspecialty, ps.practice_type, ps.services_offered
      FROM user_profiles up
      LEFT JOIN practice_settings ps ON ps.provider_id = up.fk_userid
      WHERE up.fk_userid = ?
    `, [user_id]);

    const providerSpecialty = providerInfo[0]?.specialty || specialty;

    // Get matching templates based on specialty and context
    const [templates] = await connection.query(`
      SELECT 
        et.*,
        COUNT(eu.id) as usage_count,
        AVG(eu.rating) as avg_rating,
        MAX(eu.last_used) as last_used
      FROM encounter_templates et
      LEFT JOIN encounter_usage eu ON et.id = eu.template_id
      WHERE (et.specialty = ? OR et.specialty = 'General' OR et.is_universal = 1)
        AND (et.visit_type = ? OR et.visit_type = 'Any')
        AND et.is_active = 1
      GROUP BY et.id
      ORDER BY 
        CASE WHEN et.specialty = ? THEN 1 ELSE 2 END,
        avg_rating DESC,
        usage_count DESC,
        et.created_at DESC
      LIMIT 10
    `, [providerSpecialty, visitType, providerSpecialty]);

    // AI-powered content suggestions based on chief complaint
    const contentSuggestions = await generateContentSuggestions(
      chiefComplaint, 
      providerSpecialty, 
      visitType,
      patientAge,
      patientGender
    );

    // Get frequently used templates by this provider
    const [frequentTemplates] = await connection.query(`
      SELECT et.*, COUNT(eu.id) as usage_count
      FROM encounter_templates et
      JOIN encounter_usage eu ON et.id = eu.template_id
      WHERE eu.provider_id = ? AND eu.last_used >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY et.id
      ORDER BY usage_count DESC
      LIMIT 5
    `, [user_id]);

    res.json({
      success: true,
      data: {
        recommendedTemplates: templates,
        frequentTemplates,
        contentSuggestions,
        providerSpecialty,
        contextualHints: generateContextualHints(providerSpecialty, visitType, chiefComplaint)
      }
    });

  } catch (error) {
    console.error('Smart template recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get template recommendations'
    });
  }
};

// Create custom template with AI assistance
const createSmartTemplate = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      templateName,
      specialty,
      visitType,
      procedureType,
      careManagementType,
      soapStructure,
      billingCodes,
      customFields,
      aiAssistance,
      isPrivate,
      shareWithPractice,
      tags
    } = req.body;

    // Validate required fields
    if (!templateName || !specialty || !visitType || !soapStructure) {
      return res.status(400).json({
        success: false,
        message: 'Missing required template fields'
      });
    }

    // AI-enhanced SOAP structure
    let enhancedSoapStructure = soapStructure;
    if (aiAssistance) {
      enhancedSoapStructure = await enhanceSoapWithAI(soapStructure, specialty, visitType);
    }

    // Generate smart billing suggestions
    const smartBillingCodes = await generateSmartBillingCodes(
      specialty, 
      visitType, 
      procedureType,
      enhancedSoapStructure
    );

    // Create the template
    const templateData = {
      template_name: templateName,
      specialty,
      visit_type: visitType,
      procedure_type: procedureType,
      care_management_type: careManagementType,
      soap_structure: JSON.stringify(enhancedSoapStructure),
      billing_codes: JSON.stringify({
        ...billingCodes,
        suggested: smartBillingCodes
      }),
      custom_fields: JSON.stringify(customFields || {}),
      created_by: user_id,
      is_active: true,
      is_private: isPrivate || false,
      share_with_practice: shareWithPractice || false,
      tags: JSON.stringify(tags || []),
      ai_enhanced: aiAssistance || false,
      created_at: new Date(),
      updated_at: new Date()
    };

    const [result] = await connection.query(
      'INSERT INTO encounter_templates SET ?',
      [templateData]
    );

    // Log template creation
    await logAudit(req, 'CREATE', 'ENCOUNTER_TEMPLATE', result.insertId, 
      `Created smart template: ${templateName}`);

    // Create template analytics entry
    await connection.query(`
      INSERT INTO template_analytics (template_id, created_by, specialty, visit_type, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [result.insertId, user_id, specialty, visitType]);

    res.json({
      success: true,
      message: 'Smart template created successfully',
      data: {
        templateId: result.insertId,
        enhancedSoapStructure,
        smartBillingCodes
      }
    });

  } catch (error) {
    console.error('Create smart template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create smart template'
    });
  }
};

// Get templates by specialty with smart filtering
const getTemplatesBySpecialty = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { specialty, visitType, searchTerm, sortBy = 'relevance' } = req.query;

    let query = `
      SELECT 
        et.*,
        up.firstname as creator_name,
        up.lastname as creator_lastname,
        COUNT(eu.id) as usage_count,
        AVG(eu.rating) as avg_rating,
        MAX(eu.last_used) as last_used,
        CASE WHEN et.created_by = ? THEN 1 ELSE 0 END as is_mine
      FROM encounter_templates et
      LEFT JOIN user_profiles up ON et.created_by = up.fk_userid
      LEFT JOIN encounter_usage eu ON et.id = eu.template_id
      WHERE et.is_active = 1
    `;

    const queryParams = [user_id];

    // Specialty filter
    if (specialty && specialty !== 'all') {
      query += ` AND (et.specialty = ? OR et.specialty = 'General' OR et.is_universal = 1)`;
      queryParams.push(specialty);
    }

    // Visit type filter
    if (visitType && visitType !== 'all') {
      query += ` AND (et.visit_type = ? OR et.visit_type = 'Any')`;
      queryParams.push(visitType);
    }

    // Search filter
    if (searchTerm) {
      query += ` AND (et.template_name LIKE ? OR et.tags LIKE ? OR et.soap_structure LIKE ?)`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Privacy filter - show public templates and user's private templates
    query += ` AND (et.is_private = 0 OR et.created_by = ?)`;
    queryParams.push(user_id);

    query += ` GROUP BY et.id`;

    // Sorting
    switch (sortBy) {
      case 'name':
        query += ` ORDER BY et.template_name ASC`;
        break;
      case 'recent':
        query += ` ORDER BY et.updated_at DESC`;
        break;
      case 'popular':
        query += ` ORDER BY usage_count DESC, avg_rating DESC`;
        break;
      case 'rating':
        query += ` ORDER BY avg_rating DESC, usage_count DESC`;
        break;
      default: // relevance
        query += ` ORDER BY is_mine DESC, avg_rating DESC, usage_count DESC, et.updated_at DESC`;
    }

    const [templates] = await connection.query(query, queryParams);

    // Get template categories for filtering
    const [categories] = await connection.query(`
      SELECT DISTINCT specialty, COUNT(*) as count
      FROM encounter_templates 
      WHERE is_active = 1 AND (is_private = 0 OR created_by = ?)
      GROUP BY specialty
      ORDER BY count DESC
    `, [user_id]);

    res.json({
      success: true,
      data: {
        templates: templates.map(template => ({
          ...template,
          soap_structure: JSON.parse(template.soap_structure || '{}'),
          billing_codes: JSON.parse(template.billing_codes || '{}'),
          custom_fields: JSON.parse(template.custom_fields || '{}'),
          tags: JSON.parse(template.tags || '[]'),
          usage_count: parseInt(template.usage_count) || 0,
          avg_rating: parseFloat(template.avg_rating) || 0
        })),
        categories,
        totalCount: templates.length
      }
    });

  } catch (error) {
    console.error('Get templates by specialty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates'
    });
  }
};

// Clone and customize existing template
const cloneTemplate = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { templateId } = req.params;
    const { newName, customizations } = req.body;

    // Get original template
    const [originalTemplate] = await connection.query(
      'SELECT * FROM encounter_templates WHERE id = ? AND (is_private = 0 OR created_by = ?)',
      [templateId, user_id]
    );

    if (originalTemplate.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    const original = originalTemplate[0];
    let soapStructure = JSON.parse(original.soap_structure);
    let billingCodes = JSON.parse(original.billing_codes);
    let customFields = JSON.parse(original.custom_fields || '{}');

    // Apply customizations
    if (customizations) {
      if (customizations.soapStructure) {
        soapStructure = { ...soapStructure, ...customizations.soapStructure };
      }
      if (customizations.billingCodes) {
        billingCodes = { ...billingCodes, ...customizations.billingCodes };
      }
      if (customizations.customFields) {
        customFields = { ...customFields, ...customizations.customFields };
      }
    }

    // Create cloned template
    const clonedTemplate = {
      template_name: newName || `${original.template_name} (Copy)`,
      specialty: original.specialty,
      visit_type: original.visit_type,
      procedure_type: original.procedure_type,
      care_management_type: original.care_management_type,
      soap_structure: JSON.stringify(soapStructure),
      billing_codes: JSON.stringify(billingCodes),
      custom_fields: JSON.stringify(customFields),
      created_by: user_id,
      is_active: true,
      is_private: true, // Cloned templates are private by default
      share_with_practice: false,
      tags: original.tags,
      ai_enhanced: original.ai_enhanced,
      cloned_from: templateId,
      created_at: new Date(),
      updated_at: new Date()
    };

    const [result] = await connection.query(
      'INSERT INTO encounter_templates SET ?',
      [clonedTemplate]
    );

    await logAudit(req, 'CLONE', 'ENCOUNTER_TEMPLATE', result.insertId, 
      `Cloned template from ID: ${templateId}`);

    res.json({
      success: true,
      message: 'Template cloned successfully',
      data: {
        templateId: result.insertId,
        originalId: templateId
      }
    });

  } catch (error) {
    console.error('Clone template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clone template'
    });
  }
};

// Rate and review template
const rateTemplate = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { templateId } = req.params;
    const { rating, review, usageContext } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user already rated this template
    const [existingRating] = await connection.query(
      'SELECT id FROM encounter_usage WHERE template_id = ? AND provider_id = ?',
      [templateId, user_id]
    );

    if (existingRating.length > 0) {
      // Update existing rating
      await connection.query(`
        UPDATE encounter_usage 
        SET rating = ?, review = ?, usage_context = ?, last_used = NOW()
        WHERE template_id = ? AND provider_id = ?
      `, [rating, review, JSON.stringify(usageContext), templateId, user_id]);
    } else {
      // Create new rating
      await connection.query(`
        INSERT INTO encounter_usage (template_id, provider_id, rating, review, usage_context, last_used)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [templateId, user_id, rating, review, JSON.stringify(usageContext)]);
    }

    await logAudit(req, 'RATE', 'ENCOUNTER_TEMPLATE', templateId, 
      `Rated template: ${rating}/5`);

    res.json({
      success: true,
      message: 'Template rated successfully'
    });

  } catch (error) {
    console.error('Rate template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate template'
    });
  }
};

// Get template analytics
const getTemplateAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { templateId } = req.params;

    // Get template usage statistics
    const [usageStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_uses,
        COUNT(DISTINCT provider_id) as unique_users,
        AVG(rating) as avg_rating,
        MAX(last_used) as last_used,
        MIN(last_used) as first_used
      FROM encounter_usage 
      WHERE template_id = ?
    `, [templateId]);

    // Get usage by specialty
    const [usageBySpecialty] = await connection.query(`
      SELECT 
        up.specialty,
        COUNT(*) as usage_count,
        AVG(eu.rating) as avg_rating
      FROM encounter_usage eu
      JOIN user_profiles up ON eu.provider_id = up.fk_userid
      WHERE eu.template_id = ?
      GROUP BY up.specialty
      ORDER BY usage_count DESC
    `, [templateId]);

    // Get recent reviews
    const [recentReviews] = await connection.query(`
      SELECT 
        eu.rating,
        eu.review,
        eu.last_used,
        CONCAT(up.firstname, ' ', up.lastname) as reviewer_name,
        up.specialty as reviewer_specialty
      FROM encounter_usage eu
      JOIN user_profiles up ON eu.provider_id = up.fk_userid
      WHERE eu.template_id = ? AND eu.review IS NOT NULL
      ORDER BY eu.last_used DESC
      LIMIT 10
    `, [templateId]);

    res.json({
      success: true,
      data: {
        usageStats: usageStats[0],
        usageBySpecialty,
        recentReviews
      }
    });

  } catch (error) {
    console.error('Get template analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get template analytics'
    });
  }
};

// AI Helper Functions
async function generateContentSuggestions(chiefComplaint, specialty, visitType, patientAge, patientGender) {
  // This would integrate with an AI service like OpenAI GPT
  // For now, returning structured suggestions based on common patterns
  
  const suggestions = {
    subjective: [],
    objective: [],
    assessment: [],
    plan: []
  };

  // Basic suggestions based on specialty and chief complaint
  if (specialty === 'Primary Care') {
    if (chiefComplaint?.toLowerCase().includes('headache')) {
      suggestions.subjective.push('Duration and quality of headache');
      suggestions.subjective.push('Associated symptoms (nausea, photophobia, aura)');
      suggestions.objective.push('Neurological examination');
      suggestions.objective.push('Vital signs including blood pressure');
      suggestions.assessment.push('Consider tension headache vs migraine');
      suggestions.plan.push('Pain management recommendations');
    }
  }

  return suggestions;
}

async function enhanceSoapWithAI(soapStructure, specialty, visitType) {
  // AI enhancement would add specialty-specific questions and suggestions
  const enhanced = { ...soapStructure };
  
  // Add specialty-specific enhancements
  if (specialty === 'Cardiology') {
    enhanced.objective = enhanced.objective + '\n\nCardiac examination:\n- Heart rate and rhythm\n- Murmurs, gallops, rubs\n- Peripheral pulses\n- Edema assessment';
  }
  
  return enhanced;
}

async function generateSmartBillingCodes(specialty, visitType, procedureType, soapStructure) {
  // Generate billing code suggestions based on context
  const suggestions = {
    primaryCPT: '',
    secondaryCPTs: [],
    icd10Codes: [],
    modifiers: []
  };

  // Basic CPT code suggestions
  if (visitType === 'New Patient') {
    suggestions.primaryCPT = '99203'; // Default new patient visit
  } else if (visitType === 'Established Patient') {
    suggestions.primaryCPT = '99213'; // Default established patient visit
  }

  return suggestions;
}

function generateContextualHints(specialty, visitType, chiefComplaint) {
  const hints = [];
  
  if (specialty === 'Primary Care') {
    hints.push('Consider screening questions for common conditions');
    hints.push('Include preventive care recommendations');
  }
  
  if (visitType === 'Annual/Preventive') {
    hints.push('Include age-appropriate screening guidelines');
    hints.push('Review immunization status');
  }
  
  return hints;
}

module.exports = {
  getSmartTemplateRecommendations,
  createSmartTemplate,
  getTemplatesBySpecialty,
  cloneTemplate,
  rateTemplate,
  getTemplateAnalytics
};