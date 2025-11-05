const mailSender = require("../../utils/mailSender");
const connection = require("../../config/db");
const bcrypt = require("bcryptjs");
const logAudit = require("../../utils/logAudit");

const createIntakeEmailTemplate = (email, url, providerName = "Your Healthcare Provider") => {
  const patientName = email.split('@')[0]; // Extract name from email
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Patient Intake Form - OVHI Healthcare</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 16px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .welcome { font-size: 24px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
        .message { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 30px; }
        .cta-container { text-align: center; margin: 40px 0; }
        .cta-button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);
            transition: all 0.3s ease;
        }
        .cta-button:hover { background: #1d4ed8; transform: translateY(-1px); }
        .features { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .features h3 { color: #1f2937; margin-top: 0; }
        .features ul { color: #4b5563; padding-left: 20px; }
        .features li { margin-bottom: 8px; }
        .security { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .security-icon { color: #d97706; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .footer a { color: #2563eb; text-decoration: none; }
        @media (max-width: 600px) {
            .content { padding: 20px; }
            .cta-button { padding: 14px 24px; font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🏥 OVHI Healthcare</h1>
            <p>Comprehensive Healthcare Management</p>
        </div>
        
        <div class="content">
            <h2 class="welcome">Welcome, ${patientName}!</h2>
            
            <div class="message">
                <p><strong>${providerName}</strong> has invited you to complete your secure patient intake form.</p>
                <p>This form will help us provide you with personalized, high-quality healthcare by collecting important information about your medical history, current medications, and health goals.</p>
            </div>
            
            <div class="features">
                <h3>📋 What you'll complete:</h3>
                <ul>
                    <li>Basic demographic and contact information</li>
                    <li>Medical history and current medications</li>
                    <li>Insurance information and coverage details</li>
                    <li>Emergency contacts and preferences</li>
                    <li>Upload insurance cards and identification</li>
                </ul>
            </div>
            
            <div class="cta-container">
                <a href="${url}" class="cta-button">
                    📝 Complete Intake Form
                </a>
            </div>
            
            <div class="security">
                <p><span class="security-icon">🔒</span> <strong>Secure & Private:</strong> Your information is protected with bank-level encryption and HIPAA compliance. This link expires on ${expirationDate.toLocaleDateString()} for your security.</p>
            </div>
            
            <div class="message">
                <p><strong>Estimated time:</strong> 10-15 minutes</p>
                <p><strong>Mobile friendly:</strong> Complete on any device</p>
                <p><strong>Save progress:</strong> Your information is automatically saved as you go</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions or need assistance, please contact our office at <a href="tel:+1-555-0123">(555) 012-3456</a> or reply to this email.
            </p>
        </div>
        
        <div class="footer">
            <p>© 2024 OVHI Healthcare Platform. All rights reserved.</p>
            <p>This email was sent to ${email}. If you received this in error, please ignore this message.</p>
            <p><a href="#">Privacy Policy</a> | <a href="#">Terms of Service</a> | <a href="#">Contact Support</a></p>
        </div>
    </div>
</body>
</html>`;
};

const sendIntake = async (req, res) => {
  try {
    const { email, url, providerName } = req.body;

    if (!email || !url) {
      return res.status(400).json({
        success: false,
        message: "Email and URL are required"
      });
    }

    const htmlTemplate = createIntakeEmailTemplate(email, url, providerName);
    
    // Send both HTML and plain text versions
    const plainTextMessage = `
Hello!

${providerName || 'Your Healthcare Provider'} has invited you to complete your patient intake form.

Complete your intake form: ${url}

This secure form will help us provide you with the best possible care by collecting important information about your medical history, current medications, and health preferences.

Estimated time: 10-15 minutes
Mobile friendly: Complete on any device
Secure & Private: HIPAA compliant with bank-level encryption

This link expires in 7 days for your security.

If you have any questions, please contact our office or reply to this email.

Best regards,
OVHI Healthcare Team
`;

    await mailSender(
      email,
      "🏥 Complete Your Patient Intake Form - OVHI Healthcare",
      plainTextMessage,
      htmlTemplate
    );

    return res.status(200).json({
      success: true,
      message: "Professional intake form link sent successfully"
    });
  } catch (error) {
    console.error("Error sending intake email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send intake link"
    });
  }
};

const registerPatient = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      gender,
      status,
      birthDate,
      lastVisit,
      emergencyContact,
      ethnicity,
      height,
      weight,
      bmi,
      allergies,
      bloodPressure,
      heartRate,
      temperature,
      insurance,
      currentMedications,
      diagnosis,
      notes,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
      organizationId,
      practiceId,
      nurseId,
      patientService,
      providerId: user_id
    } = req.body;
    let password = `${firstName}@hub`;

    const [rows] = await connection.execute(
      'SELECT 1 FROM users WHERE username = ? LIMIT 1',
      [email]
    );
    if (rows.length > 0) {
      return res.status(401).send({ success: false, message: 'email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery =
      "INSERT INTO users (username, password,fk_roleid,created_user_id) VALUES (?, ?,7,?)";
    const userValue = [email, hashedPassword, user_id];
    const [result] = await connection.query(insertQuery, userValue);
    const insertedId = result.insertId;

    const sql1 = `
INSERT INTO user_profiles (
  firstname, middlename, lastname, dob, work_email, phone,
  gender, ethnicity, last_visit, emergency_contact, emergency_contact_name,
  address_line, address_line_2, city, state, country, zip, 
  service_type, status, preferred_language, marital_status,
  intake_completed_at, intake_completion_percentage, fk_userid
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
    const values1 = [
      firstName,        // 1. firstname
      middleName,       // 2. middlename
      lastName,         // 3. lastname
      birthDate,        // 4. dob
      email,            // 5. work_email
      phone,            // 6. phone
      gender,           // 7. gender
      ethnicity,        // 8. ethnicity
      lastVisit,        // 9. last_visit
      emergencyContact, // 10. emergency_contact (phone)
      req.body.emergencyContactName, // 11. emergency_contact_name
      addressLine1,     // 12. address_line
      addressLine2,     // 13. address_line_2
      city,             // 14. city
      state,            // 15. state
      country,          // 16. country
      zipCode,          // 17. zip
      JSON.stringify(patientService), // 18. service_type
      status,           // 19. status
      req.body.preferredLanguage || 'English', // 20. preferred_language
      req.body.maritalStatus, // 21. marital_status
      new Date(),       // 22. intake_completed_at
      100.00,           // 23. intake_completion_percentage
      insertedId        // 24. fk_userid
    ];

    const [userResult] = await connection.query(sql1, values1);

    // Insert vitals data into patient_vitals table
    const vitalsSql = `
      INSERT INTO patient_vitals 
      (patient_id, height, weight, bmi, blood_pressure, heart_rate, temperature) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(vitalsSql, [
      insertedId,
      height || 0,
      weight || 0,
      bmi || 0,
      bloodPressure || '0/0',
      heartRate || 0,
      temperature || 0,
    ]);

    // Insert allergy data
    if (allergies && Array.isArray(allergies)) {
      const allergyQuery = `
        INSERT INTO allergies (
          patient_id, allergen, category, reaction
        ) VALUES (?, ?, ?, ?)
      `;
        
      for (const allergy of allergies) {
        await connection.query(allergyQuery, [
          insertedId,
          allergy.allergen,
          allergy.category,
          allergy.reaction
        ]);
      }
    }

    // Insert medication data
    if (currentMedications && Array.isArray(currentMedications)) {
      const medicationQuery = `
        INSERT INTO patient_medication (
          patient_id, name, dosage, frequency, startDate, 
          endDate, refills, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const medication of currentMedications) {
        await connection.query(medicationQuery, [
          insertedId,
          medication.name,
          medication.dosage,
          medication.frequency,
          medication.startDate,
          medication.endDate,
          medication.refills || 0,
          medication.status || 'Active'
        ]);
      }
    }

    // Insert enhanced diagnosis data
    if (diagnosis && Array.isArray(diagnosis)) {
      const diagnosisQuery = `
        INSERT INTO patient_diagnoses (
          patient_id, date, icd10, diagnosis_description, 
          type, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      for (const diag of diagnosis) {
        await connection.query(diagnosisQuery, [
          insertedId,
          diag.date,
          diag.icd10,
          diag.diagnosis,
          diag.type || 'primary',
          diag.status || 'active'
        ]);
      }
    }

    // Insert clinical notes
    if (notes && Array.isArray(notes)) {
      const notesQuery = `
        INSERT INTO patient_clinical_notes (
          patient_id, note_type, note_content, duration
        ) VALUES (?, ?, ?, ?)
      `;
      
      for (const note of notes) {
        await connection.query(notesQuery, [
          insertedId,
          note.type,
          note.note,
          note.duration
        ]);
      }
    }

    const sql3 = `INSERT INTO patient_insurances (
      insurance_policy_number,
      insurance_group_number,
      insurance_company,
      insurance_plan,
      insurance_relationship,
      insurance_expiry,
      insurance_type,
      effective_date,
      insured_name,
      insured_gender,
      insured_dob,
      insured_address,
      insured_phone,
      fk_userid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    insurance?.map(async (insurance) => {
      const values3 = [
        insurance.policyNumber,
        insurance.groupNumber,
        insurance.company,
        insurance.plan,
        insurance.relationship,
        insurance.expirationDate,
        insurance.type,
        insurance.effectiveDate,
        insurance.insuredName,
        insurance.insuredGender,
        insurance.insuredDOB,
        insurance.insuredAddress,
        insurance.insuredPhone,
        insertedId,
      ];
      const [insuranceResult] = await connection.query(sql3, values3);
    });

    const sql7 = `INSERT INTO users_mappings (
  organizations_id,
  practice_id,
  user_id,
  fk_role_id,
  fk_physician_id,
  fk_nurse_id
) VALUES (?, ?, ?, ?, ?, ?);`;

    const values7 = [
      organizationId ? organizationId : 0,
      practiceId ? practiceId : 0,
      insertedId,
      7,
      user_id ? user_id : 0,
      nurseId ? nurseId : 0,
    ];
    const [mappingResult] = await connection.query(sql7, values7);

    // cpt billing for rpm
    patientService?.includes(1) && await connection.query(
      `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?);`,
      [insertedId, 4]
    );

    await logAudit(req, 'CREATE', 'PATIENT', insertedId, `Patient created with patientId: ${insertedId} - ${firstName} ${lastName}`);
    return res.status(200).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    res
      .status(500)
      .json({ success: false, message: "Error in create patient API" });
  }
};


module.exports = {
  sendIntake,
  registerPatient
}