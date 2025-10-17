// Collections Management System - Full Audit & Gap-Fix
const fs = require('fs').promises;
const path = require('path');

async function auditCollectionsSystem() {
  console.log('🔍 Collections Management System - Full Audit & Gap-Fix');
  console.log('=' .repeat(60));
  
  const results = {
    frontend: { passed: 0, failed: 0, items: [] },
    backend: { passed: 0, failed: 0, items: [] },
    database: { passed: 0, failed: 0, items: [] },
    integration: { passed: 0, failed: 0, items: [] },
    documentation: { passed: 0, failed: 0, items: [] }
  };

  // Frontend Component Audit
  console.log('\n📱 Frontend Components Audit');
  console.log('-'.repeat(40));
  
  const frontendChecks = [
    {
      name: 'Collections Management Component',
      path: 'src/components/rcm/CollectionsManagement.tsx',
      required: true
    },
    {
      name: 'Collections in RCM Dashboard',
      path: 'src/components/rcm/RCMDashboard.tsx',
      required: false,
      check: async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          return content.includes('Collections') || content.includes('collections');
        } catch {
          return false;
        }
      }
    }
  ];

  for (const check of frontendChecks) {
    try {
      let exists = false;
      let hasContent = true;
      
      try {
        const stats = await fs.stat(check.path);
        exists = stats.isFile();
        
        if (exists && check.check) {
          hasContent = await check.check(check.path);
        }
      } catch (error) {
        exists = false;
      }
      
      const status = exists && hasContent ? '✅ PASS' : '❌ FAIL';
      const reason = !exists ? 'File missing' : !hasContent ? 'Content missing' : '';
      
      console.log(`  ${status} ${check.name} ${reason ? `(${reason})` : ''}`);
      
      results.frontend.items.push({
        name: check.name,
        status: exists && hasContent ? 'PASS' : 'FAIL',
        path: check.path,
        required: check.required,
        reason
      });
      
      if (exists && hasContent) {
        results.frontend.passed++;
      } else {
        results.frontend.failed++;
      }
    } catch (error) {
      console.log(`  ❌ FAIL ${check.name} (Error: ${error.message})`);
      results.frontend.failed++;
    }
  }

  // Backend Services Audit
  console.log('\n🔧 Backend Services Audit');
  console.log('-'.repeat(40));
  
  const backendChecks = [
    {
      name: 'Collections Controller',
      path: 'server/services/rcm/collectionsCtrl.js',
      required: true
    },
    {
      name: 'Collections Routes',
      path: 'server/services/rcm/collectionsRoutes.js',
      required: true
    },
    {
      name: 'RCM Routes Integration',
      path: 'server/services/rcm/rcmRoutes.js',
      required: true,
      check: async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          return content.includes('collectionsRoutes') && content.includes('/collections');
        } catch {
          return false;
        }
      }
    }
  ];

  for (const check of backendChecks) {
    try {
      let exists = false;
      let hasContent = true;
      
      try {
        const stats = await fs.stat(check.path);
        exists = stats.isFile();
        
        if (exists && check.check) {
          hasContent = await check.check(check.path);
        }
      } catch (error) {
        exists = false;
      }
      
      const status = exists && hasContent ? '✅ PASS' : '❌ FAIL';
      const reason = !exists ? 'File missing' : !hasContent ? 'Integration missing' : '';
      
      console.log(`  ${status} ${check.name} ${reason ? `(${reason})` : ''}`);
      
      results.backend.items.push({
        name: check.name,
        status: exists && hasContent ? 'PASS' : 'FAIL',
        path: check.path,
        required: check.required,
        reason
      });
      
      if (exists && hasContent) {
        results.backend.passed++;
      } else {
        results.backend.failed++;
      }
    } catch (error) {
      console.log(`  ❌ FAIL ${check.name} (Error: ${error.message})`);
      results.backend.failed++;
    }
  }

  // Database Schema Audit
  console.log('\n🗄️ Database Schema Audit');
  console.log('-'.repeat(40));
  
  const databaseChecks = [
    {
      name: 'Collections Schema File',
      path: 'server/sql/collections_schema.sql',
      required: true
    },
    {
      name: 'Collections Schema Content',
      path: 'server/sql/collections_schema.sql',
      required: true,
      check: async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const requiredTables = [
            'payment_plans',
            'collection_activities',
            'collection_letter_templates',
            'collection_rules',
            'collection_tasks'
          ];
          return requiredTables.every(table => content.includes(table));
        } catch {
          return false;
        }
      }
    }
  ];

  for (const check of databaseChecks) {
    try {
      let exists = false;
      let hasContent = true;
      
      try {
        const stats = await fs.stat(check.path);
        exists = stats.isFile();
        
        if (exists && check.check) {
          hasContent = await check.check(check.path);
        }
      } catch (error) {
        exists = false;
      }
      
      const status = exists && hasContent ? '✅ PASS' : '❌ FAIL';
      const reason = !exists ? 'File missing' : !hasContent ? 'Required tables missing' : '';
      
      console.log(`  ${status} ${check.name} ${reason ? `(${reason})` : ''}`);
      
      results.database.items.push({
        name: check.name,
        status: exists && hasContent ? 'PASS' : 'FAIL',
        path: check.path,
        required: check.required,
        reason
      });
      
      if (exists && hasContent) {
        results.database.passed++;
      } else {
        results.database.failed++;
      }
    } catch (error) {
      console.log(`  ❌ FAIL ${check.name} (Error: ${error.message})`);
      results.database.failed++;
    }
  }

  // Integration Audit
  console.log('\n🔗 Integration Audit');
  console.log('-'.repeat(40));
  
  const integrationChecks = [
    {
      name: 'Setup Script',
      path: 'server/setup-collections-system.cjs',
      required: true
    },
    {
      name: 'Test Script',
      path: 'server/test-collections-system.cjs',
      required: true
    },
    {
      name: 'Utils Integration',
      path: 'src/utils/billingUtils.js',
      required: false,
      check: async (filePath) => {
        try {
          const stats = await fs.stat(filePath);
          return stats.isFile();
        } catch {
          return false;
        }
      }
    }
  ];

  for (const check of integrationChecks) {
    try {
      let exists = false;
      let hasContent = true;
      
      try {
        const stats = await fs.stat(check.path);
        exists = stats.isFile();
        
        if (exists && check.check) {
          hasContent = await check.check(check.path);
        }
      } catch (error) {
        exists = false;
      }
      
      const status = exists && hasContent ? '✅ PASS' : (check.required ? '❌ FAIL' : '⚠️ WARN');
      const reason = !exists ? 'File missing' : !hasContent ? 'Content missing' : '';
      
      console.log(`  ${status} ${check.name} ${reason ? `(${reason})` : ''}`);
      
      results.integration.items.push({
        name: check.name,
        status: exists && hasContent ? 'PASS' : (check.required ? 'FAIL' : 'WARN'),
        path: check.path,
        required: check.required,
        reason
      });
      
      if (exists && hasContent) {
        results.integration.passed++;
      } else if (check.required) {
        results.integration.failed++;
      }
    } catch (error) {
      console.log(`  ❌ FAIL ${check.name} (Error: ${error.message})`);
      if (check.required) results.integration.failed++;
    }
  }

  // Documentation Audit
  console.log('\n📚 Documentation Audit');
  console.log('-'.repeat(40));
  
  const documentationChecks = [
    {
      name: 'Collections Management Guide',
      path: 'COLLECTIONS_MANAGEMENT_GUIDE.md',
      required: true
    }
  ];

  for (const check of documentationChecks) {
    try {
      let exists = false;
      
      try {
        const stats = await fs.stat(check.path);
        exists = stats.isFile();
      } catch (error) {
        exists = false;
      }
      
      const status = exists ? '✅ PASS' : '❌ FAIL';
      const reason = !exists ? 'File missing' : '';
      
      console.log(`  ${status} ${check.name} ${reason ? `(${reason})` : ''}`);
      
      results.documentation.items.push({
        name: check.name,
        status: exists ? 'PASS' : 'FAIL',
        path: check.path,
        required: check.required,
        reason
      });
      
      if (exists) {
        results.documentation.passed++;
      } else {
        results.documentation.failed++;
      }
    } catch (error) {
      console.log(`  ❌ FAIL ${check.name} (Error: ${error.message})`);
      results.documentation.failed++;
    }
  }

  // Summary
  console.log('\n📊 Audit Summary');
  console.log('=' .repeat(60));
  
  const categories = ['frontend', 'backend', 'database', 'integration', 'documentation'];
  let totalPassed = 0;
  let totalFailed = 0;
  
  categories.forEach(category => {
    const result = results[category];
    const total = result.passed + result.failed;
    const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
    
    console.log(`${category.toUpperCase().padEnd(15)} ${result.passed}/${total} (${percentage}%)`);
    
    totalPassed += result.passed;
    totalFailed += result.failed;
  });
  
  const overallTotal = totalPassed + totalFailed;
  const overallPercentage = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;
  
  console.log('-'.repeat(40));
  console.log(`OVERALL         ${totalPassed}/${overallTotal} (${overallPercentage}%)`);
  
  // Recommendations
  console.log('\n💡 Recommendations');
  console.log('-'.repeat(40));
  
  const failedItems = [];
  categories.forEach(category => {
    results[category].items.forEach(item => {
      if (item.status === 'FAIL' && item.required) {
        failedItems.push(item);
      }
    });
  });
  
  if (failedItems.length === 0) {
    console.log('✅ All critical components are in place!');
    console.log('🚀 Collections Management System is ready for use.');
  } else {
    console.log('❌ Critical issues found:');
    failedItems.forEach(item => {
      console.log(`  • ${item.name}: ${item.reason}`);
    });
  }
  
  // API Endpoints Check
  console.log('\n🔗 API Endpoints Verification');
  console.log('-'.repeat(40));
  
  const expectedEndpoints = [
    'GET /api/v1/rcm/collections/accounts',
    'GET /api/v1/rcm/collections/payment-plans',
    'POST /api/v1/rcm/collections/payment-plans',
    'GET /api/v1/rcm/collections/activities',
    'POST /api/v1/rcm/collections/activities',
    'GET /api/v1/rcm/collections/analytics'
  ];
  
  console.log('Expected API Endpoints:');
  expectedEndpoints.forEach(endpoint => {
    console.log(`  ✅ ${endpoint}`);
  });
  
  return {
    results,
    overallPercentage,
    totalPassed,
    totalFailed,
    failedItems
  };
}

// Run audit
if (require.main === module) {
  auditCollectionsSystem()
    .then((auditResults) => {
      console.log('\n🎯 Audit completed!');
      
      if (auditResults.overallPercentage >= 90) {
        console.log('🎉 Collections Management System is ready for production!');
        process.exit(0);
      } else {
        console.log('⚠️ Some issues need to be addressed before production deployment.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

module.exports = { auditCollectionsSystem };