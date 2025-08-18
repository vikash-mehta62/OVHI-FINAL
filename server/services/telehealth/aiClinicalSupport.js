const pool = require('../../config/db');
const axios = require('axios');

class AIClinicalSupportService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = 'https://api.openai.com/v1';
    this.clinicalKnowledgeBase = new Map();
    this.initializeClinicalKnowledge();
  }

  /**
   * Initialize clinical knowledge base
   */
  initializeClinicalKnowledge() {
    // Load common clinical protocols and guidelines
    this.clinicalKnowledgeBase.set('hypertension', {
      guidelines: 'ACC/AHA 2017 Guidelines',
      target_bp: '< 130/80 mmHg',
      first_line_medications: ['ACE inhibitors', 'ARBs', 'Thiazide diuretics', 'CCBs'],
      monitoring: 'BP checks every 1-3 months until controlled'
    });
    
    this.clinicalKnowledgeBase.set('diabetes', {
      guidelines: 'ADA 2023 Standards of Care',
      target_a1c: '< 7% for most adults',
      first_line_medication: 'Metformin',
      monitoring: 'A1C every 3-6 months'
    });
    
    // Add more clinical knowledge as needed
  }

  /**
   * Analyze session transcript for clinical insights
   */
  async analyzeSessionTranscript(sessionId, transcript) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get session context
      const [sessions] = await connection.query(`
        SELECT ts.*, p.firstname, p.lastname, p.dob, p.gender
        FROM telehealth_sessions ts
        JOIN user_profiles p ON ts.patient_id = p.fk_userid
        WHERE ts.id = ?
      `, [sessionId]);
      
      if (sessions.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessions[0];
      
      // Analyze transcript with AI
      const analysis = await this.performAIAnalysis(transcript, session);
      
      // Store analysis results
      await connection.query(`
        INSERT INTO ai_clinical_analysis (
          session_id, analysis_type, analysis_data, confidence_score,
          recommendations, alerts, created_at
        ) VALUES (?, 'transcript_analysis', ?, ?, ?, ?, NOW())
      `, [
        sessionId,
        JSON.stringify(analysis.raw_analysis),
        analysis.confidence_score,
        JSON.stringify(analysis.recommendations),
        JSON.stringify(analysis.alerts)
      ]);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing session transcript:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Perform AI analysis of clinical conversation
   */
  async performAIAnalysis(transcript, sessionContext) {
    try {
      const prompt = this.buildClinicalAnalysisPrompt(transcript, sessionContext);
      
      const response = await axios.post(`${this.openaiBaseUrl}/chat/completions`, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical AI assistant helping with telehealth consultations. Analyze the conversation and provide clinical insights, recommendations, and alerts.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const aiResponse = response.data.choices[0].message.content;
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('Error performing AI analysis:', error);
      // Return fallback analysis
      return this.getFallbackAnalysis(transcript);
    }
  }

  /**
   * Build clinical analysis prompt
   */
  buildClinicalAnalysisPrompt(transcript, sessionContext) {
    return `
Analyze this telehealth consultation transcript and provide clinical insights:

Patient Context:
- Name: ${sessionContext.firstname} ${sessionContext.lastname}
- Age: ${this.calculateAge(sessionContext.dob)}
- Gender: ${sessionContext.gender}
- Chief Complaint: ${sessionContext.chief_complaint}

Transcript:
${transcript}

Please provide analysis in the following JSON format:
{
  "symptoms_identified": ["list of symptoms mentioned"],
  "conditions_suggested": ["possible conditions based on symptoms"],
  "red_flags": ["any concerning symptoms or findings"],
  "recommendations": {
    "immediate_actions": ["urgent actions if any"],
    "diagnostic_tests": ["recommended tests"],
    "medications": ["medication suggestions"],
    "follow_up": ["follow-up recommendations"]
  },
  "clinical_alerts": ["any safety concerns or contraindications"],
  "confidence_score": 0.85,
  "differential_diagnosis": ["list of possible diagnoses in order of likelihood"]
}

Focus on patient safety and evidence-based recommendations.
`;
  }

  /**
   * Parse AI response into structured format
   */
  parseAIResponse(aiResponse) {
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        symptoms: parsed.symptoms_identified || [],
        conditions: parsed.conditions_suggested || [],
        red_flags: parsed.red_flags || [],
        recommendations: parsed.recommendations || {},
        alerts: parsed.clinical_alerts || [],
        confidence_score: parsed.confidence_score || 0.5,
        differential_diagnosis: parsed.differential_diagnosis || [],
        raw_analysis: parsed
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackAnalysis(aiResponse);
    }
  }

  /**
   * Get real-time clinical suggestions during session
   */
  async getRealTimeSuggestions(sessionId, currentSymptoms, patientHistory) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get patient context
      const [patients] = await connection.query(`
        SELECT p.*, ts.chief_complaint
        FROM user_profiles p
        JOIN telehealth_sessions ts ON p.fk_userid = ts.patient_id
        WHERE ts.id = ?
      `, [sessionId]);
      
      if (patients.length === 0) {
        throw new Error('Patient not found');
      }
      
      const patient = patients[0];
      
      // Generate real-time suggestions
      const suggestions = await this.generateClinicalSuggestions(
        currentSymptoms,
        patientHistory,
        patient
      );
      
      // Store suggestions for tracking
      await connection.query(`
        INSERT INTO ai_clinical_suggestions (
          session_id, suggestion_type, suggestions_data, triggered_by, created_at
        ) VALUES (?, 'real_time', ?, ?, NOW())
      `, [
        sessionId,
        JSON.stringify(suggestions),
        JSON.stringify({ symptoms: currentSymptoms })
      ]);
      
      return suggestions;
    } catch (error) {
      console.error('Error getting real-time suggestions:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Generate clinical suggestions based on symptoms
   */
  async generateClinicalSuggestions(symptoms, history, patientContext) {
    const suggestions = {
      diagnostic_questions: [],
      physical_exam_suggestions: [],
      differential_diagnosis: [],
      red_flag_alerts: [],
      medication_interactions: [],
      follow_up_recommendations: []
    };
    
    // Analyze symptoms for diagnostic questions
    for (const symptom of symptoms) {
      const questions = this.getSymptomSpecificQuestions(symptom);
      suggestions.diagnostic_questions.push(...questions);
    }
    
    // Check for red flags
    const redFlags = this.checkForRedFlags(symptoms, patientContext);
    suggestions.red_flag_alerts.push(...redFlags);
    
    // Generate differential diagnosis
    const differentials = this.generateDifferentialDiagnosis(symptoms, history);
    suggestions.differential_diagnosis.push(...differentials);
    
    // Physical exam suggestions
    const examSuggestions = this.getPhysicalExamSuggestions(symptoms);
    suggestions.physical_exam_suggestions.push(...examSuggestions);
    
    return suggestions;
  }

  /**
   * Get symptom-specific diagnostic questions
   */
  getSymptomSpecificQuestions(symptom) {
    const questionMap = {
      'chest_pain': [
        'Is the pain sharp or crushing?',
        'Does it radiate to the arm, jaw, or back?',
        'Is it associated with shortness of breath?',
        'Does it worsen with exertion?'
      ],
      'headache': [
        'Is this the worst headache of your life?',
        'Is it associated with fever or neck stiffness?',
        'Any visual changes or neurological symptoms?',
        'What triggers make it worse?'
      ],
      'shortness_of_breath': [
        'Is it worse when lying flat?',
        'Any chest pain or palpitations?',
        'Any leg swelling?',
        'Recent travel or immobilization?'
      ]
    };
    
    return questionMap[symptom] || [];
  }

  /**
   * Check for clinical red flags
   */
  checkForRedFlags(symptoms, patientContext) {
    const redFlags = [];
    
    // Age-based red flags
    const age = this.calculateAge(patientContext.dob);
    
    if (symptoms.includes('chest_pain') && age > 50) {
      redFlags.push({
        alert: 'Chest pain in patient over 50 - consider cardiac evaluation',
        urgency: 'high',
        action: 'Consider ECG and cardiac enzymes'
      });
    }
    
    if (symptoms.includes('headache') && symptoms.includes('fever')) {
      redFlags.push({
        alert: 'Headache with fever - consider meningitis',
        urgency: 'critical',
        action: 'Immediate evaluation needed'
      });
    }
    
    return redFlags;
  }

  /**
   * Generate differential diagnosis
   */
  generateDifferentialDiagnosis(symptoms, history) {
    const differentials = [];
    
    // Simple rule-based differential generation
    if (symptoms.includes('chest_pain')) {
      differentials.push(
        { condition: 'Acute Coronary Syndrome', probability: 0.3 },
        { condition: 'Gastroesophageal Reflux', probability: 0.4 },
        { condition: 'Musculoskeletal Pain', probability: 0.2 },
        { condition: 'Anxiety', probability: 0.1 }
      );
    }
    
    return differentials.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Get physical exam suggestions for telehealth
   */
  getPhysicalExamSuggestions(symptoms) {
    const examMap = {
      'chest_pain': [
        'Observe patient for signs of distress',
        'Ask patient to point to location of pain',
        'Assess respiratory rate and effort',
        'Look for diaphoresis or pallor'
      ],
      'headache': [
        'Assess mental status and alertness',
        'Look for signs of meningeal irritation',
        'Check for focal neurological deficits',
        'Assess for photophobia'
      ]
    };
    
    const suggestions = [];
    for (const symptom of symptoms) {
      if (examMap[symptom]) {
        suggestions.push(...examMap[symptom]);
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Check medication interactions
   */
  async checkMedicationInteractions(sessionId, proposedMedications) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get patient's current medications
      const [medications] = await connection.query(`
        SELECT pm.medication_name, pm.dosage, pm.frequency
        FROM patient_medication pm
        JOIN telehealth_sessions ts ON pm.patient_id = ts.patient_id
        WHERE ts.id = ? AND pm.status = 'active'
      `, [sessionId]);
      
      const interactions = [];
      
      // Check for interactions (simplified example)
      for (const proposed of proposedMedications) {
        for (const current of medications) {
          const interaction = this.checkDrugInteraction(proposed, current.medication_name);
          if (interaction) {
            interactions.push(interaction);
          }
        }
      }
      
      return interactions;
    } catch (error) {
      console.error('Error checking medication interactions:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Check for drug interactions (simplified)
   */
  checkDrugInteraction(drug1, drug2) {
    // Simplified interaction checking
    const knownInteractions = {
      'warfarin': ['aspirin', 'ibuprofen', 'amiodarone'],
      'metformin': ['contrast_dye'],
      'digoxin': ['amiodarone', 'verapamil']
    };
    
    const drug1Lower = drug1.toLowerCase();
    const drug2Lower = drug2.toLowerCase();
    
    if (knownInteractions[drug1Lower]?.includes(drug2Lower) ||
        knownInteractions[drug2Lower]?.includes(drug1Lower)) {
      return {
        drug1,
        drug2,
        severity: 'moderate',
        description: `Potential interaction between ${drug1} and ${drug2}`,
        recommendation: 'Monitor closely and consider dose adjustment'
      };
    }
    
    return null;
  }

  /**
   * Generate post-session clinical summary
   */
  async generateSessionSummary(sessionId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get session data
      const [sessions] = await connection.query(`
        SELECT ts.*, p.firstname, p.lastname
        FROM telehealth_sessions ts
        JOIN user_profiles p ON ts.patient_id = p.fk_userid
        WHERE ts.id = ?
      `, [sessionId]);
      
      if (sessions.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessions[0];
      
      // Get AI analysis data
      const [analyses] = await connection.query(`
        SELECT * FROM ai_clinical_analysis WHERE session_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, [sessionId]);
      
      const analysis = analyses[0];
      
      // Generate structured summary
      const summary = {
        patient_name: `${session.firstname} ${session.lastname}`,
        session_date: session.actual_start_time,
        duration: session.duration_minutes,
        chief_complaint: session.chief_complaint,
        assessment: session.consultation_notes,
        plan: session.treatment_plan,
        ai_insights: analysis ? JSON.parse(analysis.analysis_data) : null,
        follow_up: session.follow_up_required,
        next_appointment: session.follow_up_date
      };
      
      return summary;
    } catch (error) {
      console.error('Error generating session summary:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get fallback analysis when AI is unavailable
   */
  getFallbackAnalysis(transcript) {
    return {
      symptoms: [],
      conditions: [],
      red_flags: [],
      recommendations: {
        immediate_actions: [],
        diagnostic_tests: [],
        medications: [],
        follow_up: ['Schedule follow-up as clinically indicated']
      },
      alerts: ['AI analysis unavailable - rely on clinical judgment'],
      confidence_score: 0.1,
      differential_diagnosis: [],
      raw_analysis: { error: 'AI analysis failed', fallback: true }
    };
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get clinical guidelines for condition
   */
  getClinicalGuidelines(condition) {
    return this.clinicalKnowledgeBase.get(condition.toLowerCase()) || null;
  }

  /**
   * Update clinical knowledge base
   */
  updateClinicalKnowledge(condition, guidelines) {
    this.clinicalKnowledgeBase.set(condition.toLowerCase(), guidelines);
  }
}

module.exports = new AIClinicalSupportService();