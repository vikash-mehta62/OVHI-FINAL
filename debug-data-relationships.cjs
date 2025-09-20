const mysql = require('mysql2/promise');

async function debugDataRelationships() {
    console.log('🔍 Debugging Data Relationships\n');

    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'varn-health'
        });

        console.log('✅ Database connected\n');

        // 1. Check payments and their bill relationships
        console.log('1️⃣ Checking Payments and Bill Relationships...');
        const [paymentsWithBills] = await connection.execute(`
            SELECT 
                p.id as payment_id,
                p.bill_id,
                p.amount,
                p.status,
                b.id as bill_exists,
                b.patient_id,
                b.total_amount as bill_amount
            FROM payments p
            LEFT JOIN bills b ON p.bill_id = b.id
        `);

        console.log(`Found ${paymentsWithBills.length} payments:`);
        paymentsWithBills.forEach(p => {
            console.log(`  Payment ${p.payment_id}: bill_id=${p.bill_id}, bill_exists=${p.bill_exists ? 'YES' : 'NO'}, patient_id=${p.patient_id}`);
        });

        // 2. Check if bills have proper patient mappings
        console.log('\n2️⃣ Checking Bills and Patient Mappings...');
        const [billsWithMappings] = await connection.execute(`
            SELECT 
                b.id as bill_id,
                b.patient_id,
                um.fk_physician_id,
                up.firstname,
                up.lastname
            FROM bills b
            LEFT JOIN users_mappings um ON um.user_id = b.patient_id
            LEFT JOIN user_profiles up ON up.fk_userid = b.patient_id
            WHERE b.id IN (SELECT DISTINCT bill_id FROM payments)
        `);

        console.log(`Bills referenced by payments:`);
        billsWithMappings.forEach(b => {
            console.log(`  Bill ${b.bill_id}: patient_id=${b.patient_id}, physician_id=${b.fk_physician_id}, patient=${b.firstname} ${b.lastname}`);
        });

        // 3. Check the full join that's failing
        console.log('\n3️⃣ Testing Full Join Query...');
        const [fullJoinTest] = await connection.execute(`
            SELECT 
                p.id,
                p.bill_id,
                p.amount,
                b.patient_id,
                um.fk_physician_id,
                CONCAT(up.firstname, " ", up.lastname) as patient_name
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN user_profiles up ON b.patient_id = up.fk_userid
            JOIN users_mappings um ON um.user_id = b.patient_id
        `);

        console.log(`Full join result: ${fullJoinTest.length} records`);
        if (fullJoinTest.length === 0) {
            console.log('❌ The JOIN is failing - checking each step...');
            
            // Step by step debugging
            const [step1] = await connection.execute(`
                SELECT COUNT(*) as count FROM payments p
                JOIN bills b ON p.bill_id = b.id
            `);
            console.log(`  Step 1 (payments + bills): ${step1[0].count} records`);
            
            const [step2] = await connection.execute(`
                SELECT COUNT(*) as count FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN user_profiles up ON b.patient_id = up.fk_userid
            `);
            console.log(`  Step 2 (+ user_profiles): ${step2[0].count} records`);
            
            const [step3] = await connection.execute(`
                SELECT COUNT(*) as count FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN user_profiles up ON b.patient_id = up.fk_userid
                JOIN users_mappings um ON um.user_id = b.patient_id
            `);
            console.log(`  Step 3 (+ users_mappings): ${step3[0].count} records`);
        } else {
            console.log('✅ Full join works, showing sample:');
            fullJoinTest.slice(0, 3).forEach(r => {
                console.log(`  Payment ${r.id}: ${r.patient_name}, Physician: ${r.fk_physician_id}`);
            });
        }

        // 4. Check if the issue is with the sample data
        console.log('\n4️⃣ Checking Sample Data Issues...');
        
        // Check if bills in payments table actually exist
        const [orphanedPayments] = await connection.execute(`
            SELECT p.id, p.bill_id
            FROM payments p
            LEFT JOIN bills b ON p.bill_id = b.id
            WHERE b.id IS NULL
        `);
        
        if (orphanedPayments.length > 0) {
            console.log('❌ Found orphaned payments (bill_id doesn\'t exist):');
            orphanedPayments.forEach(p => {
                console.log(`  Payment ${p.id} references non-existent bill ${p.bill_id}`);
            });
        } else {
            console.log('✅ All payments reference valid bills');
        }

        // Check if patients in bills have user profiles
        const [billsWithoutProfiles] = await connection.execute(`
            SELECT DISTINCT b.id, b.patient_id
            FROM bills b
            LEFT JOIN user_profiles up ON b.patient_id = up.fk_userid
            WHERE up.fk_userid IS NULL
            AND b.id IN (SELECT DISTINCT bill_id FROM payments)
        `);
        
        if (billsWithoutProfiles.length > 0) {
            console.log('❌ Found bills without user profiles:');
            billsWithoutProfiles.forEach(b => {
                console.log(`  Bill ${b.id} patient_id ${b.patient_id} has no user profile`);
            });
        } else {
            console.log('✅ All bills have valid user profiles');
        }

        // Check if patients have physician mappings
        const [patientsWithoutMappings] = await connection.execute(`
            SELECT DISTINCT b.patient_id
            FROM bills b
            LEFT JOIN users_mappings um ON um.user_id = b.patient_id
            WHERE um.user_id IS NULL
            AND b.id IN (SELECT DISTINCT bill_id FROM payments)
        `);
        
        if (patientsWithoutMappings.length > 0) {
            console.log('❌ Found patients without physician mappings:');
            patientsWithoutMappings.forEach(p => {
                console.log(`  Patient ${p.patient_id} has no physician mapping`);
            });
            
            console.log('\n🔧 Fix: Add physician mappings for these patients');
            console.log('   INSERT INTO users_mappings (user_id, fk_physician_id, fk_role_id) VALUES (patient_id, physician_id, 7);');
        } else {
            console.log('✅ All patients have physician mappings');
        }

        await connection.end();

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

debugDataRelationships().catch(console.error);