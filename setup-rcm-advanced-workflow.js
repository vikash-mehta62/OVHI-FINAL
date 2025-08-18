const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ovhi_db',
    multipleStatements: true
};

async function setupRCMAdvancedWorkflow() {
    let connection;
    
    try {
        console.log('🚀 Setting up RCM Advanced Workflow System...');
        
        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Read and execute schema
        console.log('📊 Creating database schema...');
        const schemaPath = path.join(__dirname, 'server/sql/rcm_advanced_workflow_schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        await connection.execute(schema);
        console.log('✅ Database schema created');

        // Insert sample data
        console.log('📝 Inserting sample data...');
        await insertSampleData(connection);
        console.log('✅ Sample data inserted');

        // Create sample AR aging analysis
        console.log('🧠 Creating sample AR aging analysis...');
        await createSampleARAnalysis(connection);
        console.log('✅ Sample AR analysis created');

        // Create sample ClaimMD submissions
        console.log('📤 Creating sample ClaimMD submissions...');
        await createSampleClaimMDSubmissions(connection);
        console.log('✅ Sample ClaimMD submissions created');

        // Create sample collection workflows
        console.log('🔄 Creating sample collection workflows...');
        await createSampleCollectionWorkflows(connection);
        console.log('✅ Sample collection workflows created');

        // Create sample denial categories
        console.log('❌ Creating sample denial categories...');
        await createSampleDenialCategories(connection);
        console.log('✅ Sample denial categories created');

        console.log('\n🎉 RCM Advanced Workflow System setup completed successfully!');
        console.log('\n📋 System Components Initialized:');
        console.log('   • AR Aging Intelligence');
        console.log('   • ClaimMD Connector');
        console.log('   • Collection Workflow Manager');
        console.log('   • Denial Management Workflow');
        console.log('   • EDI Transaction Manager');
        console.log('   • Enhanced Eligibility Checker');
        console.log('   • ERA Processor');
        console.log('   • Intelligent Claims Scrubbers');
        console.log('   • Patient Financial Portal');
        console.log('   • Payment Posting Engine');
        console.log('   • Revenue Forecasting System');

        console.log('\n🔗 API Endpoints Available:');
        console.log('   • GET  /api/v1/rcm-advanced/ar-aging/analyze');
        console.log('   • POST /api/v1/rcm-advanced/claimmd/submit');
        console.log('   • POST /api/v1/rcm-advanced/collection/initiate');
        console.log('   • POST /api/v1/rcm-advanced/denial/categorize');
        console.log('   • GET  /api/v1/rcm-advanced/health');

        console.log('\n🎯 Next Steps:');
        console.log('   1. Configure ClaimMD API credentials in environment variables');
        console.log('   2. Set up automated workflow processing cron jobs');
        console.log('   3. Configure notification systems for alerts');
        console.log('   4. Test the system with real claim data');

    } catch (error) {
        console.error('❌ Error setting up RCM Advanced Workflow:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function insertSampleData(connection) {
    // Insert sample patient accounts for AR aging
    await connection.execute(`
        INSERT IGNORE INTO patient_accounts (id, patient_id, current_balance, total_charges, total_payments, last_payment_date) VALUES
        (1, 1, 2500.00, 3000.00, 500.00, DATE_SUB(NOW(), INTERVAL 45 DAY)),
        (2, 2, 1200.00, 1500.00, 300.00, DATE_SUB(NOW(), INTERVAL 75 DAY)),
        (3, 3, 5000.00, 6000.00, 1000.00, DATE_SUB(NOW(), INTERVAL 120 DAY)),
        (4, 4, 800.00, 1000.00, 200.00, DATE_SUB(NOW(), INTERVAL 30 DAY)),
        (5, 5, 3200.00, 4000.00, 800.00, DATE_SUB(NOW(), INTERVAL 95 DAY))
    `);

    // Insert sample claims for testing
    await connection.execute(`
        INSERT IGNORE INTO claims (id, claim_number, patient_id, provider_id, primary_insurance_id, total_amount, paid_amount, patient_responsibility, service_date, created_at) VALUES
        (1, 'CLM001', 1, 1, 1, 3000.00, 500.00, 2500.00, DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY)),
        (2, 'CLM002', 2, 1, 2, 1500.00, 300.00, 1200.00, DATE_SUB(NOW(), INTERVAL 75 DAY), DATE_SUB(NOW(), INTERVAL 75 DAY)),
        (3, 'CLM003', 3, 1, 1, 6000.00, 1000.00, 5000.00, DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 120 DAY)),
        (4, 'CLM004', 4, 1, 2, 1000.00, 200.00, 800.00, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY)),
        (5, 'CLM005', 5, 1, 1, 4000.00, 800.00, 3200.00, DATE_SUB(NOW(), INTERVAL 95 DAY), DATE_SUB(NOW(), INTERVAL 95 DAY))
    `);
}

async function createSampleARAnalysis(connection) {
    // Create AR aging analysis
    await connection.execute(`
        INSERT INTO rcm_ar_aging_analysis 
        (analysis_date, total_outstanding, bucket_0_30, bucket_31_60, bucket_61_90, bucket_91_120, bucket_120_plus, collection_probability, risk_distribution)
        VALUES 
        (CURDATE(), 12700.00, 800.00, 2500.00, 1200.00, 3200.00, 5000.00, 65.5, '{"low": 1, "medium": 2, "high": 1, "critical": 1}')
    `);

    // Create collection predictions
    await connection.execute(`
        INSERT INTO rcm_collection_predictions 
        (account_id, patient_id, prediction_score, confidence_level, risk_factors, recommended_actions)
        VALUES 
        (1, 1, 75.5, 85.0, '["Moderate balance", "Recent payment history"]', '["Send payment reminder", "Offer payment plan"]'),
        (2, 2, 65.2, 78.0, '["Aging debt", "Limited payment history"]', '["Schedule collection call", "Send statement"]'),
        (3, 3, 35.8, 92.0, '["Very old debt", "High balance", "No recent payments"]', '["Consider external collection", "Final notice"]'),
        (4, 4, 85.3, 88.0, '["Recent service", "Low balance"]', '["Standard follow-up", "Send statement"]'),
        (5, 5, 45.7, 82.0, '["High balance", "Extended days outstanding"]', '["Initiate payment plan", "Collection call"]')
    `);

    // Create risk scores
    await connection.execute(`
        INSERT INTO rcm_risk_scores 
        (account_id, patient_id, risk_score, risk_category, contributing_factors)
        VALUES 
        (1, 1, 45.0, 'medium', '["Moderate balance", "45 days outstanding"]'),
        (2, 2, 55.0, 'medium', '["75 days outstanding", "Limited payment history"]'),
        (3, 3, 85.0, 'critical', '["Very high balance", "120+ days outstanding", "No recent payments"]'),
        (4, 4, 25.0, 'low', '["Low balance", "Recent service"]'),
        (5, 5, 70.0, 'high', '["High balance", "95 days outstanding"]')
    `);
}

async function createSampleClaimMDSubmissions(connection) {
    // Create ClaimMD submissions
    await connection.execute(`
        INSERT INTO rcm_claimmd_submissions 
        (claim_id, claimmd_id, submission_status, confirmation_number, submission_date, response_date)
        VALUES 
        (1, 'CMD001', 'accepted', 'CONF001', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
        (2, 'CMD002', 'pending', 'CONF002', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),
        (3, 'CMD003', 'rejected', 'CONF003', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
        (4, 'CMD004', 'accepted', 'CONF004', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
        (5, 'CMD005', 'submitted', 'CONF005', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL)
    `);

    // Create ClaimMD errors for rejected claims
    await connection.execute(`
        INSERT INTO rcm_claimmd_errors 
        (submission_id, error_code, error_message, error_severity)
        VALUES 
        (3, 'E001', 'Invalid procedure code', 'high'),
        (3, 'E002', 'Missing diagnosis code', 'medium')
    `);

    // Create ClaimMD responses
    await connection.execute(`
        INSERT INTO rcm_claimmd_responses 
        (submission_id, response_type, response_data)
        VALUES 
        (1, 'acceptance', '{"status": "accepted", "payment_amount": 500.00}'),
        (3, 'rejection', '{"status": "rejected", "errors": ["Invalid procedure code", "Missing diagnosis code"]}'),
        (4, 'acceptance', '{"status": "accepted", "payment_amount": 200.00}')
    `);
}

async function createSampleCollectionWorkflows(connection) {
    // Create collection workflows
    await connection.execute(`
        INSERT INTO rcm_collection_workflows 
        (account_id, patient_id, workflow_type, current_stage, stage_sequence, status, started_date, next_action_date, workflow_data)
        VALUES 
        (1, 1, 'standard', 'first_reminder', '[{"name": "initial_statement", "order": 1}, {"name": "first_reminder", "order": 2}]', 'active', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), '{"accountBalance": 2500.00, "daysOutstanding": 45}'),
        (2, 2, 'aggressive', 'collection_call', '[{"name": "initial_statement", "order": 1}, {"name": "collection_call", "order": 2}]', 'active', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), '{"accountBalance": 1200.00, "daysOutstanding": 75}'),
        (3, 3, 'standard', 'external_collection', '[{"name": "initial_statement", "order": 1}, {"name": "external_collection", "order": 2}]', 'active', DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), '{"accountBalance": 5000.00, "daysOutstanding": 120}')
    `);

    // Create collection stages
    await connection.execute(`
        INSERT INTO rcm_collection_stages 
        (workflow_id, stage_name, stage_order, stage_type, stage_config, status, started_date, completed_date)
        VALUES 
        (1, 'initial_statement', 1, 'statement', '{"delayDays": 0, "template": "initial_statement_template"}', 'completed', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 29 DAY)),
        (1, 'first_reminder', 2, 'reminder', '{"delayDays": 30, "template": "first_reminder_template"}', 'active', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),
        (2, 'initial_statement', 1, 'statement', '{"delayDays": 0, "template": "initial_statement_template"}', 'completed', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 44 DAY)),
        (2, 'collection_call', 2, 'call', '{"delayDays": 15, "template": "collection_call_template"}', 'active', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL)
    `);

    // Create collection actions
    await connection.execute(`
        INSERT INTO rcm_collection_actions 
        (workflow_id, stage_id, action_type, action_description, scheduled_date, status, action_data)
        VALUES 
        (1, 2, 'send_reminder', 'Send first payment reminder', DATE_ADD(NOW(), INTERVAL 1 DAY), 'scheduled', '{"template": "first_reminder_template", "priority": "medium"}'),
        (2, 4, 'collection_call', 'Schedule collection call', DATE_ADD(NOW(), INTERVAL 2 DAY), 'scheduled', '{"template": "collection_call_template", "priority": "high"}'),
        (3, NULL, 'external_referral', 'Refer to external collection agency', DATE_ADD(NOW(), INTERVAL 1 DAY), 'scheduled', '{"agency": "ABC Collections", "priority": "urgent"}')
    `);

    // Create payment plans
    await connection.execute(`
        INSERT INTO rcm_payment_plans 
        (account_id, patient_id, total_amount, monthly_payment, number_of_payments, remaining_balance, start_date, next_payment_date, status)
        VALUES 
        (4, 4, 800.00, 200.00, 4, 600.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 'active'),
        (5, 5, 3200.00, 400.00, 8, 2800.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), CURDATE(), 'active')
    `);
}

async function createSampleDenialCategories(connection) {
    // Create denial categories
    await connection.execute(`
        INSERT INTO rcm_denial_categories 
        (denial_id, claim_id, denial_code, denial_reason, category, subcategory, priority_level, resolution_complexity, estimated_recovery_amount)
        VALUES 
        (1, 1, 'CO-4', 'Procedure code not valid', 'Procedure Code', 'Coding Error', 'medium', 'moderate', 2500.00),
        (2, 2, 'CO-23', 'Prior authorization required', 'Prior Authorization', 'Authorization Required', 'high', 'complex', 1200.00),
        (3, 3, 'CO-29', 'Claim submitted after timely filing deadline', 'Time Limit', 'Timely Filing', 'high', 'complex', 5000.00),
        (4, 4, 'CO-1', 'Deductible amount', 'Deductible', 'Patient Responsibility', 'low', 'simple', 80.00),
        (5, 5, 'CO-11', 'Diagnosis code not valid', 'Diagnosis Code', 'Coding Error', 'medium', 'moderate', 3200.00)
    `);

    // Create denial resolutions
    await connection.execute(`
        INSERT INTO rcm_denial_resolutions 
        (denial_category_id, suggested_action, action_priority, success_rate, average_recovery_time, required_documents, resolution_steps, historical_success_count, historical_attempt_count)
        VALUES 
        (1, 'Verify and correct procedure code', 1, 85.0, 14, '["Medical records", "Procedure documentation"]', '["Review medical records", "Verify correct CPT code", "Submit corrected claim"]', 17, 20),
        (2, 'Obtain retroactive authorization', 1, 60.0, 21, '["Medical necessity documentation", "Clinical notes"]', '["Contact payer", "Submit documentation", "Follow up weekly"]', 12, 20),
        (3, 'Appeal with good cause documentation', 1, 30.0, 45, '["Good cause documentation", "Original claim proof"]', '["Document reason", "Prepare appeal", "Submit with documentation"]', 6, 20),
        (4, 'Bill patient for deductible', 1, 95.0, 7, '["EOB", "Patient statement"]', '["Generate patient statement", "Send to patient"]', 19, 20),
        (5, 'Review and correct diagnosis coding', 1, 80.0, 10, '["Medical records", "ICD-10 documentation"]', '["Review diagnosis", "Verify ICD-10 code", "Submit corrected claim"]', 16, 20)
    `);

    // Create appeal documents
    await connection.execute(`
        INSERT INTO rcm_appeal_documents 
        (denial_category_id, appeal_type, document_template, generated_document, supporting_documents, submission_deadline, status)
        VALUES 
        (2, 'prior_auth_appeal', 'prior_auth_template', 'Generated appeal letter for prior authorization...', '["Medical necessity docs", "Clinical notes"]', DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'draft'),
        (3, 'timely_filing_appeal', 'timely_filing_template', 'Generated appeal letter for timely filing...', '["Good cause documentation", "Original claim"]', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'ready')
    `);

    // Create appeal outcomes
    await connection.execute(`
        INSERT INTO rcm_appeal_outcomes 
        (appeal_document_id, outcome, recovered_amount, response_date, response_details)
        VALUES 
        (1, 'pending', 0.00, NULL, NULL),
        (2, 'pending', 0.00, NULL, NULL)
    `);
}

// Run the setup
if (require.main === module) {
    setupRCMAdvancedWorkflow()
        .then(() => {
            console.log('\n✨ Setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupRCMAdvancedWorkflow };