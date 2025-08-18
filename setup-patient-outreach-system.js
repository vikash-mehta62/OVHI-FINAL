import mysql from 'mysql2/promise';
import { initializeRedis, closeRedis } from './server/config/redis.js';
import migration from './server/migrations/001_create_patient_outreach_tables.js';

/**
 * Setup script for Patient Outreach System
 * Initializes database schema, Redis configuration, and sample data
 */

async function setupPatientOutreachSystem() {
  let connection = null;
  
  try {
    console.log('🚀 Starting Patient Outreach System setup...');
    
    // Database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ovhi_db',
      multipleStatements: true
    });
    
    console.log('✅ Database connection established');
    
    // Run migration
    console.log('📊 Creating database schema...');
    await migration.up(connection);
    console.log('✅ Database schema created successfully');
    
    // Initialize Redis
    console.log('🔄 Initializing Redis connections...');
    await initializeRedis();
    console.log('✅ Redis connections established');
    
    // Insert sample patient communication preferences
    console.log('👥 Creating sample patient communication preferences...');
    await createSamplePatientPreferences(connection);
    
    // Insert sample segments
    console.log('🎯 Creating sample patient segments...');
    await createSampleSegments(connection);
    
    // Insert sample provider settings
    console.log('👨‍⚕️ Creating sample provider settings...');
    await createSampleProviderSettings(connection);
    
    console.log('🎉 Patient Outreach System setup completed successfully!');
    console.log('\n📋 System Components Initialized:');
    console.log('   ✓ Database schema with 12 tables');
    console.log('   ✓ Redis cache and queue configuration');
    console.log('   ✓ Default communication templates');
    console.log('   ✓ Sample patient preferences');
    console.log('   ✓ Sample patient segments');
    console.log('   ✓ Provider communication settings');
    console.log('\n🔧 Next Steps:');
    console.log('   1. Configure external provider API keys (SendGrid, Twilio, WhatsApp)');
    console.log('   2. Start the communication workers');
    console.log('   3. Test the system with sample communications');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    await closeRedis();
  }
}

async function createSamplePatientPreferences(db) {
  // Assuming we have some patients in the system, create preferences for them
  const samplePreferences = [
    {
      patient_id: 1,
      timezone: 'America/New_York',
      language: 'en',
      quiet_start: '22:00:00',
      quiet_end: '08:00:00',
      work_start: '09:00:00',
      work_end: '17:00:00',
      best_hour: 10,
      allow_email: true,
      allow_sms: true,
      allow_whatsapp: false,
      marketing_opt_in_email: true,
      marketing_opt_in_sms: false,
      email_address: 'patient1@example.com',
      sms_number: '+1-555-0101'
    },
    {
      patient_id: 2,
      timezone: 'America/Los_Angeles',
      language: 'es',
      quiet_start: '23:00:00',
      quiet_end: '07:00:00',
      work_start: '08:00:00',
      work_end: '16:00:00',
      best_hour: 14,
      allow_email: true,
      allow_sms: true,
      allow_whatsapp: true,
      marketing_opt_in_email: false,
      marketing_opt_in_sms: true,
      marketing_opt_in_whatsapp: true,
      email_address: 'patient2@example.com',
      sms_number: '+1-555-0102',
      whatsapp_number: '+1-555-0102'
    },
    {
      patient_id: 3,
      timezone: 'America/Chicago',
      language: 'en',
      quiet_start: '21:30:00',
      quiet_end: '08:30:00',
      work_start: '07:00:00',
      work_end: '15:00:00',
      best_hour: 11,
      allow_email: false,
      allow_sms: true,
      allow_whatsapp: false,
      marketing_opt_in_email: false,
      marketing_opt_in_sms: false,
      email_address: null,
      sms_number: '+1-555-0103'
    }
  ];
  
  for (const pref of samplePreferences) {
    try {
      await db.execute(`
        INSERT INTO patient_comm_prefs (
          patient_id, timezone, language, quiet_start, quiet_end, work_start, work_end,
          best_hour, allow_email, allow_sms, allow_whatsapp, marketing_opt_in_email,
          marketing_opt_in_sms, marketing_opt_in_whatsapp, email_address, sms_number, whatsapp_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          timezone = VALUES(timezone),
          language = VALUES(language),
          updated_at = CURRENT_TIMESTAMP
      `, [
        pref.patient_id, pref.timezone, pref.language, pref.quiet_start, pref.quiet_end,
        pref.work_start, pref.work_end, pref.best_hour, pref.allow_email, pref.allow_sms,
        pref.allow_whatsapp, pref.marketing_opt_in_email, pref.marketing_opt_in_sms,
        pref.marketing_opt_in_whatsapp, pref.email_address, pref.sms_number, pref.whatsapp_number
      ]);
    } catch (error) {
      console.log(`Note: Could not create preferences for patient ${pref.patient_id} (patient may not exist)`);
    }
  }
  
  console.log('✅ Sample patient preferences created');
}

