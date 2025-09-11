const mysql = require('mysql2/promise');

async function testDashboardData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Testing dashboard data query...');
    
    // Simulate the dashboard query from unifiedRCMService.js
    const dashboardQuery = `
      SELECT 
        -- Claims summary
        COUNT(*) as total_claims,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_claims,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_claims,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_claims,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_claims,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_claims,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_claims,
        
        -- Financial summary
        SUM(total_amount) as total_billed,
        SUM(CASE WHEN status IN ('paid', 'partial') THEN total_amount ELSE 0 END) as total_collected,
        AVG(total_amount) as avg_claim_amount,
        
        -- A/R Aging (optimized with single pass)
        SUM(CASE 
          WHEN status IN ('submitted', 'pending', 'denied') AND DATEDIFF(CURDATE(), service_date) <= 30 
          THEN total_amount ELSE 0 
        END) as aging_0_30,
        SUM(CASE 
          WHEN status IN ('submitted', 'pending', 'denied') AND DATEDIFF(CURDATE(), service_date) BETWEEN 31 AND 60 
          THEN total_amount ELSE 0 
        END) as aging_31_60,
        SUM(CASE 
          WHEN status IN ('submitted', 'pending', 'denied') AND DATEDIFF(CURDATE(), service_date) BETWEEN 61 AND 90 
          THEN total_amount ELSE 0 
        END) as aging_61_90,
        SUM(CASE 
          WHEN status IN ('submitted', 'pending', 'denied') AND DATEDIFF(CURDATE(), service_date) > 90 
          THEN total_amount ELSE 0 
        END) as aging_90_plus,
        
        -- Denial analytics
        SUM(CASE WHEN status = 'denied' THEN total_amount ELSE 0 END) as denied_amount,
        AVG(CASE WHEN status = 'denied' THEN total_amount ELSE NULL END) as avg_denial_amount
        
      FROM billings 
      WHERE created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    const [dashboardData] = await connection.execute(dashboardQuery);
    const data = dashboardData[0];
    
    console.log('📊 Raw dashboard data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Format the data like the service does
    const formatCurrency = (amount) => {
      if (amount === null || amount === undefined || amount === '') {
        return '$0.00';
      }
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numericAmount)) {
        return '$0.00';
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numericAmount);
    };
    
    const formattedData = {
      summary: {
        totalClaims: data.total_claims || 0,
        totalBilled: formatCurrency(data.total_billed || 0),
        totalCollected: formatCurrency(data.total_collected || 0),
        avgClaimAmount: formatCurrency(data.avg_claim_amount || 0)
      },
      arAging: {
        aging_0_30: formatCurrency(data.aging_0_30 || 0),
        aging_31_60: formatCurrency(data.aging_31_60 || 0),
        aging_61_90: formatCurrency(data.aging_61_90 || 0),
        aging_90_plus: formatCurrency(data.aging_90_plus || 0)
      },
      claimsBreakdown: {
        draft: data.draft_claims || 0,
        submitted: data.submitted_claims || 0,
        paid: data.paid_claims || 0,
        denied: data.denied_claims || 0,
        pending: data.pending_claims || 0,
        partial: data.partial_claims || 0
      }
    };
    
    console.log('\n💰 Formatted dashboard data:');
    console.log(JSON.stringify(formattedData, null, 2));
    
    // Test the frontend parsing
    console.log('\n🧪 Testing frontend parsing:');
    const agingData = [
      { name: '0-30 Days', value: parseFloat((formattedData.arAging.aging_0_30 || '$0.00').replace(/[$,]/g, '')) || 0 },
      { name: '31-60 Days', value: parseFloat((formattedData.arAging.aging_31_60 || '$0.00').replace(/[$,]/g, '')) || 0 },
      { name: '61-90 Days', value: parseFloat((formattedData.arAging.aging_61_90 || '$0.00').replace(/[$,]/g, '')) || 0 },
      { name: '90+ Days', value: parseFloat((formattedData.arAging.aging_90_plus || '$0.00').replace(/[$,]/g, '')) || 0 }
    ];
    
    console.log('Aging data for charts:', agingData);
    
    // Check for any NaN values
    const hasNaN = agingData.some(item => isNaN(item.value));
    console.log(`Has NaN values: ${hasNaN}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testDashboardData();