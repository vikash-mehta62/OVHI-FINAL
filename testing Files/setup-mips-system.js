const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './server/.env' });

/**
 * MIPS System Setup Script
 * Initializes the MIPS compliance system with database schema and sample data
 */

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ovhi_db',
  multipleStatements: true
};

async function setupMIPSSystem() {
  let connection;
  
  try {
    console.log('🚀 Starting MIPS System Setup...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');

    // Read and execute schema file
    console.log('📋 Creating MIPS database schema...');
    const schemaPath = path.join(__dirname, 'server', 'sql', 'mips_compliance_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    await connection.execute(schemaSQL);
    console.log('✅ MIPS schema created successfully');

    // Read and execute sample data file
    console.log('📊 Inserting MIPS sample data...');
    const sampleDataPath = path.join(__dirname, 'server', 'sql', 'mips_sample_data.sql');
    const sampleDataSQL = await fs.readFile(sampleDataPath, 'utf8');
    
    await connection.execute(sampleDataSQL);
    console.log('✅ MIPS sample data inserted successfully');

    // Verify installation
    console.log('🔍 Verifying MIPS system installation...');
    
    const verificationQueries = [
      { name: 'Quality Measures', query: 'SELECT COUNT(*) as count FROM mips_quality_measures' },
      { name: 'PI Measures', query: 'SELECT COUNT(*) as count FROM mips_pi_measures' },
      { name: 'IA Activities', query: 'SELECT COUNT(*) as count FROM mips_improvement_activities' },
      { name: 'Configuration', query: 'SELECT COUNT(*) as count FROM mips_configuration' }
    ];

    for (const verification of verificationQueries) {
      const [rows] = await connection.execute(verification.query);
      console.log(`   ${verification.name}: ${rows[0].count} records`);
    }

    // Create sample provider eligibility (if users exist)
    console.log('👤 Setting up sample provider eligibility...');
    
    const [providers] = await connection.execute(`
      SELECT id, npi, tin, specialty FROM users 
      WHERE role = 6 AND npi IS NOT NULL AND tin IS NOT NULL 
      LIMIT 5
    `);

    if (providers.length > 0) {
      for (const provider of providers) {
        // Calculate sample eligibility metrics
        const sampleMetrics = {
          medicareVolume: Math.random() * 100,
          patientVolume: Math.floor(Math.random() * 500) + 50,
          allowedCharges: Math.floor(Math.random() * 200000) + 50000
        };

        let eligibilityStatus = 'not_eligible';
        let eligibilityReason = 'Does not meet volume thresholds';

        if (sampleMetrics.medicareVolume >= 75 && 
            (sampleMetrics.patientVolume >= 200 || sampleMetrics.allowedCharges >= 90000)) {
          eligibilityStatus = 'eligible';
          eligibilityReason = 'Meets MIPS volume and threshold requirements';
        } else if (sampleMetrics.patientVolume <= 200 && sampleMetrics.allowedCharges <= 90000) {
          eligibilityStatus = 'exempt';
          eligibilityReason = 'Qualifies for low-volume threshold exemption';
        }

        await connection.execute(`
          INSERT IGNORE INTO mips_eligibility (
            provider_id, tin, npi, performance_year, specialty_name,
            eligibility_status, eligibility_reason, medicare_volume_threshold,
            patient_volume_threshold, allowed_charges_threshold
          ) VALUES (?, ?, ?, 2024, ?, ?, ?, ?, ?, ?)
        `, [
          provider.id, provider.tin, provider.npi, provider.specialty || 'General Practice',
          eligibilityStatus, eligibilityReason, sampleMetrics.medicareVolume,
          sampleMetrics.patientVolume, sampleMetrics.allowedCharges
        ]);

        // If eligible, create sample measure selections
        if (eligibilityStatus === 'eligible') {
          const sampleMeasures = ['001', '002', '236', '317', '112', '110'];
          
          for (const measureId of sampleMeasures) {
            await connection.execute(`
              INSERT IGNORE INTO mips_provider_measures (
                provider_id, performance_year, measure_id, selection_status,
                selection_reason, data_completeness_expected, performance_rate_target
              ) VALUES (?, 2024, ?, 'selected', 'Sample measure selection', 75, 70)
            `, [provider.id, measureId]);
          }

          // Create sample PI attestations
          const piMeasures = ['PI_EP_1', 'PI_HIE_1'];
          for (const piMeasureId of piMeasures) {
            const numerator = Math.floor(Math.random() * 100) + 50;
            const denominator = numerator + Math.floor(Math.random() * 50) + 10;
            const performanceRate = (numerator / denominator) * 100;
            const pointsEarned = performanceRate >= 75 ? 10 : Math.floor(performanceRate / 10);

            await connection.execute(`
              INSERT IGNORE INTO mips_pi_performance (
                provider_id, performance_year, measure_id, numerator_value, denominator_value,
                performance_rate, points_earned, attestation_status, attestation_date
              ) VALUES (?, 2024, ?, ?, ?, ?, ?, 'attested', NOW())
            `, [provider.id, piMeasureId, numerator, denominator, performanceRate, pointsEarned]);
          }

          // Create sample IA attestations
          const iaActivities = ['IA_EPA_1', 'IA_PM_2', 'IA_CC_1'];
          for (const activityId of iaActivities) {
            const startDate = new Date(2024, Math.floor(Math.random() * 6), 1);
            const endDate = new Date(startDate.getTime() + (90 * 24 * 60 * 60 * 1000));
            
            await connection.execute(`
              INSERT IGNORE INTO mips_ia_attestations (
                provider_id, performance_year, activity_id, attestation_status,
                start_date, end_date, continuous_90_days, points_earned, attestation_date
              ) VALUES (?, 2024, ?, 'completed', ?, ?, TRUE, 10, NOW())
            `, [provider.id, activityId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
          }

          console.log(`   ✅ Sample data created for provider ${provider.id} (${eligibilityStatus})`);
        } else {
          console.log(`   ℹ️  Provider ${provider.id} marked as ${eligibilityStatus}`);
        }
      }
    } else {
      console.log('   ⚠️  No eligible providers found (need NPI and TIN)');
    }

    // Create stored procedures for MIPS calculations
    console.log('⚙️  Creating MIPS stored procedures...');
    
    await connection.execute(`
      DROP PROCEDURE IF EXISTS CalculateMIPSCompositeScore;
    `);

    await connection.execute(`
      CREATE PROCEDURE CalculateMIPSCompositeScore(
        IN p_provider_id INT,
        IN p_performance_year YEAR
      )
      BEGIN
        DECLARE quality_score DECIMAL(5,2) DEFAULT 0.00;
        DECLARE pi_score DECIMAL(5,2) DEFAULT 0.00;
        DECLARE ia_score DECIMAL(5,2) DEFAULT 0.00;
        DECLARE cost_score DECIMAL(5,2) DEFAULT 0.00;
        DECLARE composite_score DECIMAL(5,2) DEFAULT 0.00;
        DECLARE payment_adjustment DECIMAL(5,2) DEFAULT 0.00;
        
        -- Calculate Quality Score
        SELECT COALESCE(AVG(
          CASE 
            WHEN qp.case_minimum_met = TRUE AND qp.data_completeness >= 70 
            THEN qp.performance_score 
            ELSE 0 
          END
        ), 0.00) INTO quality_score
        FROM mips_provider_measures pm
        JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
        WHERE pm.provider_id = p_provider_id 
        AND pm.performance_year = p_performance_year
        AND pm.selection_status = 'selected';
        
        -- Calculate PI Score
        SELECT COALESCE(
          (SUM(pip.points_earned) / SUM(pim.max_points)) * 100, 0.00
        ) INTO pi_score
        FROM mips_pi_performance pip
        JOIN mips_pi_measures pim ON pip.measure_id = pim.measure_id
        WHERE pip.provider_id = p_provider_id 
        AND pip.performance_year = p_performance_year
        AND pip.attestation_status = 'attested';
        
        -- Calculate IA Score
        SELECT COALESCE(
          LEAST(100, (SUM(ia.points_earned) / 40) * 100), 0.00
        ) INTO ia_score
        FROM mips_ia_attestations ia
        WHERE ia.provider_id = p_provider_id 
        AND ia.performance_year = p_performance_year
        AND ia.attestation_status = 'completed';
        
        -- Calculate Cost Score (placeholder)
        SELECT COALESCE(AVG(cp.performance_score), 0.00) INTO cost_score
        FROM mips_cost_performance cp
        WHERE cp.provider_id = p_provider_id 
        AND cp.performance_year = p_performance_year;
        
        -- Calculate Composite Score
        SET composite_score = (quality_score * 0.45) + (pi_score * 0.25) + (ia_score * 0.15) + (cost_score * 0.15);
        
        -- Calculate Payment Adjustment
        IF composite_score >= 75 THEN
          SET payment_adjustment = ((composite_score - 75) / 25) * 9.0;
        ELSE
          SET payment_adjustment = -((75 - composite_score) / 75) * 9.0;
        END IF;
        
        -- Update or Insert Submission Record
        INSERT INTO mips_submissions (
          provider_id, performance_year, quality_score, pi_score, ia_score, cost_score,
          composite_score, payment_adjustment, updated_at
        ) VALUES (
          p_provider_id, p_performance_year, quality_score, pi_score, ia_score, cost_score,
          composite_score, payment_adjustment, NOW()
        ) ON DUPLICATE KEY UPDATE
          quality_score = VALUES(quality_score),
          pi_score = VALUES(pi_score),
          ia_score = VALUES(ia_score),
          cost_score = VALUES(cost_score),
          composite_score = VALUES(composite_score),
          payment_adjustment = VALUES(payment_adjustment),
          updated_at = NOW();
          
        -- Return Results
        SELECT quality_score, pi_score, ia_score, cost_score, composite_score, payment_adjustment;
      END
    `);

    console.log('✅ MIPS stored procedures created');

    // Final system check
    console.log('🔍 Running final system verification...');
    
    const [systemCheck] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM mips_quality_measures WHERE performance_year = 2024) as quality_measures,
        (SELECT COUNT(*) FROM mips_pi_measures WHERE performance_year = 2024) as pi_measures,
        (SELECT COUNT(*) FROM mips_improvement_activities WHERE performance_year = 2024) as ia_activities,
        (SELECT COUNT(*) FROM mips_eligibility WHERE performance_year = 2024) as eligible_providers,
        (SELECT COUNT(*) FROM mips_configuration WHERE performance_year = 2024) as config_items
    `);

    const stats = systemCheck[0];
    
    console.log('\n📊 MIPS System Statistics:');
    console.log(`   Quality Measures: ${stats.quality_measures}`);
    console.log(`   PI Measures: ${stats.pi_measures}`);
    console.log(`   IA Activities: ${stats.ia_activities}`);
    console.log(`   Eligible Providers: ${stats.eligible_providers}`);
    console.log(`   Configuration Items: ${stats.config_items}`);

    console.log('\n🎉 MIPS System Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start your server: npm run dev (in server directory)');
    console.log('   2. Start your frontend: npm run dev (in root directory)');
    console.log('   3. Navigate to /provider/mips to access MIPS compliance');
    console.log('   4. Check eligibility and begin measure selection');
    console.log('\n💡 Tips:');
    console.log('   - Ensure providers have NPI and TIN in their profiles');
    console.log('   - Review sample data and customize for your needs');
    console.log('   - Configure specialty-specific measure sets');
    console.log('   - Set up automated data collection workflows');

  } catch (error) {
    console.error('❌ Error setting up MIPS system:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupMIPSSystem();