import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeProps,
  getPriorityBadgeProps,
  formatPercentage,
  formatLargeNumber,
  getCollectabilityColor,
  formatPhoneNumber,
  truncateText,
  getRelativeTime
} from '../rcmFormatters';

describe('RCM Formatters', () => {
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
    });
  });

  describe('formatDate', () => {
    it('should format valid dates correctly', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toBe('01/15/2024');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBe('01/15/2024');
    });

    it('should handle null/undefined values', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
    });

    it('should accept custom options', () => {
      const result = formatDate('2024-01-15', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      expect(result).toBe('January 15, 2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const result = formatDateTime('2024-01-15T10:30:00');
      expect(result).toContain('01/15/2024');
      expect(result).toContain('10:30');
    });
  });

  describe('getStatusBadgeProps', () => {
    it('should return correct props for known statuses', () => {
      expect(getStatusBadgeProps(0)).toEqual({
        color: 'bg-gray-500',
        text: 'Draft',
        variant: 'secondary'
      });

      expect(getStatusBadgeProps(2)).toEqual({
        color: 'bg-green-500',
        text: 'Paid',
        variant: 'default'
      });

      expect(getStatusBadgeProps(3)).toEqual({
        color: 'bg-red-500',
        text: 'Denied',
        variant: 'destructive'
      });
    });

    it('should handle unknown statuses', () => {
      const result = getStatusBadgeProps(999, 'Custom Status');
      expect(result.text).toBe('Custom Status');
      expect(result.variant).toBe('secondary');
    });
  });

  describe('getPriorityBadgeProps', () => {
    it('should handle processing days as priority', () => {
      expect(getPriorityBadgeProps(35)).toEqual({
        color: 'bg-red-500',
        text: 'Urgent',
        variant: 'destructive'
      });

      expect(getPriorityBadgeProps(20)).toEqual({
        color: 'bg-yellow-500',
        text: 'Normal',
        variant: 'outline'
      });

      expect(getPriorityBadgeProps(5)).toEqual({
        color: 'bg-green-500',
        text: 'Recent',
        variant: 'default'
      });
    });

    it('should handle string priorities', () => {
      expect(getPriorityBadgeProps('urgent')).toEqual({
        color: 'bg-red-500',
        text: 'Urgent',
        variant: 'destructive'
      });

      expect(getPriorityBadgeProps('medium')).toEqual({
        color: 'bg-yellow-500',
        text: 'Medium',
        variant: 'outline'
      });
    });

    it('should handle unknown priorities', () => {
      const result = getPriorityBadgeProps('unknown');
      expect(result.text).toBe('Normal');
      expect(result.variant).toBe('secondary');
    });
  });

  describe('formatPercentage', () => {
    it('should calculate and format percentages', () => {
      expect(formatPercentage(25, 100)).toBe('25.0%');
      expect(formatPercentage(1, 3)).toBe('33.3%');
    });

    it('should handle zero denominator', () => {
      expect(formatPercentage(25, 0)).toBe('0.0%');
    });

    it('should support custom decimal places', () => {
      expect(formatPercentage(1, 3, 2)).toBe('33.33%');
    });
  });

  describe('formatLargeNumber', () => {
    it('should format large numbers with suffixes', () => {
      expect(formatLargeNumber(1500)).toBe('1.5K');
      expect(formatLargeNumber(1500000)).toBe('1.5M');
      expect(formatLargeNumber(1500000000)).toBe('1.5B');
    });

    it('should handle small numbers', () => {
      expect(formatLargeNumber(500)).toBe('500');
      expect(formatLargeNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatLargeNumber(-1500)).toBe('-1.5K');
    });
  });

  describe('getCollectabilityColor', () => {
    it('should return correct color classes', () => {
      expect(getCollectabilityColor(90)).toBe('text-green-600');
      expect(getCollectabilityColor(70)).toBe('text-yellow-600');
      expect(getCollectabilityColor(40)).toBe('text-red-600');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
    });

    it('should handle invalid numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber(null)).toBe('N/A');
      expect(formatPhoneNumber(undefined)).toBe('N/A');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long ...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    it('should handle null/undefined', () => {
      expect(truncateText(null)).toBe('');
      expect(truncateText(undefined)).toBe('');
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      // Mock current time to ensure consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return relative time strings', () => {
      expect(getRelativeTime(new Date('2024-01-15T11:30:00Z'))).toBe('30 minutes ago');
      expect(getRelativeTime(new Date('2024-01-15T10:00:00Z'))).toBe('2 hours ago');
      expect(getRelativeTime(new Date('2024-01-14T12:00:00Z'))).toBe('1 day ago');
    });

    it('should handle very recent times', () => {
      expect(getRelativeTime(new Date('2024-01-15T12:00:00Z'))).toBe('Just now');
    });

    it('should handle null/undefined', () => {
      expect(getRelativeTime(null)).toBe('N/A');
      expect(getRelativeTime(undefined)).toBe('N/A');
    });

    it('should handle invalid dates', () => {
      expect(getRelativeTime('invalid-date')).toBe('Invalid Date');
    });
  });
});  describe(
'calculateDaysBetween', () => {
    it('should calculate days between dates', () => {
      const start = '2024-01-01';
      const end = '2024-01-15';
      expect(calculateDaysBetween(start, end)).toBe(14);
    });

    it('should handle same dates', () => {
      const date = '2024-01-01';
      expect(calculateDaysBetween(date, date)).toBe(0);
    });

    it('should handle invalid dates', () => {
      expect(calculateDaysBetween('invalid', '2024-01-01')).toBe(0);
    });
  });

  describe('formatAgingBucket', () => {
    it('should return correct aging buckets', () => {
      expect(formatAgingBucket(15)).toBe('0-30 days');
      expect(formatAgingBucket(45)).toBe('31-60 days');
      expect(formatAgingBucket(75)).toBe('61-90 days');
      expect(formatAgingBucket(105)).toBe('91-120 days');
      expect(formatAgingBucket(150)).toBe('120+ days');
    });
  });

  describe('getAgingBucketColor', () => {
    it('should return correct color classes', () => {
      expect(getAgingBucketColor(15)).toBe('text-green-600');
      expect(getAgingBucketColor(45)).toBe('text-yellow-600');
      expect(getAgingBucketColor(75)).toBe('text-orange-600');
      expect(getAgingBucketColor(105)).toBe('text-red-600');
      expect(getAgingBucketColor(150)).toBe('text-red-800');
    });
  });

  describe('getCollectionPriority', () => {
    it('should return correct priority levels', () => {
      expect(getCollectionPriority(150, 15000)).toEqual({
        level: 'urgent',
        color: 'text-red-800',
        text: 'Urgent'
      });

      expect(getCollectionPriority(100, 6000)).toEqual({
        level: 'high',
        color: 'text-red-600',
        text: 'High'
      });

      expect(getCollectionPriority(70, 2000)).toEqual({
        level: 'medium',
        color: 'text-orange-600',
        text: 'Medium'
      });

      expect(getCollectionPriority(30, 500)).toEqual({
        level: 'low',
        color: 'text-green-600',
        text: 'Low'
      });
    });
  });

  describe('formatPatientName', () => {
    it('should format patient names correctly', () => {
      expect(formatPatientName('john', 'doe')).toBe('John Doe');
      expect(formatPatientName('JANE', 'SMITH', 'marie')).toBe('Jane Marie Smith');
    });

    it('should handle missing names', () => {
      expect(formatPatientName(null, 'Doe')).toBe('Doe');
      expect(formatPatientName('John', null)).toBe('John');
      expect(formatPatientName(null, null)).toBe('Unknown Patient');
    });

    it('should handle whitespace', () => {
      expect(formatPatientName('  john  ', '  doe  ')).toBe('John Doe');
    });
  });

  describe('formatClaimAmount', () => {
    it('should format claim amounts with status context', () => {
      expect(formatClaimAmount(1000)).toBe('$1,000.00');
      expect(formatClaimAmount(1000, 1000, 'paid')).toBe('$1,000.00 (Paid in Full)');
      expect(formatClaimAmount(1000, 500, 'paid')).toBe('$1,000.00 (Paid: $500.00)');
      expect(formatClaimAmount(1000, undefined, 'denied')).toBe('$1,000.00 (Denied)');
    });
  });

  describe('formatCollectionRate', () => {
    it('should calculate and format collection rates', () => {
      const result = formatCollectionRate(950, 1000);
      expect(result.rate).toBe(95.0);
      expect(result.formatted).toBe('95.0%');
      expect(result.color).toBe('text-green-700');
      expect(result.status).toBe('excellent');
    });

    it('should handle zero billed amount', () => {
      const result = formatCollectionRate(100, 0);
      expect(result.rate).toBe(0);
      expect(result.formatted).toBe('0.0%');
    });
  });

  describe('formatDenialRate', () => {
    it('should calculate and format denial rates', () => {
      const result = formatDenialRate(2, 100);
      expect(result.rate).toBe(2.0);
      expect(result.formatted).toBe('2.0%');
      expect(result.color).toBe('text-green-700');
      expect(result.status).toBe('excellent');
    });

    it('should handle zero total claims', () => {
      const result = formatDenialRate(5, 0);
      expect(result.rate).toBe(0);
      expect(result.formatted).toBe('0.0%');
    });
  });
});

// Import and add tests for new functions
import {
  calculateDaysBetween,
  formatAgingBucket,
  getAgingBucketColor,
  getCollectionPriority,
  formatPatientName,
  formatClaimAmount,
  formatCollectionRate,
  formatDenialRate
} from '../rcmFormatters';