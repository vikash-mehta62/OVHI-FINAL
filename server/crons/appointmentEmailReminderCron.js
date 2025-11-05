/**
 * Appointment Email Reminder Cron Job
 * Runs every hour to check for appointments 24 hours away
 * Sends reminder emails to patients
 */

const cron = require('node-cron');
const connection = require('../config/db');
const { sendAppointmentReminderEmail } = require('../services/email/emailNotificationService');

class AppointmentEmailReminderCron {
  constructor() {
    this.job = null;
    this.isRunning = false;
  }

  /**
   * Start the cron job
   */
  start() {
    if (this.job) {
      console.log('⚠️  Appointment email reminder cron job already running');
      return;
    }

    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      await this.processAppointmentReminders();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('✅ Appointment email reminder cron job started (runs every hour)');
    console.log('   Schedule: Every hour at minute 0');
    console.log('   Timezone: America/New_York');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Appointment email reminder cron job stopped');
    }
  }

  /**
   * Main function to process appointment reminders
   */
  async processAppointmentReminders() {
    if (this.isRunning) {
      console.log('⚠️  Previous reminder job still running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n=== Starting Appointment Email Reminder Job ===');
      console.log('Time:', new Date().toISOString());

      // Find appointments that are 23-25 hours away
      const [appointments] = await connection.query(`
        SELECT 
          a.id as appointment_id,
          a.patient_id,
          a.patient_name,
          a.patient_email,
          a.date,
          a.duration,
          a.reason,
          a.location_id,
          a.provider_id,
          a.reminder_sent
        FROM appointment a
        WHERE STR_TO_DATE(a.date, '%Y-%m-%d %H:%i:%s') BETWEEN NOW() + INTERVAL 23 HOUR AND NOW() + INTERVAL 25 HOUR
          AND a.status NOT IN ('cancelled', 'completed')
          AND (a.reminder_sent = 0 OR a.reminder_sent IS NULL)
          AND a.patient_email IS NOT NULL
          AND a.patient_email != ''
        ORDER BY a.date ASC
      `);

      console.log(`📋 Found ${appointments.length} appointment(s) requiring reminder emails`);

      if (appointments.length === 0) {
        console.log('✓ No appointments need reminders at this time');
        console.log('=== Job Completed ===\n');
        return;
      }

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;

      // Process each appointment
      for (const appointment of appointments) {
        try {
          console.log(`\n📧 Processing appointment ${appointment.appointment_id}`);
          console.log(`   Patient: ${appointment.patient_name} (${appointment.patient_email})`);
          console.log(`   Date: ${new Date(appointment.date).toLocaleString()}`);

          // Use simple provider name (can be enhanced later)
          const providerName = 'Your Healthcare Provider';
          const location = 'Main Clinic';
          const providerPhone = '(555) 123-4567';

          // Send reminder email
          const result = await sendAppointmentReminderEmail({
            patientId: appointment.patient_id,
            patientEmail: appointment.patient_email,
            patientName: appointment.patient_name,
            appointmentId: appointment.appointment_id,
            date: appointment.date,
            duration: appointment.duration || '30 minutes',
            providerName: providerName,
            reason: appointment.reason,
            location: location,
            providerPhone: providerPhone
          });

          if (result.success) {
            // Mark reminder as sent
            await connection.query(
              'UPDATE appointment SET reminder_sent = 1 WHERE id = ?',
              [appointment.appointment_id]
            );

            successCount++;
            console.log(`   ✓ Reminder sent successfully`);
          } else if (result.reason === 'User preferences disabled') {
            // Mark as sent to avoid retrying
            await connection.query(
              'UPDATE appointment SET reminder_sent = 1 WHERE id = ?',
              [appointment.appointment_id]
            );

            skippedCount++;
            console.log(`   ⊘ Reminder skipped (user preferences)`);
          } else {
            failureCount++;
            console.log(`   ✗ Failed to send reminder: ${result.error || 'Unknown error'}`);
          }

          // Small delay between emails
          await this.sleep(1000);

        } catch (error) {
          failureCount++;
          console.error(`   ✗ Error processing appointment ${appointment.appointment_id}:`, error.message);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n=== Job Summary ===');
      console.log(`✓ Successfully sent: ${successCount}`);
      console.log(`⊘ Skipped (preferences): ${skippedCount}`);
      console.log(`✗ Failed: ${failureCount}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('=== Job Completed ===\n');

    } catch (error) {
      console.error('❌ Fatal error in appointment reminder cron job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerManually() {
    console.log('🔧 Manually triggering appointment reminder job...');
    await this.processAppointmentReminders();
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      running: this.job !== null,
      processing: this.isRunning,
      schedule: '0 * * * * (Every hour at minute 0)',
      timezone: 'America/New_York'
    };
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const appointmentEmailReminderCron = new AppointmentEmailReminderCron();

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n📛 Received SIGINT, stopping appointment email reminder cron...');
  appointmentEmailReminderCron.stop();
});

process.on('SIGTERM', () => {
  console.log('\n📛 Received SIGTERM, stopping appointment email reminder cron...');
  appointmentEmailReminderCron.stop();
});

module.exports = appointmentEmailReminderCron;
