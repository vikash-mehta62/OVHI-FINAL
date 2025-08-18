const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { labEncryption } = require('../../utils/labEncryption');

/**
 * Digital Signature Service for Lab Orders
 * Handles provider authentication, digital signatures, and order signing workflow
 */

class DigitalSignatureService {
    constructor() {
        this.connection = null;
        this.signatureStoragePath = process.env.SIGNATURE_STORAGE_PATH || './server/public/signatures';
        this.signatureValidityHours = 24; // Signatures valid for 24 hours
    }

    /**
     * Initialize database connection
     */
    async initConnection() {
        if (!this.connection) {
            this.connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'varn-health'
            });
        }
        return this.connection;
    }

    /**
     * Authenticate provider for signing
     * @param {number} providerId - Provider ID
     * @param {string} password - Provider password or PIN
     * @param {string} ipAddress - Client IP address
     * @returns {object} Authentication result
     */
    async authenticateProvider(providerId, password, ipAddress) {
        try {
            const connection = await this.initConnection();
            
            // Get provider information (mock implementation)
            // In production, this would verify against actual provider credentials
            const [providers] = await connection.execute(`
                SELECT 
                    id,
                    'Dr. Provider' as name,
                    'MD' as credentials,
                    '1234567890' as npi_number,
                    TRUE as is_active,
                    'Internal Medicine' as specialty
                FROM (SELECT ? as id) p
                WHERE ? > 0
            `, [providerId, providerId]);

            if (providers.length === 0) {
                throw new Error('Provider not found');
            }

            const provider = providers[0];

            // Validate password (mock implementation)
            // In production, this would hash and compare against stored credentials
            if (!password || password.length < 4) {
                throw new Error('Invalid credentials');
            }

            // Check for recent failed attempts (security measure)
            const recentFailures = await this.getRecentFailedAttempts(providerId, ipAddress);
            if (recentFailures >= 5) {
                throw new Error('Too many failed attempts. Please try again later.');
            }

            // Generate authentication token
            const authToken = this.generateAuthToken(providerId);
            
            // Store authentication session
            await this.storeAuthSession(providerId, authToken, ipAddress);

            // Log successful authentication
            await this.logSignatureEvent(null, 'provider_authenticated', {
                provider_id: providerId,
                provider_name: provider.name,
                ip_address: ipAddress,
                auth_token: authToken.substring(0, 8) + '...' // Partial token for logging
            });

            return {
                success: true,
                authToken,
                provider: {
                    id: provider.id,
                    name: provider.name,
                    credentials: provider.credentials,
                    npiNumber: provider.npi_number,
                    specialty: provider.specialty
                },
                expiresAt: new Date(Date.now() + this.signatureValidityHours * 60 * 60 * 1000).toISOString()
            };

        } catch (error) {
            // Log failed authentication attempt
            await this.logFailedAuthAttempt(providerId, ipAddress, error.message);
            
            console.error('❌ Provider authentication failed:', error);
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Sign lab order with digital signature
     * @param {number} orderId - Lab order ID
     * @param {object} signatureData - Signature data
     * @returns {object} Signing result
     */
    async signLabOrder(orderId, signatureData) {
        try {
            const connection = await this.initConnection();
            
            // Validate signature data
            if (!signatureData.authToken || !signatureData.signature || !signatureData.providerId) {
                throw new Error('Authentication token, signature, and provider ID are required');
            }

            // Verify authentication token
            const authSession = await this.verifyAuthToken(signatureData.authToken, signatureData.providerId);
            if (!authSession.valid) {
                throw new Error('Invalid or expired authentication token');
            }

            // Get order details and validate
            const order = await this.getOrderForSigning(orderId);
            
            // Validate order can be signed
            if (order.status !== 'draft') {
                throw new Error(`Cannot sign order in ${order.status} status`);
            }

            if (order.requester_provider_id !== signatureData.providerId) {
                throw new Error('Only the requesting provider can sign this order');
            }

            // Validate order completeness
            const validationResult = await this.validateOrderCompleteness(order);
            if (!validationResult.isComplete) {
                throw new Error(`Order incomplete: ${validationResult.missingItems.join(', ')}`);
            }

            // Ensure signature storage directory exists
            await this.ensureSignatureStorageDirectory();

            // Save signature image
            const signatureFileName = `order-signature-${orderId}-${Date.now()}.png`;
            const signaturePath = path.join(this.signatureStoragePath, signatureFileName);
            
            // Convert base64 signature to file
            const signatureBuffer = Buffer.from(
                signatureData.signature.replace(/^data:image\/png;base64,/, ''), 
                'base64'
            );
            await fs.writeFile(signaturePath, signatureBuffer);

            // Generate signature hash for integrity
            const signatureHash = crypto.createHash('sha256').update(signatureBuffer).digest('hex');

            // Create signature record
            const signatureRecord = {
                orderId,
                providerId: signatureData.providerId,
                providerName: authSession.provider.name,
                signaturePath,
                signatureHash,
                signedAt: new Date().toISOString(),
                ipAddress: signatureData.ipAddress,
                userAgent: signatureData.userAgent,
                authToken: signatureData.authToken.substring(0, 8) + '...' // Partial for security
            };

            // Start transaction
            await connection.beginTransaction();

            try {
                // Update order status to signed
                await connection.execute(`
                    UPDATE lab_orders 
                    SET 
                        status = 'signed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [orderId]);

                // Store signature details in events table
                await this.logSignatureEvent(orderId, 'order_signed', {
                    signature_record: signatureRecord,
                    order_validation: validationResult
                });

                // Invalidate auth token (one-time use for security)
                await this.invalidateAuthToken(signatureData.authToken);

                await connection.commit();

                return {
                    success: true,
                    signatureId: signatureRecord.signatureHash.substring(0, 16),
                    signedAt: signatureRecord.signedAt,
                    signedBy: {
                        id: signatureRecord.providerId,
                        name: signatureRecord.providerName
                    },
                    orderStatus: 'signed'
                };

            } catch (error) {
                await connection.rollback();
                throw error;
            }

        } catch (error) {
            console.error('❌ Error signing lab order:', error);
            throw new Error(`Failed to sign lab order: ${error.message}`);
        }
    }

    /**
     * Verify signature integrity
     * @param {number} orderId - Order ID
     * @returns {object} Signature verification result
     */
    async verifySignature(orderId) {
        try {
            const connection = await this.initConnection();
            
            // Get signature events for the order
            const [events] = await connection.execute(`
                SELECT event_detail, created_at
                FROM lab_events
                WHERE lab_order_id = ? AND event_type = 'order_signed'
                ORDER BY created_at DESC
                LIMIT 1
            `, [orderId]);

            if (events.length === 0) {
                return {
                    verified: false,
                    message: 'No signature found for this order'
                };
            }

            const signatureEvent = JSON.parse(events[0].event_detail);
            const signatureRecord = signatureEvent.signature_record;

            // Verify signature file exists
            try {
                await fs.access(signatureRecord.signaturePath);
            } catch (error) {
                return {
                    verified: false,
                    message: 'Signature file not found'
                };
            }

            // Verify signature hash integrity
            const signatureBuffer = await fs.readFile(signatureRecord.signaturePath);
            const currentHash = crypto.createHash('sha256').update(signatureBuffer).digest('hex');

            if (currentHash !== signatureRecord.signatureHash) {
                return {
                    verified: false,
                    message: 'Signature integrity check failed'
                };
            }

            return {
                verified: true,
                signatureDetails: {
                    signedBy: signatureRecord.providerName,
                    signedAt: signatureRecord.signedAt,
                    signatureId: signatureRecord.signatureHash.substring(0, 16),
                    ipAddress: signatureRecord.ipAddress
                },
                message: 'Signature verified successfully'
            };

        } catch (error) {
            console.error('❌ Error verifying signature:', error);
            return {
                verified: false,
                message: 'Signature verification failed'
            };
        }
    }

    /**
     * Get signature status for order
     * @param {number} orderId - Order ID
     * @returns {object} Signature status
     */
    async getSignatureStatus(orderId) {
        try {
            const connection = await this.initConnection();
            
            // Get order status
            const [orders] = await connection.execute(`
                SELECT status, requester_provider_id
                FROM lab_orders
                WHERE id = ?
            `, [orderId]);

            if (orders.length === 0) {
                throw new Error('Order not found');
            }

            const order = orders[0];

            // Get signature events
            const [events] = await connection.execute(`
                SELECT event_type, event_detail, created_at
                FROM lab_events
                WHERE lab_order_id = ? AND event_type IN ('order_signed', 'provider_authenticated')
                ORDER BY created_at DESC
            `, [orderId]);

            const signatureEvents = events.map(event => ({
                ...event,
                event_detail: event.event_detail ? JSON.parse(event.event_detail) : null
            }));

            const signedEvent = signatureEvents.find(e => e.event_type === 'order_signed');

            return {
                orderId,
                orderStatus: order.status,
                isSigned: order.status !== 'draft',
                requesterProviderId: order.requester_provider_id,
                signatureDetails: signedEvent ? {
                    signedAt: signedEvent.created_at,
                    signedBy: signedEvent.event_detail.signature_record.providerName,
                    signatureId: signedEvent.event_detail.signature_record.signatureHash.substring(0, 16)
                } : null,
                events: signatureEvents
            };

        } catch (error) {
            console.error('❌ Error getting signature status:', error);
            throw new Error('Failed to get signature status');
        }
    }

    /**
     * Bulk sign multiple orders (for efficiency)
     * @param {Array} orderIds - Array of order IDs
     * @param {object} signatureData - Signature data
     * @returns {object} Bulk signing result
     */
    async bulkSignOrders(orderIds, signatureData) {
        try {
            if (!Array.isArray(orderIds) || orderIds.length === 0) {
                throw new Error('Order IDs array is required');
            }

            if (orderIds.length > 10) {
                throw new Error('Maximum 10 orders can be signed at once');
            }

            // Verify authentication token
            const authSession = await this.verifyAuthToken(signatureData.authToken, signatureData.providerId);
            if (!authSession.valid) {
                throw new Error('Invalid or expired authentication token');
            }

            const results = {
                total: orderIds.length,
                signed: 0,
                failed: 0,
                results: []
            };

            // Sign each order
            for (const orderId of orderIds) {
                try {
                    const result = await this.signLabOrder(orderId, {
                        ...signatureData,
                        authToken: await this.generateAuthToken(signatureData.providerId) // Generate new token for each
                    });
                    
                    results.signed++;
                    results.results.push({
                        orderId,
                        success: true,
                        result
                    });
                } catch (error) {
                    results.failed++;
                    results.results.push({
                        orderId,
                        success: false,
                        error: error.message
                    });
                }
            }

            return results;

        } catch (error) {
            console.error('❌ Error bulk signing orders:', error);
            throw new Error(`Failed to bulk sign orders: ${error.message}`);
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    /**
     * Generate authentication token
     */
    generateAuthToken(providerId) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        const payload = `${providerId}:${timestamp}:${random}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Store authentication session
     */
    async storeAuthSession(providerId, authToken, ipAddress) {
        const connection = await this.initConnection();
        
        // Clean up old sessions first
        await connection.execute(`
            DELETE FROM lab_events 
            WHERE event_type = 'auth_session' 
            AND JSON_EXTRACT(event_detail, '$.provider_id') = ?
            AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
        `, [providerId, this.signatureValidityHours]);

        // Store new session
        await connection.execute(`
            INSERT INTO lab_events (lab_order_id, event_type, event_detail)
            VALUES (NULL, 'auth_session', ?)
        `, [JSON.stringify({
            provider_id: providerId,
            auth_token: authToken,
            ip_address: ipAddress,
            expires_at: new Date(Date.now() + this.signatureValidityHours * 60 * 60 * 1000).toISOString()
        })]);
    }

    /**
     * Verify authentication token
     */
    async verifyAuthToken(authToken, providerId) {
        const connection = await this.initConnection();
        
        const [sessions] = await connection.execute(`
            SELECT event_detail, created_at
            FROM lab_events
            WHERE event_type = 'auth_session'
            AND JSON_EXTRACT(event_detail, '$.auth_token') = ?
            AND JSON_EXTRACT(event_detail, '$.provider_id') = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY created_at DESC
            LIMIT 1
        `, [authToken, providerId, this.signatureValidityHours]);

        if (sessions.length === 0) {
            return { valid: false, message: 'Invalid or expired token' };
        }

        const sessionData = JSON.parse(sessions[0].event_detail);
        
        return {
            valid: true,
            provider: {
                id: sessionData.provider_id,
                name: 'Dr. Provider' // Mock - would come from actual provider data
            },
            expiresAt: sessionData.expires_at
        };
    }

    /**
     * Invalidate authentication token
     */
    async invalidateAuthToken(authToken) {
        const connection = await this.initConnection();
        
        await connection.execute(`
            DELETE FROM lab_events 
            WHERE event_type = 'auth_session' 
            AND JSON_EXTRACT(event_detail, '$.auth_token') = ?
        `, [authToken]);
    }

    /**
     * Get order for signing with validation
     */
    async getOrderForSigning(orderId) {
        const connection = await this.initConnection();
        
        const [orders] = await connection.execute(`
            SELECT 
                lo.*,
                COUNT(lot.id) as test_count
            FROM lab_orders lo
            LEFT JOIN lab_order_tests lot ON lo.id = lot.lab_order_id
            WHERE lo.id = ?
            GROUP BY lo.id
        `, [orderId]);

        if (orders.length === 0) {
            throw new Error('Order not found');
        }

        const order = orders[0];
        order.icd10_codes = order.icd10_codes ? JSON.parse(order.icd10_codes) : [];
        
        return order;
    }

    /**
     * Validate order completeness before signing
     */
    async validateOrderCompleteness(order) {
        const missingItems = [];

        // Check required fields
        if (!order.patient_id) missingItems.push('Patient ID');
        if (!order.lab_facility_id) missingItems.push('Lab facility');
        if (!order.requester_provider_id) missingItems.push('Requesting provider');
        if (order.test_count === 0) missingItems.push('Lab tests');
        
        // Check ICD-10 codes
        if (!order.icd10_codes || order.icd10_codes.length === 0) {
            missingItems.push('ICD-10 codes for medical necessity');
        }

        // Check ABN if required (mock implementation)
        // In production, this would check actual ABN requirements
        const abnRequired = false; // Mock
        if (abnRequired && !order.abn_signed) {
            missingItems.push('ABN signature');
        }

        return {
            isComplete: missingItems.length === 0,
            missingItems,
            abnRequired
        };
    }

    /**
     * Get recent failed authentication attempts
     */
    async getRecentFailedAttempts(providerId, ipAddress) {
        const connection = await this.initConnection();
        
        const [attempts] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM lab_events
            WHERE event_type = 'auth_failed'
            AND JSON_EXTRACT(event_detail, '$.provider_id') = ?
            AND JSON_EXTRACT(event_detail, '$.ip_address') = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, [providerId, ipAddress]);

        return attempts[0].count;
    }

    /**
     * Log failed authentication attempt
     */
    async logFailedAuthAttempt(providerId, ipAddress, reason) {
        try {
            await this.logSignatureEvent(null, 'auth_failed', {
                provider_id: providerId,
                ip_address: ipAddress,
                reason,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error logging failed auth attempt:', error);
        }
    }

    /**
     * Ensure signature storage directory exists
     */
    async ensureSignatureStorageDirectory() {
        try {
            await fs.access(this.signatureStoragePath);
        } catch (error) {
            await fs.mkdir(this.signatureStoragePath, { recursive: true });
        }
    }

    /**
     * Log signature-related event
     */
    async logSignatureEvent(orderId, eventType, eventDetail) {
        try {
            const connection = await this.initConnection();
            
            await connection.execute(`
                INSERT INTO lab_events 
                (lab_order_id, event_type, event_detail)
                VALUES (?, ?, ?)
            `, [
                orderId,
                eventType,
                JSON.stringify(eventDetail)
            ]);

        } catch (error) {
            console.error('❌ Error logging signature event:', error);
        }
    }

    /**
     * Close database connection
     */
    async closeConnection() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }
}

module.exports = new DigitalSignatureService();