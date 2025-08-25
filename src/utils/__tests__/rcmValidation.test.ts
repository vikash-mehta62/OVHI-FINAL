import {
  validatePatientInfo,
  validateClaimInfo,
  validateInsuranceInfo,
  validatePaymentInfo,
  isValidSSN,
  isValidPhoneNumber,
  isValidEmail,
  isValidCPTCode,
  isValidDiagnosisCode,
  validateDateRange,
  validateAmountRange,
  sanitizeInput,
  validateSearchQuery
} from '../rcmValidation';

describe('RCM Validation', () => {
  describe('validatePatientInfo', () => {
    it('should validate complete patient info', () => {
      const patient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        ssn: '123-45-6789',
        phone: '(555) 123-4567',
        email: 'john.doe@example.com'
      };

      const result = validatePatientInfo(patient);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require first and last name', () => {
      const patient = {
        dateOfBirth: '1990-01-15'
      };

      const result = validatePatientInfo(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('First name is required');
      expect(result.errors).toContain('Last name is required');
    });

    it('should validate date of birth', () => {
      const patient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: 'invalid-date'
      };

      const result = validatePatientInfo(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('should validate age range', () => {
      const patient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1800-01-15' // Too old
      };

      const result = validatePatientInfo(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth - age must be between 0 and 150');
    });

    it('should validate SSN format', () => {
      const patient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        ssn: '123-45-678' // Invalid format
      };

      const result = validatePatientInfo(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Social Security Number format');
    });

    it('should validate email format', () => {
      const patient = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        email: 'invalid-email'
      };

      const result = validatePatientInfo(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email address format');
    });
  });

  describe('validateClaimInfo', () => {
    it('should validate complete claim info', () => {
      const claim = {
        patientId: 'PAT-001',
        serviceDate: '2024-01-15',
        cptCodes: ['99213', '90834'],
        diagnosisCodes: ['F32.9', 'Z71.1'],
        amount: 250.00,
        payerName: 'Blue Cross Blue Shield'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require patient ID', () => {
      const claim = {
        serviceDate: '2024-01-15',
        cptCodes: ['99213'],
        diagnosisCodes: ['F32.9'],
        amount: 250.00,
        payerName: 'Blue Cross'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Patient ID is required');
    });

    it('should validate service date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const claim = {
        patientId: 'PAT-001',
        serviceDate: futureDate.toISOString(),
        cptCodes: ['99213'],
        diagnosisCodes: ['F32.9'],
        amount: 250.00,
        payerName: 'Blue Cross'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service date cannot be in the future');
    });

    it('should validate CPT codes', () => {
      const claim = {
        patientId: 'PAT-001',
        serviceDate: '2024-01-15',
        cptCodes: ['9921', '99213'], // First code is invalid (4 digits)
        diagnosisCodes: ['F32.9'],
        amount: 250.00,
        payerName: 'Blue Cross'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid CPT code at position 1: 9921');
    });

    it('should validate diagnosis codes', () => {
      const claim = {
        patientId: 'PAT-001',
        serviceDate: '2024-01-15',
        cptCodes: ['99213'],
        diagnosisCodes: ['F32', 'INVALID'], // Invalid formats
        amount: 250.00,
        payerName: 'Blue Cross'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid diagnosis code at position 1: F32');
      expect(result.errors).toContain('Invalid diagnosis code at position 2: INVALID');
    });

    it('should validate claim amount', () => {
      const claim = {
        patientId: 'PAT-001',
        serviceDate: '2024-01-15',
        cptCodes: ['99213'],
        diagnosisCodes: ['F32.9'],
        amount: 0,
        payerName: 'Blue Cross'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Claim amount must be greater than zero');
    });

    it('should warn about high amounts', () => {
      const claim = {
        patientId: 'PAT-001',
        serviceDate: '2024-01-15',
        cptCodes: ['99213'],
        diagnosisCodes: ['F32.9'],
        amount: 150000, // Very high amount
        payerName: 'Blue Cross'
      };

      const result = validateClaimInfo(claim);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Claim amount is unusually high - please verify');
    });
  });

  describe('isValidSSN', () => {
    it('should validate correct SSN formats', () => {
      expect(isValidSSN('123-45-6789')).toBe(true);
      expect(isValidSSN('123456789')).toBe(true);
      expect(isValidSSN('123 45 6789')).toBe(true);
    });

    it('should reject invalid SSN formats', () => {
      expect(isValidSSN('123-45-678')).toBe(false);
      expect(isValidSSN('123-456-789')).toBe(false);
      expect(isValidSSN('abc-de-fghi')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct phone formats', () => {
      expect(isValidPhoneNumber('1234567890')).toBe(true);
      expect(isValidPhoneNumber('(123) 456-7890')).toBe(true);
      expect(isValidPhoneNumber('123-456-7890')).toBe(true);
      expect(isValidPhoneNumber('+1 123 456 7890')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abc-def-ghij')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
    });
  });

  describe('isValidCPTCode', () => {
    it('should validate correct CPT codes', () => {
      expect(isValidCPTCode('99213')).toBe(true);
      expect(isValidCPTCode('90834')).toBe(true);
      expect(isValidCPTCode('12345')).toBe(true);
    });

    it('should reject invalid CPT codes', () => {
      expect(isValidCPTCode('9921')).toBe(false); // Too short
      expect(isValidCPTCode('992134')).toBe(false); // Too long
      expect(isValidCPTCode('9921A')).toBe(false); // Contains letter
      expect(isValidCPTCode('')).toBe(false); // Empty
    });
  });

  describe('isValidDiagnosisCode', () => {
    it('should validate correct ICD-10 codes', () => {
      expect(isValidDiagnosisCode('F32.9')).toBe(true);
      expect(isValidDiagnosisCode('Z71.1')).toBe(true);
      expect(isValidDiagnosisCode('M79.3')).toBe(true);
      expect(isValidDiagnosisCode('A01')).toBe(true); // Without decimal
    });

    it('should reject invalid ICD-10 codes', () => {
      expect(isValidDiagnosisCode('F32')).toBe(false); // Missing third digit
      expect(isValidDiagnosisCode('32.9')).toBe(false); // Missing letter
      expect(isValidDiagnosisCode('FF32.9')).toBe(false); // Two letters
      expect(isValidDiagnosisCode('F32.ABCDE')).toBe(false); // Too many chars after decimal
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date ranges', () => {
      const result = validateDateRange('2024-01-01', '2024-01-31');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid date ranges', () => {
      const result = validateDateRange('2024-01-31', '2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });

    it('should reject invalid dates', () => {
      const result = validateDateRange('invalid-date', '2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start date');
    });
  });

  describe('validateAmountRange', () => {
    it('should validate correct amount ranges', () => {
      const result = validateAmountRange(100, 1000);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative amounts', () => {
      const result = validateAmountRange(-100, 1000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum amount cannot be negative');
    });

    it('should reject invalid ranges', () => {
      const result = validateAmountRange(1000, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum amount must be less than or equal to maximum amount');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('test"value')).toBe('testvalue');
      expect(sanitizeInput("test'value")).toBe('testvalue');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test value  ')).toBe('test value');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(300);
      const result = sanitizeInput(longString);
      expect(result.length).toBe(255);
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate correct search queries', () => {
      expect(validateSearchQuery('test query')).toBe('test query');
      expect(validateSearchQuery('patient name')).toBe('patient name');
    });

    it('should reject short queries', () => {
      expect(validateSearchQuery('a')).toBe(null);
      expect(validateSearchQuery('')).toBe(null);
      expect(validateSearchQuery('  ')).toBe(null);
    });

    it('should sanitize and validate', () => {
      expect(validateSearchQuery('<script>test</script>')).toBe('scripttest/script');
      expect(validateSearchQuery('  valid query  ')).toBe('valid query');
    });

    it('should reject queries that become too short after sanitization', () => {
      expect(validateSearchQuery('<>')).toBe(null);
    });
  });
});