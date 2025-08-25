/**
 * Enhanced RCM Utils Tests
 * Comprehensive test suite for RCM utility functions with edge cases and performance testing
 */

const rcmUtils = require('../rcmUtils');

describe('Enhanced RCM Utils Tests', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(rcmUtils.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(rcmUtils.formatCurrency(0.99)).toBe('$0.99');
      expect(rcmUtils.formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should handle zero and negative amounts', () => {
      expect(rcmUtils.formatCurrency(0)).toBe('$0.00');
      expect(rcmUtils.formatCurrency(-100.50)).toBe('-$100.50');
      expect(rcmUtils.formatCurrency(-0.01)).toBe('-$0.01');
    });

    it('should handle edge cases and invalid inputs', () => {
      expect(rcmUtils.formatCurrency(null)).toBe('$0.00');
      expect(rcmUtils.formatCurrency(undefined)).toBe('$0.00');
      expect(rcmUtils.formatCurrency('')).toBe('$0.00');
      expect(rcmUtils.formatCurrency('invalid')).toBe('$0.00');
      expect(rcmUtils.formatCurrency(NaN)).toBe('$0.00');
      expect(rcmUtils.formatCurrency(Infinity)).toBe('$0.00');
    });

    it('should handle very large and very small numbers', () => {
      expect(rcmUtils.formatCurrency(999999999.99)).toBe('$999,999,999.99');
      expect(rcmUtils.formatCurrency(0.001)).toBe('$0.00'); // Rounds to 2 decimals
      expect(rcmUtils.formatCurrency(0.005)).toBe('$0.01'); // Rounds up
    });

    it('should handle different currency options', () => {
      expect(rcmUtils.formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
      expect(rcmUtils.formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
      expect(rcmUtils.formatCurrency(1234.56, 'JPY')).toBe('¥1,235'); // No decimals for JPY
    });
  });

  describe('formatDate', () => {
    it('should format valid dates correctly', () => {
      const date = new Date('2023-01-15T10:30:00Z');
      expect(rcmUtils.formatDate(date)).toBe('01/15/2023');
      expect(rcmUtils.formatDate(date, 'YYYY-MM-DD')).toBe('2023-01-15');
      expect(rcmUtils.formatDate(date, 'MM/DD/YY')).toBe('01/15/23');
    });

    it('should handle string date inputs', () => {
      expect(rcmUtils.formatDate('2023-01-15')).toBe('01/15/2023');
      expect(rcmUtils.formatDate('2023-12-31T23:59:59Z')).toBe('12/31/2023');
      expect(rcmUtils.formatDate('01/15/2023')).toBe('01/15/2023');
    });

    it('should handle invalid dates', () => {
      expect(rcmUtils.formatDate(null)).toBe('');
      expect(rcmUtils.formatDate(undefined)).toBe('');
      expect(rcmUtils.formatDate('')).toBe('');
      expect(rcmUtils.formatDate('invalid-date')).toBe('');
      expect(rcmUtils.formatDate(NaN)).toBe('');
    });

    it('should handle edge date cases', () => {
      expect(rcmUtils.formatDate('1900-01-01')).toBe('01/01/1900');
      expect(rcmUtils.formatDate('2099-12-31')).toBe('12/31/2099');
      expect(rcmUtils.formatDate('2000-02-29')).toBe('02/29/2000'); // Leap year
    });

    it('should handle timezone considerations', () => {
      const utcDate = new Date('2023-01-15T00:00:00Z');
      const localDate = new Date('2023-01-15T12:00:00');
      
      expect(rcmUtils.formatDate(utcDate)).toBe('01/15/2023');
      expect(rcmUtils.formatDate(localDate)).toBe('01/15/2023');
    });
  });

  describe('calculateDaysInAR', () => {
    it('should calculate days correctly for recent dates', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      expect(rcmUtils.calculateDaysInAR(today)).toBe(0);
      expect(rcmUtils.calculateDaysInAR(yesterday)).toBe(1);
      expect(rcmUtils.calculateDaysInAR(weekAgo)).toBe(7);
    });

    it('should handle string date inputs', () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const yesterdayString = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      expect(rcmUtils.calculateDaysInAR(todayString)).toBe(0);
      expect(rcmUtils.calculateDaysInAR(yesterdayString)).toBe(1);
    });

    it('should handle future dates', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(rcmUtils.calculateDaysInAR(tomorrow)).toBe(0); // Future dates return 0
    });

    it('should handle invalid dates', () => {
      expect(rcmUtils.calculateDaysInAR(null)).toBe(0);
      expect(rcmUtils.calculateDaysInAR(undefined)).toBe(0);
      expect(rcmUtils.calculateDaysInAR('')).toBe(0);
      expect(rcmUtils.calculateDaysInAR('invalid-date')).toBe(0);
    });

    it('should handle edge cases', () => {
      const veryOldDate = new Date('1900-01-01');
      const result = rcmUtils.calculateDaysInAR(veryOldDate);
      expect(result).toBeGreaterThan(40000); // Should be a very large number
      expect(typeof result).toBe('number');
    });
  });

  describe('validateClaimData', () => {
    it('should validate complete claim data', () => {
      const validClaim = {
        patientId: 1,
        providerId: 1,
        serviceDate: '2023-01-15',
        diagnosis: 'Z00.00',
        procedure: '99213',
        amount: 150.00
      };
      
      const result = rcmUtils.validateClaimData(validClaim);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const incompleteClaim = {
        patientId: 1,
        serviceDate: '2023-01-15'
        // Missing required fields
      };
      
      const result = rcmUtils.validateClaimData(incompleteClaim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('providerId is required');
      expect(result.errors).toContain('diagnosis is required');
      expect(result.errors).toContain('procedure is required');
      expect(result.errors).toContain('amount is required');
    });

    it('should validate field formats', () => {
      const invalidClaim = {
        patientId: 'invalid',
        providerId: -1,
        serviceDate: 'invalid-date',
        diagnosis: 'INVALID',
        procedure: '123',
        amount: -50
      };
      
      const result = rcmUtils.validateClaimData(invalidClaim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('patientId must be a positive integer');
      expect(result.errors).toContain('providerId must be a positive integer');
      expect(result.errors).toContain('serviceDate must be a valid date');
      expect(result.errors).toContain('diagnosis must be valid ICD-10 format');
      expect(result.errors).toContain('procedure must be valid CPT format');
      expect(result.errors).toContain('amount must be positive');
    });

    it('should validate business rules', () => {
      const futureClaim = {
        patientId: 1,
        providerId: 1,
        serviceDate: '2025-01-15', // Future date
        diagnosis: 'Z00.00',
        procedure: '99213',
        amount: 150.00
      };
      
      const result = rcmUtils.validateClaimData(futureClaim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('serviceDate cannot be in the future');
    });

    it('should handle null and undefined inputs', () => {
      expect(rcmUtils.validateClaimData(null).isValid).toBe(false);
      expect(rcmUtils.validateClaimData(undefined).isValid).toBe(false);
      expect(rcmUtils.validateClaimData({}).isValid).toBe(false);
    });
  });

  describe('calculateARBucket', () => {
    it('should categorize days into correct buckets', () => {
      expect(rcmUtils.calculateARBucket(0)).toBe('0-30');
      expect(rcmUtils.calculateARBucket(15)).toBe('0-30');
      expect(rcmUtils.calculateARBucket(30)).toBe('0-30');
      expect(rcmUtils.calculateARBucket(31)).toBe('31-60');
      expect(rcmUtils.calculateARBucket(45)).toBe('31-60');
      expect(rcmUtils.calculateARBucket(60)).toBe('31-60');
      expect(rcmUtils.calculateARBucket(61)).toBe('61-90');
      expect(rcmUtils.calculateARBucket(90)).toBe('61-90');
      expect(rcmUtils.calculateARBucket(91)).toBe('90+');
      expect(rcmUtils.calculateARBucket(365)).toBe('90+');
    });

    it('should handle edge cases', () => {
      expect(rcmUtils.calculateARBucket(-1)).toBe('0-30'); // Negative days default to 0-30
      expect(rcmUtils.calculateARBucket(null)).toBe('0-30');
      expect(rcmUtils.calculateARBucket(undefined)).toBe('0-30');
      expect(rcmUtils.calculateARBucket('invalid')).toBe('0-30');
    });
  });

  describe('generateClaimNumber', () => {
    it('should generate unique claim numbers', () => {
      const claim1 = rcmUtils.generateClaimNumber('PROV001');
      const claim2 = rcmUtils.generateClaimNumber('PROV001');
      
      expect(claim1).toMatch(/^PROV001-\d{4}-\d{6}$/);
      expect(claim2).toMatch(/^PROV001-\d{4}-\d{6}$/);
      expect(claim1).not.toBe(claim2);
    });

    it('should include year and sequence', () => {
      const currentYear = new Date().getFullYear();
      const claimNumber = rcmUtils.generateClaimNumber('TEST');
      
      expect(claimNumber).toContain(currentYear.toString());
      expect(claimNumber).toMatch(/^TEST-\d{4}-\d{6}$/);
    });

    it('should handle invalid provider codes', () => {
      expect(() => rcmUtils.generateClaimNumber(null)).toThrow('Provider code is required');
      expect(() => rcmUtils.generateClaimNumber('')).toThrow('Provider code is required');
      expect(() => rcmUtils.generateClaimNumber(123)).toThrow('Provider code must be a string');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE claims; --";
      const sanitized = rcmUtils.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain(';');
    });

    it('should sanitize XSS attempts', () => {
      const xssInput = '<script>alert("xss")</script>';
      const sanitized = rcmUtils.sanitizeInput(xssInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should preserve valid input', () => {
      const validInput = 'Patient John Doe, DOB: 01/15/1990';
      const sanitized = rcmUtils.sanitizeInput(validInput);
      
      expect(sanitized).toBe(validInput);
    });

    it('should handle various input types', () => {
      expect(rcmUtils.sanitizeInput(null)).toBe('');
      expect(rcmUtils.sanitizeInput(undefined)).toBe('');
      expect(rcmUtils.sanitizeInput(123)).toBe('123');
      expect(rcmUtils.sanitizeInput(true)).toBe('true');
    });
  });

  describe('calculateCollectionPriority', () => {
    it('should calculate priority based on amount and age', () => {
      const highPriority = rcmUtils.calculateCollectionPriority(1000, 90);
      const mediumPriority = rcmUtils.calculateCollectionPriority(500, 60);
      const lowPriority = rcmUtils.calculateCollectionPriority(100, 30);
      
      expect(highPriority).toBeGreaterThan(mediumPriority);
      expect(mediumPriority).toBeGreaterThan(lowPriority);
    });

    it('should handle edge cases', () => {
      expect(rcmUtils.calculateCollectionPriority(0, 90)).toBe(0);
      expect(rcmUtils.calculateCollectionPriority(1000, 0)).toBeGreaterThan(0);
      expect(rcmUtils.calculateCollectionPriority(-100, 30)).toBe(0);
      expect(rcmUtils.calculateCollectionPriority(100, -30)).toBe(0);
    });

    it('should return consistent results', () => {
      const priority1 = rcmUtils.calculateCollectionPriority(500, 60);
      const priority2 = rcmUtils.calculateCollectionPriority(500, 60);
      
      expect(priority1).toBe(priority2);
    });
  });

  describe('parseERAData', () => {
    it('should parse valid ERA data', () => {
      const eraData = `
        ST*835*0001*20230115~
        BPR*I*1500.00*C*ACH*CCP*01*123456789*DA*987654321~
        CLP*CLM001*1*150.00*120.00*30.00*12*20230115*PROV001~
      `;
      
      const result = rcmUtils.parseERAData(eraData);
      
      expect(result.isValid).toBe(true);
      expect(result.totalAmount).toBe(1500.00);
      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].claimNumber).toBe('CLM001');
    });

    it('should handle invalid ERA format', () => {
      const invalidERA = 'Invalid ERA data';
      const result = rcmUtils.parseERAData(invalidERA);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid ERA format');
    });

    it('should handle empty or null input', () => {
      expect(rcmUtils.parseERAData(null).isValid).toBe(false);
      expect(rcmUtils.parseERAData('').isValid).toBe(false);
      expect(rcmUtils.parseERAData(undefined).isValid).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = Date.now();
      
      // Process 10,000 currency formatting operations
      for (let i = 0; i < 10000; i++) {
        rcmUtils.formatCurrency(Math.random() * 10000);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve(rcmUtils.calculateDaysInAR(new Date(Date.now() - i * 24 * 60 * 60 * 1000)))
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result).toBe(index);
      });
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks with repeated operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        rcmUtils.formatCurrency(i);
        rcmUtils.formatDate(new Date());
        rcmUtils.calculateDaysInAR(new Date());
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Boundary Tests', () => {
    it('should handle circular references in objects', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;
      
      expect(() => rcmUtils.sanitizeInput(circularObj)).not.toThrow();
    });

    it('should handle extremely large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const result = rcmUtils.formatCurrency(largeNumber);
      
      expect(result).toContain('$');
      expect(typeof result).toBe('string');
    });

    it('should handle date edge cases', () => {
      const invalidDate = new Date('invalid');
      expect(rcmUtils.formatDate(invalidDate)).toBe('');
      expect(rcmUtils.calculateDaysInAR(invalidDate)).toBe(0);
    });
  });

  describe('Stress Tests', () => {
    it('should handle rapid successive calls', () => {
      const results = [];
      
      for (let i = 0; i < 1000; i++) {
        results.push(rcmUtils.generateClaimNumber('STRESS'));
      }
      
      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(results.length);
    });

    it('should maintain accuracy under load', () => {
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        amount: i * 10.5,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      }));
      
      testData.forEach((data, index) => {
        const formattedAmount = rcmUtils.formatCurrency(data.amount);
        const daysInAR = rcmUtils.calculateDaysInAR(data.date);
        
        expect(formattedAmount).toContain('$');
        expect(daysInAR).toBe(index);
      });
    });
  });
});