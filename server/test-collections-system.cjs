const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'ovhi_db'
};

async function testCollectionsSystem() {
  let connection;
  
  try {
    console.log('🧪 Testing Collections Management System...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Test 1: Patient Accounts Collections Data
    console.log('\n📊 Test 1: Patient Accounts Collections Data');
    const [accounts] = await connection.execute(`
      SELECT 
        pa.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        pa.total_balance,
        pa.aging_0_30,
        pa.aging_31_60,
        pa.aging_61_90,
        pa.aging_91_plus,
        pa.collection_status,
        pa.priority,
        pa.assigned_collector,
        pa.contact_attempts
      FROM patient_accounts pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      WHERE pa.total_balance > 0
      LIMIT 5
    `);
    
    console.log(`Found ${accounts.length} patient accounts with balances:`);
    accounts.forEach(account => {
      console.log(`  • ${account.patient_name || `Patient ${account.patient_id}`}: $${account.total_balance} (${account.collection_status})`);
    });
    
    // Test 2: Payment Plans
    console.log('\n💳 Test 2: Payment Plans');
    const [paymentPlans] = await connection.execute(`
      SELECT 
        pp.id,
        pp.patient_id,
        pp.total_amount,
        pp.monthly_payment,
        pp.remaining_balance,
        pp.next_payment_date,
        pp.status,
        pp.payments_remaining,
        pp.auto_pay_enabled
      FROM payment_plans pp
      WHERE pp.status = 'active'
    `);
    
    console.log(`Found ${paymentPlans.length} active payment plans:`);
    paymentPlans.forEach(plan => {
      console.log(`  • Patient ${plan.patient_id}: $${plan.monthly_payment}/month, ${plan.payments_remaining} payments left`);
    });
    
    // Test 3: Collection Activities
    console.log('\n📞 Test 3: Collection Activities');
    const [activities] = await connection.execute(`
      SELECT 
        ca.patient_id,
        ca.activity_type,
        ca.activity_date,
        ca.description,
        ca.outcome,
        ca.performed_by
      FROM collection_activities ca
      ORDER BY ca.activity_date DESC
      LIMIT 5
    `);
    
    console.log(`Found ${activities.length} recent collection activities:`);
    activities.forEach(activity => {
      console.log(`  • ${activity.activity_date.toISOString().split('T')[0]}: ${activity.activity_type} for Patient ${activity.patient_id} (${activity.outcome})`);
    });
    
    // Test 4: Collection Letter Templates
    console.log('\n📄 Test 4: Collection Letter Templates');
    const [templates] = await connection.execute(`
      SELECT template_name, template_type, days_after_due, is_active
      FROM collection_letter_templates
      WHERE is_active = 1
    `);
    
    console.log(`Found ${templates.length} active letter templates:`);
    templates.forEach(template => {
      console.log(`  • ${template.template_name} (${template.template_type}) - ${template.days_after_due} days`);
    });
    
    // Test 5: Collection Rules
    console.log('\n⚙️ Test 5: Collection Rules');
    const [rules] = await connection.execute(`
      SELECT rule_name, action_type, is_active, execution_order
      FROM collection_rules
      WHERE is_active = 1
      ORDER BY execution_order
    `);
    
    console.log(`Found ${rules.length} active collection rules:`);
    rules.forEach(rule => {
      console.log(`  • ${rule.rule_name}: ${rule.action_type} (Order: ${rule.execution_order})`);
    });
    
    // Test 6: Collections Summary View
    console.log('\n📈 Test 6: Collections Summary');
    const [summary] = await connection.execute(`
      SELECT 
        collection_status,
        priority,
        account_count,
        total_balance,
        aging_30,
        aging_60,
        aging_90,
        aging_120_plus
      FROM collections_summary
      ORDER BY total_balance DESC
    `);
    
    console.log('Collections Summary by Status and Priority:');
    summary.forEach(row => {
      console.log(`  • ${row.collection_status}/${row.priority}: ${row.account_count} accounts, $${row.total_balance}`);
    });
    
    // Test 7: Payment Plan Summary View
    console.log('\n💰 Test 7: Payment Plan Summary');
    const [planSummary] = await connection.execute(`
      SELECT 
        status,
        plan_count,
        total_planned,
        total_remaining,
        avg_monthly_payment,
        auto_pay_count
      FROM payment_plan_summary
    `);
    
    console.log('Payment Plan Summary by Status:');
    planSummary.forEach(row => {
      console.log(`  • ${row.status}: ${row.plan_count} plans, $${row.total_remaining} remaining`);
    });
    
    // Test 8: Aging Analysis
    console.log('\n📊 Test 8: Aging Analysis');
    const [aging] = await connection.execute(`
      SELECT 
        SUM(aging_0_30) as aging_30_total,
        SUM(aging_31_60) as aging_60_total,
        SUM(aging_61_90) as aging_90_total,
        SUM(aging_91_plus) as aging_120_plus_total,
        COUNT(*) as total_accounts,
        SUM(total_balance) as grand_total
      FROM patient_accounts
      WHERE total_balance > 0
    `);
    
    if (aging.length > 0) {
      const data = aging[0];
      console.log('Aging Distribution:');
      console.log(`  • 0-30 days: $${data.aging_30_total || 0}`);
      console.log(`  • 31-60 days: $${data.aging_60_total || 0}`);
      console.log(`  • 61-90 days: $${data.aging_90_total || 0}`);
      console.log(`  • 90+ days: $${data.aging_120_plus_total || 0}`);
      console.log(`  • Total: ${data.total_accounts} accounts, $${data.grand_total}`);
    }
    
    // Test 9: Collection Performance Metrics
    console.log('\n📈 Test 9: Collection Performance Metrics');
    
    // Calculate collection rate (resolved vs total)
    const [performance] = await connection.execute(`
      SELECT 
        collection_status,
        COUNT(*) as count,
        SUM(total_balance) as balance
      FROM patient_accounts
      GROUP BY collection_status
    `);
    
    console.log('Collection Status Distribution:');
    let totalAccounts = 0;
    let resolvedAccounts = 0;
    performance.forEach(row => {
      console.log(`  • ${row.collection_status}: ${row.count} accounts ($${row.balance})`);
      totalAccounts += row.count;
      if (row.collection_status === 'resolved') {
        resolvedAccounts += row.count;
      }
    });
    
    const collectionRate = totalAccounts > 0 ? ((resolvedAccounts / totalAccounts) * 100).toFixed(1) : 0;
    console.log(`Collection Rate: ${collectionRate}%`);
    
    // Test 10: Recent Activity Trends
    console.log('\n📞 Test 10: Recent Activity Trends (Last 30 days)');
    const [activityTrends] = await connection.execute(`
      SELECT 
        activity_type,
        outcome,
        COUNT(*) as count
      FROM collection_activities
      WHERE activity_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY activity_type, outcome
      ORDER BY count DESC
    `);
    
    console.log('Recent Collection Activity:');
    activityTrends.forEach(trend => {
      console.log(`  • ${trend.activity_type} (${trend.outcome}): ${trend.count} times`);
    });
    
    // Test 11: Stored Procedure Test
    console.log('\n⚙️ Test 11: Testing Stored Procedures');
    
    try {
      // Test ProcessCollectionRules procedure
      await connection.execute('CALL ProcessCollectionRules()');
      console.log('✅ ProcessCollectionRules procedure executed successfully');
      
      // Check if any tasks were created
      const [tasks] = await connection.execute(`
        SELECT COUNT(*) as task_count 
        FROM collection_tasks 
        WHERE created_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `);
      console.log(`📋 Created ${tasks[0].task_count} new collection tasks`);
      
    } catch (error) {
      console.log('⚠️ Stored procedure test failed:', error.message);
    }
    
    console.log('\n🎉 Collections System Testing Completed!');
    console.log('\n📋 Test Results Summary:');
    console.log(`   • Patient Accounts: ${accounts.length} with balances`);
    console.log(`   • Active Payment Plans: ${paymentPlans.length}`);
    console.log(`   • Collection Activities: ${activities.length} recent`);
    console.log(`   • Letter Templates: ${templates.length} active`);
    console.log(`   • Collection Rules: ${rules.length} active`);
    console.log(`   • Collection Rate: ${collectionRate}%`);
    
  } catch (error) {
    console.error('❌ Error testing collections system:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Test API simulation (mock data)
async function testAPISimulation() {
  console.log('\n🔗 API Simulation Test');
  
  const mockPatientAccounts = [
    {
      id: 1,
      patientId: 1001,
      patientName: 'John Smith',
      totalBalance: 1250.00,
      aging30: 300.00,
      aging60: 450.00,
      aging90: 250.00,
      aging120Plus: 250.00,
      collectionStatus: 'active',
      priority: 'high'
    },
    {
      id: 2,
      patientId: 1002,
      patientName: 'Mary Davis',
      totalBalance: 850.00,
      aging30: 850.00,
      aging60: 0.00,
      aging90: 0.00,
      aging120Plus: 0.00,
      collectionStatus: 'new',
      priority: 'medium'
    }
  ];
  
  console.log('Mock API Response - Patient Accounts:');
  console.log(JSON.stringify(mockPatientAccounts, null, 2));
  
  const mockPaymentPlan = {
    patientId: 1001,
    totalAmount: 1250.00,
    monthlyPayment: 150.00,
    startDate: '2024-02-01',
    autoPayEnabled: true,
    notes: 'Patient requested payment plan due to financial hardship'
  };
  
  console.log('\nMock API Request - Create Payment Plan:');
  console.log(JSON.stringify(mockPaymentPlan, null, 2));
  
  const mockActivity = {
    patientId: 1001,
    activityType: 'phone_call',
    description: 'Called patient regarding overdue balance of $1,250',
    outcome: 'promised_payment',
    nextAction: 'phone_call',
    nextActionDate: '2024-02-15',
    notes: 'Patient promised to pay $200 by end of week'
  };
  
  console.log('\nMock API Request - Log Collection Activity:');
  console.log(JSON.stringify(mockActivity, null, 2));
}

// Run tests
if (require.main === module) {
  testCollectionsSystem()
    .then(() => testAPISimulation())
    .then(() => {
      console.log('\n✅ All collections system tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testCollectionsSystem };