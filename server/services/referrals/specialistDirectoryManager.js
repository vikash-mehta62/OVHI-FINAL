const db = require('../../config/db');
const specialistService = require('./specialistService');

/**
 * Specialist Directory Manager
 * Advanced directory operations, network management, and integration services
 */

class SpecialistDirectoryManager {
  constructor() {
    this.networkProviders = new Map();
    this.integrationEndpoints = new Map();
    this.initializeNetworkProviders();
  }

  /**
   * Initialize network providers and integration endpoints
   */
  initializeNetworkProviders() {
    // Common insurance networks
    this.networkProviders.set('insurance_networks', [
      'Aetna', 'Anthem', 'Blue Cross Blue Shield', 'Cigna', 'Humana',
      'UnitedHealthcare', 'Medicare', 'Medicaid', 'Kaiser Permanente',
      'Molina Healthcare', 'Centene', 'WellCare', 'Independence Blue Cross'
    ]);

    // Integration endpoints for external directories
    this.integrationEndpoints.set('npi_registry', {
      url: 'https://npiregistry.cms.hhs.gov/api/',
      apiKey: process.env.NPI_REGISTRY_API_KEY,
      rateLimit: 1000 // requests per hour
    });

    this.integrationEndpoints.set('provider_directory', {
      url: process.env.PROVIDER_DIRECTORY_URL,
      apiKey: process.env.PROVIDER_DIRECTORY_API_KEY,
      rateLimit: 500
    });
  }

  /**
   * Bulk import specialists from external source
   */
  async bulkImportSpecialists(importData, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const importResult = {
        success: true,
        totalProcessed: 0,
        successfulImports: 0,
        failedImports: 0,
        duplicates: 0,
        errors: []
      };

      for (const specialistData of importData.specialists) {
        try {
          importResult.totalProcessed++;

          // Check for duplicates
          const existingSpecialist = await this.findDuplicateSpecialist(specialistData, connection);
          if (existingSpecialist) {
            importResult.duplicates++;
            continue;
          }

          // Validate and normalize data
          const normalizedData = await this.normalizeSpecialistData(specialistData);

          // Import specialist
          await specialistService.addSpecialist(normalizedData, userId);
          importResult.successfulImports++;

        } catch (error) {
          importResult.failedImports++;
          importResult.errors.push({
            specialist: specialistData.name || 'Unknown',
            error: error.message
          });
        }
      }

      await connection.commit();

      // Log import activity
      await this.logImportActivity(importResult, userId);

      return importResult;

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in bulk import:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Sync specialist data with NPI registry
   */
  async syncWithNPIRegistry(npiNumbers = [], userId) {
    try {
      const syncResult = {
        success: true,
        totalProcessed: 0,
        updated: 0,
        added: 0,
        errors: []
      };

      // If no specific NPIs provided, sync all active specialists
      if (npiNumbers.length === 0) {
        const [specialists] = await db.execute(`
          SELECT npi_number FROM referral_specialists 
          WHERE is_active = TRUE AND npi_number IS NOT NULL
        `);
        npiNumbers = specialists.map(s => s.npi_number);
      }

      for (const npiNumber of npiNumbers) {
        try {
          syncResult.totalProcessed++;

          // Fetch data from NPI registry
          const npiData = await this.fetchNPIData(npiNumber);
          if (!npiData) {
            continue;
          }

          // Check if specialist exists
          const [existing] = await db.execute(`
            SELECT id FROM referral_specialists WHERE npi_number = ?
          `, [npiNumber]);

          if (existing.length > 0) {
            // Update existing specialist
            await this.updateSpecialistFromNPI(existing[0].id, npiData, userId);
            syncResult.updated++;
          } else {
            // Add new specialist
            const specialistData = await this.convertNPIToSpecialistData(npiData);
            await specialistService.addSpecialist(specialistData, userId);
            syncResult.added++;
          }

        } catch (error) {
          syncResult.errors.push({
            npi: npiNumber,
            error: error.message
          });
        }
      }

      return syncResult;

    } catch (error) {
      console.error('Error syncing with NPI registry:', error);
      throw error;
    }
  }

  /**
   * Manage specialist network affiliations
   */
  async manageNetworkAffiliations(specialistId, networkUpdates, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current specialist
      const specialist = await specialistService.getSpecialistById(specialistId, connection);
      if (!specialist) {
        throw new Error('Specialist not found');
      }

      const currentNetworks = JSON.parse(specialist.insurance_networks || '[]');
      let updatedNetworks = [...currentNetworks];

      // Process network updates
      for (const update of networkUpdates) {
        if (update.action === 'add' && !updatedNetworks.includes(update.network)) {
          updatedNetworks.push(update.network);
        } else if (update.action === 'remove') {
          updatedNetworks = updatedNetworks.filter(n => n !== update.network);
        }
      }

      // Update specialist networks
      await connection.execute(`
        UPDATE referral_specialists 
        SET insurance_networks = ?, updated_at = NOW()
        WHERE id = ?
      `, [JSON.stringify(updatedNetworks), specialistId]);

      // Log network changes
      await this.logNetworkChanges(specialistId, currentNetworks, updatedNetworks, userId);

      await connection.commit();

      return {
        success: true,
        previousNetworks: currentNetworks,
        updatedNetworks: updatedNetworks,
        message: 'Network affiliations updated successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error managing network affiliations:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Generate specialist directory report
   */
  async generateDirectoryReport(reportType = 'summary', filters = {}) {
    try {
      let report = {
        reportType,
        generatedAt: new Date().toISOString(),
        filters,
        data: {}
      };

      switch (reportType) {
        case 'summary':
          report.data = await this.generateSummaryReport(filters);
          break;
        case 'performance':
          report.data = await this.generatePerformanceReport(filters);
          break;
        case 'network_coverage':
          report.data = await this.generateNetworkCoverageReport(filters);
          break;
        case 'geographic_distribution':
          report.data = await this.generateGeographicReport(filters);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      return report;

    } catch (error) {
      console.error('Error generating directory report:', error);
      throw error;
    }
  }

  /**
   * Validate specialist credentials
   */
  async validateSpecialistCredentials(specialistId) {
    try {
      const specialist = await specialistService.getSpecialistById(specialistId);
      if (!specialist) {
        throw new Error('Specialist not found');
      }

      const validationResult = {
        specialistId,
        validatedAt: new Date().toISOString(),
        checks: {
          npiValid: false,
          licenseValid: false,
          boardCertified: false,
          insuranceNetworksValid: false
        },
        details: {},
        overallValid: false
      };

      // Validate NPI number
      if (specialist.npi_number) {
        validationResult.checks.npiValid = await this.validateNPINumber(specialist.npi_number);
        validationResult.details.npi = {
          number: specialist.npi_number,
          valid: validationResult.checks.npiValid
        };
      }

      // Validate licenses
      if (specialist.license_numbers) {
        const licenses = JSON.parse(specialist.license_numbers);
        validationResult.checks.licenseValid = await this.validateLicenses(licenses, specialist.state);
        validationResult.details.licenses = licenses;
      }

      // Validate insurance networks
      if (specialist.insurance_networks) {
        const networks = JSON.parse(specialist.insurance_networks);
        validationResult.checks.insuranceNetworksValid = await this.validateInsuranceNetworks(networks);
        validationResult.details.insuranceNetworks = networks;
      }

      // Calculate overall validity
      validationResult.overallValid = Object.values(validationResult.checks).every(check => check === true);

      // Store validation result
      await this.storeValidationResult(specialistId, validationResult);

      return validationResult;

    } catch (error) {
      console.error('Error validating specialist credentials:', error);
      throw error;
    }
  }

  /**
   * Find potential duplicate specialists
   */
  async findPotentialDuplicates(threshold = 0.8) {
    try {
      const [specialists] = await db.execute(`
        SELECT id, name, npi_number, phone, email, practice_name, city, state
        FROM referral_specialists 
        WHERE is_active = TRUE
        ORDER BY name
      `);

      const duplicates = [];

      for (let i = 0; i < specialists.length; i++) {
        for (let j = i + 1; j < specialists.length; j++) {
          const similarity = this.calculateSimilarity(specialists[i], specialists[j]);
          
          if (similarity >= threshold) {
            duplicates.push({
              specialist1: specialists[i],
              specialist2: specialists[j],
              similarity: similarity,
              matchingFields: this.getMatchingFields(specialists[i], specialists[j])
            });
          }
        }
      }

      return {
        threshold,
        totalSpecialists: specialists.length,
        potentialDuplicates: duplicates.length,
        duplicates
      };

    } catch (error) {
      console.error('Error finding potential duplicates:', error);
      throw error;
    }
  }

  /**
   * Merge duplicate specialists
   */
  async mergeDuplicateSpecialists(primarySpecialistId, duplicateSpecialistId, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get both specialists
      const primary = await specialistService.getSpecialistById(primarySpecialistId, connection);
      const duplicate = await specialistService.getSpecialistById(duplicateSpecialistId, connection);

      if (!primary || !duplicate) {
        throw new Error('One or both specialists not found');
      }

      // Merge data (primary takes precedence, but fill in missing fields from duplicate)
      const mergedData = this.mergeSpecialistData(primary, duplicate);

      // Update primary specialist with merged data
      await this.updateSpecialistWithMergedData(primarySpecialistId, mergedData, connection);

      // Transfer referrals from duplicate to primary
      await connection.execute(`
        UPDATE referrals SET specialist_id = ? WHERE specialist_id = ?
      `, [primarySpecialistId, duplicateSpecialistId]);

      // Transfer metrics from duplicate to primary
      await this.transferSpecialistMetrics(duplicateSpecialistId, primarySpecialistId, connection);

      // Deactivate duplicate specialist
      await connection.execute(`
        UPDATE referral_specialists 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ?
      `, [duplicateSpecialistId]);

      // Log merge activity
      await this.logMergeActivity(primarySpecialistId, duplicateSpecialistId, userId);

      await connection.commit();

      return {
        success: true,
        primarySpecialistId,
        duplicateSpecialistId,
        message: 'Specialists merged successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error merging duplicate specialists:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Helper Methods

  /**
   * Find duplicate specialist
   */
  async findDuplicateSpecialist(specialistData, connection) {
    // Check by NPI number first
    if (specialistData.npiNumber) {
      const [npiMatch] = await connection.execute(`
        SELECT id FROM referral_specialists WHERE npi_number = ?
      `, [specialistData.npiNumber]);
      
      if (npiMatch.length > 0) {
        return npiMatch[0];
      }
    }

    // Check by name and practice combination
    if (specialistData.name && specialistData.practiceName) {
      const [nameMatch] = await connection.execute(`
        SELECT id FROM referral_specialists 
        WHERE name = ? AND practice_name = ?
      `, [specialistData.name, specialistData.practiceName]);
      
      if (nameMatch.length > 0) {
        return nameMatch[0];
      }
    }

    return null;
  }

  /**
   * Normalize specialist data
   */
  async normalizeSpecialistData(rawData) {
    return {
      name: this.normalizeName(rawData.name),
      title: rawData.title,
      specialtyPrimary: this.normalizeSpecialty(rawData.specialty || rawData.specialtyPrimary),
      specialtiesSecondary: rawData.specialtiesSecondary || [],
      practiceName: rawData.practiceName || rawData.practice_name,
      phone: this.normalizePhone(rawData.phone),
      fax: this.normalizePhone(rawData.fax),
      email: this.normalizeEmail(rawData.email),
      website: rawData.website,
      addressLine1: rawData.addressLine1 || rawData.address_line1,
      addressLine2: rawData.addressLine2 || rawData.address_line2,
      city: rawData.city,
      state: rawData.state,
      zipCode: this.normalizeZipCode(rawData.zipCode || rawData.zip_code),
      npiNumber: rawData.npiNumber || rawData.npi_number,
      licenseNumbers: rawData.licenseNumbers || [],
      insuranceNetworks: rawData.insuranceNetworks || [],
      availabilityHours: rawData.availabilityHours || {},
      acceptsNewPatients: rawData.acceptsNewPatients !== false,
      preferredReferralMethod: rawData.preferredReferralMethod || 'fax'
    };
  }

  /**
   * Fetch NPI data from registry
   */
  async fetchNPIData(npiNumber) {
    try {
      // This would make actual API call to NPI registry
      // For now, return mock data structure
      return {
        npi: npiNumber,
        name: 'Dr. Sample Provider',
        specialty: 'Internal Medicine',
        address: {
          line1: '123 Medical Center Dr',
          city: 'Healthcare City',
          state: 'NY',
          zipCode: '12345'
        },
        phone: '555-123-4567'
      };
    } catch (error) {
      console.error('Error fetching NPI data:', error);
      return null;
    }
  }

  /**
   * Convert NPI data to specialist format
   */
  async convertNPIToSpecialistData(npiData) {
    return {
      name: npiData.name,
      specialtyPrimary: npiData.specialty,
      npiNumber: npiData.npi,
      addressLine1: npiData.address?.line1,
      city: npiData.address?.city,
      state: npiData.address?.state,
      zipCode: npiData.address?.zipCode,
      phone: npiData.phone
    };
  }

  /**
   * Update specialist from NPI data
   */
  async updateSpecialistFromNPI(specialistId, npiData, userId) {
    const updateData = await this.convertNPIToSpecialistData(npiData);
    return await specialistService.updateSpecialist(specialistId, updateData, userId);
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(filters) {
    const [summary] = await db.execute(`
      SELECT 
        COUNT(*) as total_specialists,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_specialists,
        COUNT(CASE WHEN accepts_new_patients = TRUE THEN 1 END) as accepting_new_patients,
        COUNT(DISTINCT specialty_primary) as unique_specialties,
        COUNT(DISTINCT city) as cities_covered,
        COUNT(DISTINCT state) as states_covered,
        AVG(patient_satisfaction_score) as avg_satisfaction,
        AVG(average_response_time) as avg_response_time
      FROM referral_specialists
    `);

    const [specialtyBreakdown] = await db.execute(`
      SELECT 
        specialty_primary,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count
      FROM referral_specialists
      GROUP BY specialty_primary
      ORDER BY count DESC
    `);

    return {
      summary: summary[0],
      specialtyBreakdown
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(filters) {
    const [performance] = await db.execute(`
      SELECT 
        s.id,
        s.name,
        s.specialty_primary,
        s.patient_satisfaction_score,
        s.average_response_time,
        s.total_referrals_received,
        s.completed_referrals,
        CASE 
          WHEN s.total_referrals_received > 0 
          THEN ROUND((s.completed_referrals / s.total_referrals_received) * 100, 2)
          ELSE 0 
        END as completion_rate
      FROM referral_specialists s
      WHERE s.is_active = TRUE
      ORDER BY s.patient_satisfaction_score DESC, completion_rate DESC
    `);

    return { performance };
  }

  /**
   * Generate network coverage report
   */
  async generateNetworkCoverageReport(filters) {
    const [networkCoverage] = await db.execute(`
      SELECT 
        network,
        COUNT(*) as specialist_count
      FROM referral_specialists s,
      JSON_TABLE(s.insurance_networks, '$[*]' COLUMNS (network VARCHAR(100) PATH '$')) jt
      WHERE s.is_active = TRUE
      GROUP BY network
      ORDER BY specialist_count DESC
    `);

    return { networkCoverage };
  }

  /**
   * Generate geographic report
   */
  async generateGeographicReport(filters) {
    const [geographic] = await db.execute(`
      SELECT 
        state,
        city,
        COUNT(*) as specialist_count,
        COUNT(DISTINCT specialty_primary) as specialties_available
      FROM referral_specialists
      WHERE is_active = TRUE
      GROUP BY state, city
      ORDER BY state, specialist_count DESC
    `);

    return { geographic };
  }

  /**
   * Calculate similarity between specialists
   */
  calculateSimilarity(specialist1, specialist2) {
    let matches = 0;
    let total = 0;

    // Compare fields
    const fields = ['name', 'npi_number', 'phone', 'email', 'practice_name'];
    
    for (const field of fields) {
      total++;
      if (specialist1[field] && specialist2[field]) {
        if (field === 'name') {
          // Use fuzzy matching for names
          if (this.fuzzyMatch(specialist1[field], specialist2[field]) > 0.8) {
            matches++;
          }
        } else if (specialist1[field] === specialist2[field]) {
          matches++;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Get matching fields between specialists
   */
  getMatchingFields(specialist1, specialist2) {
    const matching = [];
    const fields = ['name', 'npi_number', 'phone', 'email', 'practice_name'];
    
    for (const field of fields) {
      if (specialist1[field] && specialist2[field] && specialist1[field] === specialist2[field]) {
        matching.push(field);
      }
    }

    return matching;
  }

  /**
   * Merge specialist data
   */
  mergeSpecialistData(primary, duplicate) {
    const merged = { ...primary };

    // Fill in missing fields from duplicate
    const fields = ['phone', 'fax', 'email', 'website', 'npi_number'];
    
    for (const field of fields) {
      if (!merged[field] && duplicate[field]) {
        merged[field] = duplicate[field];
      }
    }

    // Merge arrays
    if (duplicate.specialties_secondary) {
      const primarySecondary = JSON.parse(merged.specialties_secondary || '[]');
      const duplicateSecondary = JSON.parse(duplicate.specialties_secondary || '[]');
      merged.specialties_secondary = JSON.stringify([...new Set([...primarySecondary, ...duplicateSecondary])]);
    }

    return merged;
  }

  /**
   * Fuzzy string matching
   */
  fuzzyMatch(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Data normalization methods
  normalizeName(name) {
    return name?.trim().replace(/\s+/g, ' ');
  }

  normalizeSpecialty(specialty) {
    return specialty?.trim();
  }

  normalizePhone(phone) {
    return phone?.replace(/\D/g, '');
  }

  normalizeEmail(email) {
    return email?.toLowerCase().trim();
  }

  normalizeZipCode(zipCode) {
    return zipCode?.replace(/\D/g, '').substring(0, 5);
  }

  // Validation methods
  async validateNPINumber(npiNumber) {
    // Basic NPI validation - 10 digits
    return /^\d{10}$/.test(npiNumber);
  }

  async validateLicenses(licenses, state) {
    // This would integrate with state licensing boards
    return licenses.length > 0;
  }

  async validateInsuranceNetworks(networks) {
    const validNetworks = this.networkProviders.get('insurance_networks');
    return networks.every(network => validNetworks.includes(network));
  }

  // Logging methods
  async logImportActivity(importResult, userId) {
    await db.execute(`
      INSERT INTO referral_audit_logs (
        user_id, action, entity_type, entity_id, new_values, created_at
      ) VALUES (?, 'BULK_IMPORT', 'specialist_directory', NULL, ?, NOW())
    `, [userId, JSON.stringify(importResult)]);
  }

  async logNetworkChanges(specialistId, oldNetworks, newNetworks, userId) {
    await db.execute(`
      INSERT INTO referral_audit_logs (
        user_id, action, entity_type, entity_id, old_values, new_values, created_at
      ) VALUES (?, 'NETWORK_UPDATE', 'specialist', ?, ?, ?, NOW())
    `, [userId, specialistId, JSON.stringify(oldNetworks), JSON.stringify(newNetworks)]);
  }

  async logMergeActivity(primaryId, duplicateId, userId) {
    await db.execute(`
      INSERT INTO referral_audit_logs (
        user_id, action, entity_type, entity_id, new_values, created_at
      ) VALUES (?, 'SPECIALIST_MERGE', 'specialist', ?, ?, NOW())
    `, [userId, primaryId, JSON.stringify({ mergedFrom: duplicateId })]);
  }

  async storeValidationResult(specialistId, validationResult) {
    await db.execute(`
      INSERT INTO specialist_validations (
        specialist_id, validation_result, validated_at
      ) VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        validation_result = VALUES(validation_result),
        validated_at = VALUES(validated_at)
    `, [specialistId, JSON.stringify(validationResult)]);
  }

  async transferSpecialistMetrics(fromSpecialistId, toSpecialistId, connection) {
    // Transfer daily metrics
    await connection.execute(`
      UPDATE referral_specialist_metrics 
      SET specialist_id = ? 
      WHERE specialist_id = ?
    `, [toSpecialistId, fromSpecialistId]);
  }

  async updateSpecialistWithMergedData(specialistId, mergedData, connection) {
    await connection.execute(`
      UPDATE referral_specialists 
      SET 
        name = ?, phone = ?, fax = ?, email = ?, website = ?,
        npi_number = ?, specialties_secondary = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      mergedData.name, mergedData.phone, mergedData.fax, mergedData.email,
      mergedData.website, mergedData.npi_number, mergedData.specialties_secondary,
      specialistId
    ]);
  }
}

module.exports = new SpecialistDirectoryManager();