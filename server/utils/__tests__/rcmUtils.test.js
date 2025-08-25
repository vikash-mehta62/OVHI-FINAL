const {
  formatCurrency,
  formatDate,
  calculateDaysInAR,
  validateClaimData,
  calculateCollectionRate,
  calculateDenialRate,
  getAgingBucket,
  getCollectabilityScore,
  getClaimRecommendations
} = require('../rcmUtils');

describe('RCM Utilities', () => {
  describe('formatCurrency', () => {
    it('should format valid numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('should handle string inputs', () => {
      expect(formatCurrency('1234.56')).toBe('$1,234.56');
      expect(formatCurrency('0')).toBe('$0.00');
    });

    it('should handle null/undefined/empty values', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency('')).toBe('$0.00');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(formatCurrency('invalid')).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    it('should support different currencies', () => {
      expect(formatCurrency(100, 'EUR')).toContain('100');
    });
  });

  describe('formatDate', () => {
    it('should format valid dates correctly', () => {
      expect(formatDate('2024-01-15')).toBe('01/15/2024');
      expect(formatDate(new Date('2024-01-15'))).toBe('01/15/2024');
    });

    it('should handle different formats', () => {
      expect(formatDate('2024-01-15', 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate('2024-01-15', 'MMM DD, YYYY')).toBe('Jan 15, 2024');
    });

    it('should handle null/undefined values', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('calculateDaysInAR', () => {
    it('should calculate days correctly', () => {
      const serviceDate = new Date('2024-01-01');
      const currentDate = new Date('2024-01-31');
      expect(calculateDaysInAR(serviceDate, currentDate)).toBe(30);
    });

    it('should handle string dates', () => {
      expect(calculateDaysInAR('2024-01-01', '2024-01-31')).toBe(30);
    });

    it('should return 0 for invalid dates', () => {
      expect(calculateDaysInAR('invalid', '2024-01-31')).toBe(0);
      expect(calculateDaysInAR(null)).toBe(0);
    });

    it('should ensure non-negative results', () => {
      expect(calculateDaysInAR('2024-01-31', '2024-01-01')).toBe(0);
    });
  });

  describe('validateClaimData', () => {
    const validClaim = {
      patient_id: 123,
      procedure_code: '12345',
      total_amount: 100.50,
      service_date: '2024-01-15'
    };

    it('should validate correct claim data', () => {
      const result = validateClaimData(validClaim);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing required fields', () => {
      const invalidClaim = { patient_id: 123 };
      const result = validateClaimData(invalidClaim);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: procedure_code');
    });

    it('should validate data types', () => {
      const invalidClaim = {
        ...validClaim,
        patient_id: 'invalid',
        total_amount: -100,
        procedure_code: '123' // Too short
      };
      const result = validateClaimData(invalidClaim);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCollectionRate', () => {
    it('should calculate rate correctly', () => {
      expect(calculateCollectionRate(800, 1000)).toBe(80.0);
      expect(calculateCollectionRate(750, 1000)).toBe(75.0);
    });

    it('should handle zero denominator', () => {
      expect(calculateCollectionRate(100, 0)).toBe(0);
      expect(calculateCollectionRate(100, null)).toBe(0);
    });

    it('should handle string inputs', () => {
      expect(calculateCollectionRate('800', '1000')).toBe(80.0);
    });
  });

  describe('calculateDenialRate', () => {
    it('should calculate rate correctly', () => {
      expect(calculateDenialRate(5, 100)).toBe(5.0);
      expect(calculateDenialRate(15, 100)).toBe(15.0);
    });

    it('should handle zero denominator', () => {
      expect(calculateDenialRate(5, 0)).toBe(0);
    });
  });

  describe('getAgingBucket', () => {
    it('should return correct buckets', () => {
      expect(getAgingBucket(15)).toBe('0-30');
      expect(getAgingBucket(45)).toBe('31-60');
      expect(getAgingBucket(75)).toBe('61-90');
      expect(getAgingBucket(105)).toBe('91-120');
      expect(getAgingBucket(150)).toBe('120+');
    });

    it('should handle edge cases', () => {
      expect(getAgingBucket(30)).toBe('0-30');
      expect(getAgingBucket(60)).toBe('31-60');
      expect(getAgingBucket(90)).toBe('61-90');
      expect(getAgingBucket(120)).toBe('91-120');
    });
  });

  describe('getCollectabilityScore', () => {
    it('should return correct scores', () => {
      expect(getCollectabilityScore(15)).toBe(95);
      expect(getCollectabilityScore(45)).toBe(85);
      expect(getCollectabilityScore(75)).toBe(70);
      expect(getCollectabilityScore(105)).toBe(50);
      expect(getCollectabilityScore(150)).toBe(25);
    });
  });

  describe('getClaimRecommendations', () => {
    it('should generate recommendations for overdue claims', () => {
      const claim = {
        service_date: '2023-01-01', // Old date
        status: 1,
        total_amount: 500
      };
      const recommendations = getClaimRecommendations(claim);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('overdue'))).toBe(true);
    });

    it('should generate recommendations for denied claims', () => {
      const claim = {
        service_date: '2024-01-01',
        status: 3, // Denied
        total_amount: 500
      };
      const recommendations = getClaimRecommendations(claim);
      expect(recommendations.some(r => r.includes('appeal'))).toBe(true);
    });

    it('should handle null claim', () => {
      const recommendations = getClaimRecommendations(null);
      expect(recommendations).toEqual([]);
    });
  });
});