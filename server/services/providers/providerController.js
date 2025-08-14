const bcrypt = require("bcryptjs");
const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");

// Create patient

const getAllOrganizations = async (req, res) => {
  try {
    const query =
      "SELECT organization_id, organization_name FROM organizations";
    const [rows] = await connection.query(query);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getAllPractices = async (req, res) => {
  try {
    const query = "SELECT practice_id,practice_name FROM `practices`";
    const [rows] = await connection.query(query);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const updateUserMapping = async (req, res) => {
  const { providerId, organizationId, practiceId } = req.body;

  if (!providerId || !organizationId || !practiceId) {
    return res.status(400).json({
      success: false,
      message: "providerId, organizationId, and practiceId are required",
    });
  }

  try {
    // Check if a mapping already exists
    const checkQuery = `
        SELECT * FROM users_mappings 
        WHERE user_id = ? LIMIT 1
      `;
    const [existing] = await connection.query(checkQuery, [providerId]);

    if (existing.length > 0) {
      // Update existing mapping
      const updateQuery = `
          UPDATE users_mappings 
          SET organizations_id = ?, practice_id = ? ,fk_role_id=?
          WHERE user_id = ?
        `;
      await connection.query(updateQuery, [
        organizationId,
        practiceId,
        6,
        providerId,
      ]);
    } else {
      // Insert new mapping
      const insertQuery = `
          INSERT INTO users_mappings (user_id, organizations_id, practice_id,fk_role_id) 
          VALUES (?, ?, ?,?)
        `;
      await connection.query(insertQuery, [
        providerId,
        organizationId,
        practiceId,
        6,
      ]);
    }

    // Log audit for user mapping update
    try {
      await logAudit(req, 'UPDATE', 'USER_MAPPING', providerId, 'Updated user mapping for provider');
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    res.status(200).json({
      success: true,
      message: "User mapping saved successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getProviders = async (req, res) => {
  try {
    const query =
      "SELECT u.user_id,up.firstname,up.lastname,u.username as email FROM users u LEFT JOIN user_profiles up ON up.fk_userid = u.user_id WHERE u.fk_roleid= 6;";
    const [rows] = await connection.query(query);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const updateProviderInformation = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { npi, taxonomy, taxId, faxId,firstName,lastName } = req.body;

    if (!user_id) {
      return res.status(400).json({success:false, message: 'Missing userId in request params.' });
    }

    const sql = `
      UPDATE user_profiles
      SET npi = ?, taxonomy = ?, tax_id = ?, fax = ?,firstname=?,lastname=?
      WHERE fk_userid = ?
    `;

    const values = [
      npi || '',
      taxonomy || '',
      taxId || '',
      faxId || '',
      firstName,
      lastName,
      user_id
    ];

    const [result] = await connection.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success:false,message: 'User not found.' });
    }

    // Log audit for provider information update
    try {
      await logAudit(req, 'UPDATE', 'PROVIDER_INFO', user_id, 'Updated provider information');
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    return res.status(200).json({ success:true,message: 'Provider information updated successfully.' });
  } catch (error) {
    console.error('Error updating provider information:', error);
    return res.status(500).json({ success:false,message: 'Internal server error.' });
  }
};
const getProviderInformation = async (req, res) => {
  try {

    const { user_id } = req.user;


    if (!user_id) {
      return res.status(400).json({ message: 'Missing userId in request params.' });
    }

    const sql = `
   SELECT
  IFNULL(npi, '') AS npi,
  IFNULL(taxonomy, '') AS taxonomy,
  IFNULL(tax_id, '') AS taxId,
  IFNULL(fax, '') AS faxId,
  IFNULL(firstname, '') AS firstname,
  IFNULL(lastname, '') AS lastname
FROM user_profiles
WHERE fk_userid = ?
LIMIT 1

  `;

    const [rows] = await connection.query(sql, [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return the provider information
    const providerInfo = rows[0];
    return res.status(200).json({
      success: true,
      data: {
        npi: providerInfo.npi,
        taxonomy: providerInfo.taxonomy,
        taxId: providerInfo.taxId,
        faxId: providerInfo.faxId,
        firstname: providerInfo.firstname,
        lastname:providerInfo.lastname
      }
    });
  } catch (error) {
    console.error('Error updating provider information:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
const addPatientBillingNote =  async (req, res) => {
  try {
    const {
      patientId,
      category,
      duration,
      note
    } = { ...req.body, ...req.query };
    const { user_id } = req.user;
    if (!patientId  || !category || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, timed_by, category, duration are required.'
      });
    }

    // Insert
    const sql = `
      INSERT INTO patient_billing_notes
      (patient_id, timed_by, category, duration, note)
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      patientId,
      user_id,
      category,
      duration,
      note || 'Note Not provided'
    ];
    const [result] = await connection.query(sql, values);

    // Log audit for billing note creation
    try {
      await logAudit(req, 'CREATE', 'BILLING_NOTE', patientId, `Added billing note for patient ID: ${patientId}`);
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Billing note added successfully.'
    });
  } catch (err) {
    console.error('Error adding billing note:', err);
    res.status(500).json({success:false, message: 'Internal server error.' });
  }
};
const providerDashboardCount = async (req, res) => {
  try {
    const { user_id } = req.user;
    if (!user_id) {
      return res.status(400).json({ message: 'Missing user_id in request.' });
    }
    const sql = `
      SELECT COUNT(*) as todays_appointments
      FROM appointment
      WHERE DATE(date) = CURDATE()
      AND provider_id = ?
    `;
    const [rows] = await connection.query(sql, [user_id]);
    let todays_appointments = rows[0]?.todays_appointments || 0

    const [data] = await connection.query(`
      SELECT COUNT(DISTINCT users.user_id) AS totalPatients FROM users_mappings JOIN users ON users.user_id = users_mappings.user_id WHERE fk_physician_id = ? AND fk_role_id = 7;
    `,[user_id])
    let total_patients = data[0]?.totalPatients || 0

    const [data2] = await connection.query(`
      SELECT count(*) as teleCount  FROM appointment WHERE type LIKE '%telehealth%' AND provider_id = ?
    `,[user_id])
    const [data3] = await connection.query(`
      SELECT count(*) as pendingCount  FROM appointment WHERE status LIKE '%pending%' AND provider_id = ?
    `,[user_id])
    let teleCount = data2[0]?.teleCount || 0;
    let pendingCount = data3[0]?.pendingCount;
    res.status(200).json({
      success: true,
      data: {
        todays_appointments,
        total_patients,
        teleCount,
        pendingCount
      }
    });
  } catch (err) {
    console.error('Error getting provider dashboard count:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const patientsMedications = async (req, res) => {
  try {
    const { user_id } = req.user;
    if (!user_id) {
      return res.status(400).json({ message: 'Missing user_id in request.' });
    }
    const sql = `SELECT pm.*,CONCAT(up.firstname," ",up.lastname) as patient_name FROM patient_medication pm LEFT JOIN users_mappings um ON um.user_id = pm.patient_id JOIN user_profiles up ON up.fk_userid = pm.patient_id WHERE um.fk_physician_id = ? ORDER BY pm.id DESC`;
    const [rows] = await connection.query(sql, [user_id]);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error getting provider dashboard count:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
const addPractice = async (req, res) => {
  try {
    const {
      practiceName,
      practicePhone,
      fax,
      facilityName,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country,
      practiceType,
      taxId,
      npi,
      practiceFax,
      practiceEmail,
      website,
    } = req.body;

    const { user_id } = req.user;

    // Validate required fields
    if (!practiceName || !practicePhone || !addressLine1 || !city || !state || !zip || !country) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    // Insert practice into DB
    const [result] = await connection.query(
      `INSERT INTO provider_practices (
        practice_name,
        practice_phone,
        fax,
        facility_name,
        address_line1,
        address_line2,
        city,
        state,
        zip,
        country,
        provider_id,
        practice_type,
        tax_id,
        npi,
        practice_fax,
        practice_email,
        website
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        practiceName,
        practicePhone,
        fax,
        facilityName,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        country,
        user_id,
        practiceType,
        taxId,
        npi,
        practiceFax,
        practiceEmail,
        website
      ]
    );

    await logAudit(req, 'CREATE', 'PRACTICE', result.insertId, `Practice added successfully`);

    // Fetch user + updated practice info
    const [rows] = await connection.query(`
      SELECT 
        users.username,
        users.fk_roleid,
        users.user_token,
        users.user_id,
        up.firstname,
        up.lastname,
        up.npi,
        up.tax_id,
        up.fax,
        pp.*
      FROM users 
      LEFT JOIN user_profiles up ON up.fk_userid = users.user_id 
      LEFT JOIN provider_practices pp ON pp.provider_id = users.user_id 
      WHERE users.user_id = ?
      ORDER BY pp.id DESC LIMIT 1
    `, [user_id]);

    const data = rows?.[0];

    const token = data?.user_token;
    const user = {
      id: data?.user_id,
      firstname: data?.firstname,
      lastname: data?.lastname,
      email: data?.username,
      role: data?.fk_roleid,
    };

    return res.status(200).json({
      success: true,
      user,
      token,
      practice: {
        id: data?.id,
        practiceName: data?.practice_name,
        practicePhone: data?.practice_phone,
        fax: data?.fax,
        facilityName: data?.facility_name,
        addressLine1: data?.address_line1,
        addressLine2: data?.address_line2,
        city: data?.city,
        state: data?.state,
        zip: data?.zip,
        country: data?.country,
        practiceType: data?.practice_type,
        taxId: data?.tax_id,
        npi: data?.npi,
        practiceFax: data?.practice_fax,
        practiceEmail: data?.practice_email,
        website: data?.website
      },
      message: 'Practice added and user logged in successfully'
    });

  } catch (error) {
    console.error("Add Practice Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const editPractice = async (req, res) => {
  try {
    let { user_id } = req.user;
    const {
      practiceName,
      practiceType,
      taxId,
      npi,
      practicePhone,
      practiceFax,
      practiceEmail,
      website,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      operatingHours,
      servicesOffered,
      insuranceNetworks,
      hospitalAffiliations
    } = req.body;

    // Convert complex fields to JSON strings
    const officeHoursJson = JSON.stringify(operatingHours || {});
    const selectedServicesJson = JSON.stringify(servicesOffered || []);
    const selectedNetworksJson = JSON.stringify(insuranceNetworks || []);
    const affiliationsJson = JSON.stringify(hospitalAffiliations || []);

    const [result] = await connection.query(
      `UPDATE provider_practices SET 
        practice_name = ?, 
        practice_type = ?, 
        tax_id = ?, 
        npi = ?, 
        practice_phone = ?, 
        practice_fax = ?, 
        practice_email = ?, 
        website = ?, 
        address_line1 = ?, 
        address_line2 = ?, 
        city = ?, 
        state = ?, 
        zip = ?, 
        country = ?, 
        office_hours = ?, 
        selected_services = ?, 
        selected_insurances = ?, 
        hospital_affiliations = ?
      WHERE provider_id = ?`,
      [
        practiceName,
        practiceType,
        taxId,
        npi,
        practicePhone,
        practiceFax,
        practiceEmail,
        website,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        country,
        officeHoursJson,
        selectedServicesJson,
        selectedNetworksJson,
        affiliationsJson,
        user_id
      ]
    );
    
    if (result.affectedRows === 0) {
      // No record found → Insert new one
      await connection.query(
        `INSERT INTO provider_practices (
          provider_id, practice_name, practice_type, tax_id, npi, 
          practice_phone, practice_fax, practice_email, website, 
          address_line1, address_line2, city, state, zip, country, 
          office_hours, selected_services, selected_insurances, hospital_affiliations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          practiceName,
          practiceType,
          taxId,
          npi,
          practicePhone,
          practiceFax,
          practiceEmail,
          website,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          country,
          officeHoursJson,
          selectedServicesJson,
          selectedNetworksJson,
          affiliationsJson
        ]
      );
    }
    

    await logAudit(req, 'UPDATE', 'PRACTICE', user_id, `Practice updated successfully`);

    return res.status(200).json({
      success: true,
      message: "Practice updated successfully"
    });

  } catch (error) {
    console.error("Edit Practice Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
;
const addService = async (req, res) => {
  try {
    const { serviceName } = req.body;
    const { user_id } = req.user;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: "Service name is required"
      });
    }

    const [result] = await connection.query(
      `INSERT INTO services_offered (service_name, provider_id) VALUES (?, ?)`,
      [serviceName, user_id]
    );

    await logAudit(req, 'CREATE', 'SERVICE', result.insertId, `Service "${serviceName}" added for provider`);

    return res.status(200).json({
      success: true,
      message: "Service added successfully",
      service_id: result.insertId
    });

  } catch (error) {
    console.error("Add Service Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
const addInsuranceNetwork = async (req, res) => {
  try {
    const { networkName } = req.body;
    const { user_id } = req.user;

    if (!networkName) {
      return res.status(400).json({
        success: false,
        message: "Network name is required"
      });
    }

    const [result] = await connection.query(
      `INSERT INTO insurance_networks (network_name, provider_id) VALUES (?, ?)`,
      [networkName, user_id]
    );

    await logAudit(req, 'CREATE', 'INSURANCE_NETWORK', result.insertId, `Insurance network "${networkName}" added`);

    return res.status(200).json({
      success: true,
      message: "Insurance network added successfully",
      network_id: result.insertId
    });

  } catch (error) {
    console.error("Add Insurance Network Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
const getProviderDetails = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get practice info
    const [practiceRows] = await connection.query(
      `SELECT * FROM provider_practices WHERE provider_id = ? LIMIT 1`,
      [user_id]
    );

    if (!practiceRows.length) {
      return res.status(404).json({
        success: false,
        message: "No practice found for this provider"
      });
    }

    const practice = practiceRows[0];

    // Parse main fields stored as JSON
    const operatingHours = practice.office_hours || {};
    const servicesOffered = practice.selected_services || [];
    const insuranceNetworks = practice.selected_insurances || [];
    const hospitalAffiliations = Array.isArray(practice.hospital_affiliations)
    ? practice.hospital_affiliations
    : [];
  

    // Additional (manually added) services
    const [manualServices] = await connection.query(
      `SELECT service_name FROM services_offered WHERE provider_id = ?`,
      [user_id]
    );
    const additionalServicesOffered = manualServices.map(s => s.service_name);

    // Additional insurance networks
    const [manualNetworks] = await connection.query(
      `SELECT network_name FROM insurance_networks WHERE provider_id = ?`,
      [user_id]
    );
    const additionalInsuranceNetworks = manualNetworks.map(n => n.network_name);

    // Final response object
    const response = {
      practiceName: practice.practice_name || "",
      practiceType: practice.practice_type || "",
      taxId: practice.tax_id || "",
      npi: practice.npi || "",
      practicePhone: practice.practice_phone || "",
      practiceFax: practice.practice_fax || "",
      practiceEmail: practice.practice_email || "",
      website: practice.website || "",
      addressLine1: practice.address_line1 || "",
      addressLine2: practice.address_line2 || "",
      city: practice.city || "",
      state: practice.state || "",
      zipCode: practice.zip || "",
      country: practice.country || "",
      operatingHours,
      servicesOffered,
      insuranceNetworks,
      hospitalAffiliations,
      additionalServicesOffered,
      additionalInsuranceNetworks
    };

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Get Provider Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


module.exports = {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
  getProviders,
  updateProviderInformation,
  getProviderInformation,
  addPatientBillingNote,
  providerDashboardCount,
  patientsMedications,
  addPractice,
  editPractice,
  addService,
  addInsuranceNetwork,
  getProviderDetails
};
