/**
 * Appointment Email Reminder - Demo Test
 * 
 * This script demonstrates the complete appointment reminder email system.
 * It can be run anytime to show how the system works.
 * 
 * Usage:
 *   node test-appointment-reminder-demo.js
 * 
 * What it does:
 *   1. Creates a test appointment 24 hours from now
 *   2. Triggers the reminder cron job manually
 *   3. Sends an actual email to the patient
 *   4. Shows the complete flow with detailed logs
 */

require('dotenv').config();
const connection = require('./config/db');
const appointmentEmailReminderCron = require('./crons/appointmentEmailReminderCron');

// Demo configuration
const DEMO_CONFIG = {
  patientEmail: 'jayvekariya2003@gmail.com',
  patientName: 'Demo Patient',
  patientId: 8, // Use existing user ID
  providerName: 'Dr. Sarah Johnson',
  location: 'Main Clinic - Room 204',
  providerPhone: '(555) 123-4567',
  reason: 'Annual Health Checkup',
  duration: '30 minutes'
};

async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     APPOINTMENT EMAIL REMINDER SYSTEM - DEMONSTRATION             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Clean up old demo and test appointments
    console.log('📋 Step 1: Cleaning up old test appointments...');
    
    // Delete old demo appointments
    await connection.query(`
      DELETE FROM appointment 
      WHERE patient_email = ? 
      AND patient_name IN ('Demo Patient', 'Test Patient')
    `, [DEMO_CONFIG.patientEmail]);
    
    console.log('   ✓ Cleanup completed\n');

    // Step 2: Create demo appointment
    console.log('📋 Step 2: Creating demo appointment 24 hours from now...');
    const [result] = await connection.query(`
      INSERT INTO appointment (
        patient_id,
        patient_name,
        patient_email,
        date,
        duration,
        reason,
        status,
        location_id,
        provider_id,
        reminder_sent
      ) VALUES (
        ?,
        ?,
        ?,
        DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 24 HOUR), '%Y-%m-%d %H:%i:%s'),
        ?,
        ?,
        'scheduled',
        1,
        1,
        0
      )
    `, [
      DEMO_CONFIG.patientId,
      DEMO_CONFIG.patientName,
      DEMO_CONFIG.patientEmail,
      DEMO_CONFIG.duration,
      DEMO_CONFIG.reason
    ]);

    const appointmentId = result.insertId;
    console.log(`   ✓ Appointment created with ID: ${appointmentId}\n`);

    // Step 3: Verify appointment details
    console.log('📋 Step 3: Verifying appointment details...');
    const [appointments] = await connection.query(`
      SELECT 
        id,
        patient_name,
        patient_email,
        date,
        duration,
        reason,
        status,
        reminder_sent,
        TIMESTAMPDIFF(HOUR, NOW(), STR_TO_DATE(date, '%Y-%m-%d %H:%i:%s')) as hours_until_appointment
      FROM appointment 
      WHERE id = ?
    `, [appointmentId]);

    if (appointments.length === 0) {
      throw new Error('Appointment not found after creation!');
    }

    const appointment = appointments[0];
    console.log('\n   ┌─────────────────────────────────────────────────────────────┐');
    console.log('   │ APPOINTMENT DETAILS                                         │');
    console.log('   ├─────────────────────────────────────────────────────────────┤');
    console.log(`   │ ID:              ${appointment.id.toString().padEnd(44)} │`);
    console.log(`   │ Patient:         ${appointment.patient_name.padEnd(44)} │`);
    console.log(`   │ Email:           ${appointment.patient_email.padEnd(44)} │`);
    console.log(`   │ Date/Time:       ${appointment.date.padEnd(44)} │`);
    console.log(`   │ Duration:        ${appointment.duration.padEnd(44)} │`);
    console.log(`   │ Reason:          ${appointment.reason.padEnd(44)} │`);
    console.log(`   │ Status:          ${appointment.status.padEnd(44)} │`);
    console.log(`   │ Hours Until:     ${appointment.hours_until_appointment.toString().padEnd(44)} │`);
    console.log(`   │ Reminder Sent:   ${(appointment.reminder_sent ? 'Yes' : 'No').padEnd(44)} │`);
    console.log('   └─────────────────────────────────────────────────────────────┘\n');

    // Step 4: Check if appointment is in the reminder window
    console.log('📋 Step 4: Checking if appointment is in reminder window (23-25 hours)...');
    const [windowCheck] = await connection.query(`
      SELECT 
        id,
        CASE 
          WHEN STR_TO_DATE(date, '%Y-%m-%d %H:%i:%s') >= NOW() + INTERVAL 23 HOUR 
            AND STR_TO_DATE(date, '%Y-%m-%d %H:%i:%s') <= NOW() + INTERVAL 25 HOUR 
          THEN 'YES'
          ELSE 'NO'
        END as in_window
      FROM appointment 
      WHERE id = ?
    `, [appointmentId]);

    const inWindow = windowCheck[0].in_window === 'YES';
    if (inWindow) {
      console.log('   ✓ Appointment IS in the 23-25 hour reminder window\n');
    } else {
      console.log('   ⚠️  Appointment is NOT in the window (expected for 24-hour appointment)\n');
    }

    // Step 5: Trigger the reminder cron manually
    console.log('📋 Step 5: Triggering appointment reminder cron job...\n');
    console.log('   ════════════════════════════════════════════════════════════════');
    
    await appointmentEmailReminderCron.triggerManually();
    
    console.log('   ════════════════════════════════════════════════════════════════\n');

    // Step 6: Verify reminder was sent
    console.log('📋 Step 6: Verifying reminder status...');
    const [updatedAppointment] = await connection.query(`
      SELECT 
        id,
        reminder_sent
      FROM appointment 
      WHERE id = ?
    `, [appointmentId]);

    if (updatedAppointment[0].reminder_sent) {
      console.log('   ✓ Reminder flag updated to SENT\n');
    } else {
      console.log('   ⚠️  Reminder flag NOT updated (might be outside window or failed)\n');
    }

    // Step 7: Check notification logs
    console.log('📋 Step 7: Checking notification logs...');
    const [logs] = await connection.query(`
      SELECT 
        id,
        notification_type,
        title,
        status,
        delivery_method,
        sent_at
      FROM user_notifications 
      WHERE user_id = ?
      ORDER BY id DESC 
      LIMIT 1
    `, [DEMO_CONFIG.patientId]);

    if (logs.length > 0) {
      const log = logs[0];
      console.log('   ✓ Notification logged in database:');
      console.log(`      - Type: ${log.notification_type}`);
      console.log(`      - Title: ${log.title}`);
      console.log(`      - Status: ${log.status}`);
      console.log(`      - Method: ${log.delivery_method}`);
      console.log(`      - Sent At: ${log.sent_at}\n`);
    } else {
      console.log('   ⚠️  No notification log found (user might not exist in users table)\n');
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                        DEMO SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Demo appointment created: ID ${appointmentId}`);
    console.log(`✅ Patient email: ${DEMO_CONFIG.patientEmail}`);
    console.log(`✅ Scheduled for: ${appointment.date}`);
    console.log(`✅ Cron job executed successfully`);
    
    if (updatedAppointment[0].reminder_sent) {
      console.log(`✅ Reminder email SENT`);
      console.log(`\n📧 CHECK YOUR INBOX: ${DEMO_CONFIG.patientEmail}`);
      console.log('   You should receive a professional appointment reminder email!');
    } else {
      console.log(`⚠️  Reminder not sent (appointment might be outside 23-25 hour window)`);
      console.log(`   Current hours until appointment: ${appointment.hours_until_appointment}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
    console.log('💡 TIP: The cron job runs every hour automatically.');
    console.log('    It will find appointments 23-25 hours away and send reminders.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR OCCURRED:\n');
    console.error(error);
    console.log('\n');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Demo interrupted by user');
  process.exit(0);
});

// Run the demo
console.log('\n⏳ Starting demo in 2 seconds...\n');
setTimeout(() => {
  runDemo();
}, 2000);
