export interface EncounterTemplate {
  id: string;
  name: string;
  specialty: string;
  type: string;
  estimatedTime: number;
  category: string;
  complexity: 'low' | 'moderate' | 'high';
  soapTemplate: {
    subjective: {
      sections: string[];
      quickPhrases: string[];
      requiredFields: string[];
    };
    objective: {
      sections: string[];
      quickPhrases: string[];
      vitalSigns: string[];
      physicalExam: string[];
    };
    assessment: {
      commonDiagnoses: string[];
      differentialDx: string[];
      riskFactors: string[];
    };
    plan: {
      treatments: string[];
      medications: string[];
      followUp: string[];
      patientEducation: string[];
    };
  };
  billingCodes: {
    commonCPT: string[];
    commonICD10: string[];
  };
  qualityMeasures?: string[];
  clinicalGuidelines?: string[];
}

export const ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  // Primary Care Templates
  {
    id: 'annual-physical',
    name: 'Annual Physical Examination',
    specialty: 'Family Medicine',
    type: 'annual',
    estimatedTime: 45,
    category: 'Primary Care',
    complexity: 'moderate',
    soapTemplate: {
      subjective: {
        sections: [
          'Chief Complaint',
          'Review of Systems',
          'Past Medical History',
          'Current Medications',
          'Allergies',
          'Social History',
          'Family History'
        ],
        quickPhrases: [
          'Here for annual physical examination',
          'No acute complaints',
          'Feeling well overall',
          'Wants to discuss preventive care',
          'No new symptoms since last visit'
        ],
        requiredFields: ['Chief Complaint', 'Review of Systems', 'Past Medical History']
      },
      objective: {
        sections: ['Vital Signs', 'General Appearance', 'Complete Physical Exam'],
        quickPhrases: [
          'Well-appearing adult in no acute distress',
          'Alert and oriented x3',
          'Vital signs stable and within normal limits'
        ],
        vitalSigns: ['Blood Pressure', 'Heart Rate', 'Temperature', 'Weight', 'Height', 'BMI'],
        physicalExam: [
          'HEENT: Normocephalic, atraumatic',
          'Cardiovascular: Regular rate and rhythm, no murmurs',
          'Respiratory: Clear to auscultation bilaterally',
          'Abdominal: Soft, non-tender, no organomegaly',
          'Extremities: No edema, pulses intact',
          'Neurological: Grossly intact',
          'Skin: No concerning lesions'
        ]
      },
      assessment: {
        commonDiagnoses: [
          'Health maintenance',
          'Hypertension',
          'Hyperlipidemia',
          'Diabetes mellitus type 2',
          'Obesity'
        ],
        differentialDx: [],
        riskFactors: ['Age', 'Family history', 'Lifestyle factors']
      },
      plan: {
        treatments: [
          'Continue current medications',
          'Lifestyle modifications',
          'Weight management counseling'
        ],
        medications: [],
        followUp: [
          'Return in 1 year for annual physical',
          'Follow up with specialists as needed',
          'Contact office with concerns'
        ],
        patientEducation: [
          'Discussed importance of regular exercise',
          'Reviewed healthy diet recommendations',
          'Counseled on preventive screenings'
        ]
      }
    },
    billingCodes: {
      commonCPT: ['99395', '99396', '99397', '99385', '99386', '99387'],
      commonICD10: ['Z00.00', 'Z00.01']
    },
    qualityMeasures: [
      'Blood pressure screening',
      'Cholesterol screening',
      'Diabetes screening',
      'Cancer screenings',
      'Immunization status'
    ]
  },

  // Acute Care Templates
  {
    id: 'acute-illness',
    name: 'Acute Illness Visit',
    specialty: 'Family Medicine',
    type: 'acute',
    estimatedTime: 20,
    category: 'Acute Care',
    complexity: 'moderate',
    soapTemplate: {
      subjective: {
        sections: [
          'Chief Complaint',
          'History of Present Illness',
          'Associated Symptoms',
          'Pertinent Review of Systems'
        ],
        quickPhrases: [
          'Presents with acute onset of symptoms',
          'Symptoms started [timeframe] ago',
          'No fever, chills, or night sweats',
          'Denies recent travel or sick contacts'
        ],
        requiredFields: ['Chief Complaint', 'History of Present Illness']
      },
      objective: {
        sections: ['Vital Signs', 'Focused Physical Examination'],
        quickPhrases: [
          'Appears mildly ill but in no acute distress',
          'Vital signs stable',
          'Focused examination reveals'
        ],
        vitalSigns: ['Temperature', 'Blood Pressure', 'Heart Rate', 'Respiratory Rate', 'O2 Saturation'],
        physicalExam: [
          'General: Alert and oriented',
          'HEENT: Examination focused on chief complaint',
          'Cardiovascular: Regular rate and rhythm',
          'Respiratory: Clear to auscultation',
          'Focused examination based on symptoms'
        ]
      },
      assessment: {
        commonDiagnoses: [
          'Upper respiratory infection',
          'Viral syndrome',
          'Acute bronchitis',
          'Gastroenteritis',
          'Urinary tract infection'
        ],
        differentialDx: [
          'Bacterial vs viral infection',
          'Allergic reaction',
          'Medication side effect'
        ],
        riskFactors: ['Recent illness exposure', 'Immunocompromised state']
      },
      plan: {
        treatments: [
          'Symptomatic treatment',
          'Rest and hydration',
          'Over-the-counter medications as needed'
        ],
        medications: [
          'Acetaminophen for fever/pain',
          'Ibuprofen for inflammation',
          'Cough suppressant if needed'
        ],
        followUp: [
          'Return if symptoms worsen',
          'Follow up in 1-2 weeks if not improving',
          'Return to work/school when fever-free for 24 hours'
        ],
        patientEducation: [
          'Discussed expected course of illness',
          'Reviewed warning signs to watch for',
          'Emphasized importance of rest and hydration'
        ]
      }
    },
    billingCodes: {
      commonCPT: ['99213', '99214', '99202', '99203'],
      commonICD10: ['J06.9', 'K59.1', 'N39.0', 'J20.9']
    }
  },

  // Cardiology Template
  {
    id: 'cardiology-consultation',
    name: 'Cardiology Consultation',
    specialty: 'Cardiology',
    type: 'cardiology',
    estimatedTime: 40,
    category: 'Specialty',
    complexity: 'high',
    soapTemplate: {
      subjective: {
        sections: [
          'Chief Complaint',
          'History of Present Illness',
          'Cardiac History',
          'Risk Factors',
          'Current Medications',
          'Family History of CAD'
        ],
        quickPhrases: [
          'Referred for cardiac evaluation',
          'Chest pain with exertion',
          'Shortness of breath on exertion',
          'Palpitations',
          'History of hypertension',
          'Family history of heart disease'
        ],
        requiredFields: ['Chief Complaint', 'Cardiac History', 'Risk Factors']
      },
      objective: {
        sections: ['Vital Signs', 'Cardiovascular Examination', 'Diagnostic Studies'],
        quickPhrases: [
          'Blood pressure elevated/normal/low',
          'Heart rate regular/irregular',
          'No peripheral edema',
          'Pulses intact bilaterally'
        ],
        vitalSigns: ['Blood Pressure', 'Heart Rate', 'Weight', 'O2 Saturation'],
        physicalExam: [
          'Cardiovascular: Point of maximal impulse',
          'Heart sounds: S1, S2 present',
          'Murmurs: Present/absent',
          'Peripheral pulses: Radial, dorsalis pedis',
          'Extremities: Edema assessment',
          'Jugular venous distension assessment'
        ]
      },
      assessment: {
        commonDiagnoses: [
          'Coronary artery disease',
          'Hypertension',
          'Heart failure',
          'Atrial fibrillation',
          'Valvular disease'
        ],
        differentialDx: [
          'Stable vs unstable angina',
          'Systolic vs diastolic heart failure',
          'Ischemic vs non-ischemic cardiomyopathy'
        ],
        riskFactors: [
          'Diabetes',
          'Smoking',
          'Hyperlipidemia',
          'Family history',
          'Age',
          'Gender'
        ]
      },
      plan: {
        treatments: [
          'Lifestyle modifications',
          'Cardiac rehabilitation',
          'Risk factor modification'
        ],
        medications: [
          'ACE inhibitor/ARB',
          'Beta-blocker',
          'Statin therapy',
          'Antiplatelet therapy'
        ],
        followUp: [
          'Cardiology follow-up in 3-6 months',
          'Primary care follow-up',
          'Emergency precautions discussed'
        ],
        patientEducation: [
          'Discussed cardiac diet',
          'Exercise recommendations',
          'Medication compliance',
          'Warning signs of cardiac events'
        ]
      }
    },
    billingCodes: {
      commonCPT: ['99243', '99244', '99245', '93000', '93306'],
      commonICD10: ['I25.9', 'I10', 'I50.9', 'I48.91']
    },
    clinicalGuidelines: [
      'ACC/AHA Guidelines for CAD',
      'Heart Failure Guidelines',
      'Hypertension Guidelines'
    ]
  },

  // Mental Health Template
  {
    id: 'psychiatric-evaluation',
    name: 'Psychiatric Evaluation',
    specialty: 'Psychiatry',
    type: 'psychiatry',
    estimatedTime: 60,
    category: 'Mental Health',
    complexity: 'high',
    soapTemplate: {
      subjective: {
        sections: [
          'Chief Complaint',
          'History of Present Illness',
          'Psychiatric History',
          'Substance Use History',
          'Social History',
          'Family Psychiatric History'
        ],
        quickPhrases: [
          'Presents for psychiatric evaluation',
          'Mood symptoms',
          'Anxiety symptoms',
          'Sleep disturbances',
          'Concentration difficulties',
          'Relationship problems'
        ],
        requiredFields: ['Chief Complaint', 'Psychiatric History', 'Risk Assessment']
      },
      objective: {
        sections: ['Mental Status Examination', 'Behavioral Observations', 'Risk Assessment'],
        quickPhrases: [
          'Cooperative with interview',
          'Appropriate dress and grooming',
          'Good eye contact',
          'Speech normal rate and volume'
        ],
        vitalSigns: ['Blood Pressure', 'Heart Rate', 'Weight'],
        physicalExam: [
          'Appearance: Well-groomed/disheveled',
          'Behavior: Cooperative/agitated/withdrawn',
          'Speech: Normal/pressured/slow',
          'Mood: Euthymic/depressed/elevated',
          'Affect: Appropriate/flat/labile',
          'Thought process: Linear/tangential/circumstantial',
          'Thought content: No delusions/obsessions',
          'Perceptions: No hallucinations',
          'Cognition: Alert and oriented x3',
          'Insight: Good/fair/poor',
          'Judgment: Good/fair/poor'
        ]
      },
      assessment: {
        commonDiagnoses: [
          'Major depressive disorder',
          'Generalized anxiety disorder',
          'Bipolar disorder',
          'ADHD',
          'PTSD'
        ],
        differentialDx: [
          'Medical causes of psychiatric symptoms',
          'Substance-induced mood disorder',
          'Personality disorder'
        ],
        riskFactors: [
          'Suicidal ideation',
          'Homicidal ideation',
          'Substance abuse',
          'Social stressors'
        ]
      },
      plan: {
        treatments: [
          'Psychotherapy',
          'Cognitive behavioral therapy',
          'Medication management'
        ],
        medications: [
          'SSRI/SNRI',
          'Mood stabilizer',
          'Anxiolytic',
          'Sleep aid'
        ],
        followUp: [
          'Psychiatry follow-up in 2-4 weeks',
          'Therapy referral',
          'Crisis plan established'
        ],
        patientEducation: [
          'Discussed diagnosis and treatment options',
          'Medication side effects reviewed',
          'Crisis resources provided',
          'Importance of medication compliance'
        ]
      }
    },
    billingCodes: {
      commonCPT: ['90791', '90834', '90837', '90847'],
      commonICD10: ['F32.9', 'F41.1', 'F31.9', 'F90.9', 'F43.10']
    }
  },

  // Pediatric Template
  {
    id: 'pediatric-well-visit',
    name: 'Pediatric Well Child Visit',
    specialty: 'Pediatrics',
    type: 'pediatric-well',
    estimatedTime: 30,
    category: 'Pediatric',
    complexity: 'moderate',
    soapTemplate: {
      subjective: {
        sections: [
          'Chief Complaint',
          'Interval History',
          'Development Assessment',
          'Nutrition History',
          'Safety Assessment'
        ],
        quickPhrases: [
          'Here for well child check',
          'Growing and developing appropriately',
          'No acute concerns',
          'Meeting developmental milestones',
          'Good appetite and sleep'
        ],
        requiredFields: ['Chief Complaint', 'Development Assessment']
      },
      objective: {
        sections: ['Growth Parameters', 'Physical Examination', 'Developmental Assessment'],
        quickPhrases: [
          'Well-appearing child',
          'Active and alert',
          'Appropriate for age',
          'No acute distress'
        ],
        vitalSigns: ['Weight', 'Height', 'Head Circumference', 'BMI', 'Blood Pressure', 'Temperature'],
        physicalExam: [
          'General: Well-appearing, active',
          'HEENT: Normocephalic, fontanelles soft',
          'Cardiovascular: Regular rate and rhythm',
          'Respiratory: Clear to auscultation',
          'Abdominal: Soft, non-tender',
          'Genitourinary: Normal external genitalia',
          'Extremities: No deformities',
          'Neurological: Age-appropriate reflexes',
          'Skin: No rashes or lesions'
        ]
      },
      assessment: {
        commonDiagnoses: [
          'Well child',
          'Normal growth and development',
          'Up to date with immunizations'
        ],
        differentialDx: [],
        riskFactors: ['Family history', 'Environmental factors']
      },
      plan: {
        treatments: [
          'Continue current care',
          'Age-appropriate activities',
          'Safety measures'
        ],
        medications: [
          'Vitamins as appropriate',
          'Fluoride supplementation if indicated'
        ],
        followUp: [
          'Next well child visit as scheduled',
          'Contact office with concerns',
          'Emergency precautions reviewed'
        ],
        patientEducation: [
          'Discussed normal development',
          'Safety counseling provided',
          'Nutrition guidance given',
          'Immunization schedule reviewed'
        ]
      }
    },
    billingCodes: {
      commonCPT: ['99381', '99382', '99383', '99391', '99392', '99393'],
      commonICD10: ['Z00.121', 'Z00.129']
    },
    qualityMeasures: [
      'Immunization rates',
      'Growth tracking',
      'Developmental screening',
      'Lead screening',
      'Vision/hearing screening'
    ]
  },

  // Telehealth Template
  {
    id: 'telehealth-visit',
    name: 'Telehealth Consultation',
    specialty: 'Telemedicine',
    type: 'telehealth',
    estimatedTime: 20,
    category: 'Telehealth',
    complexity: 'low',
    soapTemplate: {
      subjective: {
        sections: [
          'Chief Complaint',
          'History of Present Illness',
          'Current Medications',
          'Review of Systems'
        ],
        quickPhrases: [
          'Telehealth visit for follow-up',
          'Patient reports feeling well',
          'No new symptoms',
          'Medication compliance good',
          'Able to perform activities of daily living'
        ],
        requiredFields: ['Chief Complaint', 'History of Present Illness']
      },
      objective: {
        sections: ['Visual Assessment', 'Patient-Reported Vitals', 'Limited Physical Exam'],
        quickPhrases: [
          'Patient appears well on video',
          'Good audio and video quality',
          'Patient cooperative with exam',
          'Home blood pressure readings reviewed'
        ],
        vitalSigns: ['Patient-reported BP', 'Patient-reported weight', 'Patient-reported temperature'],
        physicalExam: [
          'General: Well-appearing on video',
          'Speech: Clear and appropriate',
          'Cognition: Alert and oriented',
          'Mood: Appropriate',
          'Visible skin: No acute changes',
          'Gait: Steady (if observed)'
        ]
      },
      assessment: {
        commonDiagnoses: [
          'Chronic condition stable',
          'Follow-up visit',
          'Medication management'
        ],
        differentialDx: [],
        riskFactors: ['Limited physical examination']
      },
      plan: {
        treatments: [
          'Continue current management',
          'Lifestyle modifications',
          'Home monitoring'
        ],
        medications: [
          'Continue current medications',
          'Medication adjustments as needed'
        ],
        followUp: [
          'Telehealth follow-up as scheduled',
          'In-person visit if needed',
          'Contact office with concerns'
        ],
        patientEducation: [
          'Reviewed condition management',
          'Discussed warning signs',
          'Home monitoring instructions',
          'Technology support provided'
        ]
      }
    },
    billingCodes: {
      commonCPT: ['99213', '99214', '99202', '99203'],
      commonICD10: ['Z00.00', 'Z51.81']
    }
  }
];

// Helper function to get templates by type
export const getTemplatesByType = (type: string): EncounterTemplate[] => {
  return ENCOUNTER_TEMPLATES.filter(template => template.type === type);
};

// Helper function to get templates by specialty
export const getTemplatesBySpecialty = (specialty: string): EncounterTemplate[] => {
  return ENCOUNTER_TEMPLATES.filter(template => template.specialty === specialty);
};

// Helper function to get template by ID
export const getTemplateById = (id: string): EncounterTemplate | undefined => {
  return ENCOUNTER_TEMPLATES.find(template => template.id === id);
};