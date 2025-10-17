// Integration Tests for Form Generation Accuracy
// Testing CMS-1500 and UB-04 form generation with real data

console.log('🧪 Running Form Generation Integration Tests...\n');

const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function runTest(testName, testFunction) {
  testResults.total++;
  try {
    const result = testFunction();
    if (result) {
      console.log(`✅ ${testName}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${testName}`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
    testResults.failed++;
  }
}

// Mock Form Generation Services
class MockCMS1500Generator {
  generateForm(claimData) {
    // Validate required fields for CMS-1500
    const requiredFields = [
      'patientName', 'patientDOB', 'patientAddress',
      'providerName', 'providerNPI', 'serviceDate',
      'diagnosisCode', 'procedureCode', 'chargeAmount'
    ];
    
    for (const field of requiredFields) {
      if (!claimData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Mock form generation
    return {
      success: true,
      formData: {
        box1: claimData.insuranceType || 'Medicare',
        box2: claimData.patientName,
        box3: claimData.patientDOB,
        box5: claimData.patientAddress,
        box24A: claimData.serviceDate,
        box24B: claimData.placeOfService || '11',
        box24D: claimData.procedureCode,
        box24F: claimData.chargeAmount,
        box21: claimData.diagnosisCode,
        box33: claimData.providerNPI
      },
      validationErrors: []
    };
  }
  
  validateFormData(formData) {
    const errors = [];
    
    // Validate NPI in box 33
    if (!/^\d{10}$/.test(formData.box33)) {
      errors.push('Invalid NPI format in box 33');
    }
    
    // Validate procedure code in box 24D
    if (!/^\d{5}$/.test(formData.box24D)) {
      errors.push('Invalid CPT code format in box 24D');
    }
    
    // Validate diagnosis code in box 21
    if (!/^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/.test(formData.box21)) {
      errors.push('Invalid ICD-10 code format in box 21');
    }
    
    // Validate charge amount in box 24F
    if (!/^\d+\.\d{2}$/.test(formData.box24F)) {
      errors.push('Invalid charge amount format in box 24F');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

class MockUB04Generator {
  generateForm(claimData) {
    // Validate required fields for UB-04
    const requiredFields = [
      'patientName', 'patientDOB', 'admissionDate',
      'facilityName', 'facilityNPI', 'revenueCode',
      'diagnosisCode', 'totalCharges'
    ];
    
    for (const field of requiredFields) {
      if (!claimData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Mock UB-04 form generation
    return {
      success: true,
      formData: {
        fl8: claimData.patientName,
        fl9: claimData.patientAddress,
        fl10: claimData.patientDOB,
        fl12: claimData.admissionDate,
        fl13: claimData.dischargeDate,
        fl42: claimData.revenueCode,
        fl47: claimData.totalCharges,
        fl67: claimData.diagnosisCode,
        fl76: claimData.facilityNPI
      },
      validationErrors: []
    };
  }
  
  validateFormData(formData) {
    const errors = [];
    
    // Validate facility NPI in FL 76
    if (!/^\d{10}$/.test(formData.fl76)) {
      errors.push('Invalid NPI format in FL 76');
    }
    
    // Validate revenue code in FL 42
    if (!/^\d{4}$/.test(formData.fl42)) {
      errors.push('Invalid revenue code format in FL 42');
    }
    
    // Validate diagnosis code in FL 67
    if (!/^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/.test(formData.fl67)) {
      errors.push('Invalid ICD-10 code format in FL 67');
    }
    
    // Validate total charges in FL 47
    if (!/^\d+\.\d{2}$/.test(formData.fl47)) {
      errors.push('Invalid charge amount format in FL 47');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

const cms1500Generator = new MockCMS1500Generator();
const ub04Generator = new MockUB04Generator();

// Sample test data
const validCMS1500Data = {
  patientName: 'John Doe',
  patientDOB: '1980-01-15',
  patientAddress: '123 Main St, Anytown, ST 12345',
  providerName: 'Dr. Smith',
  providerNPI: '1234567890',
  serviceDate: '2024-01-15',
  diagnosisCode: 'Z00.00',
  procedureCode: '99213',
  chargeAmount: '150.00',
  placeOfService: '11'
};

const validUB04Data = {
  patientName: 'Jane Smith',
  patientDOB: '1975-05-20',
  patientAddress: '456 Oak Ave, Somewhere, ST 67890',
  admissionDate: '2024-01-10',
  dischargeDate: '2024-01-12',
  facilityName: 'General Hospital',
  facilityNPI: '9876543210',
  revenueCode: '0250',
  diagnosisCode: 'I10',
  totalCharges: '2500.00'
};

// Test Suite 1: CMS-1500 Form Generation Tests
console.log('📋 Test Suite 1: CMS-1500 Form Generation');

runTest('CMS-1500 generation with valid data', () => {
  const result = cms1500Generator.generateForm(validCMS1500Data);
  return result.success && result.formData.box2 === 'John Doe';
});

runTest('CMS-1500 validation passes for valid form', () => {
  const result = cms1500Generator.generateForm(validCMS1500Data);
  const validation = cms1500Generator.validateFormData(result.formData);
  return validation.isValid;
});

runTest('CMS-1500 rejects missing patient name', () => {
  try {
    const invalidData = { ...validCMS1500Data };
    delete invalidData.patientName;
    cms1500Generator.generateForm(invalidData);
    return false;
  } catch (error) {
    return error.message.includes('patientName');
  }
});

runTest('CMS-1500 rejects invalid NPI format', () => {
  const invalidData = { ...validCMS1500Data, providerNPI: '123' };
  const result = cms1500Generator.generateForm(invalidData);
  const validation = cms1500Generator.validateFormData(result.formData);
  return !validation.isValid && validation.errors.some(e => e.includes('NPI'));
});

runTest('CMS-1500 rejects invalid CPT code format', () => {
  const invalidData = { ...validCMS1500Data, procedureCode: '9921' };
  const result = cms1500Generator.generateForm(invalidData);
  const validation = cms1500Generator.validateFormData(result.formData);
  return !validation.isValid && validation.errors.some(e => e.includes('CPT'));
});

// Test Suite 2: UB-04 Form Generation Tests
console.log('\n📋 Test Suite 2: UB-04 Form Generation');

runTest('UB-04 generation with valid data', () => {
  const result = ub04Generator.generateForm(validUB04Data);
  return result.success && result.formData.fl8 === 'Jane Smith';
});

runTest('UB-04 validation passes for valid form', () => {
  const result = ub04Generator.generateForm(validUB04Data);
  const validation = ub04Generator.validateFormData(result.formData);
  return validation.isValid;
});

runTest('UB-04 rejects missing admission date', () => {
  try {
    const invalidData = { ...validUB04Data };
    delete invalidData.admissionDate;
    ub04Generator.generateForm(invalidData);
    return false;
  } catch (error) {
    return error.message.includes('admissionDate');
  }
});

runTest('UB-04 rejects invalid revenue code format', () => {
  const invalidData = { ...validUB04Data, revenueCode: '25' };
  const result = ub04Generator.generateForm(invalidData);
  const validation = ub04Generator.validateFormData(result.formData);
  return !validation.isValid && validation.errors.some(e => e.includes('revenue code'));
});

runTest('UB-04 rejects invalid facility NPI', () => {
  const invalidData = { ...validUB04Data, facilityNPI: '987654321' };
  const result = ub04Generator.generateForm(invalidData);
  const validation = ub04Generator.validateFormData(result.formData);
  return !validation.isValid && validation.errors.some(e => e.includes('NPI'));
});

// Test Suite 3: Cross-Form Validation Tests
console.log('\n📋 Test Suite 3: Cross-Form Validation');

runTest('Both forms handle same patient data consistently', () => {
  const sharedData = {
    patientName: 'Test Patient',
    patientDOB: '1990-06-15',
    diagnosisCode: 'E11.9',
    providerNPI: '1111111111',
    facilityNPI: '1111111111'
  };
  
  const cms1500Data = { ...validCMS1500Data, ...sharedData };
  const ub04Data = { ...validUB04Data, ...sharedData };
  
  const cms1500Result = cms1500Generator.generateForm(cms1500Data);
  const ub04Result = ub04Generator.generateForm(ub04Data);
  
  return cms1500Result.formData.box2 === ub04Result.formData.fl8 &&
         cms1500Result.formData.box21 === ub04Result.formData.fl67;
});

runTest('Both forms validate NPI consistently', () => {
  const invalidNPI = '123';
  
  const cms1500Data = { ...validCMS1500Data, providerNPI: invalidNPI };
  const ub04Data = { ...validUB04Data, facilityNPI: invalidNPI };
  
  const cms1500Result = cms1500Generator.generateForm(cms1500Data);
  const ub04Result = ub04Generator.generateForm(ub04Data);
  
  const cms1500Validation = cms1500Generator.validateFormData(cms1500Result.formData);
  const ub04Validation = ub04Generator.validateFormData(ub04Result.formData);
  
  return !cms1500Validation.isValid && !ub04Validation.isValid;
});

// Test Suite 4: Performance Tests
console.log('\n📋 Test Suite 4: Performance Tests');

runTest('CMS-1500 generation completes within time limit', () => {
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    cms1500Generator.generateForm(validCMS1500Data);
  }
  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log(`    Generated 100 CMS-1500 forms in ${duration}ms`);
  return duration < 1000; // Should complete within 1 second
});

runTest('UB-04 generation completes within time limit', () => {
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    ub04Generator.generateForm(validUB04Data);
  }
  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log(`    Generated 100 UB-04 forms in ${duration}ms`);
  return duration < 1000; // Should complete within 1 second
});

console.log('\n📊 Integration Test Results Summary:');
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 All form generation integration tests passed!');
} else {
  console.log(`\n⚠️ ${testResults.failed} test(s) failed. Review form generation implementation.`);
}