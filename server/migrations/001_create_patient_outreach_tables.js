import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration: Create Patient Outreach System Tables
 * Creates all necessary tables for the patient communication and outreach system
 */

const migrationName = '001_create_patient_outreach_tables';

const up = async (db) => {
  console.log(`Running migration: ${migrationName}`);
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../sql/patient_outreach_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await db.execute(statement);
      }
    }
    
    // Insert default organization communication settings
    await db.execute(`
      INSERT INTO org_comm_settings (
        organization_id, 
        business_name, 
        business_address,
        business_phone,
        support_email,
        default_timezone,
        default_language,
        enable_marketing,
        marketing_consent_required
      ) VALUES (
        1,
        'OVHI Healthcare',
        '123 Healthcare Ave, Medical City, MC 12345',
        '+1-555-0123',
        'support@ovhi.com',
        'America/New_York',
        'en',
        true,
        true
      ) ON DUPLICATE KEY UPDATE
        business_name = VALUES(business_name),
        business_address = VALUES(business_address),
        updated_at = CURRENT_TIMESTAMP
    `);
    
    // Insert default communication templates
    const defaultTemplates = [
      {
        name: 'Appointment Confirmation - Email',
        purpose: 'appt_confirm',
        channel: 'email',
        subject: 'Appointment Confirmed - {{appt_date}} at {{appt_time}}',
        body: `
          <h2>Appointment Confirmed</h2>
          <p>Dear {{first_name}},</p>
          <p>Your appointment has been confirmed for:</p>
          <ul>
            <li><strong>Date:</strong> {{appt_date}}</li>
            <li><strong>Time:</strong> {{appt_time}}</li>
            <li><strong>Provider:</strong> {{provider}}</li>
            <li><strong>Location:</strong> {{location}}</li>
          </ul>
          <p>If you need to reschedule, please <a href="{{reschedule_link}}">click here</a> or call our office.</p>
          <p>Access your patient portal: <a href="{{portal_link}}">Patient Portal</a></p>
          <p>Thank you,<br>{{organization_name}}</p>
        `,
        variables: '["first_name", "appt_date", "appt_time", "provider", "location", "reschedule_link", "portal_link", "organization_name"]'
      },
      {
        name: 'Appointment Reminder - SMS',
        purpose: 'appt_reminder',
        channel: 'sms',
        subject: null,
        body: 'Hi {{first_name}}, reminder: appointment {{appt_date}} at {{appt_time}} with {{provider}}. Reply C to confirm, R to reschedule, or STOP to opt out. {{portal_link}}',
        variables: '["first_name", "appt_date", "appt_time", "provider", "portal_link"]'
      },
      {
        name: 'No Show Follow-up - SMS',
        purpose: 'no_show',
        channel: 'sms',
        subject: null,
        body: 'Hi {{first_name}}, we missed you at your appointment today. Please call us to reschedule: {{phone}}. Reply STOP to opt out.',
        variables: '["first_name", "phone"]'
      },
      {
        name: 'Prescription Refill Reminder - SMS',
        purpose: 'rx_refill',
        channel: 'sms',
        subject: null,
        body: 'Hi {{first_name}}, your prescription for {{medication}} is ready for refill. Contact your pharmacy or visit {{portal_link}}. Reply STOP to opt out.',
        variables: '["first_name", "medication", "portal_link"]'
      },
      {
        name: 'Lab Results Available - Email',
        purpose: 'lab_ready',
        channel: 'email',
        subject: 'Lab Results Available - {{organization_name}}',
        body: `
          <h2>Lab Results Available</h2>
          <p>Dear {{first_name}},</p>
          <p>Your lab results from {{test_date}} are now available in your patient portal.</p>
          <p><a href="{{portal_link}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Results</a></p>
          <p>If you have any questions, please contact our office at {{phone}}.</p>
          <p>Best regards,<br>{{organization_name}}</p>
        `,
        variables: '["first_name", "test_date", "portal_link", "phone", "organization_name"]'
      },
      {
        name: 'Health Education Campaign - Email',
        purpose: 'campaign_education',
        channel: 'email',
        subject: 'Important Health Information - {{topic}}',
        body: `
          <h2>{{topic}}</h2>
          <p>Dear {{first_name}},</p>
          <p>{{content}}</p>
          <p>For more information or to schedule an appointment, please visit your <a href="{{portal_link}}">patient portal</a> or call us at {{phone}}.</p>
          <p>Stay healthy,<br>{{organization_name}}</p>
          <hr>
          <small>
            You received this email because you opted in to health education communications. 
            <a href="{{unsubscribe_link}}">Unsubscribe</a> | 
            {{organization_name}}, {{business_address}}
          </small>
        `,
        variables: '["first_name", "topic", "content", "portal_link", "phone", "organization_name", "unsubscribe_link", "business_address"]',
        is_marketing: true
      }
    ];
    
    for (const template of defaultTemplates) {
      await db.execute(`
        INSERT INTO comm_templates (
          name, purpose, channel, language, subject, body, variables, is_marketing, organization_id
        ) VALUES (?, ?, ?, 'en', ?, ?, ?, ?, 1)
      `, [
        template.name,
        template.purpose,
        template.channel,
        template.subject,
        template.body,
        template.variables,
        template.is_marketing || false
      ]);
    }
    
    console.log(`Migration ${migrationName} completed successfully`);
    
  } catch (error) {
    console.error(`Migration ${migrationName} failed:`, error);
    throw error;
  }
};

const down = async (db) => {
  console.log(`Rolling back migration: ${migrationName}`);
  
  try {
    // Drop tables in reverse order of dependencies
    const tables = [
      'patient_segment_membership',
      'comm_queue_jobs',
      'org_comm_settings',
      'provider_comm_settings',
      'comm_audit_log',
      'comm_stats',
      'comm_inbound',
      'comm_jobs',
      'comm_campaigns',
      'patient_segments',
      'comm_templates',
      'patient_comm_prefs'
    ];
    
    for (const table of tables) {
      await db.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`Dropped table: ${table}`);
    }
    
    console.log(`Migration ${migrationName} rolled back successfully`);
    
  } catch (error) {
    console.error(`Rollback of migration ${migrationName} failed:`, error);
    throw error;
  }
};

export default {
  up,
  down,
  migrationName
};