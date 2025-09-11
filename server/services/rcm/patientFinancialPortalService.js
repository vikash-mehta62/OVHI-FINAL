/**
 * Patient Financial Portal Service
 * Self-service patient financial management and communication
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbConfig = require('../../config/db');
const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');
const { auditLog } = require('../../utils/dbUtils');

class PatientFinancialPortalService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.jwtSecret = process.env.JWT_SECRET || 'patient-portal-secret';
        this.paymentMethods = ['credit_card', 'debit_card', 'ach', 'paypal'];
        this.statementFormats = ['pdf', 'html', 'email'];
    }

    /**
     * Patient portal authentication
     */
    async authenticatePatient(credentials) {
        try {
            const connection = await this.pool.getConnection();
            
            const { email, password, patientId, dateOfBirth } = credentials;

            // Get patient information
            const [patients] = await connection.execute(`
                SELECT 
                    p.*,
                    pa.current_balance,
                    pa.last_payment_date,
                    pp.password_hash,
                    pp.is_active,
                    pp.last_login,
                    pp.failed_attempts
                FROM patients p
                LEFT JOIN patient_accounts pa ON p.id = pa.patient_id
                LEFT JOIN patient_portal_access pp ON p.id = pp.patient_id
                WHERE (p.email = ? OR p.id = ?)
                AND p.date_of_birth = ?
            `, [email, patientId, dateOfBirth]);

            if (!patients.length) {
                throw new Error('Invalid credentials');
            }

            const patient = patients[0];

            // Check if account is locked
            if (patient.failed_attempts >= 5) {
                throw new Error('Account locked due to multiple failed attempts');
            }

            // Verify password if exists, otherwise create new portal access
            if (patient.password_hash) {
                const isValidPassword = await bcrypt.compare(password, patient.password_hash);
                if (!isValidPassword) {
                    // Increment failed attempts
                    await connection.execute(`
                        UPDATE patient_portal_access 
                        SET failed_attempts = failed_attempts + 1
                        WHERE patient_id = ?
                    `, [patient.id]);
                    
                    throw new Error('Invalid password');
                }
            } else {
                // First time login - create portal access
                const hashedPassword = await bcrypt.hash(password, 10);
                await connection.execute(`
                    INSERT INTO patient_portal_access 
                    (patient_id, password_hash, is_active, created_at)
                    VALUES (?, ?, 1, NOW())
                    ON DUPLICATE KEY UPDATE
                    password_hash = VALUES(password_hash),
                    is_active = 1
                `, [patient.id, hashedPassword]);
            }

            // Update login information
            await connection.execute(`
                UPDATE patient_portal_access 
                SET last_login = NOW(), failed_attempts = 0
                WHERE patient_id = ?
            `, [patient.id]);

            // Generate JWT token
            const token = jwt.sign(
                { 
                    patientId: patient.id,
                    email: patient.email,
                    type: 'patient_portal'
                },
                this.jwtSecret,
                { expiresIn: '24h' }
            );

            // Log authentication
            await auditLog('PATIENT_PORTAL_LOGIN', {
                patientId: patient.id,
                email: patient.email,
                loginTime: new Date()
            });

            connection.release();

            return {
                success: true,
                token,
                patient: {
                    id: patient.id,
                    firstName: patient.first_name,
                    lastName: patient.last_name,
                    email: patient.email,
                    currentBalance: patient.current_balance || 0,
                    lastPaymentDate: patient.last_payment_date
                }
            };

        } catch (error) {
            console.error('Patient authentication error:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive patient account summary
     */
    async getAccountSummary(patientId) {
        try {
            const connection = await this.pool.getConnection();

            // Get patient account information
            const [accountInfo] = await connection.execute(`
                SELECT 
                    p.id,
                    p.first_name,
                    p.last_name,
                    p.email,
                    p.phone,
                    pa.current_balance,
                    pa.total_charges,
                    pa.total_payments,
                    pa.last_payment_date,
                    pa.last_statement_date
                FROM patients p
                LEFT JOIN patient_accounts pa ON p.id = pa.patient_id
                WHERE p.id = ?
            `, [patientId]);

            if (!accountInfo.length) {
                throw new Error('Patient account not found');
            }

            const account = accountInfo[0];

            // Get payment history
            const [paymentHistory] = await connection.execute(`
                SELECT 
                    py.id,
                    py.amount,
                    py.payment_date,
                    py.payment_method,
                    py.check_number,
                    py.confirmation_number,
                    c.claim_number,
                    c.service_date
                FROM payments py
                LEFT JOIN claims c ON py.claim_id = c.id
                WHERE py.patient_id = ?
                ORDER BY py.payment_date DESC
                LIMIT 20
            `, [patientId]);

            // Get outstanding claims
            const [outstandingClaims] = await connection.execute(`
                SELECT 
                    c.id,
                    c.claim_number,
                    c.service_date,
                    c.total_amount,
                    c.paid_amount,
                    c.remaining_balance,
                    c.status,
                    pr.practice_name as provider_name,
                    ins.insurance_name
                FROM claims c
                LEFT JOIN providers pr ON c.provider_id = pr.id
                LEFT JOIN insurance ins ON c.primary_insurance_id = ins.id
                WHERE c.patient_id = ?
                AND c.remaining_balance > 0
                ORDER BY c.service_date DESC
            `, [patientId]);

            // Get active payment plans
            const [paymentPlans] = await connection.execute(`
                SELECT 
                    pp.*,
                    COUNT(ppp.id) as total_payments,
                    SUM(CASE WHEN ppp.payment_status = 'completed' THEN ppp.payment_amount ELSE 0 END) as paid_amount
                FROM patient_payment_plans pp
                LEFT JOIN patient_payment_plan_payments ppp ON pp.id = ppp.payment_plan_id
                WHERE pp.patient_id = ?
                AND pp.status = 'active'
                GROUP BY pp.id
            `, [patientId]);

            // Get recent statements
            const [statements] = await connection.execute(`
                SELECT 
                    ps.*,
                    COUNT(psi.id) as item_count,
                    SUM(psi.amount) as statement_total
                FROM patient_statements ps
                LEFT JOIN patient_statement_items psi ON ps.id = psi.statement_id
                WHERE ps.patient_id = ?
                GROUP BY ps.id
                ORDER BY ps.statement_date DESC
                LIMIT 12
            `, [patientId]);

            // Get recent messages
            const [messages] = await connection.execute(`
                SELECT 
                    pm.*,
                    u.name as staff_name
                FROM patient_messages pm
                LEFT JOIN users u ON pm.staff_user_id = u.id
                WHERE pm.patient_id = ?
                ORDER BY pm.created_at DESC
                LIMIT 10
            `, [patientId]);

            connection.release();

            return {
                accountInfo: account,
                paymentHistory,
                outstandingClaims,
                paymentPlans,
                statements,
                messages,
                summary: {
                    currentBalance: parseFloat(account.current_balance) || 0,
                    totalCharges: parseFloat(account.total_charges) || 0,
                    totalPayments: parseFloat(account.total_payments) || 0,
                    outstandingClaimsCount: outstandingClaims.length,
                    activePaymentPlansCount: paymentPlans.length,
                    lastPaymentDate: account.last_payment_date,
                    lastStatementDate: account.last_statement_date
                }
            };

        } catch (error) {
            console.error('Error getting account summary:', error);
            throw error;
        }
    }

    /**
     * Process patient payment
     */
    async processPayment(paymentData) {
        try {
            const connection = await this.pool.getConnection();
            await connection.beginTransaction();

            const {
                patientId,
                amount,
                paymentMethod,
                paymentDetails, // Card info, ACH details, etc.
                claimIds = [], // Specific claims to pay
                applyToOldest = true
            } = paymentData;

            // Validate payment method
            if (!this.paymentMethods.includes(paymentMethod)) {
                throw new Error('Invalid payment method');
            }

            // Validate amount
            if (!amount || amount <= 0) {
                throw new Error('Invalid payment amount');
            }

            // Get patient account balance
            const [accountInfo] = await connection.execute(`
                SELECT current_balance FROM patient_accounts WHERE patient_id = ?
            `, [patientId]);

            if (!accountInfo.length || parseFloat(accountInfo[0].current_balance) <= 0) {
                throw new Error('No outstanding balance found');
            }

            // Process payment through payment gateway
            const paymentResult = await this.processPaymentGateway(
                paymentMethod, 
                amount, 
                paymentDetails
            );

            if (!paymentResult.success) {
                throw new Error(`Payment processing failed: ${paymentResult.error}`);
            }

            // Determine claims to apply payment to
            let targetClaims = [];
            if (claimIds.length > 0) {
                // Apply to specific claims
                const [specificClaims] = await connection.execute(`
                    SELECT id, claim_number, remaining_balance
                    FROM claims 
                    WHERE id IN (${claimIds.map(() => '?').join(',')})
                    AND patient_id = ?
                    AND remaining_balance > 0
                `, [...claimIds, patientId]);
                targetClaims = specificClaims;
            } else if (applyToOldest) {
                // Apply to oldest claims first
                const [oldestClaims] = await connection.execute(`
                    SELECT id, claim_number, remaining_balance, service_date
                    FROM claims 
                    WHERE patient_id = ?
                    AND remaining_balance > 0
                    ORDER BY service_date ASC
                `, [patientId]);
                targetClaims = oldestClaims;
            }

            // Allocate payment to claims
            const paymentAllocations = [];
            let remainingAmount = amount;

            for (const claim of targetClaims) {
                if (remainingAmount <= 0) break;

                const claimBalance = parseFloat(claim.remaining_balance);
                const allocationAmount = Math.min(remainingAmount, claimBalance);

                // Create payment record
                const [paymentRecord] = await connection.execute(`
                    INSERT INTO payments 
                    (claim_id, patient_id, amount, payment_date, payment_method, 
                     confirmation_number, gateway_transaction_id, posted_by, posting_source)
                    VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'PATIENT_PORTAL')
                `, [
                    claim.id,
                    patientId,
                    allocationAmount,
                    paymentMethod,
                    paymentResult.confirmationNumber,
                    paymentResult.transactionId,
                    patientId
                ]);

                // Update claim balance
                await connection.execute(`
                    UPDATE claims 
                    SET paid_amount = paid_amount + ?,
                        remaining_balance = remaining_balance - ?,
                        status = CASE 
                            WHEN remaining_balance - ? <= 0 THEN 3 -- Paid
                            ELSE status
                        END,
                        last_payment_date = NOW()
                    WHERE id = ?
                `, [allocationAmount, allocationAmount, allocationAmount, claim.id]);

                paymentAllocations.push({
                    claimId: claim.id,
                    claimNumber: claim.claim_number,
                    allocatedAmount: allocationAmount,
                    paymentId: paymentRecord.insertId
                });

                remainingAmount -= allocationAmount;
            }

            // Handle any remaining amount as credit
            if (remainingAmount > 0) {
                await connection.execute(`
                    INSERT INTO patient_credits 
                    (patient_id, credit_amount, credit_date, source, description)
                    VALUES (?, ?, NOW(), 'OVERPAYMENT', 'Overpayment from patient portal')
                `, [patientId, remainingAmount]);
            }

            // Update patient account balance
            await connection.execute(`
                UPDATE patient_accounts 
                SET total_payments = total_payments + ?,
                    current_balance = current_balance - ?,
                    last_payment_date = NOW()
                WHERE patient_id = ?
            `, [amount, amount - remainingAmount, patientId]);

            // Log payment activity
            await auditLog('PATIENT_PAYMENT', {
                patientId,
                amount,
                paymentMethod,
                confirmationNumber: paymentResult.confirmationNumber,
                allocations: paymentAllocations
            });

            await connection.commit();
            connection.release();

            return {
                success: true,
                paymentId: paymentAllocations[0]?.paymentId,
                confirmationNumber: paymentResult.confirmationNumber,
                totalAmount: amount,
                allocatedAmount: amount - remainingAmount,
                creditAmount: remainingAmount,
                allocations: paymentAllocations,
                transactionId: paymentResult.transactionId
            };

        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }

    /**
     * Set up payment plan
     */
    async setupPaymentPlan(planData) {
        try {
            const connection = await this.pool.getConnection();
            await connection.beginTransaction();

            const {
                patientId,
                totalAmount,
                monthlyPayment,
                numberOfPayments,
                startDate,
                autoPayEnabled = false,
                paymentMethod,
                paymentDetails
            } = planData;

            // Validate plan parameters
            if (monthlyPayment * numberOfPayments < totalAmount * 0.9) {
                throw new Error('Payment plan total must cover at least 90% of balance');
            }

            // Create payment plan
            const [planResult] = await connection.execute(`
                INSERT INTO patient_payment_plans 
                (patient_id, total_amount, monthly_payment, number_of_payments, 
                 start_date, auto_pay_enabled, payment_method, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
            `, [
                patientId,
                totalAmount,
                monthlyPayment,
                numberOfPayments,
                startDate,
                autoPayEnabled,
                paymentMethod
            ]);

            const paymentPlanId = planResult.insertId;

            // Store payment method details if auto-pay enabled
            if (autoPayEnabled && paymentDetails) {
                await connection.execute(`
                    INSERT INTO patient_payment_methods 
                    (patient_id, payment_plan_id, payment_method, payment_details, is_active)
                    VALUES (?, ?, ?, ?, 1)
                `, [
                    patientId,
                    paymentPlanId,
                    paymentMethod,
                    JSON.stringify(this.encryptPaymentDetails(paymentDetails))
                ]);
            }

            // Generate payment schedule
            const paymentSchedule = [];
            const startDateObj = new Date(startDate);

            for (let i = 0; i < numberOfPayments; i++) {
                const paymentDate = new Date(startDateObj);
                paymentDate.setMonth(paymentDate.getMonth() + i);

                const [scheduleResult] = await connection.execute(`
                    INSERT INTO patient_payment_plan_payments 
                    (payment_plan_id, payment_number, scheduled_date, payment_amount, payment_status)
                    VALUES (?, ?, ?, ?, 'scheduled')
                `, [
                    paymentPlanId,
                    i + 1,
                    paymentDate,
                    monthlyPayment
                ]);

                paymentSchedule.push({
                    paymentNumber: i + 1,
                    scheduledDate: paymentDate,
                    paymentAmount: monthlyPayment,
                    status: 'scheduled'
                });
            }

            // Log payment plan creation
            await auditLog('PAYMENT_PLAN_CREATED', {
                patientId,
                paymentPlanId,
                totalAmount,
                monthlyPayment,
                numberOfPayments
            });

            await connection.commit();
            connection.release();

            return {
                success: true,
                paymentPlanId,
                totalAmount,
                monthlyPayment,
                numberOfPayments,
                startDate,
                autoPayEnabled,
                paymentSchedule
            };

        } catch (error) {
            console.error('Payment plan setup error:', error);
            throw error;
        }
    }

    /**
     * Send secure message to billing staff
     */
    async sendMessage(messageData) {
        try {
            const connection = await this.pool.getConnection();

            const {
                patientId,
                subject,
                message,
                priority = 'normal',
                category = 'billing'
            } = messageData;

            // Create message record
            const [messageResult] = await connection.execute(`
                INSERT INTO patient_messages 
                (patient_id, subject, message_content, priority, category, 
                 message_type, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'outbound', 'unread', NOW())
            `, [
                patientId,
                subject,
                message,
                priority,
                category
            ]);

            const messageId = messageResult.insertId;

            // Notify billing staff (could integrate with notification system)
            await this.notifyBillingStaff(patientId, messageId, subject, priority);

            // Log message activity
            await auditLog('PATIENT_MESSAGE_SENT', {
                patientId,
                messageId,
                subject,
                category,
                priority
            });

            connection.release();

            return {
                success: true,
                messageId,
                status: 'sent',
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Message sending error:', error);
            throw error;
        }
    }

    /**
     * Get patient statements
     */
    async getStatements(patientId, options = {}) {
        try {
            const connection = await this.pool.getConnection();

            const {
                limit = 12,
                format = 'summary',
                startDate,
                endDate
            } = options;

            let dateFilter = '';
            const params = [patientId];

            if (startDate && endDate) {
                dateFilter = 'AND ps.statement_date BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            // Get statements with summary information
            const [statements] = await connection.execute(`
                SELECT 
                    ps.*,
                    COUNT(psi.id) as item_count,
                    SUM(psi.amount) as total_amount,
                    SUM(CASE WHEN psi.item_type = 'charge' THEN psi.amount ELSE 0 END) as total_charges,
                    SUM(CASE WHEN psi.item_type = 'payment' THEN psi.amount ELSE 0 END) as total_payments,
                    SUM(CASE WHEN psi.item_type = 'adjustment' THEN psi.amount ELSE 0 END) as total_adjustments
                FROM patient_statements ps
                LEFT JOIN patient_statement_items psi ON ps.id = psi.statement_id
                WHERE ps.patient_id = ?
                ${dateFilter}
                GROUP BY ps.id
                ORDER BY ps.statement_date DESC
                LIMIT ?
            `, [...params, limit]);

            // Get detailed items if requested
            if (format === 'detailed' && statements.length > 0) {
                for (const statement of statements) {
                    const [items] = await connection.execute(`
                        SELECT * FROM patient_statement_items 
                        WHERE statement_id = ?
                        ORDER BY service_date ASC
                    `, [statement.id]);
                    
                    statement.items = items;
                }
            }

            connection.release();

            return {
                statements,
                summary: {
                    totalStatements: statements.length,
                    latestStatementDate: statements[0]?.statement_date,
                    totalOutstanding: statements.reduce((sum, s) => sum + parseFloat(s.balance_due || 0), 0)
                }
            };

        } catch (error) {
            console.error('Error getting statements:', error);
            throw error;
        }
    }

    /**
     * Download statement as PDF
     */
    async downloadStatement(patientId, statementId, format = 'pdf') {
        try {
            const connection = await this.pool.getConnection();

            // Verify statement belongs to patient
            const [statements] = await connection.execute(`
                SELECT ps.*, p.first_name, p.last_name, p.address, p.city, p.state, p.zip_code
                FROM patient_statements ps
                JOIN patients p ON ps.patient_id = p.id
                WHERE ps.id = ? AND ps.patient_id = ?
            `, [statementId, patientId]);

            if (!statements.length) {
                throw new Error('Statement not found');
            }

            const statement = statements[0];

            // Get statement items
            const [items] = await connection.execute(`
                SELECT * FROM patient_statement_items 
                WHERE statement_id = ?
                ORDER BY service_date ASC
            `, [statementId]);

            connection.release();

            // Generate statement document
            const statementDocument = await this.generateStatementDocument(
                statement, 
                items, 
                format
            );

            // Log download activity
            await auditLog('STATEMENT_DOWNLOADED', {
                patientId,
                statementId,
                format
            });

            return {
                success: true,
                document: statementDocument,
                format,
                filename: `statement_${statementId}_${statement.statement_date}.${format}`
            };

        } catch (error) {
            console.error('Statement download error:', error);
            throw error;
        }
    }

    // Helper methods

    /**
     * Process payment through gateway (mock implementation)
     */
    async processPaymentGateway(paymentMethod, amount, paymentDetails) {
        // Mock payment processing - integrate with actual payment gateway
        try {
            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock validation
            if (paymentMethod === 'credit_card' && !paymentDetails.cardNumber) {
                throw new Error('Card number required');
            }

            // Generate mock confirmation
            const confirmationNumber = 'PAY' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
            const transactionId = 'TXN' + Date.now();

            return {
                success: true,
                confirmationNumber,
                transactionId,
                amount,
                processedAt: new Date()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Encrypt payment details for storage
     */
    encryptPaymentDetails(paymentDetails) {
        // Mock encryption - implement proper encryption in production
        return {
            ...paymentDetails,
            cardNumber: paymentDetails.cardNumber ? 
                '**** **** **** ' + paymentDetails.cardNumber.slice(-4) : undefined
        };
    }

    /**
     * Notify billing staff of new message
     */
    async notifyBillingStaff(patientId, messageId, subject, priority) {
        // Mock notification - integrate with actual notification system
        console.log(`New patient message: Patient ${patientId}, Subject: ${subject}, Priority: ${priority}`);
    }

    /**
     * Generate statement document
     */
    async generateStatementDocument(statement, items, format) {
        // Mock document generation - integrate with actual PDF/document generator
        const document = {
            statementId: statement.id,
            patientName: `${statement.first_name} ${statement.last_name}`,
            statementDate: statement.statement_date,
            balanceDue: statement.balance_due,
            items: items.map(item => ({
                date: item.service_date,
                description: item.description,
                amount: item.amount,
                type: item.item_type
            })),
            format
        };

        if (format === 'pdf') {
            // Return base64 encoded PDF content
            return Buffer.from(JSON.stringify(document)).toString('base64');
        }

        return document;
    }
}

module.exports = PatientFinancialPortalService;