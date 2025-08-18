const crypto = require('crypto');

/**
 * Lab Integration Encryption Utilities
 * Provides secure encryption/decryption for sensitive lab data payloads
 * Complies with HIPAA requirements for PHI protection
 */

class LabEncryptionService {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits
        
        // Get encryption key from environment or generate one
        this.encryptionKey = this.getOrCreateEncryptionKey();
    }
    
    /**
     * Get or create encryption key from environment
     * @returns {Buffer} Encryption key
     */
    getOrCreateEncryptionKey() {
        const keyFromEnv = process.env.LAB_ENCRYPTION_KEY;
        
        if (keyFromEnv) {
            return Buffer.from(keyFromEnv, 'hex');
        }
        
        // Generate a new key (should be stored securely in production)
        const key = crypto.randomBytes(this.keyLength);
        console.warn('⚠️  Generated new encryption key. Store LAB_ENCRYPTION_KEY in environment:', key.toString('hex'));
        return key;
    }
    
    /**
     * Encrypt sensitive lab payload data
     * @param {string|object} data - Data to encrypt
     * @returns {string} Encrypted data with IV
     */
    encrypt(data) {
        try {
            // Convert object to string if needed
            const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Generate random IV
            const iv = crypto.randomBytes(this.ivLength);
            
            // Create cipher
            const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
            
            // Encrypt the data
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Combine IV and encrypted data
            const result = {
                iv: iv.toString('hex'),
                encrypted: encrypted
            };
            
            return JSON.stringify(result);
            
        } catch (error) {
            console.error('❌ Encryption error:', error);
            throw new Error('Failed to encrypt lab data');
        }
    }
    
    /**
     * Decrypt sensitive lab payload data
     * @param {string} encryptedData - Encrypted data string
     * @returns {string} Decrypted plaintext
     */
    decrypt(encryptedData) {
        try {
            // Parse the encrypted data structure
            const data = JSON.parse(encryptedData);
            const { iv, encrypted } = data;
            
            // Convert hex strings back to buffers
            const ivBuffer = Buffer.from(iv, 'hex');
            
            // Create decipher
            const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, ivBuffer);
            
            // Decrypt the data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
            
        } catch (error) {
            console.error('❌ Decryption error:', error);
            throw new Error('Failed to decrypt lab data');
        }
    }
    
    /**
     * Encrypt lab result payload for database storage
     * @param {object} payload - FHIR or HL7 payload
     * @returns {string} Encrypted payload string
     */
    encryptLabPayload(payload) {
        if (!payload) {
            return null;
        }
        
        // Add metadata for audit purposes
        const payloadWithMetadata = {
            timestamp: new Date().toISOString(),
            payload: payload,
            checksum: this.generateChecksum(payload)
        };
        
        return this.encrypt(payloadWithMetadata);
    }
    
    /**
     * Decrypt lab result payload from database
     * @param {string} encryptedPayload - Encrypted payload string
     * @returns {object} Decrypted payload object
     */
    decryptLabPayload(encryptedPayload) {
        if (!encryptedPayload) {
            return null;
        }
        
        const decryptedData = this.decrypt(encryptedPayload);
        const payloadWithMetadata = JSON.parse(decryptedData);
        
        // Verify checksum for data integrity
        const expectedChecksum = this.generateChecksum(payloadWithMetadata.payload);
        if (payloadWithMetadata.checksum !== expectedChecksum) {
            throw new Error('Lab payload integrity check failed');
        }
        
        return payloadWithMetadata.payload;
    }
    
    /**
     * Generate checksum for data integrity verification
     * @param {object} data - Data to checksum
     * @returns {string} SHA-256 checksum
     */
    generateChecksum(data) {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    
    /**
     * Redact PHI from data for logging purposes
     * @param {object} data - Data containing potential PHI
     * @returns {object} Data with PHI redacted
     */
    redactPHI(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        const redactedData = JSON.parse(JSON.stringify(data)); // Deep clone
        
        // Common PHI patterns to redact
        const phiPatterns = [
            'ssn', 'social_security_number', 'socialSecurityNumber',
            'phone', 'phoneNumber', 'telephone', 'mobile',
            'email', 'emailAddress', 'email_address',
            'address', 'street', 'city', 'zip', 'zipCode', 'postal_code',
            'dob', 'dateOfBirth', 'date_of_birth', 'birthDate',
            'mrn', 'medical_record_number', 'patientId', 'patient_id',
            'name', 'firstName', 'lastName', 'first_name', 'last_name',
            'given', 'family' // FHIR name components
        ];
        
        this.redactObjectRecursively(redactedData, phiPatterns);
        
        return redactedData;
    }
    
    /**
     * Recursively redact PHI patterns from object
     * @param {object} obj - Object to redact
     * @param {array} patterns - PHI patterns to look for
     */
    redactObjectRecursively(obj, patterns) {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Check if key matches PHI pattern
                const isPhiField = patterns.some(pattern => 
                    key.toLowerCase().includes(pattern.toLowerCase())
                );
                
                if (isPhiField) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object') {
                    // Recursively process nested objects
                    if (Array.isArray(obj[key])) {
                        obj[key].forEach(item => this.redactObjectRecursively(item, patterns));
                    } else {
                        this.redactObjectRecursively(obj[key], patterns);
                    }
                }
            }
        }
    }
    
    /**
     * Generate secure order number
     * @returns {string} Unique order number
     */
    generateOrderNumber() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `LAB-${timestamp}-${random}`;
    }
    
    /**
     * Validate encryption configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        try {
            // Test encryption/decryption
            const testData = { test: 'encryption_test', timestamp: new Date().toISOString() };
            const encrypted = this.encrypt(testData);
            const decrypted = JSON.parse(this.decrypt(encrypted));
            
            return decrypted.test === testData.test;
        } catch (error) {
            console.error('❌ Encryption configuration validation failed:', error);
            return false;
        }
    }
}

// Export singleton instance
const labEncryption = new LabEncryptionService();

module.exports = {
    LabEncryptionService,
    labEncryption
};