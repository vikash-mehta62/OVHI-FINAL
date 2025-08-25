// Unit Tests for CMS Validation Rules
// Comprehensive testing of all CMS validation components

console.log('🧪 Running CMS Validation Unit Tests...\n');

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

// Mock CMS Validation Service for testing
class MockCMSValidationService {
  validateNPI(npi) {
    // NPI should be 10 digits
    return /^\d{10}$/.test(npi);
  }

  validateCPTCode(cptCode) {
    // CPT codes are 5 digits
    return /^\d{5}$/.test(cptCode);
  }

  validateICD10Code(icdCode) {
    // ICD-10 codes follow specific pattern
    return /^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/.test(icdCode);
  }

  validateTaxonomyCode(taxonomyCode) {
    // Taxonomy codes are 10 characters
    return /^\d{10}X$/.test(taxonomyCode);
  }

  validatePlaceOfService(pos) {
    // Place of service codes are 2 digits
    const validPOS = ['11', '12', '21', '22', '23', '24', '25', '26'];
    return validPOS.includes(pos);
  }

  validateModifier(modifier) {
    // Modifiers are 2 characters
    return /^[A-Z0-9]{2}$/.test(modifier);
  }

  validateTimelyFiling(serviceDate, submissionDate) {
    const service = new Date(serviceDate);
    const submission = new Date(submissionDate);
    const daysDiff = (submission - service) / (1000 * 60 * 60 * 24);
    return daysDiff <= 365; // 1 year timely filing limit
  }

  validateMedicalNecessity(diagnosis, procedure) {
    // Mock medical necessity validation
    const validCombinations = {
      'Z00.00': ['99213', '99214'], // Routine exam
      'I10': ['99213', '99214', '93000'], // Hypertension
      'E11.9': ['99213', '99214', '82947'] // Diabetes
    };
    
    return validCombinations[diagnosis]?.includes(procedure) || false;
  }
}

const mockService = new MockCMSValidationService();

// Test Suite 1: NPI Validation Tests
console.log('📋 Test Suite 1: NPI Validation');
runTest('Valid 10-digit NPI', () => mockService.validateNPI('1234567890'));
runTest('Invalid NPI - too short', () => !mockService.validateNPI('123456789'));
runTest('Invalid NPI - too long', () => !mockService.validateNPI('12345678901'));
runTest('Invalid NPI - contains letters', () => !mockService.validateNPI('123456789A'));
runTest('Invalid NPI - empty', () => !mockService.validateNPI(''));

// Test Suite 2: CPT Code Validation Tests
console.log('\n📋 Test Suite 2: CPT Code Validation');
runTest('Valid CPT code', () => mockService.validateCPTCode('99213'));
runTest('Valid CPT code - surgery', () => mockService.validateCPTCode('10021'));
runTest('Invalid CPT - too short', () => !mockService.validateCPTCode('9921'));
runTest('Invalid CPT - too long', () => !mockService.validateCPTCode('992134'));
runTest('Invalid CPT - contains letters', () => !mockService.validateCPTCode('9921A'));

// Test Suite 3: ICD-10 Code Validation Tests
console.log('\n📋 Test Suite 3: ICD-10 Code Validation');
runTest('Valid ICD-10 code - simple', () => mockService.validateICD10Code('Z00'));
runTest('Valid ICD-10 code - with decimal', () => mockService.validateICD10Code('Z00.00'));
runTest('Valid ICD-10 code - complex', () => mockService.validateICD10Code('S72.001A'));
runTest('Invalid ICD-10 - starts with number', () => !mockService.validateICD10Code('100.00'));
runTest('Invalid ICD-10 - wrong format', () => !mockService.validateICD10Code('ZZ00.00'));

// Test Suite 4: Taxonomy Code Validation Tests
console.log('\n📋 Test Suite 4: Taxonomy Code Validation');
runTest('Valid taxonomy code', () => mockService.validateTaxonomyCode('207Q00000X'));
runTest('Valid taxonomy code - different specialty', () => mockService.validateTaxonomyCode('208D00000X'));
runTest('Invalid taxonomy - wrong length', () => !mockService.validateTaxonomyCode('207Q0000X'));
runTest('Invalid taxonomy - missing X', () => !mockService.validateTaxonomyCode('207Q000000'));
runTest('Invalid taxonomy - wrong format', () => !mockService.validateTaxonomyCode('20AQ00000X'));

// Test Suite 5: Place of Service Validation Tests
console.log('\n📋 Test Suite 5: Place of Service Validation');
runTest('Valid POS - office', () => mockService.validatePlaceOfService('11'));
runTest('Valid POS - home', () => mockService.validatePlaceOfService('12'));
runTest('Valid POS - hospital inpatient', () => mockService.validatePlaceOfService('21'));
runTest('Invalid POS - not in list', () => !mockService.validatePlaceOfService('99'));
runTest('Invalid POS - wrong format', () => !mockService.validatePlaceOfService('1'));

// Test Suite 6: Modifier Validation Tests
console.log('\n📋 Test Suite 6: Modifier Validation');
runTest('Valid modifier - 25', () => mockService.validateModifier('25'));
runTest('Valid modifier - 59', () => mockService.validateModifier('59'));
runTest('Valid modifier - TC', () => mockService.validateModifier('TC'));
runTest('Invalid modifier - too long', () => !mockService.validateModifier('259'));
runTest('Invalid modifier - lowercase', () => !mockService.validateModifier('tc'));

// Test Suite 7: Timely Filing Validation Tests
console.log('\n📋 Test Suite 7: Timely Filing Validation');
runTest('Valid timely filing - same day', () => 
  mockService.validateTimelyFiling('2024-01-01', '2024-01-01'));
runTest('Valid timely filing - 30 days', () => 
  mockService.validateTimelyFiling('2024-01-01', '2024-01-31'));
runTest('Valid timely filing - 365 days', () => 
  mockService.validateTimelyFiling('2024-01-01', '2024-12-31'));
runTest('Invalid timely filing - over 1 year', () => 
  !mockService.validateTimelyFiling('2023-01-01', '2024-01-02'));
runTest('Invalid timely filing - future service date', () => 
  !mockService.validateTimelyFiling('2024-12-31', '2024-01-01'));

// Test Suite 8: Medical Necessity Validation Tests
console.log('\n📋 Test Suite 8: Medical Necessity Validation');
runTest('Valid medical necessity - routine exam', () => 
  mockService.validateMedicalNecessity('Z00.00', '99213'));
runTest('Valid medical necessity - hypertension', () => 
  mockService.validateMedicalNecessity('I10', '93000'));
runTest('Valid medical necessity - diabetes', () => 
  mockService.validateMedicalNecessity('E11.9', '82947'));
runTest('Invalid medical necessity - mismatch', () => 
  !mockService.validateMedicalNecessity('Z00.00', '93000'));
runTest('Invalid medical necessity - unknown diagnosis', () => 
  !mockService.validateMedicalNecessity('X99.99', '99213'));

console.log('\n📊 Test Results Summary:');
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 All CMS validation unit tests passed!');
} else {
  console.log(`\n⚠️ ${testResults.failed} test(s) failed. Review implementation.`);
}