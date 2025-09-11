// Test RCM API directly using the server's internal functions
const { executeQuery } = require('./server/utils/dbUtils');

async function testRCMQuery() {
  console.log('🔄 Testing RCM claims query directly...');
  
  try {
    // Test the exact query used in the RCM service
    const baseQuery = `
      SELECT 
        b.id,
        b.patient_id,
        CONCAT(p.firstname, ' ', p.lastname) as patient_name,
        b.procedure_code,
        b.procedure_code as procedure_codes,
        b.total_amount,
        b.service_date,
        b.status,
        b.created,
        b.created as created_at,
        b.created as updated_at,
        CONCAT('CLM-', LPAD(b.id, 6, '0')) as claim_number,
        DATEDIFF(CURDATE(), b.service_date) as days_in_ar,
        CONCAT(UPPER(SUBSTRING(b.status, 1, 1)), LOWER(SUBSTRING(b.status, 2))) as status_text,
        'Unknown Payer' as payer_name,
        'N/A' as diagnosis_code,
        'N/A' as diagnosis_codes
      FROM billings b
      INNER JOIN user_profiles p ON b.patient_id = p.fk_userid
      ORDER BY b.created DESC
      LIMIT 10
    `;
    
    const result = await executeQuery(baseQuery);
    
    console.log(`✅ Query successful! Found ${result.length} claims`);
    
    if (result.length > 0) {
      console.log('📋 Sample claims:');
      result.slice(0, 3).forEach((claim, index) => {
        console.log(`  ${index + 1}. ${claim.claim_number} - ${claim.patient_name}`);
        console.log(`     Amount: $${claim.total_amount} | Status: ${claim.status_text}`);
        console.log(`     Service Date: ${claim.service_date}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return null;
  }
}

testRCMQuery();