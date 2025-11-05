/**
 * Email Template for Patient Registration
 */

// Patient Registration Welcome Email Template
const patientRegistrationTemplate = (data) => {
  const {
    patientName,
    email,
    password,
    providerName,
    practicePhone = '(555) 123-4567',
    patientId
  } = data;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to OVHI Healthcare</title>
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
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }

    .welcome-icon {
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

    .welcome-box {
      background-color: #E8F5E9;
      border-left: 4px solid #4CAF50;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .welcome-box h2 {
      margin: 0 0 15px 0;
      font-size: 22px;
      color: #2E7D32;
    }

    .credentials-box {
      background-color: #FFF3E0;
      border: 2px solid #FF9800;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .credentials-box h3 {
      margin-top: 0;
      color: #E65100;
    }

    .credential-row {
      padding: 10px;
      margin: 10px 0;
      background-color: #fff;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .credential-label {
      font-weight: bold;
      color: #555;
      display: block;
      margin-bottom: 5px;
    }

    .credential-value {
      color: #333;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      background-color: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
    }

    .features-box {
      background-color: #E3F2FD;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .features-box h3 {
      margin-top: 0;
      color: #1976D2;
    }

    .feature-item {
      padding: 10px 0;
      color: #555;
    }

    .feature-item:before {
      content: "✓ ";
      color: #4CAF50;
      font-weight: bold;
      margin-right: 8px;
      font-size: 18px;
    }

    .important-note {
      background-color: #FFEBEE;
      border-left: 4px solid #F44336;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .important-note strong {
      color: #C62828;
    }

    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
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
      <div class="welcome-icon">🎉</div>
      <h1>Welcome to OVHI Healthcare!</h1>
    </div>

    <div class="content">
      <p class="greeting">Dear ${patientName},</p>

      <div class="welcome-box">
        <h2>Registration Successful!</h2>
        <p style="margin: 0; font-size: 16px;">
          Your patient account has been successfully created. We're excited to have you as part of our healthcare community!
        </p>
      </div>

      <div class="credentials-box">
        <h3>🔐 Your Login Credentials</h3>
        <p style="margin-bottom: 15px;">Use these credentials to access your patient portal:</p>
        
        <div class="credential-row">
          <span class="credential-label">Email / Username:</span>
          <div class="credential-value">${email}</div>
        </div>

        <div class="credential-row">
          <span class="credential-label">Temporary Password:</span>
          <div class="credential-value">${password}</div>
        </div>

        <div class="credential-row">
          <span class="credential-label">Patient ID:</span>
          <div class="credential-value">${patientId}</div>
        </div>
      </div>

      <div class="important-note">
        <strong>🔒 Security Notice:</strong> Please change your password after your first login for security purposes. Keep your credentials confidential and never share them with anyone.
      </div>

      <div class="features-box">
        <h3>📋 What You Can Do in Your Patient Portal:</h3>
        <div class="feature-item">View and manage your appointments</div>
        <div class="feature-item">Access your medical records and test results</div>
        <div class="feature-item">View and request prescription refills</div>
        <div class="feature-item">Communicate securely with your healthcare provider</div>
        <div class="feature-item">Update your personal and insurance information</div>
        <div class="feature-item">Pay bills and view payment history</div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
          Access Patient Portal
        </a>
      </div>

      ${providerName ? `
      <div class="contact-info">
        <p style="margin: 5px 0;">
          <strong>Your Care Provider:</strong>
        </p>
        <p style="margin: 5px 0; font-size: 16px;">
          ${providerName}
        </p>
        <p style="margin: 15px 0 5px 0;">
          <strong>Questions?</strong> Call us at <strong>${practicePhone}</strong>
        </p>
      </div>
      ` : ''}

      <p style="color: #555; margin-top: 30px;">
        We look forward to providing you with excellent healthcare services!
      </p>

      <p style="color: #555; margin-top: 10px;">
        Best regards,<br>
        <strong>OVHI Healthcare Management Team</strong>
      </p>
    </div>

    <div class="footer">
      <p style="margin: 5px 0;">
        This is an automated notification. For assistance, please contact your healthcare provider.
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
  patientRegistrationTemplate
};
