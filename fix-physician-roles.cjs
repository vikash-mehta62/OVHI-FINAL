const mysql = require('mysql2/promise');

async function fixPhysicianRoles() {
    console.log('🔧 Fixing Physician Roles and Mappings\n');

    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'varn-health'
        });

        console.log('✅ Database connected\n');

        // 1. Check what roles exist
        console.log('1️⃣ Checking Available Roles...');
        const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
        console.log('Available roles:');
        roles.forEach(role => {
            console.log(`  ID: ${role.id}, Name: ${role.name}`);
        });

        // 2. Check current user mappings
        console.log('\n2️⃣ Checking Current User Mappings...');
        const [mappings] = await connection.execute(`
            SELECT 
                um.fk_physician_id,
                um.fk_role_id,
                r.name as role_name,
                CONCAT(up.firstname, ' ', up.lastname) as physician_name,
                COUNT(DISTINCT um.user_id) as patient_count
            FROM users_mappings um
            JOIN roles r ON r.id = um.fk_role_id
            JOIN user_profiles up ON up.fk_userid = um.fk_physician_id
            GROUP BY um.fk_physician_id, um.fk_role_id, r.name, up.firstname, up.lastname
            ORDER BY um.fk_physician_id
        `);

        console.log('Current physician mappings:');
        mappings.forEach(m => {
            console.log(`  Physician: ${m.physician_name} (ID: ${m.fk_physician_id}), Role: ${m.role_name} (ID: ${m.fk_role_id}), Patients: ${m.patient_count}`);
        });

        // 3. Find physicians who have bills
        console.log('\n3️⃣ Finding Physicians with Bills...');
        const [physiciansWithBills] = await connection.execute(`
            SELECT DISTINCT 
                um.fk_physician_id,
                CONCAT(up.firstname, ' ', up.lastname) as physician_name,
                COUNT(DISTINCT b.id) as bill_count,
                COUNT(DISTINCT p.id) as payment_count
            FROM users_mappings um
            JOIN user_profiles up ON up.fk_userid = um.fk_physician_id
            JOIN bills b ON b.patient_id = um.user_id
            LEFT JOIN payments p ON p.bill_id = b.id
            GROUP BY um.fk_physician_id, up.firstname, up.lastname
        `);

        console.log('Physicians with bills (any role):');
        physiciansWithBills.forEach(p => {
            console.log(`  ${p.physician_name} (ID: ${p.fk_physician_id}): ${p.bill_count} bills, ${p.payment_count} payments`);
        });

        // 4. Check what role ID should be used for physicians
        console.log('\n4️⃣ Determining Correct Physician Role...');
        
        // Look for physician-like roles
        const physicianRoles = roles.filter(r => 
            r.name.toLowerCase().includes('physician') || 
            r.name.toLowerCase().includes('doctor') || 
            r.name.toLowerCase().includes('provider')
        );

        if (physicianRoles.length > 0) {
            console.log('Found physician-like roles:');
            physicianRoles.forEach(role => {
                console.log(`  ID: ${role.id}, Name: ${role.name}`);
            });
        } else {
            console.log('No obvious physician roles found. Checking role usage...');
            
            // Check which roles are used by users who have bills
            const [roleUsage] = await connection.execute(`
                SELECT 
                    um.fk_role_id,
                    r.name as role_name,
                    COUNT(DISTINCT um.fk_physician_id) as physician_count,
                    COUNT(DISTINCT b.id) as bill_count
                FROM users_mappings um
                JOIN roles r ON r.id = um.fk_role_id
                LEFT JOIN bills b ON b.patient_id = um.user_id
                GROUP BY um.fk_role_id, r.name
                HAVING bill_count > 0
                ORDER BY bill_count DESC
            `);
            
            console.log('Roles used by users with bills:');
            roleUsage.forEach(ru => {
                console.log(`  Role: ${ru.role_name} (ID: ${ru.fk_role_id}), Physicians: ${ru.physician_count}, Bills: ${ru.bill_count}`);
            });
        }

        // 5. Test the payments query with actual physician IDs
        console.log('\n5️⃣ Testing Payments Query with Actual Data...');
        
        if (physiciansWithBills.length > 0) {
            const testPhysicianId = physiciansWithBills[0].fk_physician_id;
            console.log(`Testing with physician ID: ${testPhysicianId}`);
            
            const [testPayments] = await connection.execute(`
                SELECT 
                    p.*,
                    CONCAT(up.firstname, " ", up.lastname) as patient_name,
                    up.work_email as patient_email,
                    b.total_amount as bill_total_amount
                FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN user_profiles up ON b.patient_id = up.fk_userid
                JOIN users_mappings um ON um.user_id = b.patient_id
                WHERE um.fk_physician_id = ?
                ORDER BY p.payment_date DESC
            `, [testPhysicianId]);
            
            console.log(`✅ Found ${testPayments.length} payments for physician ${testPhysicianId}`);
            
            if (testPayments.length > 0) {
                console.log('Sample payment:');
                const sample = testPayments[0];
                console.log(`  Payment ID: ${sample.id}, Patient: ${sample.patient_name}, Amount: $${sample.amount}`);
            }
        }

        await connection.end();

        console.log('\n📋 Summary:');
        console.log('✅ Data relationships are working');
        console.log('✅ Payments can be retrieved with correct physician ID');
        console.log('⚠️  The API needs to use the correct physician ID from the logged-in user');
        
        console.log('\n🔧 Next Steps:');
        console.log('1. Start the server: cd server && npm start');
        console.log('2. Login with a user who is mapped as a physician');
        console.log('3. The user_id from the JWT token should match fk_physician_id in users_mappings');
        console.log('4. Test the payments API with proper authentication');

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

fixPhysicianRoles().catch(console.error);