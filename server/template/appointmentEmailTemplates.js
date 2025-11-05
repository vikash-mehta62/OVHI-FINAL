/**
 * Email Templates for Appointment Notifications
 */

// Appointment Reminder Email Template (24 hours before)
const appointmentReminderTemplate = (data) => {
  const {
    patientName,
    appointmentId,
    date,
    duration,
    providerName,
    reason,
    location = 'Main Clinic',
    providerPhone = '(555) 123-4567'
  } = data;

  const appointmentDate = new Date(date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Appointment Reminder</title>
  <style>
    body {
      background-color: #f4f4f4;
      font-family: 'Arial', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header {
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }

    .reminder-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .content {
      padding: 30px 20px;
    }

    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }

    .reminder-box {
      background-color: #FFF3E0;
      border-left: 4px solid #FF9800;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .reminder-box h2 {
      margin: 0 0 15px 0;
      font-size: 22px;
      color: #E65100;
    }

    .appointment-details {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .detail-row {
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: bold;
      color: #555;
      display: inline-block;
      min-width: 140px;
    }

    .detail-value {
      color: #333;
    }

    .important-note {
      background-color: #E3F2FD;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .important-note strong {
      color: #1976D2;
    }

    .preparation-checklist {
      background-color: #F5F5F5;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .preparation-checklist h3 {
      margin-top: 0;
      color: #333;
    }

    .checklist-item {
      padding: 8px 0;
      color: #555;
    }

    .checklist-item:before {
      content: "✓ ";
      color: #4CAF50;
      font-weight: bold;
      margin-right: 8px;
    }

    .footer {
      background-color: #f5f5f5;
      text-align: center;
      padding: 20px;
      font-size: 13px;
      color: #777;
    }

    .contact-info {
      background-color: #fff;
      border: 1px solid #e0e0e0;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      text-align: center;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <div class="reminder-icon">⏰</div>
      <h1>Appointment Reminder</h1>
    </div>

    <div class="content">
      <p class="greeting">Dear ${patientName},</p>

      <div class="reminder-box">
        <h2>Your appointment is tomorrow!</h2>
        <p style="margin: 0; font-size: 16px;">
          This is a friendly reminder about your upcoming medical appointment.
        </p>
      </div>

      <div class="appointment-details">
        <h3 style="margin-top: 0; color: #333;">Appointment Details</h3>
        
        <div class="detail-row">
          <span class="detail-label">📅 Date:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">🕐 Time:</span>
          <span class="detail-value">${formattedTime}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">⏱️ Duration:</span>
          <span class="detail-value">${duration}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">👨‍⚕️ Provider:</span>
          <span class="detail-value">${providerName}</span>
        </div>

        ${reason ? `
        <div class="detail-row">
          <span class="detail-label">📋 Reason:</span>
          <span class="detail-value">${reason}</span>
        </div>
        ` : ''}

        <div class="detail-row">
          <span class="detail-label">📍 Location:</span>
          <span class="detail-value">${location}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">🔢 Appointment ID:</span>
          <span class="detail-value">${appointmentId}</span>
        </div>
      </div>

      <div class="important-note">
        <strong>⚠️ Important:</strong> Please arrive <strong>15 minutes early</strong> to complete any necessary paperwork and check-in procedures.
      </div>

      <div class="preparation-checklist">
        <h3>📝 What to Bring:</h3>
        <div class="checklist-item">Photo ID (Driver's License or Passport)</div>
        <div class="checklist-item">Insurance card</div>
        <div class="checklist-item">List of current medications</div>
        <div class="checklist-item">Any recent medical records or test results</div>
        <div class="checklist-item">Payment method for co-pay (if applicable)</div>
      </div>

      <div class="contact-info">
        <p style="margin: 5px 0;">
          <strong>Need to reschedule or cancel?</strong>
        </p>
        <p style="margin: 5px 0;">
          Please call us at <strong>${providerPhone}</strong> at least 24 hours in advance.
        </p>
      </div>

      <p style="color: #555; margin-top: 30px;">
        We look forward to seeing you tomorrow!
      </p>

      <p style="color: #555; margin-top: 10px;">
        Best regards,<br>
        <strong>OVHI Healthcare Management System</strong>
      </p>
    </div>

    <div class="footer">
      <p style="margin: 5px 0;">
        This is an automated reminder. Please do not reply to this email.
      </p>
      <p style="margin: 15px 0 5px 0;">
        © 2025 OVHI Healthcare Management System. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
};

module.exports = {
  appointmentReminderTemplate
};
