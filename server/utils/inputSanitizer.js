/**
 * Input Sanitization and Validation Utilities
 * Comprehensive input cleaning and security validation
 */

const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

class InputSanitizer {
  constructor() {
    this.sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|"|`)/g,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\b(OR|AND)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/gi
    ];

    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ];

    this.pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi
    ];
  }

  /**
   * Comprehensive input sanitization
   * @param {any} input - Input to sanitize
   * @param {Object} options - Sanitization options
   */
  sanitize(input, options = {}) {
    const {
      allowHTML = false,
      allowSQL = false,
      maxLength = null,
      trimWhitespace = true,
      normalizeUnicode = true,
      removeNullBytes = true
    } = options;

    if (input === null || input === undefined) {
      return input;
    }

    let sanitized = input;

    // Handle different input types
    if (typeof input === 'string') {
      sanitized = this.sanitizeString(input, {
        allowHTML,
        allowSQL,
        maxLength,
        trimWhitespace,
        normalizeUnicode,
        removeNullBytes
      });
    } else if (typeof input === 'object') {
      sanitized = this.sanitizeObject(input, options);
    } else if (Array.isArray(input)) {
      sanitized = this.sanitizeArray(input, options);
    }

    return sanitized;
  }

  /**
   * Sanitize string input
   * @param {string} str - String to sanitize
   * @param {Object} options - Sanitization options
   */
  sanitizeString(str, options = {}) {
    if (typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // Remove null bytes
    if (options.removeNullBytes) {
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Normalize unicode
    if (options.normalizeUnicode) {
      sanitized = sanitized.normalize('NFC');
    }

    // Trim whitespace
    if (options.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Enforce max length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove SQL injection patterns
    if (!options.allowSQL) {
      sanitized = this.removeSQLInjection(sanitized);
    }

    // Remove XSS patterns
    if (!options.allowHTML) {
      sanitized = this.removeXSS(sanitized);
    } else {
      // If HTML is allowed, sanitize it
      sanitized = DOMPurify.sanitize(sanitized);
    }

    // Remove path traversal patterns
    sanitized = this.removePathTraversal(sanitized);

    return sanitized;
  }

  /**
   * Sanitize object recursively
   * @param {Object} obj - Object to sanitize
   * @param {Object} options - Sanitization options
   */
  sanitizeObject(obj, options = {}) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key
      const sanitizedKey = this.sanitizeString(key, { 
        allowHTML: false, 
        allowSQL: false,
        maxLength: 100 
      });

      // Sanitize the value
      sanitized[sanitizedKey] = this.sanitize(value, options);
    }

    return sanitized;
  }

  /**
   * Sanitize array recursively
   * @param {Array} arr - Array to sanitize
   * @param {Object} options - Sanitization options
   */
  sanitizeArray(arr, options = {}) {
    if (!Array.isArray(arr)) {
      return arr;
    }

    return arr.map(item => this.sanitize(item, options));
  }

  /**
   * Remove SQL injection patterns
   * @param {string} str - String to clean
   */
  removeSQLInjection(str) {
    let cleaned = str;

    for (const pattern of this.sqlInjectionPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
  }

  /**
   * Remove XSS patterns
   * @param {string} str - String to clean
   */
  removeXSS(str) {
    let cleaned = str;

    for (const pattern of this.xssPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Additional XSS protection
    cleaned = cleaned
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return cleaned;
  }

  /**
   * Remove path traversal patterns
   * @param {string} str - String to clean
   */
  removePathTraversal(str) {
    let cleaned = str;

    for (const pattern of this.pathTraversalPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const sanitized = this.sanitizeString(email, { maxLength: 254 });
    
    if (!validator.isEmail(sanitized)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true, sanitized };
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Phone number is required' };
    }

    const sanitized = this.sanitizeString(phone, { maxLength: 20 });
    const cleaned = sanitized.replace(/[^\d+\-\(\)\s]/g, '');

    if (!validator.isMobilePhone(cleaned, 'any', { strictMode: false })) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    return { valid: true, sanitized: cleaned };
  }

  /**
   * Validate SSN
   * @param {string} ssn - SSN to validate
   */
  validateSSN(ssn) {
    if (!ssn || typeof ssn !== 'string') {
      return { valid: false, error: 'SSN is required' };
    }

    const sanitized = this.sanitizeString(ssn, { maxLength: 11 });
    const cleaned = sanitized.replace(/[^\d-]/g, '');

    // Basic SSN format validation
    const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssnPattern.test(cleaned)) {
      return { valid: false, error: 'Invalid SSN format' };
    }

    // Format consistently
    const formatted = cleaned.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');

    return { valid: true, sanitized: formatted };
  }

  /**
   * Validate date
   * @param {string} date - Date to validate
   */
  validateDate(date) {
    if (!date) {
      return { valid: false, error: 'Date is required' };
    }

    const sanitized = this.sanitizeString(date.toString(), { maxLength: 10 });

    if (!validator.isDate(sanitized)) {
      return { valid: false, error: 'Invalid date format' };
    }

    const parsedDate = new Date(sanitized);
    if (isNaN(parsedDate.getTime())) {
      return { valid: false, error: 'Invalid date' };
    }

    return { valid: true, sanitized: parsedDate.toISOString().split('T')[0] };
  }

  /**
   * Validate currency amount
   * @param {string|number} amount - Amount to validate
   */
  validateCurrency(amount) {
    if (amount === null || amount === undefined) {
      return { valid: false, error: 'Amount is required' };
    }

    const sanitized = this.sanitizeString(amount.toString(), { maxLength: 20 });
    const cleaned = sanitized.replace(/[^\d.-]/g, '');

    if (!validator.isFloat(cleaned, { min: 0 })) {
      return { valid: false, error: 'Invalid amount format' };
    }

    const parsedAmount = parseFloat(cleaned);
    if (parsedAmount < 0) {
      return { valid: false, error: 'Amount cannot be negative' };
    }

    // Round to 2 decimal places
    const rounded = Math.round(parsedAmount * 100) / 100;

    return { valid: true, sanitized: rounded };
  }

  /**
   * Validate medical code (ICD, CPT, etc.)
   * @param {string} code - Medical code to validate
   * @param {string} type - Code type (icd10, cpt, etc.)
   */
  validateMedicalCode(code, type = 'general') {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Medical code is required' };
    }

    const sanitized = this.sanitizeString(code, { maxLength: 20 });
    const cleaned = sanitized.replace(/[^A-Z0-9.-]/gi, '').toUpperCase();

    let pattern;
    let errorMessage;

    switch (type.toLowerCase()) {
      case 'icd10':
        pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;
        errorMessage = 'Invalid ICD-10 code format';
        break;
      case 'cpt':
        pattern = /^\d{5}$/;
        errorMessage = 'Invalid CPT code format';
        break;
      case 'hcpcs':
        pattern = /^[A-Z]\d{4}$/;
        errorMessage = 'Invalid HCPCS code format';
        break;
      default:
        pattern = /^[A-Z0-9.-]{3,20}$/;
        errorMessage = 'Invalid medical code format';
    }

    if (!pattern.test(cleaned)) {
      return { valid: false, error: errorMessage };
    }

    return { valid: true, sanitized: cleaned };
  }

  /**
   * Validate patient ID
   * @param {string} patientId - Patient ID to validate
   */
  validatePatientId(patientId) {
    if (!patientId || typeof patientId !== 'string') {
      return { valid: false, error: 'Patient ID is required' };
    }

    const sanitized = this.sanitizeString(patientId, { maxLength: 50 });
    const cleaned = sanitized.replace(/[^A-Z0-9-]/gi, '');

    if (cleaned.length < 3 || cleaned.length > 50) {
      return { valid: false, error: 'Patient ID must be 3-50 characters' };
    }

    return { valid: true, sanitized: cleaned };
  }

  /**
   * Validate claim number
   * @param {string} claimNumber - Claim number to validate
   */
  validateClaimNumber(claimNumber) {
    if (!claimNumber || typeof claimNumber !== 'string') {
      return { valid: false, error: 'Claim number is required' };
    }

    const sanitized = this.sanitizeString(claimNumber, { maxLength: 50 });
    const cleaned = sanitized.replace(/[^A-Z0-9-]/gi, '');

    if (cleaned.length < 5 || cleaned.length > 50) {
      return { valid: false, error: 'Claim number must be 5-50 characters' };
    }

    return { valid: true, sanitized: cleaned };
  }

  /**
   * Validate insurance policy number
   * @param {string} policyNumber - Policy number to validate
   */
  validatePolicyNumber(policyNumber) {
    if (!policyNumber || typeof policyNumber !== 'string') {
      return { valid: false, error: 'Policy number is required' };
    }

    const sanitized = this.sanitizeString(policyNumber, { maxLength: 50 });
    const cleaned = sanitized.replace(/[^A-Z0-9-]/gi, '');

    if (cleaned.length < 3 || cleaned.length > 50) {
      return { valid: false, error: 'Policy number must be 3-50 characters' };
    }

    return { valid: true, sanitized: cleaned };
  }

  /**
   * Validate and sanitize search query
   * @param {string} query - Search query to validate
   */
  validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return { valid: false, error: 'Search query is required' };
    }

    const sanitized = this.sanitizeString(query, { 
      maxLength: 200,
      allowHTML: false,
      allowSQL: false
    });

    if (sanitized.length < 2) {
      return { valid: false, error: 'Search query must be at least 2 characters' };
    }

    // Remove special characters that could be problematic
    const cleaned = sanitized.replace(/[<>{}[\]\\]/g, '');

    return { valid: true, sanitized: cleaned };
  }

  /**
   * Batch validate multiple fields
   * @param {Object} data - Data object to validate
   * @param {Object} rules - Validation rules
   */
  validateBatch(data, rules) {
    const results = {
      valid: true,
      errors: {},
      sanitized: {}
    };

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      let result;

      switch (rule.type) {
        case 'email':
          result = this.validateEmail(value);
          break;
        case 'phone':
          result = this.validatePhone(value);
          break;
        case 'ssn':
          result = this.validateSSN(value);
          break;
        case 'date':
          result = this.validateDate(value);
          break;
        case 'currency':
          result = this.validateCurrency(value);
          break;
        case 'medical_code':
          result = this.validateMedicalCode(value, rule.subtype);
          break;
        case 'patient_id':
          result = this.validatePatientId(value);
          break;
        case 'claim_number':
          result = this.validateClaimNumber(value);
          break;
        case 'policy_number':
          result = this.validatePolicyNumber(value);
          break;
        case 'search_query':
          result = this.validateSearchQuery(value);
          break;
        default:
          result = { 
            valid: true, 
            sanitized: this.sanitize(value, rule.options || {}) 
          };
      }

      if (!result.valid) {
        results.valid = false;
        results.errors[field] = result.error;
      } else {
        results.sanitized[field] = result.sanitized;
      }
    }

    return results;
  }

  /**
   * Check if input contains suspicious patterns
   * @param {string} input - Input to check
   */
  detectSuspiciousPatterns(input) {
    if (!input || typeof input !== 'string') {
      return { suspicious: false, patterns: [] };
    }

    const suspiciousPatterns = [
      { name: 'SQL Injection', patterns: this.sqlInjectionPatterns },
      { name: 'XSS', patterns: this.xssPatterns },
      { name: 'Path Traversal', patterns: this.pathTraversalPatterns },
      { 
        name: 'Command Injection', 
        patterns: [/(\||&|;|`|\$\(|\${)/g] 
      },
      { 
        name: 'LDAP Injection', 
        patterns: [/(\*|\(|\)|\\|\/)/g] 
      }
    ];

    const detectedPatterns = [];

    for (const category of suspiciousPatterns) {
      for (const pattern of category.patterns) {
        if (pattern.test(input)) {
          detectedPatterns.push({
            category: category.name,
            pattern: pattern.toString(),
            matches: input.match(pattern)
          });
        }
      }
    }

    return {
      suspicious: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }
}

// Create singleton instance
const inputSanitizer = new InputSanitizer();

module.exports = {
  InputSanitizer,
  inputSanitizer
};