import { 
  Calendar,
  Clock,
  Stethoscope,
  Brain,
  Clipboard,
  Heart,
  Shield,
  AlertTriangle,
  Zap,
  Eye,
  Activity,
  Video,
  Baby,
  Wind,
  AlertCircle,
  Search,
  FileCheck,
  Settings
} from "lucide-react";

export interface EncounterTypeConfig {
  value: string;
  label: string;
  time: number;
  icon: any;
  category: string;
  complexity: 'low' | 'moderate' | 'high';
  description: string;
  requiredFields: string[];
  suggestedCPTCodes: string[];
  commonDiagnoses: string[];
  qualityMeasures?: string[];
  specialtySpecific?: boolean;
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
  };
  prerequisites?: string[];
  followUpRecommendations: string[];
}

export const ENCOUNTER_TYPE_CONFIGS: EncounterTypeConfig[] = [
  // Primary Care
  {
    value: 'routine',
    label: 'Routine Follow-up',
    time: 15,
    icon: Calendar,
    category: 'Primary Care',
    complexity: 'low',
    description: 'Standard follow-up visit for established patients with stable conditions',
    requiredFields: ['Chief Complaint', 'Assessment', 'Plan'],
    suggestedCPTCodes: ['99213', '99212'],
    commonDiagnoses: ['Hypertension', 'Diabetes', 'Hyperlipidemia'],
    followUpRecommendations: ['3-6 months', 'PRN', 'Annual labs']
  },
  {
    value: 'annual',
    label: 'Annual Physical',
    time: 45,
    icon: Clipboard,
    category: 'Primary Care',
    complexity: 'moderate',
    description: 'Comprehensive annual physical examination with preventive care screening',
    requiredFields: ['ROS', 'Physical Exam', 'Assessment', 'Plan', 'Preventive Counseling'],
    suggestedCPTCodes: ['99395', '99396', '99397'],
    commonDiagnoses: ['Health maintenance', 'Screening'],
    qualityMeasures: ['Blood pressure', 'Cholesterol', 'Cancer screening', 'Immunizations'],
    followUpRecommendations: ['1 year', 'Specialist referrals as needed']
  },
  {
    value: 'wellness',
    label: 'Wellness Visit',
    time: 30,
    icon: Heart,
    category: 'Primary Care',
    complexity: 'low',
    description: 'Focused wellness and health maintenance visit',
    requiredFields: ['Health Goals', 'Risk Assessment', 'Counseling'],
    suggestedCPTCodes: ['G0438', 'G0439'],
    commonDiagnoses: ['Health maintenance', 'Risk factor counseling'],
    qualityMeasures: ['Lifestyle counseling', 'Preventive screening'],
    followUpRecommendations: ['Annual', 'PRN for health concerns']
  },
  {
    value: 'preventive',
    label: 'Preventive Care',
    time: 25,
    icon: Shield,
    category: 'Primary Care',
    complexity: 'low',
    description: 'Focused visit for preventive care services and screenings',
    requiredFields: ['Screening History', 'Risk Assessment', 'Counseling'],
    suggestedCPTCodes: ['99401', '99402', '99403'],
    commonDiagnoses: ['Screening', 'Prevention counseling'],
    qualityMeasures: ['Cancer screening', 'Immunization status'],
    followUpRecommendations: ['Per screening guidelines']
  },

  // Acute Care
  {
    value: 'acute',
    label: 'Acute Illness',
    time: 20,
    icon: Stethoscope,
    category: 'Acute Care',
    complexity: 'moderate',
    description: 'Evaluation and treatment of acute medical conditions',
    requiredFields: ['HPI', 'Physical Exam', 'Assessment', 'Treatment Plan'],
    suggestedCPTCodes: ['99213', '99214'],
    commonDiagnoses: ['URI', 'UTI', 'Gastroenteritis', 'Acute bronchitis'],
    followUpRecommendations: ['PRN', '1-2 weeks if not improving']
  },
  {
    value: 'urgent',
    label: 'Urgent Care',
    time: 30,
    icon: AlertTriangle,
    category: 'Acute Care',
    complexity: 'high',
    description: 'Urgent medical evaluation requiring prompt attention',
    requiredFields: ['HPI', 'Physical Exam', 'Assessment', 'Urgent Treatment'],
    suggestedCPTCodes: ['99214', '99215'],
    commonDiagnoses: ['Acute conditions requiring urgent care'],
    followUpRecommendations: ['24-48 hours', 'Return if worsening']
  },
  {
    value: 'emergency',
    label: 'Emergency Visit',
    time: 45,
    icon: Zap,
    category: 'Acute Care',
    complexity: 'high',
    description: 'Emergency department or urgent evaluation',
    requiredFields: ['HPI', 'Physical Exam', 'Assessment', 'Emergency Treatment', 'Disposition'],
    suggestedCPTCodes: ['99281', '99282', '99283', '99284', '99285'],
    commonDiagnoses: ['Emergency conditions'],
    followUpRecommendations: ['Immediate follow-up', 'Specialist referral']
  },
  {
    value: 'walk-in',
    label: 'Walk-in Visit',
    time: 15,
    icon: Clock,
    category: 'Acute Care',
    complexity: 'low',
    description: 'Unscheduled visit for minor acute issues',
    requiredFields: ['Chief Complaint', 'Focused Exam', 'Treatment'],
    suggestedCPTCodes: ['99212', '99213'],
    commonDiagnoses: ['Minor acute conditions'],
    followUpRecommendations: ['PRN', 'Return if not improving']
  },

  // Specialty Care
  {
    value: 'consultation',
    label: 'Specialist Consultation',
    time: 45,
    icon: Brain,
    category: 'Specialty',
    complexity: 'high',
    description: 'Comprehensive specialist consultation and evaluation',
    requiredFields: ['Consultation Reason', 'Specialist Assessment', 'Recommendations'],
    suggestedCPTCodes: ['99243', '99244', '99245'],
    commonDiagnoses: ['Specialty-specific conditions'],
    specialtySpecific: true,
    followUpRecommendations: ['Per specialty guidelines', 'Return to referring provider']
  },
  {
    value: 'cardiology',
    label: 'Cardiology Visit',
    time: 40,
    icon: Heart,
    category: 'Specialty',
    complexity: 'high',
    description: 'Cardiovascular evaluation and management',
    requiredFields: ['Cardiac History', 'CV Exam', 'Risk Assessment', 'Cardiac Plan'],
    suggestedCPTCodes: ['99213', '99214', '93000'],
    commonDiagnoses: ['CAD', 'Heart failure', 'Arrhythmia', 'Hypertension'],
    qualityMeasures: ['Blood pressure control', 'Lipid management', 'Medication compliance'],
    followUpRecommendations: ['3-6 months', 'Cardiac rehabilitation', 'Lifestyle modification']
  },
  {
    value: 'dermatology',
    label: 'Dermatology Visit',
    time: 25,
    icon: Eye,
    category: 'Specialty',
    complexity: 'moderate',
    description: 'Dermatological examination and treatment',
    requiredFields: ['Skin Complaint', 'Dermatologic Exam', 'Diagnosis', 'Treatment'],
    suggestedCPTCodes: ['99213', '99214', '11100'],
    commonDiagnoses: ['Acne', 'Eczema', 'Skin cancer screening', 'Rash'],
    followUpRecommendations: ['2-4 weeks', 'Annual skin screening']
  },
  {
    value: 'orthopedic',
    label: 'Orthopedic Visit',
    time: 35,
    icon: Activity,
    category: 'Specialty',
    complexity: 'moderate',
    description: 'Musculoskeletal evaluation and treatment',
    requiredFields: ['MSK History', 'Orthopedic Exam', 'Imaging Review', 'Treatment Plan'],
    suggestedCPTCodes: ['99213', '99214', '20610'],
    commonDiagnoses: ['Arthritis', 'Joint pain', 'Fracture', 'Sports injury'],
    followUpRecommendations: ['2-6 weeks', 'Physical therapy', 'Imaging follow-up']
  },
  {
    value: 'neurology',
    label: 'Neurology Visit',
    time: 50,
    icon: Brain,
    category: 'Specialty',
    complexity: 'high',
    description: 'Neurological evaluation and management',
    requiredFields: ['Neurologic History', 'Neuro Exam', 'Assessment', 'Neuro Plan'],
    suggestedCPTCodes: ['99213', '99214', '95860'],
    commonDiagnoses: ['Headache', 'Seizure', 'Neuropathy', 'Dementia'],
    followUpRecommendations: ['3-6 months', 'Specialist follow-up', 'Imaging as needed']
  },

  // Mental Health
  {
    value: 'psychiatry',
    label: 'Psychiatry Visit',
    time: 60,
    icon: Brain,
    category: 'Mental Health',
    complexity: 'high',
    description: 'Psychiatric evaluation and medication management',
    requiredFields: ['Mental Status Exam', 'Risk Assessment', 'Psychiatric Diagnosis', 'Treatment Plan'],
    suggestedCPTCodes: ['90834', '90837', '90791'],
    commonDiagnoses: ['Depression', 'Anxiety', 'Bipolar', 'ADHD', 'PTSD'],
    followUpRecommendations: ['2-4 weeks', 'Therapy referral', 'Crisis plan']
  },
  {
    value: 'psychology',
    label: 'Psychology Session',
    time: 50,
    icon: Heart,
    category: 'Mental Health',
    complexity: 'moderate',
    description: 'Psychological therapy and counseling session',
    requiredFields: ['Session Goals', 'Therapeutic Interventions', 'Progress Assessment'],
    suggestedCPTCodes: ['90834', '90837', '90847'],
    commonDiagnoses: ['Adjustment disorder', 'Anxiety', 'Depression', 'Relationship issues'],
    followUpRecommendations: ['Weekly', 'Bi-weekly', 'Monthly sessions']
  },

  // Chronic Care
  {
    value: 'diabetes',
    label: 'Diabetes Management',
    time: 30,
    icon: Activity,
    category: 'Chronic Care',
    complexity: 'moderate',
    description: 'Comprehensive diabetes care and management',
    requiredFields: ['Diabetes History', 'Glucose Control', 'Complications Screening', 'Management Plan'],
    suggestedCPTCodes: ['99213', '99214', 'G0108'],
    commonDiagnoses: ['Type 1 DM', 'Type 2 DM', 'Diabetic complications'],
    qualityMeasures: ['HbA1c', 'Eye exam', 'Foot exam', 'Nephropathy screening'],
    followUpRecommendations: ['3 months', 'Endocrinology referral', 'Diabetes education']
  },
  {
    value: 'hypertension',
    label: 'Hypertension Follow-up',
    time: 20,
    icon: Heart,
    category: 'Chronic Care',
    complexity: 'low',
    description: 'Blood pressure monitoring and hypertension management',
    requiredFields: ['BP History', 'Current BP', 'Medication Review', 'Lifestyle Assessment'],
    suggestedCPTCodes: ['99213', '99212'],
    commonDiagnoses: ['Essential hypertension', 'Secondary hypertension'],
    qualityMeasures: ['Blood pressure control', 'Medication adherence'],
    followUpRecommendations: ['1-3 months', 'Home BP monitoring', 'Lifestyle counseling']
  },
  {
    value: 'copd',
    label: 'COPD Management',
    time: 35,
    icon: Wind,
    category: 'Chronic Care',
    complexity: 'moderate',
    description: 'Chronic obstructive pulmonary disease management',
    requiredFields: ['Respiratory History', 'Pulmonary Exam', 'Functional Assessment', 'Treatment Plan'],
    suggestedCPTCodes: ['99213', '99214', '94060'],
    commonDiagnoses: ['COPD', 'Chronic bronchitis', 'Emphysema'],
    qualityMeasures: ['Spirometry', 'Vaccination status', 'Smoking cessation'],
    followUpRecommendations: ['3-6 months', 'Pulmonary rehabilitation', 'Smoking cessation']
  },
  {
    value: 'chronic-pain',
    label: 'Chronic Pain Management',
    time: 40,
    icon: AlertCircle,
    category: 'Chronic Care',
    complexity: 'high',
    description: 'Comprehensive chronic pain evaluation and management',
    requiredFields: ['Pain Assessment', 'Functional Status', 'Medication Review', 'Pain Plan'],
    suggestedCPTCodes: ['99213', '99214', '20610'],
    commonDiagnoses: ['Chronic pain', 'Fibromyalgia', 'Neuropathy'],
    followUpRecommendations: ['4-8 weeks', 'Pain management referral', 'Physical therapy']
  },

  // Procedures
  {
    value: 'procedure',
    label: 'Minor Procedure',
    time: 60,
    icon: Settings,
    category: 'Procedures',
    complexity: 'high',
    description: 'Minor surgical or diagnostic procedure',
    requiredFields: ['Procedure Indication', 'Consent', 'Procedure Note', 'Post-procedure Care'],
    suggestedCPTCodes: ['11100', '11200', '12001'],
    commonDiagnoses: ['Procedure-specific diagnoses'],
    followUpRecommendations: ['1-2 weeks', 'Wound care', 'Activity restrictions']
  },
  {
    value: 'biopsy',
    label: 'Biopsy',
    time: 45,
    icon: Settings,
    category: 'Procedures',
    complexity: 'high',
    description: 'Tissue biopsy procedure',
    requiredFields: ['Biopsy Indication', 'Consent', 'Procedure Details', 'Specimen Handling'],
    suggestedCPTCodes: ['11100', '11101', '88305'],
    commonDiagnoses: ['Lesion requiring biopsy'],
    followUpRecommendations: ['1-2 weeks for results', 'Wound care']
  },
  {
    value: 'injection',
    label: 'Injection/Infusion',
    time: 30,
    icon: Settings,
    category: 'Procedures',
    complexity: 'moderate',
    description: 'Therapeutic injection or infusion',
    requiredFields: ['Injection Indication', 'Consent', 'Injection Details', 'Post-injection Care'],
    suggestedCPTCodes: ['20610', '96372', '96365'],
    commonDiagnoses: ['Joint pain', 'Medication administration'],
    followUpRecommendations: ['PRN', 'Monitor for complications']
  },
  {
    value: 'diagnostic',
    label: 'Diagnostic Procedure',
    time: 40,
    icon: Search,
    category: 'Procedures',
    complexity: 'moderate',
    description: 'Diagnostic testing and evaluation',
    requiredFields: ['Test Indication', 'Procedure Details', 'Results', 'Interpretation'],
    suggestedCPTCodes: ['93000', '94060', '76700'],
    commonDiagnoses: ['Diagnostic evaluation'],
    followUpRecommendations: ['Results follow-up', 'Additional testing as needed']
  },

  // Telehealth
  {
    value: 'telehealth',
    label: 'Telehealth Visit',
    time: 20,
    icon: Video,
    category: 'Telehealth',
    complexity: 'low',
    description: 'Virtual consultation via telehealth platform',
    requiredFields: ['Virtual Assessment', 'Technology Verification', 'Remote Exam'],
    suggestedCPTCodes: ['99213', '99214', 'G2012'],
    commonDiagnoses: ['Follow-up care', 'Chronic disease management'],
    followUpRecommendations: ['Virtual or in-person follow-up', 'Technology support']
  },
  {
    value: 'tele-followup',
    label: 'Telehealth Follow-up',
    time: 15,
    icon: Video,
    category: 'Telehealth',
    complexity: 'low',
    description: 'Virtual follow-up visit for established patients',
    requiredFields: ['Follow-up Assessment', 'Medication Review', 'Virtual Plan'],
    suggestedCPTCodes: ['99212', '99213'],
    commonDiagnoses: ['Chronic condition follow-up'],
    followUpRecommendations: ['Continued virtual care', 'In-person if needed']
  },
  {
    value: 'tele-consultation',
    label: 'Telehealth Consultation',
    time: 30,
    icon: Video,
    category: 'Telehealth',
    complexity: 'moderate',
    description: 'Virtual specialist consultation',
    requiredFields: ['Consultation Reason', 'Virtual Assessment', 'Specialist Recommendations'],
    suggestedCPTCodes: ['99243', '99244'],
    commonDiagnoses: ['Specialty consultation'],
    followUpRecommendations: ['Virtual or in-person specialty follow-up']
  },

  // Pediatric
  {
    value: 'pediatric-well',
    label: 'Pediatric Well Visit',
    time: 30,
    icon: Baby,
    category: 'Pediatric',
    complexity: 'moderate',
    description: 'Well-child examination and developmental assessment',
    requiredFields: ['Growth Assessment', 'Development Screening', 'Immunizations', 'Anticipatory Guidance'],
    suggestedCPTCodes: ['99381', '99382', '99391', '99392'],
    commonDiagnoses: ['Well child', 'Normal development'],
    qualityMeasures: ['Growth tracking', 'Immunizations', 'Developmental screening'],
    ageRestrictions: { maxAge: 18 },
    followUpRecommendations: ['Per AAP schedule', 'Next well visit']
  },
  {
    value: 'pediatric-sick',
    label: 'Pediatric Sick Visit',
    time: 25,
    icon: Baby,
    category: 'Pediatric',
    complexity: 'moderate',
    description: 'Evaluation of acute illness in pediatric patients',
    requiredFields: ['Pediatric HPI', 'Age-appropriate Exam', 'Parent/Guardian Input'],
    suggestedCPTCodes: ['99213', '99214'],
    commonDiagnoses: ['Pediatric acute illness'],
    ageRestrictions: { maxAge: 18 },
    followUpRecommendations: ['PRN', 'Return if not improving', 'Parent education']
  },
  {
    value: 'immunization',
    label: 'Immunization Visit',
    time: 15,
    icon: Shield,
    category: 'Pediatric',
    complexity: 'low',
    description: 'Vaccination administration and counseling',
    requiredFields: ['Immunization History', 'Vaccine Administration', 'Post-vaccine Instructions'],
    suggestedCPTCodes: ['90460', '90461', '90471'],
    commonDiagnoses: ['Immunization administration'],
    qualityMeasures: ['Immunization rates', 'Vaccine safety'],
    followUpRecommendations: ['Per immunization schedule', 'Monitor for reactions']
  },

  // Women's Health
  {
    value: 'gynecology',
    label: 'Gynecology Visit',
    time: 35,
    icon: Heart,
    category: 'Women\'s Health',
    complexity: 'moderate',
    description: 'Gynecological examination and women\'s health care',
    requiredFields: ['Gynecologic History', 'Pelvic Exam', 'Breast Exam', 'Screening'],
    suggestedCPTCodes: ['99213', '99214', 'G0101'],
    commonDiagnoses: ['Annual gynecologic exam', 'Contraception counseling'],
    qualityMeasures: ['Cervical cancer screening', 'Breast cancer screening'],
    followUpRecommendations: ['Annual exam', 'Screening per guidelines']
  },
  {
    value: 'prenatal',
    label: 'Prenatal Visit',
    time: 30,
    icon: Heart,
    category: 'Women\'s Health',
    complexity: 'moderate',
    description: 'Prenatal care and monitoring during pregnancy',
    requiredFields: ['Prenatal History', 'Fetal Assessment', 'Maternal Health', 'Prenatal Education'],
    suggestedCPTCodes: ['99213', '99214', '76805'],
    commonDiagnoses: ['Normal pregnancy', 'Prenatal care'],
    qualityMeasures: ['Prenatal vitamins', 'Screening tests', 'Fetal monitoring'],
    followUpRecommendations: ['Per prenatal schedule', 'Delivery planning']
  },
  {
    value: 'postpartum',
    label: 'Postpartum Visit',
    time: 25,
    icon: Heart,
    category: 'Women\'s Health',
    complexity: 'moderate',
    description: 'Postpartum care and recovery assessment',
    requiredFields: ['Postpartum Assessment', 'Breastfeeding Support', 'Contraception Counseling'],
    suggestedCPTCodes: ['99213', '99214'],
    commonDiagnoses: ['Postpartum care', 'Normal delivery'],
    followUpRecommendations: ['6-8 weeks postpartum', 'Contraception planning']
  },

  // Geriatric
  {
    value: 'geriatric',
    label: 'Geriatric Assessment',
    time: 45,
    icon: Clock,
    category: 'Geriatric',
    complexity: 'high',
    description: 'Comprehensive geriatric assessment and care planning',
    requiredFields: ['Functional Assessment', 'Cognitive Screening', 'Fall Risk', 'Medication Review'],
    suggestedCPTCodes: ['99213', '99214', 'G0438'],
    commonDiagnoses: ['Multiple chronic conditions', 'Geriatric syndromes'],
    qualityMeasures: ['Fall prevention', 'Medication management', 'Cognitive assessment'],
    ageRestrictions: { minAge: 65 },
    followUpRecommendations: ['3-6 months', 'Care coordination', 'Family involvement']
  },
  {
    value: 'memory',
    label: 'Memory Assessment',
    time: 40,
    icon: Brain,
    category: 'Geriatric',
    complexity: 'high',
    description: 'Cognitive assessment and dementia evaluation',
    requiredFields: ['Cognitive Testing', 'Functional Assessment', 'Caregiver Input', 'Safety Assessment'],
    suggestedCPTCodes: ['99213', '99214', '96116'],
    commonDiagnoses: ['Mild cognitive impairment', 'Dementia', 'Memory concerns'],
    followUpRecommendations: ['3-6 months', 'Neurology referral', 'Caregiver support']
  },

  // Administrative
  {
    value: 'pre-op',
    label: 'Pre-operative Clearance',
    time: 30,
    icon: FileCheck,
    category: 'Administrative',
    complexity: 'moderate',
    description: 'Pre-operative medical clearance and risk assessment',
    requiredFields: ['Surgical History', 'Risk Assessment', 'Clearance Decision', 'Recommendations'],
    suggestedCPTCodes: ['99213', '99214'],
    commonDiagnoses: ['Pre-operative evaluation'],
    followUpRecommendations: ['Post-operative follow-up', 'Surgical clearance']
  },
  {
    value: 'post-op',
    label: 'Post-operative Follow-up',
    time: 25,
    icon: FileCheck,
    category: 'Administrative',
    complexity: 'moderate',
    description: 'Post-operative care and recovery assessment',
    requiredFields: ['Surgical Recovery', 'Wound Assessment', 'Complications Screening', 'Activity Clearance'],
    suggestedCPTCodes: ['99213', '99024'],
    commonDiagnoses: ['Post-operative care'],
    followUpRecommendations: ['Per surgical protocol', 'Return to activity clearance']
  },
  {
    value: 'disability',
    label: 'Disability Evaluation',
    time: 60,
    icon: FileCheck,
    category: 'Administrative',
    complexity: 'high',
    description: 'Comprehensive disability assessment and documentation',
    requiredFields: ['Functional Assessment', 'Work Capacity', 'Disability Documentation', 'Recommendations'],
    suggestedCPTCodes: ['99215', '99245'],
    commonDiagnoses: ['Disability evaluation'],
    followUpRecommendations: ['Per disability requirements', 'Follow-up assessments']
  },
  {
    value: 'work-comp',
    label: 'Workers\' Compensation Exam',
    time: 45,
    icon: FileCheck,
    category: 'Administrative',
    complexity: 'high',
    description: 'Workers\' compensation medical evaluation',
    requiredFields: ['Work Injury History', 'Functional Assessment', 'Work Restrictions', 'Return to Work Plan'],
    suggestedCPTCodes: ['99213', '99214'],
    commonDiagnoses: ['Work-related injury'],
    followUpRecommendations: ['Per work comp requirements', 'Return to work assessment']
  }
];

// Helper functions
export const getEncounterTypesByCategory = (category: string): EncounterTypeConfig[] => {
  return ENCOUNTER_TYPE_CONFIGS.filter(config => config.category === category);
};

export const getEncounterTypeByValue = (value: string): EncounterTypeConfig | undefined => {
  return ENCOUNTER_TYPE_CONFIGS.find(config => config.value === value);
};

export const getEncounterTypesForAge = (age: number): EncounterTypeConfig[] => {
  return ENCOUNTER_TYPE_CONFIGS.filter(config => {
    if (!config.ageRestrictions) return true;
    const { minAge, maxAge } = config.ageRestrictions;
    if (minAge && age < minAge) return false;
    if (maxAge && age > maxAge) return false;
    return true;
  });
};

export const getEncounterCategories = (): string[] => {
  return [...new Set(ENCOUNTER_TYPE_CONFIGS.map(config => config.category))];
};