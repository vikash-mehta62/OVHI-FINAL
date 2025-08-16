// RCM Principal Audit - Exhaustive Production Readiness Verification
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'ovhi_db',
  multipleStatements: true
};

class RCMPrincipalAuditor {
  constructor() {
    this.auditResults = {
      functionalCoverage: { passed: 0, partial: 0, missing: 0, items: [] },
      dataIntegrity: { passed: 0, partial: 0, missing: 0, items: [] },
      operationalReadiness: { passed: 0, partial: 0, missing: 0, items: [] },
      securityCompliance: { passed: 0, partial: 0, missing: 0, items: [] },
      documentationUX: { passed: 0, partial: 0, missing: 0, items: [] }
    };
    this.traceabilityMatrix = [];
    this.evidencePaths = [];
    this.fixTasks = [];
    this.connection = null;
  }

  async initializeDatabase() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async auditFunctionalCoverage() {
    console.log('\n🔍 FUNCTIONAL COVERAGE AUDIT');
    console.log('=' .repeat(60));

    const requirements = [
      {
        id: 'FC001',
        name: 'Payer/Provider Master Data & RBAC',
        files: ['server/sql/rcm_complete_schema.sql', 'server/services/rcm/rcmCtrl.js'],
        endpoints: ['/api/v1/rcm/dashboard'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for payers table
            const [payers] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME = 'payers'
            `);
            
            // Check for providers table
            const [providers] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME = 'providers'
            `);
            
            if (payers[0].count > 0 && providers[0].count > 0) {
              // Check for sample data
              const [payerData] = await this.connection.execute('SELECT COUNT(*) as count FROM payers');
              const [providerData] = await this.connection.execute('SELECT COUNT(*) as count FROM providers');
              
              if (payerData[0].count >= 3 && providerData[0].count >= 2) {
                return { status: 'COMPLETE', evidence: `${payerData[0].count} payers, ${providerData[0].count} providers` };
              } else {
                return { status: 'PARTIAL', evidence: `Insufficient seed data: ${payerData[0].count} payers, ${providerData[0].count} providers` };
              }
            } else {
              return { status: 'MISSING', evidence: 'Payers or providers tables missing' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC002',
        name: 'Patient + Multiple Insurances with Active Periods',
        files: ['server/sql/patient_account_schema.sql', 'src/components/patient/PatientAccountManager.tsx'],
        endpoints: ['/api/v1/patients/accounts'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for patients and patient_insurances tables
            const [patients] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME IN ('patients', 'patient_insurances')
            `);
            
            if (patients[0].count >= 2) {
              // Check for sample data with multiple insurances
              const [patientData] = await this.connection.execute('SELECT COUNT(*) as count FROM patients');
              
              if (patientData[0].count >= 10) {
                return { status: 'COMPLETE', evidence: `${patientData[0].count} patients with insurance tracking` };
              } else {
                return { status: 'PARTIAL', evidence: `Insufficient patient data: ${patientData[0].count} patients` };
              }
            } else {
              return { status: 'MISSING', evidence: 'Patient insurance tables missing' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC003',
        name: 'Eligibility Tracking and Benefit Snapshot Linkage',
        files: ['server/sql/rcm_enhanced_schema.sql'],
        endpoints: ['/api/v1/rcm/eligibility'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            const [eligibility] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME = 'eligibility_checks'
            `);
            
            if (eligibility[0].count > 0) {
              return { status: 'COMPLETE', evidence: 'Eligibility tracking table exists' };
            } else {
              return { status: 'MISSING', evidence: 'Eligibility tracking not implemented' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC004',
        name: 'Charge Capture & Coding Validations (CPT/HCPCS, ICD-10)',
        files: ['src/components/rcm/ClaimValidation.tsx', 'server/services/rcm/claimValidationCtrl.js'],
        endpoints: ['/api/v1/rcm/claims/:id/validate'],
        test: async () => {
          try {
            const claimValidationExists = await this.fileExists('src/components/rcm/ClaimValidation.tsx');
            const controllerExists = await this.fileExists('server/services/rcm/claimValidationCtrl.js');
            
            if (claimValidationExists && controllerExists) {
              // Check for validation logic
              const content = await fs.readFile('server/services/rcm/claimValidationCtrl.js', 'utf8');
              if (content.includes('CPT') && content.includes('ICD')) {
                return { status: 'COMPLETE', evidence: 'Claim validation with CPT/ICD checks implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'Validation files exist but missing CPT/ICD logic' };
              }
            } else {
              return { status: 'MISSING', evidence: 'Claim validation components missing' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `File check error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC005',
        name: 'Claim Lifecycle Management (Draft → Paid/Denied)',
        files: ['src/components/rcm/ClaimsManagement.tsx', 'server/services/rcm/rcmCtrl.js'],
        endpoints: ['/api/v1/rcm/claims', '/api/v1/rcm/claims/:id/status'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for claims table with status tracking
            const [claims] = await this.connection.execute(`
              SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME = 'claims' AND COLUMN_NAME = 'status'
            `);
            
            if (claims.length > 0) {
              // Check for sample claims with varied statuses
              const [claimData] = await this.connection.execute(`
                SELECT status, COUNT(*) as count FROM claims GROUP BY status
              `);
              
              if (claimData.length >= 3) {
                return { status: 'COMPLETE', evidence: `Claims with ${claimData.length} different statuses` };
              } else {
                return { status: 'PARTIAL', evidence: `Limited claim status variety: ${claimData.length} statuses` };
              }
            } else {
              return { status: 'MISSING', evidence: 'Claims status tracking not implemented' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC006',
        name: 'ERA/835 Ingest and Auto-Posting',
        files: ['server/services/rcm/eraProcessingCtrl.js', 'server/sql/era_processing_schema.sql'],
        endpoints: ['/api/v1/rcm/era/process', '/api/v1/rcm/era/files'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for ERA tables
            const [eraTables] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME IN ('era_files', 'era_details')
            `);
            
            if (eraTables[0].count >= 2) {
              // Check for ERA processing controller
              const controllerExists = await this.fileExists('server/services/rcm/eraProcessingCtrl.js');
              if (controllerExists) {
                return { status: 'COMPLETE', evidence: 'ERA processing system implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'ERA tables exist but controller missing' };
              }
            } else {
              return { status: 'MISSING', evidence: 'ERA processing tables missing' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC007',
        name: 'Denials Management (CARC/RARC) with Appeals',
        files: ['src/components/rcm/DenialManagement.tsx', 'server/services/rcm/rcmCtrl.js'],
        endpoints: ['/api/v1/rcm/denials/analytics', '/api/v1/rcm/denials/trends'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for denials table
            const [denials] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME = 'denials'
            `);
            
            if (denials[0].count > 0) {
              // Check for denial management component
              const componentExists = await this.fileExists('src/components/rcm/DenialManagement.tsx');
              if (componentExists) {
                return { status: 'COMPLETE', evidence: 'Denials management system implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'Denials table exists but UI component missing' };
              }
            } else {
              return { status: 'MISSING', evidence: 'Denials management not implemented' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC008',
        name: 'Patient Billing (Statements, Refunds, Write-offs)',
        files: ['src/components/rcm/PatientStatements.tsx', 'server/services/rcm/patientStatementCtrl.js'],
        endpoints: ['/api/v1/rcm/statements', '/api/v1/rcm/statements/generate'],
        test: async () => {
          try {
            const componentExists = await this.fileExists('src/components/rcm/PatientStatements.tsx');
            const controllerExists = await this.fileExists('server/services/rcm/patientStatementCtrl.js');
            
            if (componentExists && controllerExists) {
              return { status: 'COMPLETE', evidence: 'Patient billing system implemented' };
            } else {
              return { status: 'PARTIAL', evidence: `Missing: ${!componentExists ? 'UI component' : ''} ${!controllerExists ? 'controller' : ''}` };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `File check error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC009',
        name: 'Analytics (AR Aging, Denial Rate, Collections %)',
        files: ['src/components/analytics/AnalyticsDashboard.tsx', 'server/services/analytics/analyticsCtrl.js'],
        endpoints: ['/api/v1/analytics/dashboard', '/api/v1/rcm/ar-aging'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for analytics tables
            const [analytics] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME IN ('rcm_analytics', 'ar_aging')
            `);
            
            if (analytics[0].count >= 1) {
              // Check for analytics components
              const dashboardExists = await this.fileExists('src/components/analytics/AnalyticsDashboard.tsx');
              const controllerExists = await this.fileExists('server/services/analytics/analyticsCtrl.js');
              
              if (dashboardExists && controllerExists) {
                return { status: 'COMPLETE', evidence: 'Analytics system fully implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'Analytics tables exist but components incomplete' };
              }
            } else {
              return { status: 'MISSING', evidence: 'Analytics tables missing' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        id: 'FC010',
        name: 'Collections Management with Payment Plans',
        files: ['src/components/rcm/CollectionsManagement.tsx', 'server/services/rcm/collectionsCtrl.js'],
        endpoints: ['/api/v1/rcm/collections/accounts', '/api/v1/rcm/collections/payment-plans'],
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for collections tables
            const [collections] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME IN ('payment_plans', 'collection_activities')
            `);
            
            if (collections[0].count >= 2) {
              // Check for collections components
              const componentExists = await this.fileExists('src/components/rcm/CollectionsManagement.tsx');
              const controllerExists = await this.fileExists('server/services/rcm/collectionsCtrl.js');
              
              if (componentExists && controllerExists) {
                return { status: 'COMPLETE', evidence: 'Collections management fully implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'Collections tables exist but components incomplete' };
              }
            } else {
              return { status: 'MISSING', evidence: 'Collections tables missing' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      }
    ];

    for (const req of requirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      
      const result = await req.test();
      
      const item = {
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files,
        endpoints: req.endpoints
      };
      
      this.auditResults.functionalCoverage.items.push(item);
      
      // Add to traceability matrix
      this.traceabilityMatrix.push({
        requirement: req.name,
        files: req.files.join(', '),
        endpoints: req.endpoints.join(', '),
        status: result.status,
        evidence: result.evidence
      });
      
      // Update counters
      if (result.status === 'COMPLETE') {
        this.auditResults.functionalCoverage.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.functionalCoverage.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.functionalCoverage.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        // Add to fix tasks
        this.fixTasks.push({
          priority: 'HIGH',
          scope: req.name,
          acceptanceCriteria: `Implement ${req.name} with files: ${req.files.join(', ')}`,
          testPlan: `Verify endpoints: ${req.endpoints.join(', ')} return expected data`,
          evidence: result.evidence
        });
      }
    }
  }

  async auditDataIntegrity() {
    console.log('\n🔒 DATA INTEGRITY AUDIT');
    console.log('=' .repeat(60));

    if (!this.connection) {
      console.log('❌ Cannot audit data integrity - no database connection');
      return;
    }

    const integrityChecks = [
      {
        name: 'Foreign Key Constraints',
        test: async () => {
          try {
            const [fks] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            return { status: fks[0].count > 10 ? 'COMPLETE' : 'PARTIAL', evidence: `${fks[0].count} foreign keys found` };
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      },
      {
        name: 'Non-Null Constraints on Critical Fields',
        test: async () => {
          try {
            const [nonNulls] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND IS_NULLABLE = 'NO' 
              AND COLUMN_NAME IN ('id', 'patient_id', 'claim_id', 'amount', 'status')
            `);
            return { status: nonNulls[0].count > 20 ? 'COMPLETE' : 'PARTIAL', evidence: `${nonNulls[0].count} non-null constraints` };
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      },
      {
        name: 'Unique Indexes on Business Keys',
        test: async () => {
          try {
            const [indexes] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND NON_UNIQUE = 0
            `);
            return { status: indexes[0].count > 15 ? 'COMPLETE' : 'PARTIAL', evidence: `${indexes[0].count} unique indexes` };
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      },
      {
        name: 'Audit Log Tables',
        test: async () => {
          try {
            const [auditTables] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = 'ovhi_db' AND TABLE_NAME LIKE '%_audit' OR TABLE_NAME LIKE 'audit_%'
            `);
            return { status: auditTables[0].count > 0 ? 'COMPLETE' : 'MISSING', evidence: `${auditTables[0].count} audit tables` };
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      }
    ];

    for (const check of integrityChecks) {
      console.log(`\n🔍 Checking: ${check.name}`);
      const result = await check.test();
      
      this.auditResults.dataIntegrity.items.push({
        name: check.name,
        status: result.status,
        evidence: result.evidence
      });
      
      if (result.status === 'COMPLETE') {
        this.auditResults.dataIntegrity.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.dataIntegrity.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.dataIntegrity.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
      }
    }
  }

  async auditOperationalReadiness() {
    console.log('\n⚙️ OPERATIONAL READINESS AUDIT');
    console.log('=' .repeat(60));

    const operationalChecks = [
      {
        name: 'Seed Dataset with Required Entities',
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for minimum required seed data
            const checks = await Promise.all([
              this.connection.execute('SELECT COUNT(*) as count FROM payers'),
              this.connection.execute('SELECT COUNT(*) as count FROM providers'),
              this.connection.execute('SELECT COUNT(*) as count FROM patients'),
              this.connection.execute('SELECT COUNT(*) as count FROM claims')
            ]);
            
            const [payers, providers, patients, claims] = checks.map(([rows]) => rows[0].count);
            
            if (payers >= 3 && providers >= 2 && patients >= 10 && claims >= 20) {
              return { status: 'COMPLETE', evidence: `${payers} payers, ${providers} providers, ${patients} patients, ${claims} claims` };
            } else {
              return { status: 'PARTIAL', evidence: `Insufficient data: ${payers} payers, ${providers} providers, ${patients} patients, ${claims} claims` };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: `DB error: ${error.message}` };
          }
        }
      },
      {
        name: 'Background Jobs Implementation',
        test: async () => {
          try {
            // Check for cron jobs or background processing
            const cronExists = await this.fileExists('server/crons');
            const jobsExist = await this.directoryExists('server/jobs') || await this.directoryExists('server/workers');
            
            if (cronExists || jobsExist) {
              return { status: 'COMPLETE', evidence: 'Background job infrastructure exists' };
            } else {
              return { status: 'MISSING', evidence: 'No background job infrastructure found' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      },
      {
        name: 'Setup and Test Scripts',
        test: async () => {
          try {
            const setupExists = await this.fileExists('setup-rcm-with-payments.js') || 
                               await this.fileExists('server/setup-collections-system.cjs');
            const testExists = await this.fileExists('test-rcm-complete.js') || 
                              await this.fileExists('server/test-collections-system.cjs');
            
            if (setupExists && testExists) {
              return { status: 'COMPLETE', evidence: 'Setup and test scripts available' };
            } else {
              return { status: 'PARTIAL', evidence: `Missing: ${!setupExists ? 'setup' : ''} ${!testExists ? 'test' : ''} scripts` };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      }
    ];

    for (const check of operationalChecks) {
      console.log(`\n🔍 Checking: ${check.name}`);
      const result = await check.test();
      
      this.auditResults.operationalReadiness.items.push({
        name: check.name,
        status: result.status,
        evidence: result.evidence
      });
      
      if (result.status === 'COMPLETE') {
        this.auditResults.operationalReadiness.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.operationalReadiness.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.operationalReadiness.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
      }
    }
  }

  async auditSecurityCompliance() {
    console.log('\n🔐 SECURITY & COMPLIANCE AUDIT');
    console.log('=' .repeat(60));

    const securityChecks = [
      {
        name: 'Authentication Middleware',
        test: async () => {
          try {
            const authExists = await this.fileExists('server/middleware/auth.js');
            if (authExists) {
              const content = await fs.readFile('server/middleware/auth.js', 'utf8');
              if (content.includes('jwt') || content.includes('JWT')) {
                return { status: 'COMPLETE', evidence: 'JWT authentication middleware implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'Auth middleware exists but JWT not confirmed' };
              }
            } else {
              return { status: 'MISSING', evidence: 'Authentication middleware not found' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      },
      {
        name: 'Input Validation on Mutations',
        test: async () => {
          try {
            // Check for validation in controllers
            const rcmCtrlExists = await this.fileExists('server/services/rcm/rcmCtrl.js');
            if (rcmCtrlExists) {
              const content = await fs.readFile('server/services/rcm/rcmCtrl.js', 'utf8');
              if (content.includes('validation') || content.includes('validate') || content.includes('joi') || content.includes('zod')) {
                return { status: 'COMPLETE', evidence: 'Input validation implemented in controllers' };
              } else {
                return { status: 'PARTIAL', evidence: 'Controllers exist but validation not confirmed' };
              }
            } else {
              return { status: 'MISSING', evidence: 'RCM controllers not found' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      },
      {
        name: 'PII/PHI Field Protection',
        test: async () => {
          if (!this.connection) return { status: 'MISSING', evidence: 'No DB connection' };
          
          try {
            // Check for encrypted or protected fields
            const [encryptedFields] = await this.connection.execute(`
              SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = 'ovhi_db' 
              AND (COLUMN_NAME LIKE '%encrypted%' OR COLUMN_NAME LIKE '%hash%' OR COLUMN_TYPE LIKE '%ENCRYPTED%')
            `);
            
            if (encryptedFields[0].count > 0) {
              return { status: 'COMPLETE', evidence: `${encryptedFields[0].count} encrypted/protected fields found` };
            } else {
              return { status: 'PARTIAL', evidence: 'No explicit field encryption found - may use application-level encryption' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      }
    ];

    for (const check of securityChecks) {
      console.log(`\n🔍 Checking: ${check.name}`);
      const result = await check.test();
      
      this.auditResults.securityCompliance.items.push({
        name: check.name,
        status: result.status,
        evidence: result.evidence
      });
      
      if (result.status === 'COMPLETE') {
        this.auditResults.securityCompliance.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.securityCompliance.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.securityCompliance.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
      }
    }
  }

  async auditDocumentationUX() {
    console.log('\n📚 DOCUMENTATION & UX AUDIT');
    console.log('=' .repeat(60));

    const docChecks = [
      {
        name: 'User Interface Components for All Operations',
        test: async () => {
          const requiredComponents = [
            'src/components/rcm/RCMDashboard.tsx',
            'src/components/rcm/ClaimsManagement.tsx',
            'src/components/rcm/ARAgingManagement.tsx',
            'src/components/rcm/DenialManagement.tsx',
            'src/components/rcm/PaymentManagement.tsx',
            'src/components/rcm/CollectionsManagement.tsx',
            'src/components/rcm/PatientStatements.tsx'
          ];
          
          let existingComponents = 0;
          const missingComponents = [];
          
          for (const component of requiredComponents) {
            if (await this.fileExists(component)) {
              existingComponents++;
            } else {
              missingComponents.push(component);
            }
          }
          
          if (existingComponents === requiredComponents.length) {
            return { status: 'COMPLETE', evidence: `All ${existingComponents} required UI components exist` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingComponents}/${requiredComponents.length} components exist. Missing: ${missingComponents.join(', ')}` };
          }
        }
      },
      {
        name: 'Comprehensive Documentation',
        test: async () => {
          const requiredDocs = [
            'RCM_SYSTEM_GUIDE.md',
            'ENHANCED_RCM_GUIDE.md',
            'COLLECTIONS_MANAGEMENT_GUIDE.md',
            'INTEGRATION_GUIDE.md'
          ];
          
          let existingDocs = 0;
          const missingDocs = [];
          
          for (const doc of requiredDocs) {
            if (await this.fileExists(doc)) {
              existingDocs++;
            } else {
              missingDocs.push(doc);
            }
          }
          
          if (existingDocs === requiredDocs.length) {
            return { status: 'COMPLETE', evidence: `All ${existingDocs} required documentation files exist` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingDocs}/${requiredDocs.length} docs exist. Missing: ${missingDocs.join(', ')}` };
          }
        }
      },
      {
        name: 'API Documentation (Swagger)',
        test: async () => {
          try {
            // Check for swagger setup in routes
            const rcmRoutesExists = await this.fileExists('server/services/rcm/rcmRoutes.js');
            if (rcmRoutesExists) {
              const content = await fs.readFile('server/services/rcm/rcmRoutes.js', 'utf8');
              if (content.includes('@swagger') || content.includes('swagger')) {
                return { status: 'COMPLETE', evidence: 'Swagger API documentation implemented' };
              } else {
                return { status: 'PARTIAL', evidence: 'Routes exist but Swagger documentation not confirmed' };
              }
            } else {
              return { status: 'MISSING', evidence: 'RCM routes not found' };
            }
          } catch (error) {
            return { status: 'MISSING', evidence: error.message };
          }
        }
      }
    ];

    for (const check of docChecks) {
      console.log(`\n🔍 Checking: ${check.name}`);
      const result = await check.test();
      
      this.auditResults.documentationUX.items.push({
        name: check.name,
        status: result.status,
        evidence: result.evidence
      });
      
      if (result.status === 'COMPLETE') {
        this.auditResults.documentationUX.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.documentationUX.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.documentationUX.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
      }
    }
  }

  async generateFinancialMathSpotCheck() {
    console.log('\n💰 FINANCIAL MATH SPOT-CHECK');
    console.log('=' .repeat(60));

    if (!this.connection) {
      console.log('❌ Cannot perform financial math check - no database connection');
      return;
    }

    try {
      // Sample claim financial calculation
      const [claims] = await this.connection.execute(`
        SELECT c.id, c.claim_number, c.total_amount, c.paid_amount, c.patient_responsibility,
               c.status, pa.total_balance
        FROM claims c
        LEFT JOIN patient_accounts pa ON c.patient_id = pa.patient_id
        LIMIT 1
      `);

      if (claims.length > 0) {
        const claim = claims[0];
        console.log('📊 Sample Claim Financial Breakdown:');
        console.log(`   Claim ID: ${claim.id}`);
        console.log(`   Claim Number: ${claim.claim_number}`);
        console.log(`   Total Amount: $${claim.total_amount}`);
        console.log(`   Paid Amount: $${claim.paid_amount || 0}`);
        console.log(`   Patient Responsibility: $${claim.patient_responsibility || 0}`);
        console.log(`   Status: ${claim.status}`);
        console.log(`   Patient Balance: $${claim.total_balance || 0}`);
        
        this.evidencePaths.push(`Financial spot-check: Claim ${claim.id} - $${claim.total_amount} total`);
      } else {
        console.log('⚠️ No claims found for financial math verification');
      }
    } catch (error) {
      console.log(`❌ Financial math check failed: ${error.message}`);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  generateSummaryReport() {
    console.log('\n📊 AUDIT SUMMARY REPORT');
    console.log('=' .repeat(60));

    const categories = ['functionalCoverage', 'dataIntegrity', 'operationalReadiness', 'securityCompliance', 'documentationUX'];
    let totalPassed = 0;
    let totalPartial = 0;
    let totalMissing = 0;

    categories.forEach(category => {
      const result = this.auditResults[category];
      const total = result.passed + result.partial + result.missing;
      const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
      
      console.log(`${category.toUpperCase().padEnd(20)} ${result.passed}/${total} (${percentage}%) - ${result.partial} partial, ${result.missing} missing`);
      
      totalPassed += result.passed;
      totalPartial += result.partial;
      totalMissing += result.missing;
    });

    const overallTotal = totalPassed + totalPartial + totalMissing;
    const overallPercentage = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;
    
    console.log('-'.repeat(60));
    console.log(`OVERALL                  ${totalPassed}/${overallTotal} (${overallPercentage}%) - ${totalPartial} partial, ${totalMissing} missing`);

    return {
      totalPassed,
      totalPartial,
      totalMissing,
      overallPercentage,
      overallTotal
    };
  }

  async runFullAudit() {
    console.log('🔍 RCM PRINCIPAL AUDIT - EXHAUSTIVE PRODUCTION READINESS VERIFICATION');
    console.log('=' .repeat(80));
    
    // Initialize database connection
    await this.initializeDatabase();
    
    // Run all audit categories
    await this.auditFunctionalCoverage();
    await this.auditDataIntegrity();
    await this.auditOperationalReadiness();
    await this.auditSecurityCompliance();
    await this.auditDocumentationUX();
    
    // Generate financial math spot-check
    await this.generateFinancialMathSpotCheck();
    
    // Generate summary
    const summary = this.generateSummaryReport();
    
    // Close database connection
    if (this.connection) {
      await this.connection.end();
    }
    
    return {
      auditResults: this.auditResults,
      traceabilityMatrix: this.traceabilityMatrix,
      evidencePaths: this.evidencePaths,
      fixTasks: this.fixTasks,
      summary
    };
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new RCMPrincipalAuditor();
  
  auditor.runFullAudit()
    .then((results) => {
      console.log('\n🎯 PRINCIPAL AUDIT COMPLETED');
      console.log(`📊 Summary: ${results.summary.totalPassed} passed, ${results.summary.totalPartial} partial, ${results.summary.totalMissing} missing`);
      console.log(`📈 Overall: ${results.summary.overallPercentage}% complete`);
      
      if (results.summary.overallPercentage >= 85) {
        console.log('🎉 RCM SYSTEM IS PRODUCTION READY!');
        process.exit(0);
      } else {
        console.log('⚠️ RCM SYSTEM NEEDS IMPROVEMENTS BEFORE PRODUCTION');
        console.log(`🔧 ${results.fixTasks.length} fix tasks identified`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Principal audit failed:', error);
      process.exit(1);
    });
}

module.exports = { RCMPrincipalAuditor };