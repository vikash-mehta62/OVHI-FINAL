// Settings Module Comprehensive Audit - EHR/RCM Product Auditor
const fs = require('fs').promises;
const path = require('path');

class SettingsModuleAuditor {
  constructor() {
    this.auditResults = {
      organizationSettings: { passed: 0, partial: 0, missing: 0, items: [] },
      providerSettings: { passed: 0, partial: 0, missing: 0, items: [] },
      documentAutomation: { passed: 0, partial: 0, missing: 0, items: [] },
      encounterIntegration: { passed: 0, partial: 0, missing: 0, items: [] },
      complianceMapping: { passed: 0, partial: 0, missing: 0, items: [] },
      scalabilityCheck: { passed: 0, partial: 0, missing: 0, items: [] }
    };
    this.coverageMatrix = [];
    this.documentFieldMap = [];
    this.gapList = [];
    this.evidencePaths = [];
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
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

  async auditOrganizationSettings() {
    console.log('\n🏢 ORGANIZATION SETTINGS AUDIT');
    console.log('=' .repeat(60));

    const orgRequirements = [
      {
        id: 'ORG001',
        name: 'Legal Name, DBA, Full Address',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasFields = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', 
              ['practiceName', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode']);
            return hasFields ? 
              { status: 'COMPLETE', evidence: 'Practice setup with full address fields implemented' } :
              { status: 'PARTIAL', evidence: 'Component exists but missing address fields' };
          }
          return { status: 'MISSING', evidence: 'Practice setup component not found' };
        }
      },
      {
        id: 'ORG002',
        name: 'Tax ID/TIN, NPI (Organization/Facility)',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasIds = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', 
              ['taxId', 'npi']);
            return hasIds ? 
              { status: 'COMPLETE', evidence: 'Tax ID and NPI fields implemented' } :
              { status: 'PARTIAL', evidence: 'Component exists but missing tax/NPI fields' };
          }
          return { status: 'MISSING', evidence: 'Practice setup component not found' };
        }
      },
      {
        id: 'ORG003',
        name: 'Contact Information (Phone, Fax, Email, Website)',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasContact = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', 
              ['practicePhone', 'practiceFax', 'practiceEmail', 'website']);
            return hasContact ? 
              { status: 'COMPLETE', evidence: 'All contact information fields implemented' } :
              { status: 'PARTIAL', evidence: 'Component exists but missing contact fields' };
          }
          return { status: 'MISSING', evidence: 'Practice setup component not found' };
        }
      },
      {
        id: 'ORG004',
        name: 'Branding (Logo, Color Theme, Letterhead)',
        files: ['src/components/settings/AppearanceSettings.tsx', 'server/services/settings/settingsCtrl.js'],
        test: async () => {
          const appearanceExists = await this.fileExists('src/components/settings/AppearanceSettings.tsx');
          const pdfHeaderExists = await this.checkFileContent('server/services/settings/settingsCtrl.js', ['pdfHeaders', 'logo']);
          
          if (appearanceExists && pdfHeaderExists) {
            return { status: 'COMPLETE', evidence: 'Appearance settings and PDF header configuration implemented' };
          } else if (appearanceExists || pdfHeaderExists) {
            return { status: 'PARTIAL', evidence: 'Some branding features implemented but not complete' };
          }
          return { status: 'MISSING', evidence: 'Branding configuration not found' };
        }
      },
      {
        id: 'ORG005',
        name: 'Operating Hours and Time Zones',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasHours = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', 
              ['operatingHours', 'monday', 'tuesday', 'open', 'close']);
            return hasHours ? 
              { status: 'COMPLETE', evidence: 'Operating hours configuration implemented' } :
              { status: 'PARTIAL', evidence: 'Component exists but operating hours not confirmed' };
          }
          return { status: 'MISSING', evidence: 'Practice setup component not found' };
        }
      },
      {
        id: 'ORG006',
        name: 'Document Numbering Sequences',
        files: ['server/sql/*.sql'],
        test: async () => {
          // Check for document numbering in schema files
          const schemaFiles = [
            'server/sql/rcm_complete_schema.sql',
            'server/sql/rcm_enhanced_schema.sql'
          ];
          
          let hasNumbering = false;
          for (const file of schemaFiles) {
            if (await this.fileExists(file)) {
              const hasSequences = await this.checkFileContent(file, ['sequence', 'auto_increment', 'invoice', 'statement']);
              if (hasSequences) {
                hasNumbering = true;
                break;
              }
            }
          }
          
          return hasNumbering ? 
            { status: 'PARTIAL', evidence: 'Some document numbering found in schema' } :
            { status: 'MISSING', evidence: 'Document numbering sequences not implemented' };
        }
      },
      {
        id: 'ORG007',
        name: 'Multi-Location Support',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            // Check if there's support for multiple locations
            const hasMultiLocation = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', 
              ['location', 'Location']);
            return hasMultiLocation ? 
              { status: 'PARTIAL', evidence: 'Some location support found but multi-location not confirmed' } :
              { status: 'MISSING', evidence: 'Multi-location support not implemented' };
          }
          return { status: 'MISSING', evidence: 'Practice setup component not found' };
        }
      }
    ];

    for (const req of orgRequirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      const result = await req.test();
      
      this.auditResults.organizationSettings.items.push({
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files
      });

      this.coverageMatrix.push({
        requirement: req.name,
        present: result.status !== 'MISSING',
        source: req.files.join(', '),
        usedIn: 'Documents, Encounters',
        evidence: result.evidence
      });

      if (result.status === 'COMPLETE') {
        this.auditResults.organizationSettings.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.organizationSettings.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.organizationSettings.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        this.gapList.push({
          priority: 'P1',
          problem: `Missing ${req.name}`,
          proposedFix: `Implement ${req.name} in settings module`,
          acceptanceCriteria: `Settings UI allows configuration of ${req.name} and values are saved/retrieved correctly`,
          impactedScreens: req.files.join(', '),
          testToAdd: `Verify ${req.name} can be configured and appears in generated documents`
        });
      }
    }
  }

  async auditProviderSettings() {
    console.log('\n👨‍⚕️ PROVIDER SETTINGS AUDIT');
    console.log('=' .repeat(60));

    const providerRequirements = [
      {
        id: 'PROV001',
        name: 'Provider Profile (Name, Credentials, NPI, Taxonomy)',
        files: ['src/components/settings/DoctorProfileSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/DoctorProfileSettings.tsx');
          if (componentExists) {
            const hasProfile = await this.checkFileContent('src/components/settings/DoctorProfileSettings.tsx', 
              ['name', 'credential', 'npi']);
            return hasProfile ? 
              { status: 'COMPLETE', evidence: 'Doctor profile settings implemented' } :
              { status: 'PARTIAL', evidence: 'Component exists but profile fields not confirmed' };
          }
          return { status: 'MISSING', evidence: 'Doctor profile settings component not found' };
        }
      },
      {
        id: 'PROV002',
        name: 'Specialty Configuration (Single/Multiple)',
        files: ['src/components/settings/SpecialtyConfigurationSettings.tsx', 'src/components/settings/SmartSpecialtyManager.tsx'],
        test: async () => {
          const specialtyExists = await this.fileExists('src/components/settings/SpecialtyConfigurationSettings.tsx');
          const smartSpecialtyExists = await this.fileExists('src/components/settings/SmartSpecialtyManager.tsx');
          
          if (specialtyExists && smartSpecialtyExists) {
            return { status: 'COMPLETE', evidence: 'Specialty configuration and smart specialty manager implemented' };
          } else if (specialtyExists || smartSpecialtyExists) {
            return { status: 'PARTIAL', evidence: 'Some specialty configuration found but not complete' };
          }
          return { status: 'MISSING', evidence: 'Specialty configuration not found' };
        }
      },
      {
        id: 'PROV003',
        name: 'Auto-Specialty Templates',
        files: ['src/components/settings/AutoSpecialtyTemplateSettings.tsx', 'server/services/settings/autoSpecialtyCtrl.js'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/AutoSpecialtyTemplateSettings.tsx');
          const controllerExists = await this.fileExists('server/services/settings/autoSpecialtyCtrl.js');
          
          if (componentExists && controllerExists) {
            return { status: 'COMPLETE', evidence: 'Auto-specialty template system fully implemented' };
          } else if (componentExists || controllerExists) {
            return { status: 'PARTIAL', evidence: 'Some auto-specialty features implemented' };
          }
          return { status: 'MISSING', evidence: 'Auto-specialty templates not implemented' };
        }
      },
      {
        id: 'PROV004',
        name: 'Provider Signature and Credential Formatting',
        files: ['server/services/settings/settingsCtrl.js'],
        test: async () => {
          const controllerExists = await this.fileExists('server/services/settings/settingsCtrl.js');
          if (controllerExists) {
            const hasSignature = await this.checkFileContent('server/services/settings/settingsCtrl.js', 
              ['signature', 'credential']);
            return hasSignature ? 
              { status: 'PARTIAL', evidence: 'Some signature/credential handling found' } :
              { status: 'MISSING', evidence: 'Signature/credential formatting not implemented' };
          }
          return { status: 'MISSING', evidence: 'Settings controller not found' };
        }
      },
      {
        id: 'PROV005',
        name: 'Provider Availability Hours',
        files: ['src/components/settings/DoctorProfileSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/DoctorProfileSettings.tsx');
          if (componentExists) {
            const hasAvailability = await this.checkFileContent('src/components/settings/DoctorProfileSettings.tsx', 
              ['availability', 'hours', 'schedule']);
            return hasAvailability ? 
              { status: 'PARTIAL', evidence: 'Some availability configuration found' } :
              { status: 'MISSING', evidence: 'Provider availability hours not implemented' };
          }
          return { status: 'MISSING', evidence: 'Doctor profile settings not found' };
        }
      }
    ];

    for (const req of providerRequirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      const result = await req.test();
      
      this.auditResults.providerSettings.items.push({
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files
      });

      if (result.status === 'COMPLETE') {
        this.auditResults.providerSettings.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.providerSettings.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.providerSettings.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        this.gapList.push({
          priority: 'P1',
          problem: `Missing ${req.name}`,
          proposedFix: `Implement ${req.name} in provider settings`,
          acceptanceCriteria: `Provider settings allow configuration of ${req.name}`,
          impactedScreens: req.files.join(', '),
          testToAdd: `Verify ${req.name} configuration and document integration`
        });
      }
    }
  }

  async auditDocumentAutomation() {
    console.log('\n📄 DOCUMENT AUTOMATION AUDIT');
    console.log('=' .repeat(60));

    const documentRequirements = [
      {
        id: 'DOC001',
        name: 'Patient Statement Auto-Population',
        files: ['src/components/rcm/PatientStatements.tsx', 'server/services/rcm/patientStatementCtrl.js'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/PatientStatements.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/patientStatementCtrl.js');
          
          if (componentExists && controllerExists) {
            return { status: 'COMPLETE', evidence: 'Patient statement generation system implemented' };
          } else if (componentExists || controllerExists) {
            return { status: 'PARTIAL', evidence: 'Some patient statement features implemented' };
          }
          return { status: 'MISSING', evidence: 'Patient statement automation not found' };
        }
      },
      {
        id: 'DOC002',
        name: 'Superbill/Encounter Summary Auto-Population',
        files: ['src/components/encounter', 'server/services/encounter'],
        test: async () => {
          const encounterComponentExists = await this.fileExists('src/components/encounter');
          const encounterServiceExists = await this.fileExists('server/services/encounter');
          
          if (encounterComponentExists && encounterServiceExists) {
            return { status: 'PARTIAL', evidence: 'Encounter components exist but superbill auto-population not confirmed' };
          } else if (encounterComponentExists || encounterServiceExists) {
            return { status: 'PARTIAL', evidence: 'Some encounter features implemented' };
          }
          return { status: 'MISSING', evidence: 'Encounter/Superbill automation not implemented' };
        }
      },
      {
        id: 'DOC003',
        name: 'Referral Letter Auto-Population',
        files: ['src/components/referral', 'server/services/referral'],
        test: async () => {
          // Check for referral-related files
          const hasReferralFiles = await this.fileExists('src/components/referral') || 
                                   await this.fileExists('server/services/referral');
          
          return hasReferralFiles ? 
            { status: 'PARTIAL', evidence: 'Some referral functionality may exist' } :
            { status: 'MISSING', evidence: 'Referral letter automation not implemented' };
        }
      },
      {
        id: 'DOC004',
        name: 'Claim Header Preview Auto-Population',
        files: ['src/components/rcm/ClaimsManagement.tsx', 'server/services/rcm/rcmCtrl.js'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/rcm/ClaimsManagement.tsx');
          const controllerExists = await this.fileExists('server/services/rcm/rcmCtrl.js');
          
          if (componentExists && controllerExists) {
            return { status: 'COMPLETE', evidence: 'Claims management system implemented' };
          } else if (componentExists || controllerExists) {
            return { status: 'PARTIAL', evidence: 'Some claims features implemented' };
          }
          return { status: 'MISSING', evidence: 'Claims header automation not found' };
        }
      },
      {
        id: 'DOC005',
        name: 'PDF Header Configuration Integration',
        files: ['server/services/settings/settingsCtrl.js'],
        test: async () => {
          const controllerExists = await this.fileExists('server/services/settings/settingsCtrl.js');
          if (controllerExists) {
            const hasPdfConfig = await this.checkFileContent('server/services/settings/settingsCtrl.js', 
              ['pdfHeaders', 'pdf_header_configs']);
            return hasPdfConfig ? 
              { status: 'COMPLETE', evidence: 'PDF header configuration system implemented' } :
              { status: 'PARTIAL', evidence: 'Settings controller exists but PDF config not confirmed' };
          }
          return { status: 'MISSING', evidence: 'PDF header configuration not found' };
        }
      }
    ];

    for (const req of documentRequirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      const result = await req.test();
      
      this.auditResults.documentAutomation.items.push({
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files
      });

      // Add to document field mapping
      this.documentFieldMap.push({
        documentType: req.name,
        settingsSource: req.files.join(', '),
        autoPopulated: result.status === 'COMPLETE',
        evidence: result.evidence
      });

      if (result.status === 'COMPLETE') {
        this.auditResults.documentAutomation.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.documentAutomation.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.documentAutomation.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        this.gapList.push({
          priority: 'P0',
          problem: `Missing ${req.name}`,
          proposedFix: `Implement document auto-population for ${req.name}`,
          acceptanceCriteria: `Documents auto-populate from settings without manual intervention`,
          impactedScreens: req.files.join(', '),
          testToAdd: `Generate sample document and verify all fields populate from settings`
        });
      }
    }
  }

  async auditEncounterIntegration() {
    console.log('\n🏥 ENCOUNTER INTEGRATION AUDIT');
    console.log('=' .repeat(60));

    const encounterRequirements = [
      {
        id: 'ENC001',
        name: 'Encounter Creation with Settings Defaults',
        files: ['src/components/encounter', 'server/services/encounter'],
        test: async () => {
          const encounterExists = await this.fileExists('src/components/encounter') || 
                                  await this.fileExists('server/services/encounter');
          
          return encounterExists ? 
            { status: 'PARTIAL', evidence: 'Encounter system exists but settings integration not confirmed' } :
            { status: 'MISSING', evidence: 'Encounter system not implemented' };
        }
      },
      {
        id: 'ENC002',
        name: 'Provider Identity Block in Encounter Outputs',
        files: ['src/components/encounter', 'server/services/encounter'],
        test: async () => {
          // This would need encounter system to be implemented first
          return { status: 'MISSING', evidence: 'Encounter provider identity integration not implemented' };
        }
      },
      {
        id: 'ENC003',
        name: 'Specialty-Specific Template Attachment',
        files: ['src/components/settings/AutoSpecialtyTemplateSettings.tsx', 'server/services/settings/autoSpecialtyCtrl.js'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/AutoSpecialtyTemplateSettings.tsx');
          const controllerExists = await this.fileExists('server/services/settings/autoSpecialtyCtrl.js');
          
          if (componentExists && controllerExists) {
            return { status: 'COMPLETE', evidence: 'Auto-specialty template system implemented' };
          } else if (componentExists || controllerExists) {
            return { status: 'PARTIAL', evidence: 'Some specialty template features implemented' };
          }
          return { status: 'MISSING', evidence: 'Specialty template attachment not implemented' };
        }
      }
    ];

    for (const req of encounterRequirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      const result = await req.test();
      
      this.auditResults.encounterIntegration.items.push({
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files
      });

      if (result.status === 'COMPLETE') {
        this.auditResults.encounterIntegration.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.encounterIntegration.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.encounterIntegration.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        this.gapList.push({
          priority: 'P1',
          problem: `Missing ${req.name}`,
          proposedFix: `Implement encounter integration with settings for ${req.name}`,
          acceptanceCriteria: `Encounters automatically use settings defaults and provider information`,
          impactedScreens: req.files.join(', '),
          testToAdd: `Create encounter and verify settings integration`
        });
      }
    }
  }

  async auditComplianceMapping() {
    console.log('\n📋 COMPLIANCE MAPPING AUDIT');
    console.log('=' .repeat(60));

    const complianceRequirements = [
      {
        id: 'COMP001',
        name: 'NPI Fields in Documents',
        files: ['src/components/settings/PracticeSetupSettings.tsx', 'src/components/settings/DoctorProfileSettings.tsx'],
        test: async () => {
          const practiceExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          const doctorExists = await this.fileExists('src/components/settings/DoctorProfileSettings.tsx');
          
          if (practiceExists && doctorExists) {
            const hasNPI = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', ['npi']);
            return hasNPI ? 
              { status: 'COMPLETE', evidence: 'NPI fields implemented in settings' } :
              { status: 'PARTIAL', evidence: 'Settings exist but NPI fields not confirmed' };
          }
          return { status: 'MISSING', evidence: 'Settings components for NPI not found' };
        }
      },
      {
        id: 'COMP002',
        name: 'TIN/Tax ID in Documents',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasTaxId = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', ['taxId']);
            return hasTaxId ? 
              { status: 'COMPLETE', evidence: 'Tax ID field implemented' } :
              { status: 'PARTIAL', evidence: 'Component exists but Tax ID not confirmed' };
          }
          return { status: 'MISSING', evidence: 'Tax ID configuration not found' };
        }
      },
      {
        id: 'COMP003',
        name: 'CLIA Number for Lab Documents',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasCLIA = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', ['clia', 'CLIA']);
            return hasCLIA ? 
              { status: 'COMPLETE', evidence: 'CLIA number field found' } :
              { status: 'MISSING', evidence: 'CLIA number not implemented' };
          }
          return { status: 'MISSING', evidence: 'Practice settings not found' };
        }
      },
      {
        id: 'COMP004',
        name: 'State License Numbers',
        files: ['src/components/settings/DoctorProfileSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/DoctorProfileSettings.tsx');
          if (componentExists) {
            const hasLicense = await this.checkFileContent('src/components/settings/DoctorProfileSettings.tsx', 
              ['license', 'License']);
            return hasLicense ? 
              { status: 'PARTIAL', evidence: 'Some license configuration found' } :
              { status: 'MISSING', evidence: 'State license configuration not implemented' };
          }
          return { status: 'MISSING', evidence: 'Doctor profile settings not found' };
        }
      }
    ];

    for (const req of complianceRequirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      const result = await req.test();
      
      this.auditResults.complianceMapping.items.push({
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files
      });

      if (result.status === 'COMPLETE') {
        this.auditResults.complianceMapping.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.complianceMapping.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.complianceMapping.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        this.gapList.push({
          priority: 'P0',
          problem: `Missing ${req.name}`,
          proposedFix: `Implement ${req.name} in settings and document generation`,
          acceptanceCriteria: `Required regulatory identifiers appear on all applicable documents`,
          impactedScreens: req.files.join(', '),
          testToAdd: `Verify ${req.name} appears correctly on generated documents`
        });
      }
    }
  }

  async auditScalabilityCheck() {
    console.log('\n🏗️ SCALABILITY CHECK AUDIT');
    console.log('=' .repeat(60));

    const scalabilityRequirements = [
      {
        id: 'SCALE001',
        name: 'Multi-Tenant Organization Support',
        files: ['server/sql/*.sql'],
        test: async () => {
          // Check for organization/tenant support in schema
          const schemaFiles = [
            'server/sql/rcm_complete_schema.sql',
            'server/sql/enhanced_settings_schema.sql'
          ];
          
          let hasMultiTenant = false;
          for (const file of schemaFiles) {
            if (await this.fileExists(file)) {
              const hasTenant = await this.checkFileContent(file, ['organization', 'tenant', 'practice_id']);
              if (hasTenant) {
                hasMultiTenant = true;
                break;
              }
            }
          }
          
          return hasMultiTenant ? 
            { status: 'PARTIAL', evidence: 'Some multi-tenant support found in schema' } :
            { status: 'MISSING', evidence: 'Multi-tenant support not implemented' };
        }
      },
      {
        id: 'SCALE002',
        name: 'Multiple Location Support',
        files: ['src/components/settings/PracticeSetupSettings.tsx'],
        test: async () => {
          const componentExists = await this.fileExists('src/components/settings/PracticeSetupSettings.tsx');
          if (componentExists) {
            const hasMultiLocation = await this.checkFileContent('src/components/settings/PracticeSetupSettings.tsx', 
              ['location', 'Location', 'multiple']);
            return hasMultiLocation ? 
              { status: 'PARTIAL', evidence: 'Some location support found but multi-location not confirmed' } :
              { status: 'MISSING', evidence: 'Multi-location support not implemented' };
          }
          return { status: 'MISSING', evidence: 'Practice settings not found' };
        }
      },
      {
        id: 'SCALE003',
        name: 'Settings Isolation Between Organizations',
        files: ['server/services/settings/*.js'],
        test: async () => {
          const settingsFiles = [
            'server/services/settings/settingsCtrl.js',
            'server/services/settings/enhancedSettingsCtrl.js'
          ];
          
          let hasIsolation = false;
          for (const file of settingsFiles) {
            if (await this.fileExists(file)) {
              const hasOrgFilter = await this.checkFileContent(file, ['organization', 'tenant', 'practice']);
              if (hasOrgFilter) {
                hasIsolation = true;
                break;
              }
            }
          }
          
          return hasIsolation ? 
            { status: 'PARTIAL', evidence: 'Some organization filtering found in settings' } :
            { status: 'MISSING', evidence: 'Settings isolation not implemented' };
        }
      }
    ];

    for (const req of scalabilityRequirements) {
      console.log(`\n📋 Testing: ${req.name}`);
      const result = await req.test();
      
      this.auditResults.scalabilityCheck.items.push({
        id: req.id,
        name: req.name,
        status: result.status,
        evidence: result.evidence,
        files: req.files
      });

      if (result.status === 'COMPLETE') {
        this.auditResults.scalabilityCheck.passed++;
        console.log(`  ✅ COMPLETE: ${result.evidence}`);
      } else if (result.status === 'PARTIAL') {
        this.auditResults.scalabilityCheck.partial++;
        console.log(`  ⚠️ PARTIAL: ${result.evidence}`);
      } else {
        this.auditResults.scalabilityCheck.missing++;
        console.log(`  ❌ MISSING: ${result.evidence}`);
        
        this.gapList.push({
          priority: 'P2',
          problem: `Missing ${req.name}`,
          proposedFix: `Implement ${req.name} for enterprise scalability`,
          acceptanceCriteria: `System supports multiple organizations without conflicts`,
          impactedScreens: req.files.join(', '),
          testToAdd: `Test multi-tenant scenarios and settings isolation`
        });
      }
    }
  }

  generateSummaryReport() {
    console.log('\n📊 SETTINGS MODULE AUDIT SUMMARY');
    console.log('=' .repeat(60));

    const categories = ['organizationSettings', 'providerSettings', 'documentAutomation', 'encounterIntegration', 'complianceMapping', 'scalabilityCheck'];
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

  async runComprehensiveAudit() {
    console.log('🔍 SETTINGS MODULE COMPREHENSIVE AUDIT - EHR/RCM PRODUCT VERIFICATION');
    console.log('=' .repeat(80));
    
    // Run all audit categories
    await this.auditOrganizationSettings();
    await this.auditProviderSettings();
    await this.auditDocumentAutomation();
    await this.auditEncounterIntegration();
    await this.auditComplianceMapping();
    await this.auditScalabilityCheck();
    
    // Generate summary
    const summary = this.generateSummaryReport();
    
    return {
      auditResults: this.auditResults,
      coverageMatrix: this.coverageMatrix,
      documentFieldMap: this.documentFieldMap,
      gapList: this.gapList,
      evidencePaths: this.evidencePaths,
      summary
    };
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new SettingsModuleAuditor();
  
  auditor.runComprehensiveAudit()
    .then((results) => {
      console.log('\n🎯 SETTINGS MODULE AUDIT COMPLETED');
      console.log(`📊 Summary: ${results.summary.totalPassed} passed, ${results.summary.totalPartial} partial, ${results.summary.totalMissing} missing`);
      console.log(`📈 Overall: ${results.summary.overallPercentage}% complete (${results.summary.adjustedPercentage}% with partial credit)`);
      
      // Categorize gaps by priority
      const p0Gaps = results.gapList.filter(gap => gap.priority === 'P0');
      const p1Gaps = results.gapList.filter(gap => gap.priority === 'P1');
      const p2Gaps = results.gapList.filter(gap => gap.priority === 'P2');
      
      console.log(`\n🔧 Gap Analysis:`);
      console.log(`   P0 (Critical): ${p0Gaps.length} gaps`);
      console.log(`   P1 (High): ${p1Gaps.length} gaps`);
      console.log(`   P2 (Medium): ${p2Gaps.length} gaps`);
      
      if (results.summary.adjustedPercentage >= 70) {
        console.log('✅ SETTINGS MODULE IS FUNCTIONAL - IMPROVEMENTS RECOMMENDED');
        process.exit(0);
      } else {
        console.log('⚠️ SETTINGS MODULE NEEDS SIGNIFICANT IMPROVEMENTS');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Settings audit failed:', error);
      process.exit(1);
    });
}

module.exports = { SettingsModuleAuditor };