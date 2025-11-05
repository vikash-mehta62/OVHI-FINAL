/**
 * Email Notification Service
 * Handles sending appointment reminder emails
 */

const connection = require('../../config/db');
const mailSender = require('../../utils/mailSender');
const { appointmentReminderTemplate } = require("../../template/appointmentEmailTemplates");
const { patientRegistrationTemplate } = require("../../template/patientRegistrationEmailTemplate");

/**
 * Check if user has email notifications enabled for appointments
 */
const checkEmailSettings = async (userId, notificationType) => {
  try {
    const [settings] = await connection.query(`
      SELECT 
        email_notifications,
        email_appointments,
        email_lab_results,
        email_patient_registration,
        email_messages
      FROM user_notification_settings 
      WHERE user_id = ?
    `, [userId]);

    if (!settings || settings.length === 0) {
      console.log(`No notification settings found for user ${userId} - notifications disabled`);
      return false; // If no settings exist, don't send emails
    }

    if (!settings[0].email_notifications) {
      console.log(`Email notifications globally disabled for user ${userId}`);
      return false;
    }

    const typeMap = {
      'appointment': 'email_appointments',
      'lab_result': 'email_lab_results',
      'registration': 'email_patient_registration',
      'message': 'email_messages'
    };

    const settingKey = typeMap[notificationType];
    if (settingKey) {
      const isEnabled = settings[0][settingKey];
      console.log(`Email notification for ${notificationType}: ${isEnabled ? 'enabled' : 'disabled'} for user ${userId}`);
      return isEnabled;
    }

    return true;
  } catch (error) {
    console.error('Error checking email settings:', error);
    return false;
  }
};

/**
 * Log email notification to database
 */
const logEmailNotification = async (userId, notificationType, title, message, email, status, metadata = {}) => {
  try {
    // First check if the user exists in users table
    const [userExists] = await connection.query(
      'SELECT user_id FROM users WHERE user_id = ?',
      [userId]
    );

    if (!userExists || userExists.length === 0) {
      console.log(`Skipping notification log - user ${userId} not found in users table`);
      return;
    }

    await connection.query(`
      INSERT INTO user_notifications (
        user_id, 
        notification_type, 
        title, 
        message, 
        status, 
        delivery_method, 
        sent_at,
        metadata
      ) VALUES (?, ?, ?, ?, ?, 'email', NOW(), ?)
    `, [
      userId,
      notificationType,
      title,
      message,
      status,
      JSON.stringify({ email, ...metadata })
    ]);

    console.log(`✓ Email notification logged for user ${userId}, type: ${notificationType}, status: ${status}`);
  } catch (error) {
    console.log(`⚠️  Could not log email notification: ${error.message}`);
    // Don't throw - logging failure shouldn't stop email sending
  }
};

/**
 * Send Appointment Reminder Email (24 hours before)
 */
const sendAppointmentReminderEmail = async (data) => {
  const {
    patientId,
    patientEmail,
    patientName,
    appointmentId,
    date,
    duration,
    providerName,
    reason,
    location,
    providerPhone
  } = data;

  try {
    console.log(`Preparing to send appointment reminder email to ${patientEmail}`);

    // Check if user wants email notifications for appointments
    const shouldSend = await checkEmailSettings(patientId, 'appointment');
    if (!shouldSend) {
      console.log(`Skipping appointment reminder email for user ${patientId} - notifications disabled`);
      await logEmailNotification(
        patientId,
        'appointment_reminder',
        'Appointment Reminder',
        `Appointment reminder for ${new Date(date).toLocaleString()}`,
        patientEmail,
        'skipped',
        { appointmentId, reason: 'User preferences disabled' }
      );
      return { success: false, reason: 'User preferences disabled' };
    }

    // Generate email HTML
    const emailBody = appointmentReminderTemplate({
      patientName,
      appointmentId,
      date,
      duration,
      providerName,
      reason,
      location,
      providerPhone
    });

    // Send email using existing mailSender
    const emailResult = await mailSender(
      patientEmail,
      '⏰ Appointment Reminder - Tomorrow',
      emailBody
    );

    console.log(`Appointment reminder email sent successfully to ${patientEmail}`);

    // Log successful delivery
    await logEmailNotification(
      patientId,
      'appointment_reminder',
      'Appointment Reminder - Tomorrow',
      `Reminder for appointment with ${providerName} on ${new Date(date).toLocaleString()}`,
      patientEmail,
      'delivered',
      { 
        appointmentId, 
        providerName, 
        date,
        emailResult: emailResult?.messageId || 'sent'
      }
    );

    return { success: true, messageId: emailResult?.messageId };

  } catch (error) {
    console.error('Error sending appointment reminder email:', error);

    // Log failed delivery
    await logEmailNotification(
      patientId,
      'appointment_reminder',
      'Appointment Reminder - Tomorrow',
      `Failed reminder for appointment ${appointmentId}`,
      patientEmail,
      'failed',
      { appointmentId, error: error.message }
    );

    return { success: false, error: error.message };
  }
};