async function createSampleSegments(db) {
  const sampleSegments = [
    {
      name: 'Hypertension Patients - Overdue Visit',
      description: 'Patients with hypertension diagnosis who haven\'t had a visit in over 90 days',
      rules: JSON.stringify({
        and: [
          { field: 'diagnosis_codes', operator: 'contains', value: 'I10' },
          { field: 'last_visit_days', operator: 'gt', value: 90 },
          { field: 'age', operator: 'gte', value: 18 }
        ]
      }),
      organization_id: 1,
      created_by: 1
    },
    {
      name: 'Diabetes Patients - A1C Overdue',
      description: 'Diabetic patients who need A1C testing',
      rules: JSON.stringify({
        and: [
          {
            or: [
              { field: 'diagnosis_codes', operator: 'contains', value: 'E11' },
              { field: 'diagnosis_codes', operator: 'contains', value: 'E10' }
            ]
          },
          { field: 'last_a1c_days', operator: 'gt', value: 180 }
        ]
      }),
      organization_id: 1,
      created_by: 1
    },
    {
      name: 'New Patients - Onboarding',
      description: 'Patients registered within the last 30 days for onboarding communications',
      rules: JSON.stringify({
        and: [
          { field: 'registration_days', operator: 'lte', value: 30 },
          { field: 'visit_count', operator: 'lt', value: 2 }
        ]
      }),
      organization_id: 1,
      created_by: 1
    },
    {
      name: 'Spanish Speaking Patients',
      description: 'Patients who prefer Spanish language communications',
      rules: JSON.stringify({
        and: [
          { field: 'preferred_language', operator: 'eq', value: 'es' }
        ]
      }),
      organization_id: 1,
      created_by: 1
    }
  ];
  
  for (const segment of sampleSegments) {
    await db.execute(`
      INSERT INTO patient_segments (name, description, rules, organization_id, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [segment.name, segment.description, segment.rules, segment.organization_id, segment.created_by]);
  }
  
  console.log('✅ Sample patient segments created');
}

async function createSampleProviderSettings(db) {
  const sampleProviderSettings = [
    {
      provider_id: 1,
      organization_id: 1,
      default_timezone: 'America/New_York',
      default_language: 'en',
      enable_auto_reminders: true,
      reminder_hours_before: JSON.stringify([24, 2]),
      signature: 'Dr. Smith\nFamily Medicine\nOVHI Healthcare'
    },
    {
      provider_id: 2,
      organization_id: 1,
      default_timezone: 'America/New_York',
      default_language: 'es',
      enable_auto_reminders: true,
      reminder_hours_before: JSON.stringify([48, 4]),
      signature: 'Dra. García\nMedicina Interna\nOVHI Healthcare'
    }
  ];
  
  for (const setting of sampleProviderSettings) {
    try {
      await db.execute(`
        INSERT INTO provider_comm_settings (
          provider_id, organization_id, default_timezone, default_language,
          enable_auto_reminders, reminder_hours_before, signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          default_timezone = VALUES(default_timezone),
          default_language = VALUES(default_language),
          updated_at = CURRENT_TIMESTAMP
      `, [
        setting.provider_id, setting.organization_id, setting.default_timezone,
        setting.default_language, setting.enable_auto_reminders,
        setting.reminder_hours_before, setting.signature
      ]);
    } catch (error) {
      console.log(`Note: Could not create settings for provider ${setting.provider_id} (provider may not exist)`);
    }
  }
  
  console.log('✅ Sample provider settings created');
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupPatientOutreachSystem();
}

export {
  setupPatientOutreachSystem,
  createSamplePatientPreferences,
  createSampleSegments,
  createSampleProviderSettings
};