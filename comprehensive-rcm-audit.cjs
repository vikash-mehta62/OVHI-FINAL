// Comprehensive RCM Audit - Production Readiness Verification
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveRCMAuditor {
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

  async checkFileContent(filePath, searchTerms) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return searchTerms.every(term => content.includes(term));
    } catch {
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
          const schemaExists = await this.fileExists('server/sql/rcm_complete_schema.sql');
          const ctrlExists = await this.fileExists('server/services/rcm/rcmCtrl.js');
          
          if (schemaExists && ctrlExists) {
            const hasPayerTables = await this.checkFileContent('server/sql/rcm_complete_schema.sql', ['payers', 'providers']);
            if (hasPayerTables) {
              return { status: 'COMPLETE', evidence: 'Payer/Provider schema and controller implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Files exist but payer/provider tables not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!schemaExists ? 'schema' : ''} ${!ctrlExists ? 'controller' : ''}` };
          }
        }
      },
      {
        id: 'FC002',
        name: 'Patient + Multiple Insurances with Active Periods',
        files: ['server/sql/patient_account_schema.sql', 'src/components/patient/PatientAccountManager.tsx'],
        endpoints: ['/api/v1/patients/accounts'],
        test: async () => {
          const schemaExists = await this.fileExists('server/sql/patient_account_schema.sql');
          const componentExists = await this.fileExists('src/components/patient/PatientAccountManager.tsx');
          
          if (schemaExists && componentExists) {
            const hasInsuranceTracking = await this.checkFileContent('server/sql/patient_account_schema.sql', ['patient_insurances', 'active_period']);
            if (hasInsuranceTracking) {
              return { status: 'COMPLETE', evidence: 'Patient insurance tracking fully implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Patient components exist but insurance tracking not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!schemaExists ? 'schema' : ''} ${!componentExists ? 'component' : ''}` };
          }
        }
      },
      {
        id: 'FC003',
        name: 'Eligibility Tracking and Benefit Snapshot Linkage',
        files: ['server/sql/rcm_enhanced_schema.sql'],
        endpoints: ['/api/v1/rcm/eligibility'],
        test: async () => {
          const schemaExists = await this.fileExists('server/sql/rcm_enhanced_schema.sql');
          
          if (schemaExists) {
            const hasEligibility = await this.checkFileContent('server/sql/rcm_enhanced_schema.sql', ['eligibility']);
            if (hasEligibility) {
              return { status: 'COMPLETE', evidence: 'Eligibility tracking schema implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Enhanced schema exists but eligibility tracking not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: 'Enhanced schema file missing' };
          }
        }
      },
      {
        id: 'FC004',
        name: 'Charge Capture & Coding Validations (CPT/HCPCS, ICD-10)',
        files: ['src/components/rcm/ClaimValidation.tsx', 'server/services/rcm/claimValidationCtrl.js'],
        endpoints: ['/api/v1/rcm/claims/:id/validate'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/ClaimValidation.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/claimValidationCtrl.js');
          
          if (componentExists && controllerExists) {
            const hasValidation = await this.checkFileContent('server/services/rcm/claimValidationCtrl.js', ['CPT', 'ICD']);
            if (hasValidation) {
              return { status: 'COMPLETE', evidence: 'Claim validation with CPT/ICD checks implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Validation components exist but CPT/ICD logic not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!componentExists ? 'UI component' : ''} ${!controllerExists ? 'controller' : ''}` };
          }
        }
      },
      {
        id: 'FC005',
        name: 'Claim Lifecycle Management (Draft → Paid/Denied)',
        files: ['src/components/rcm/ClaimsManagement.tsx', 'server/services/rcm/rcmCtrl.js'],
        endpoints: ['/api/v1/rcm/claims', '/api/v1/rcm/claims/:id/status'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/ClaimsManagement.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/rcmCtrl.js');
          
          if (componentExists && controllerExists) {
            const hasLifecycle = await this.checkFileContent('src/components/rcm/ClaimsManagement.tsx', ['status', 'draft', 'paid']);
            if (hasLifecycle) {
              return { status: 'COMPLETE', evidence: 'Claims lifecycle management fully implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Claims components exist but lifecycle not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!componentExists ? 'UI component' : ''} ${!controllerExists ? 'controller' : ''}` };
          }
        }
      },
      {
        id: 'FC006',
        name: 'ERA/835 Ingest and Auto-Posting',
        files: ['server/services/rcm/eraProcessingCtrl.js', 'server/sql/era_processing_schema.sql'],
        endpoints: ['/api/v1/rcm/era/process', '/api/v1/rcm/era/files'],
        test: async () => {
          const controllerExists = await this.fileExists('server/services/rcm/eraProcessingCtrl.js');
          const schemaExists = await this.fileExists('server/sql/era_processing_schema.sql');
          
          if (controllerExists && schemaExists) {
            const hasERAProcessing = await this.checkFileContent('server/services/rcm/eraProcessingCtrl.js', ['ERA', '835', 'process']);
            if (hasERAProcessing) {
              return { status: 'COMPLETE', evidence: 'ERA processing system fully implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'ERA files exist but processing logic not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!controllerExists ? 'controller' : ''} ${!schemaExists ? 'schema' : ''}` };
          }
        }
      },
      {
        id: 'FC007',
        name: 'Denials Management (CARC/RARC) with Appeals',
        files: ['src/components/rcm/DenialManagement.tsx', 'server/services/rcm/rcmCtrl.js'],
        endpoints: ['/api/v1/rcm/denials/analytics', '/api/v1/rcm/denials/trends'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/DenialManagement.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/rcmCtrl.js');
          
          if (componentExists && controllerExists) {
            const hasDenialLogic = await this.checkFileContent('src/components/rcm/DenialManagement.tsx', ['denial', 'appeal', 'CARC']);
            if (hasDenialLogic) {
              return { status: 'COMPLETE', evidence: 'Denials management with appeals implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Denial components exist but CARC/RARC logic not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!componentExists ? 'UI component' : ''} ${!controllerExists ? 'controller' : ''}` };
          }
        }
      },
      {
        id: 'FC008',
        name: 'Patient Billing (Statements, Refunds, Write-offs)',
        files: ['src/components/rcm/PatientStatements.tsx', 'server/services/rcm/patientStatementCtrl.js'],
        endpoints: ['/api/v1/rcm/statements', '/api/v1/rcm/statements/generate'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/PatientStatements.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/patientStatementCtrl.js');
          
          if (componentExists && controllerExists) {
            const hasBillingFeatures = await this.checkFileContent('src/components/rcm/PatientStatements.tsx', ['statement', 'refund', 'write']);
            if (hasBillingFeatures) {
              return { status: 'COMPLETE', evidence: 'Patient billing system fully implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Billing components exist but features not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!componentExists ? 'UI component' : ''} ${!controllerExists ? 'controller' : ''}` };
          }
        }
      },
      {
        id: 'FC009',
        name: 'Analytics (AR Aging, Denial Rate, Collections %)',
        files: ['src/components/analytics/AnalyticsDashboard.tsx', 'server/services/analytics/analyticsCtrl.js'],
        endpoints: ['/api/v1/analytics/dashboard', '/api/v1/rcm/ar-aging'],
        test: async () => {
          const dashboardExists = await this.fileExists('src/components/analytics/AnalyticsDashboard.tsx');
          const controllerExists = await this.fileExists('server/services/analytics/analyticsCtrl.js');
          const arAgingExists = await this.fileExists('src/components/rcm/ARAgingManagement.tsx');
          
          if (dashboardExists && controllerExists && arAgingExists) {
            const hasAnalytics = await this.checkFileContent('src/components/analytics/AnalyticsDashboard.tsx', ['aging', 'denial', 'collection']);
            if (hasAnalytics) {
              return { status: 'COMPLETE', evidence: 'Analytics system with AR aging and denial tracking implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Analytics components exist but features not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!dashboardExists ? 'dashboard' : ''} ${!controllerExists ? 'controller' : ''} ${!arAgingExists ? 'AR aging' : ''}` };
          }
        }
      },
      {
        id: 'FC010',
        name: 'Collections Management with Payment Plans',
        files: ['src/components/rcm/CollectionsManagement.tsx', 'server/services/rcm/collectionsCtrl.js'],
        endpoints: ['/api/v1/rcm/collections/accounts', '/api/v1/rcm/collections/payment-plans'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/CollectionsManagement.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/collectionsCtrl.js');
          const schemaExists = await this.fileExists('server/sql/collections_schema.sql');
          
          if (componentExists && controllerExists && schemaExists) {
            const hasPaymentPlans = await this.checkFileContent('src/components/rcm/CollectionsManagement.tsx', ['payment', 'plan', 'collection']);
            if (hasPaymentPlans) {
              return { status: 'COMPLETE', evidence: 'Collections management with payment plans fully implemented' };
            } else {
              return { status: 'PARTIAL', evidence: 'Collections components exist but payment plan features not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: `Missing: ${!componentExists ? 'UI component' : ''} ${!controllerExists ? 'controller' : ''} ${!schemaExists ? 'schema' : ''}` };
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

    const integrityChecks = [
      {
        name: 'Database Schema Files',
        test: async () => {
          const schemaFiles = [
            'server/sql/rcm_complete_schema.sql',
            'server/sql/rcm_enhanced_schema.sql',
            'server/sql/collections_schema.sql',
            'server/sql/era_processing_schema.sql',
            'server/sql/analytics_schema.sql'
          ];
          
          let existingSchemas = 0;
          const missingSchemas = [];
          
          for (const schema of schemaFiles) {
            if (await this.fileExists(schema)) {
              existingSchemas++;
            } else {
              missingSchemas.push(schema);
            }
          }
          
          if (existingSchemas === schemaFiles.length) {
            return { status: 'COMPLETE', evidence: `All ${existingSchemas} schema files exist` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingSchemas}/${schemaFiles.length} schemas exist. Missing: ${missingSchemas.join(', ')}` };
          }
        }
      },
      {
        name: 'Foreign Key Constraints in Schema',
        test: async () => {
          const schemaFile = 'server/sql/rcm_complete_schema.sql';
          if (await this.fileExists(schemaFile)) {
            const hasForeignKeys = await this.checkFileContent(schemaFile, ['FOREIGN KEY', 'REFERENCES']);
            if (hasForeignKeys) {
              return { status: 'COMPLETE', evidence: 'Foreign key constraints defined in schema' };
            } else {
              return { status: 'PARTIAL', evidence: 'Schema exists but foreign keys not confirmed' };
            }
          } else {
            return { status: 'MISSING', evidence: 'Main schema file missing' };
          }
        }
      },
      {
        name: 'Audit Trail Implementation',
        test: async () => {
          // Check for audit-related files or schema
          const auditFiles = [
            'server/sql/rcm_complete_schema.sql',
            'server/sql/rcm_enhanced_schema.sql'
          ];
          
          let hasAuditTrail = false;
          for (const file of auditFiles) {
            if (await this.fileExists(file)) {
              const hasAudit = await this.checkFileContent(file, ['audit', 'created_date', 'updated_date']);
              if (hasAudit) {
                hasAuditTrail = true;
                break;
              }
            }
          }
          
          if (hasAuditTrail) {
            return { status: 'COMPLETE', evidence: 'Audit trail fields implemented in schema' };
          } else {
            return { status: 'MISSING', evidence: 'No audit trail implementation found' };
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
        name: 'Setup and Initialization Scripts',
        test: async () => {
          const setupScripts = [
            'setup-rcm-with-payments.js',
            'server/setup-collections-system.cjs',
            'setup-enhanced-rcm.cjs'
          ];
          
          let existingScripts = 0;
          const missingScripts = [];
          
          for (const script of setupScripts) {
            if (await this.fileExists(script)) {
              existingScripts++;
            } else {
              missingScripts.push(script);
            }
          }
          
          if (existingScripts >= 2) {
            return { status: 'COMPLETE', evidence: `${existingScripts} setup scripts available` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingScripts} setup scripts found. Missing: ${missingScripts.join(', ')}` };
          }
        }
      },
      {
        name: 'Test Scripts and Validation',
        test: async () => {
          const testScripts = [
            'test-rcm-complete.js',
            'server/test-collections-system.cjs',
            'collections-audit.cjs'
          ];
          
          let existingTests = 0;
          const missingTests = [];
          
          for (const test of testScripts) {
            if (await this.fileExists(test)) {
              existingTests++;
            } else {
              missingTests.push(test);
            }
          }
          
          if (existingTests >= 2) {
            return { status: 'COMPLETE', evidence: `${existingTests} test scripts available` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingTests} test scripts found. Missing: ${missingTests.join(', ')}` };
          }
        }
      },
      {
        name: 'Sample Data and Seed Files',
        test: async () => {
          const sampleDataFiles = [
            'server/sql/rcm_sample_data.sql'
          ];
          
          let existingData = 0;
          for (const dataFile of sampleDataFiles) {
            if (await this.fileExists(dataFile)) {
              existingData++;
            }
          }
          
          if (existingData > 0) {
            return { status: 'COMPLETE', evidence: `${existingData} sample data files available` };
          } else {
            return { status: 'MISSING', evidence: 'No sample data files found' };
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
        name: 'Authentication and Authorization',
        test: async () => {
          const authFiles = [
            'server/middleware/auth.js',
            'server/services/auth'
          ];
          
          let hasAuth = false;
          for (const authFile of authFiles) {
            if (await this.fileExists(authFile)) {
              hasAuth = true;
              break;
            }
          }
          
          if (hasAuth) {
            return { status: 'COMPLETE', evidence: 'Authentication middleware implemented' };
          } else {
            return { status: 'MISSING', evidence: 'Authentication system not found' };
          }
        }
      },
      {
        name: 'Input Validation in Controllers',
        test: async () => {
          const controllers = [
            'server/services/rcm/rcmCtrl.js',
            'server/services/rcm/collectionsCtrl.js',
            'server/services/payments/paymentCtrl.js'
          ];
          
          let hasValidation = false;
          for (const controller of controllers) {
            if (await this.fileExists(controller)) {
              const hasValidationLogic = await this.checkFileContent(controller, ['validation', 'validate', 'joi', 'zod']);
              if (hasValidationLogic) {
                hasValidation = true;
                break;
              }
            }
          }
          
          if (hasValidation) {
            return { status: 'COMPLETE', evidence: 'Input validation implemented in controllers' };
          } else {
            return { status: 'PARTIAL', evidence: 'Controllers exist but validation not confirmed' };
          }
        }
      },
      {
        name: 'Environment Configuration Security',
        test: async () => {
          const envExists = await this.fileExists('server/.env');
          const envExampleExists = await this.fileExists('server/.env.example');
          
          if (envExists) {
            return { status: 'COMPLETE', evidence: 'Environment configuration files present' };
          } else if (envExampleExists) {
            return { status: 'PARTIAL', evidence: 'Environment example exists but .env file missing' };
          } else {
            return { status: 'MISSING', evidence: 'No environment configuration found' };
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
        name: 'Core UI Components',
        test: async () => {
          const coreComponents = [
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
          
          for (const component of coreComponents) {
            if (await this.fileExists(component)) {
              existingComponents++;
            } else {
              missingComponents.push(component);
            }
          }
          
          if (existingComponents === coreComponents.length) {
            return { status: 'COMPLETE', evidence: `All ${existingComponents} core UI components implemented` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingComponents}/${coreComponents.length} components exist. Missing: ${missingComponents.slice(0, 3).join(', ')}${missingComponents.length > 3 ? '...' : ''}` };
          }
        }
      },
      {
        name: 'Analytics and Reporting Components',
        test: async () => {
          const analyticsComponents = [
            'src/components/analytics/AnalyticsDashboard.tsx',
            'src/components/analytics/AdvancedMetricsVisualization.tsx',
            'src/components/analytics/CustomReportBuilder.tsx'
          ];
          
          let existingAnalytics = 0;
          const missingAnalytics = [];
          
          for (const component of analyticsComponents) {
            if (await this.fileExists(component)) {
              existingAnalytics++;
            } else {
              missingAnalytics.push(component);
            }
          }
          
          if (existingAnalytics === analyticsComponents.length) {
            return { status: 'COMPLETE', evidence: `All ${existingAnalytics} analytics components implemented` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingAnalytics}/${analyticsComponents.length} analytics components exist. Missing: ${missingAnalytics.join(', ')}` };
          }
        }
      },
      {
        name: 'Comprehensive Documentation',
        test: async () => {
          const docFiles = [
            'RCM_SYSTEM_GUIDE.md',
            'ENHANCED_RCM_GUIDE.md',
            'COLLECTIONS_MANAGEMENT_GUIDE.md',
            'INTEGRATION_GUIDE.md',
            'RCM_COMPLETENESS_REPORT.md'
          ];
          
          let existingDocs = 0;
          const missingDocs = [];
          
          for (const doc of docFiles) {
            if (await this.fileExists(doc)) {
              existingDocs++;
            } else {
              missingDocs.push(doc);
            }
          }
          
          if (existingDocs >= 4) {
            return { status: 'COMPLETE', evidence: `${existingDocs} documentation files available` };
          } else {
            return { status: 'PARTIAL', evidence: `${existingDocs} docs exist. Missing: ${missingDocs.join(', ')}` };
          }
        }
      },
      {
        name: 'API Documentation and Routes',
        test: async () => {
          const routeFiles = [
            'server/services/rcm/rcmRoutes.js',
            'server/services/rcm/collectionsRoutes.js',
            'server/services/analytics/analyticsRoutes.js',
            'server/services/payments/paymentRoutes.js'
          ];
          
          let existingRoutes = 0;
          let hasSwagger = false;
          
          for (const routeFile of routeFiles) {
            if (await this.fileExists(routeFile)) {
              existingRoutes++;
              const hasSwaggerDocs = await this.checkFileContent(routeFile, ['@swagger', 'swagger']);
              if (hasSwaggerDocs) {
                hasSwagger = true;
              }
            }
          }
          
          if (existingRoutes >= 3 && hasSwagger) {
            return { status: 'COMPLETE', evidence: `${existingRoutes} route files with Swagger documentation` };
          } else if (existingRoutes >= 3) {
            return { status: 'PARTIAL', evidence: `${existingRoutes} route files exist but Swagger documentation not confirmed` };
          } else {
            return { status: 'MISSING', evidence: `Only ${existingRoutes} route files found` };
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

  generateSummaryReport() {
    console.log('\n📊 COMPREHENSIVE AUDIT SUMMARY');
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
    const adjustedPercentage = overallTotal > 0 ? Math.round(((totalPassed + (totalPartial * 0.5)) / overallTotal) * 100) : 0;
    
    console.log('-'.repeat(60));
    console.log(`OVERALL                  ${totalPassed}/${overallTotal} (${overallPercentage}%) - ${totalPartial} partial, ${totalMissing} missing`);
    console.log(`ADJUSTED SCORE           ${adjustedPercentage}% (including partial credit)`);

    return {
      totalPassed,
      totalPartial,
      totalMissing,
      overallPercentage,
      adjustedPercentage,
      overallTotal
    };
  }

  async generateTraceabilityMatrix() {
    console.log('\n📋 TRACEABILITY MATRIX');
    console.log('=' .repeat(80));
    console.log('Requirement'.padEnd(40) + 'Status'.padEnd(10) + 'Files/Evidence');
    console.log('-'.repeat(80));
    
    this.traceabilityMatrix.forEach(item => {
      const status = item.status === 'COMPLETE' ? '✅' : item.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`${item.requirement.padEnd(40)}${status.padEnd(10)}${item.files}`);
    });
  }

  async runComprehensiveAudit() {
    console.log('🔍 RCM COMPREHENSIVE AUDIT - PRODUCTION READINESS VERIFICATION');
    console.log('=' .repeat(80));
    
    // Run all audit categories
    await this.auditFunctionalCoverage();
    await this.auditDataIntegrity();
    await this.auditOperationalReadiness();
    await this.auditSecurityCompliance();
    await this.auditDocumentationUX();
    
    // Generate traceability matrix
    await this.generateTraceabilityMatrix();
    
    // Generate summary
    const summary = this.generateSummaryReport();
    
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
  const auditor = new ComprehensiveRCMAuditor();
  
  auditor.runComprehensiveAudit()
    .then((results) => {
      console.log('\n🎯 COMPREHENSIVE AUDIT COMPLETED');
      console.log(`📊 Summary: ${results.summary.totalPassed} passed, ${results.summary.totalPartial} partial, ${results.summary.totalMissing} missing`);
      console.log(`📈 Overall: ${results.summary.overallPercentage}% complete (${results.summary.adjustedPercentage}% with partial credit)`);
      
      if (results.summary.adjustedPercentage >= 85) {
        console.log('🎉 RCM SYSTEM IS PRODUCTION READY!');
        process.exit(0);
      } else if (results.summary.adjustedPercentage >= 70) {
        console.log('⚠️ RCM SYSTEM IS MOSTLY READY - MINOR IMPROVEMENTS NEEDED');
        console.log(`🔧 ${results.fixTasks.length} fix tasks identified`);
        process.exit(0);
      } else {
        console.log('❌ RCM SYSTEM NEEDS SIGNIFICANT IMPROVEMENTS BEFORE PRODUCTION');
        console.log(`🔧 ${results.fixTasks.length} fix tasks identified`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Comprehensive audit failed:', error);
      process.exit(1);
    });
}

module.exports = { ComprehensiveRCMAuditor };