/**
 * Send Patient Registration Welcome Email
 */
const sendPatientRegistrationEmail = async (data) => {
  const {
    patientId,
    patientEmail,
    patientName,
    password,
    providerName,
    practicePhone
  } = data;

  try {
    console.log(`Preparing to send registration email to ${patientEmail}`);

    // Check if provider has email notifications enabled for patient registrations
    // Note: We check provider's settings, not patient's (since patient just registered)
    const [providerSettings] = await connection.query(`
      SELECT uns.user_id, uns.email_patient_registration
      FROM user_notification_settings uns
      INNER JOIN users_mappings um ON uns.user_id = um.fk_physician_id
      WHERE um.user_id = ?
      LIMIT 1
    `, [patientId]);

    let shouldSend = true;
    let providerId = null;

    if (providerSettings && providerSettings.length > 0) {
      providerId = providerSettings[0].user_id;
      shouldSend = providerSettings[0].email_patient_registration;
      
      if (!shouldSend) {
        console.log(`Skipping patient registration email - provider ${providerId} has disabled these notifications`);
        
        // Log skipped notification for patient
        await logEmailNotification(
          patientId,
          'patient_registration',
          'Account Created',
          `Your account has been created successfully.`,
          patientEmail,
          'skipped',
          { patientId, reason: 'Provider email preferences disabled' }
        );
        
        // Log for provider
        await logEmailNotification(
          providerId,
          'patient_registration',
          'New Patient Registration',
          `New patient registered: ${patientName}`,
          patientEmail,
          'skipped',
          { patientId, reason: 'Provider preferences disabled' }
        );
        
        return { success: false, reason: 'Provider preferences disabled' };
      }
    }

    // Generate email HTML
    const emailBody = patientRegistrationTemplate({
      patientName,
      email: patientEmail,
      password,
      providerName,
      practicePhone,
      patientId
    });

    // Send email to patient
    const emailResult = await mailSender(
      patientEmail,
      '🎉 Welcome to OVHI Healthcare - Your Account is Ready!',
      emailBody
    );

    console.log(`Patient registration email sent successfully to ${patientEmail}`);

    // Log successful delivery notification for the patient
    await logEmailNotification(
      patientId,
      'patient_registration',
      'Welcome to OVHI Healthcare!',
      `Your account has been created. Please check your email at ${patientEmail} for login credentials.`,
      patientEmail,
      'delivered',
      { 
        patientId, 
        patientName,
        providerId,
        emailResult: emailResult?.messageId || 'sent'
      }
    );

    // Also log to provider if available (for their dashboard)
    if (providerId) {
      await logEmailNotification(
        providerId,
        'patient_registration',
        'New Patient Registration',
        `New patient registered: ${patientName} (${patientEmail})`,
        patientEmail,
        'delivered',
        { 
          patientId, 
          patientName,
          emailResult: emailResult?.messageId || 'sent'
        }
      );
    }

    return { success: true, messageId: emailResult?.messageId };

  } catch (error) {
    console.error('Error sending patient registration email:', error);

    // Log failed delivery
    try {
      const [providerSettings] = await connection.query(`
        SELECT uns.user_id 
        FROM user_notification_settings uns
        INNER JOIN users_mappings um ON uns.user_id = um.fk_physician_id
        WHERE um.user_id = ?
        LIMIT 1
      `, [patientId]);

      // Log failed delivery for patient
      await logEmailNotification(
        patientId,
        'patient_registration',
        'Account Created',
        `Your account was created but we could not send the welcome email. Please contact support.`,
        patientEmail,
        'failed',
        { patientId, error: error.message }
      );
      
      // Log for provider if available
      if (providerSettings && providerSettings.length > 0) {
        await logEmailNotification(
          providerSettings[0].user_id,
          'patient_registration',
          'New Patient Registration',
          `Failed to send welcome email to ${patientName}`,
          patientEmail,
          'failed',
          { patientId, error: error.message }
        );
      }
    } catch (logError) {
      console.error('Error logging failed registration email:', logError);
    }

    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAppointmentReminderEmail,
  sendPatientRegistrationEmail,
  checkEmailSettings,
  logEmailNotification
};
