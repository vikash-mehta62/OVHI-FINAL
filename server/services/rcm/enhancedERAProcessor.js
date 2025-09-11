/**
 * Enhanced ERA Processor Service
 * Comprehensive ERA file processing with intelligent payment matching
 */

const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');
const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');
const { auditLog } = require('../../utils/dbUtils');

class EnhancedERAProcessor {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.supportedFormats = ['X12_835', 'CSV', 'EXCEL', 'JSON'];
        this.matchingAlgorithms = ['exact', 'fuzzy', 'partial', 'advanced'];
    }

    /**
     * Process ERA file with comprehensive parsing and validation
     */
    async processERAFile(eraFileData) {
        try {
            const connection = await this.pool.getConnection();
            
            const {
                eraContent,
                fileName,
                fileFormat = 'X12_835',
                autoPost = false,
                userId
            } = eraFileData;

            // Validate file format
            if (!this.supportedFormats.includes(fileFormat)) {
                throw new Error(`Unsupported file format: ${fileFormat}`);
            }

            // Create ERA file record
            const [eraFileResult] = await connection.execute(`
                INSERT INTO rcm_era_files 
                (file_name, file_format, file_size, processing_status, uploaded_by, created_at)
                VALUES (?, ?, ?, 'processing', ?, NOW())
            `, [fileName, fileFormat, eraContent.length, userId]);

            const eraFileId = eraFileResult.insertId;

            try {
                // Parse ERA content based on format
                const parsedERA = await this.parseERAContent(eraContent, fileFormat);
                
                // Validate parsed data
                const validationResult = await this.validateERAData(parsedERA);
                
                if (!validationResult.isValid) {
                    await connection.execute(`
                        UPDATE rcm_era_files 
                        SET processing_status = 'failed', 
                            error_message = ?,
                            processed_at = NOW()
                        WHERE id = ?
                    `, [JSON.stringify(validationResult.errors), eraFileId]);
                    
                    connection.release();
                    return {
                        success: false,
                        eraFileId,
                        errors: validationResult.errors
                    };
                }

                // Process ERA line items
                const processingResult = await this.processERALineItems(
                    eraFileId, 
                    parsedERA, 
                    connection
                );

                // Perform payment matching
                const matchingResult = await this.performPaymentMatching(
                    eraFileId, 
                    processingResult.lineItems,
                    connection
                );

                // Auto-post if enabled
                let postingResult = null;
                if (autoPost && matchingResult.matchedPayments.length > 0) {
                    postingResult = await this.autoPostPayments(
                        matchingResult.matchedPayments,
                        userId,
                        connection
                    );
                }

                // Update ERA file status
                await connection.execute(`
                    UPDATE rcm_era_files 
                    SET processing_status = 'completed',
                        total_payments = ?,
                        matched_payments = ?,
                        unmatched_payments = ?,
                        posted_amount = ?,
                        processed_at = NOW()
                    WHERE id = ?
                `, [
                    processingResult.totalPayments,
                    matchingResult.matchedPayments.length,
                    matchingResult.unmatchedPayments.length,
                    postingResult?.totalPosted || 0,
                    eraFileId
                ]);

                // Log audit trail
                await auditLog('ERA_PROCESSED', {
                    userId,
                    eraFileId,
                    fileName,
                    totalPayments: processingResult.totalPayments,
                    matchedPayments: matchingResult.matchedPayments.length,
                    autoPosted: autoPost
                });

                connection.release();

                return {
                    success: true,
                    eraFileId,
                    processingResult,
                    matchingResult,
                    postingResult,
                    summary: {
                        totalPayments: processingResult.totalPayments,
                        totalAmount: processingResult.totalAmount,
                        matchedPayments: matchingResult.matchedPayments.length,
                        unmatchedPayments: matchingResult.unmatchedPayments.length,
                        postedAmount: postingResult?.totalPosted || 0,
                        processingTime: Date.now() - new Date().getTime()
                    }
                };

            } catch (processingError) {
                // Update ERA file with error status
                await connection.execute(`
                    UPDATE rcm_era_files 
                    SET processing_status = 'failed',
                        error_message = ?,
                        processed_at = NOW()
                    WHERE id = ?
                `, [processingError.message, eraFileId]);

                connection.release();
                throw processingError;
            }

        } catch (error) {
            console.error('ERA processing error:', error);
            throw error;
        }
    }

    /**
     * Parse ERA content based on format
     */
    async parseERAContent(content, format) {
        switch (format) {
            case 'X12_835':
                return this.parseX12_835(content);
            case 'CSV':
                return this.parseCSV(content);
            case 'EXCEL':
                return this.parseExcel(content);
            case 'JSON':
                return JSON.parse(content);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Parse X12 835 EDI format
     */
    parseX12_835(content) {
        const lines = content.split('\n');
        const eraData = {
            header: {},
            payerInfo: {},
            payments: [],
            summary: {}
        };

        let currentPayment = null;
        let currentClaim = null;

        for (const line of lines) {
            const segments = line.split('*');
            const segmentId = segments[0];

            switch (segmentId) {
                case 'ISA': // Interchange Control Header
                    eraData.header.interchangeControlNumber = segments[13];
                    break;

                case 'BPR': // Beginning Segment for Payment Order/Remittance
                    eraData.payerInfo.paymentAmount = parseFloat(segments[2]);
                    eraData.payerInfo.paymentMethod = segments[3];
                    eraData.payerInfo.effectiveDate = segments[16];
                    break;

                case 'N1': // Party Identification
                    if (segments[1] === 'PR') { // Payer
                        eraData.payerInfo.name = segments[2];
                    }
                    break;

                case 'CLP': // Claim Payment Information
                    if (currentPayment) {
                        eraData.payments.push(currentPayment);
                    }
                    currentPayment = {
                        claimNumber: segments[1],
                        claimStatus: segments[2],
                        totalCharges: parseFloat(segments[3]),
                        paymentAmount: parseFloat(segments[4]),
                        patientResponsibility: parseFloat(segments[5]),
                        claimType: segments[6],
                        serviceLines: [],
                        adjustments: []
                    };
                    break;

                case 'SVC': // Service Payment Information
                    if (currentPayment) {
                        const serviceLine = {
                            procedureCode: segments[1],
                            chargedAmount: parseFloat(segments[2]),
                            paidAmount: parseFloat(segments[3]),
                            units: segments[4] || 1
                        };
                        currentPayment.serviceLines.push(serviceLine);
                    }
                    break;

                case 'CAS': // Claims Adjustment
                    if (currentPayment) {
                        const adjustment = {
                            groupCode: segments[1],
                            reasonCode: segments[2],
                            adjustmentAmount: parseFloat(segments[3]),
                            quantity: segments[4] || 0
                        };
                        currentPayment.adjustments.push(adjustment);
                    }
                    break;
            }
        }

        // Add last payment
        if (currentPayment) {
            eraData.payments.push(currentPayment);
        }

        return eraData;
    }

    /**
     * Parse CSV format ERA
     */
    parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const payments = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const payment = {};
                
                headers.forEach((header, index) => {
                    payment[header] = values[index]?.trim();
                });

                // Standardize payment object
                payments.push({
                    claimNumber: payment.claim_number || payment.claimNumber,
                    paymentAmount: parseFloat(payment.payment_amount || payment.paymentAmount || 0),
                    totalCharges: parseFloat(payment.total_charges || payment.totalCharges || 0),
                    patientResponsibility: parseFloat(payment.patient_responsibility || payment.patientResponsibility || 0),
                    checkNumber: payment.check_number || payment.checkNumber,
                    paymentDate: payment.payment_date || payment.paymentDate,
                    serviceLines: [],
                    adjustments: []
                });
            }
        }

        return {
            header: { format: 'CSV' },
            payerInfo: { name: 'CSV Import' },
            payments,
            summary: { totalPayments: payments.length }
        };
    }

    /**
     * Validate ERA data
     */
    async validateERAData(eraData) {
        const errors = [];
        const warnings = [];

        // Validate header
        if (!eraData.header) {
            errors.push('Missing ERA header information');
        }

        // Validate payer info
        if (!eraData.payerInfo || !eraData.payerInfo.name) {
            errors.push('Missing payer information');
        }

        // Validate payments
        if (!eraData.payments || eraData.payments.length === 0) {
            errors.push('No payment records found in ERA file');
        } else {
            eraData.payments.forEach((payment, index) => {
                if (!payment.claimNumber) {
                    errors.push(`Payment ${index + 1}: Missing claim number`);
                }
                if (isNaN(payment.paymentAmount) || payment.paymentAmount < 0) {
                    errors.push(`Payment ${index + 1}: Invalid payment amount`);
                }
                if (payment.totalCharges && payment.paymentAmount > payment.totalCharges) {
                    warnings.push(`Payment ${index + 1}: Payment exceeds total charges`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Process ERA line items and store in database
     */
    async processERALineItems(eraFileId, eraData, connection) {
        const lineItems = [];
        let totalPayments = 0;
        let totalAmount = 0;

        for (const payment of eraData.payments) {
            const [lineItemResult] = await connection.execute(`
                INSERT INTO rcm_era_line_items 
                (era_file_id, claim_number, payment_amount, total_charges, 
                 patient_responsibility, check_number, payment_date, 
                 service_lines, adjustments, processing_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `, [
                eraFileId,
                payment.claimNumber,
                payment.paymentAmount,
                payment.totalCharges || 0,
                payment.patientResponsibility || 0,
                payment.checkNumber || null,
                payment.paymentDate || new Date(),
                JSON.stringify(payment.serviceLines || []),
                JSON.stringify(payment.adjustments || [])
            ]);

            lineItems.push({
                id: lineItemResult.insertId,
                ...payment
            });

            totalPayments++;
            totalAmount += payment.paymentAmount;
        }

        return {
            lineItems,
            totalPayments,
            totalAmount
        };
    }

    /**
     * Perform intelligent payment matching
     */
    async performPaymentMatching(eraFileId, lineItems, connection) {
        const matchedPayments = [];
        const unmatchedPayments = [];

        for (const lineItem of lineItems) {
            try {
                // Try exact matching first
                let matchResult = await this.exactMatch(lineItem, connection);
                
                if (!matchResult.matched) {
                    // Try fuzzy matching
                    matchResult = await this.fuzzyMatch(lineItem, connection);
                }

                if (!matchResult.matched) {
                    // Try partial matching
                    matchResult = await this.partialMatch(lineItem, connection);
                }

                if (matchResult.matched) {
                    // Store successful match
                    await connection.execute(`
                        INSERT INTO rcm_payment_matches 
                        (era_file_id, era_line_item_id, claim_id, match_type, 
                         match_confidence, match_criteria, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, NOW())
                    `, [
                        eraFileId,
                        lineItem.id,
                        matchResult.claimId,
                        matchResult.matchType,
                        matchResult.confidence,
                        JSON.stringify(matchResult.criteria)
                    ]);

                    matchedPayments.push({
                        lineItemId: lineItem.id,
                        claimId: matchResult.claimId,
                        matchType: matchResult.matchType,
                        confidence: matchResult.confidence,
                        paymentAmount: lineItem.paymentAmount
                    });

                    // Update line item status
                    await connection.execute(`
                        UPDATE rcm_era_line_items 
                        SET processing_status = 'matched', matched_claim_id = ?
                        WHERE id = ?
                    `, [matchResult.claimId, lineItem.id]);

                } else {
                    unmatchedPayments.push({
                        lineItemId: lineItem.id,
                        claimNumber: lineItem.claimNumber,
                        paymentAmount: lineItem.paymentAmount,
                        reason: 'No matching claim found'
                    });

                    // Update line item status
                    await connection.execute(`
                        UPDATE rcm_era_line_items 
                        SET processing_status = 'unmatched'
                        WHERE id = ?
                    `, [lineItem.id]);
                }

            } catch (matchError) {
                console.error(`Matching error for line item ${lineItem.id}:`, matchError);
                unmatchedPayments.push({
                    lineItemId: lineItem.id,
                    claimNumber: lineItem.claimNumber,
                    paymentAmount: lineItem.paymentAmount,
                    reason: matchError.message
                });
            }
        }

        return {
            matchedPayments,
            unmatchedPayments,
            matchingStats: {
                totalProcessed: lineItems.length,
                matched: matchedPayments.length,
                unmatched: unmatchedPayments.length,
                matchRate: (matchedPayments.length / lineItems.length) * 100
            }
        };
    }

    /**
     * Exact matching algorithm
     */
    async exactMatch(lineItem, connection) {
        const [claims] = await connection.execute(`
            SELECT id, claim_number, total_amount, patient_id
            FROM claims 
            WHERE claim_number = ? 
            AND ABS(total_amount - ?) < 0.01
            AND status IN (1, 2) -- Submitted or In Process
            LIMIT 1
        `, [lineItem.claimNumber, lineItem.paymentAmount]);

        if (claims.length > 0) {
            return {
                matched: true,
                claimId: claims[0].id,
                matchType: 'exact',
                confidence: 100,
                criteria: {
                    claimNumber: 'exact',
                    amount: 'exact'
                }
            };
        }

        return { matched: false };
    }

    /**
     * Fuzzy matching algorithm
     */
    async fuzzyMatch(lineItem, connection) {
        // Try matching by claim number with amount tolerance
        const [claims] = await connection.execute(`
            SELECT id, claim_number, total_amount, patient_id,
                   ABS(total_amount - ?) as amount_diff
            FROM claims 
            WHERE claim_number = ?
            AND status IN (1, 2)
            ORDER BY amount_diff ASC
            LIMIT 1
        `, [lineItem.paymentAmount, lineItem.claimNumber]);

        if (claims.length > 0) {
            const amountDiff = claims[0].amount_diff;
            const tolerance = claims[0].total_amount * 0.1; // 10% tolerance

            if (amountDiff <= tolerance) {
                const confidence = Math.max(60, 100 - (amountDiff / tolerance) * 40);
                
                return {
                    matched: true,
                    claimId: claims[0].id,
                    matchType: 'fuzzy',
                    confidence: Math.round(confidence),
                    criteria: {
                        claimNumber: 'exact',
                        amount: 'tolerance',
                        amountDifference: amountDiff
                    }
                };
            }
        }

        return { matched: false };
    }

    /**
     * Partial matching algorithm
     */
    async partialMatch(lineItem, connection) {
        // Try matching by similar claim number patterns
        const claimPattern = lineItem.claimNumber.replace(/[^A-Za-z0-9]/g, '');
        
        const [claims] = await connection.execute(`
            SELECT id, claim_number, total_amount, patient_id
            FROM claims 
            WHERE REPLACE(REPLACE(claim_number, '-', ''), ' ', '') LIKE ?
            AND ABS(total_amount - ?) <= ?
            AND status IN (1, 2)
            ORDER BY ABS(total_amount - ?) ASC
            LIMIT 1
        `, [
            `%${claimPattern}%`,
            lineItem.paymentAmount,
            lineItem.paymentAmount * 0.2, // 20% tolerance
            lineItem.paymentAmount
        ]);

        if (claims.length > 0) {
            return {
                matched: true,
                claimId: claims[0].id,
                matchType: 'partial',
                confidence: 50,
                criteria: {
                    claimNumber: 'partial',
                    amount: 'tolerance'
                }
            };
        }

        return { matched: false };
    }

    /**
     * Auto-post matched payments
     */
    async autoPostPayments(matchedPayments, userId, connection) {
        const postingResults = [];
        let totalPosted = 0;

        for (const match of matchedPayments) {
            try {
                // Create payment record
                const [paymentResult] = await connection.execute(`
                    INSERT INTO payments 
                    (claim_id, patient_id, amount, payment_date, payment_method, 
                     check_number, posted_by, posting_source, created_at)
                    SELECT ?, c.patient_id, ?, NOW(), 'ERA', 
                           eli.check_number, ?, 'ERA_AUTO_POST', NOW()
                    FROM claims c
                    JOIN rcm_era_line_items eli ON eli.matched_claim_id = c.id
                    WHERE c.id = ? AND eli.id = ?
                `, [
                    match.claimId,
                    match.paymentAmount,
                    userId,
                    match.claimId,
                    match.lineItemId
                ]);

                // Update claim status and amounts
                await connection.execute(`
                    UPDATE claims 
                    SET paid_amount = paid_amount + ?,
                        remaining_balance = total_amount - (paid_amount + ?),
                        status = CASE 
                            WHEN (paid_amount + ?) >= total_amount THEN 3 -- Paid
                            ELSE 2 -- Partially Paid
                        END,
                        last_payment_date = NOW()
                    WHERE id = ?
                `, [
                    match.paymentAmount,
                    match.paymentAmount,
                    match.paymentAmount,
                    match.claimId
                ]);

                // Store posting result
                await connection.execute(`
                    INSERT INTO rcm_posting_results 
                    (payment_match_id, payment_id, claim_id, posted_amount, 
                     posting_status, posted_by, posted_at)
                    VALUES (?, ?, ?, ?, 'success', ?, NOW())
                `, [
                    match.lineItemId,
                    paymentResult.insertId,
                    match.claimId,
                    match.paymentAmount,
                    userId
                ]);

                postingResults.push({
                    matchId: match.lineItemId,
                    paymentId: paymentResult.insertId,
                    claimId: match.claimId,
                    postedAmount: match.paymentAmount,
                    status: 'success'
                });

                totalPosted += match.paymentAmount;

            } catch (postingError) {
                console.error(`Posting error for match ${match.lineItemId}:`, postingError);
                
                postingResults.push({
                    matchId: match.lineItemId,
                    claimId: match.claimId,
                    postedAmount: 0,
                    status: 'failed',
                    error: postingError.message
                });
            }
        }

        return {
            postingResults,
            totalPosted,
            successCount: postingResults.filter(r => r.status === 'success').length,
            failureCount: postingResults.filter(r => r.status === 'failed').length
        };
    }

    /**
     * Get ERA processing status
     */
    async getERAProcessingStatus(eraFileId) {
        try {
            const connection = await this.pool.getConnection();

            const [eraFile] = await connection.execute(`
                SELECT 
                    ef.*,
                    COUNT(eli.id) as total_line_items,
                    SUM(CASE WHEN eli.processing_status = 'matched' THEN 1 ELSE 0 END) as matched_items,
                    SUM(CASE WHEN eli.processing_status = 'unmatched' THEN 1 ELSE 0 END) as unmatched_items,
                    SUM(eli.payment_amount) as total_payment_amount
                FROM rcm_era_files ef
                LEFT JOIN rcm_era_line_items eli ON ef.id = eli.era_file_id
                WHERE ef.id = ?
                GROUP BY ef.id
            `, [eraFileId]);

            if (!eraFile.length) {
                throw new Error('ERA file not found');
            }

            // Get matching details
            const [matchingDetails] = await connection.execute(`
                SELECT 
                    pm.match_type,
                    COUNT(*) as count,
                    AVG(pm.match_confidence) as avg_confidence
                FROM rcm_payment_matches pm
                WHERE pm.era_file_id = ?
                GROUP BY pm.match_type
            `, [eraFileId]);

            // Get posting results
            const [postingResults] = await connection.execute(`
                SELECT 
                    posting_status,
                    COUNT(*) as count,
                    SUM(posted_amount) as total_amount
                FROM rcm_posting_results pr
                JOIN rcm_payment_matches pm ON pr.payment_match_id = pm.era_line_item_id
                WHERE pm.era_file_id = ?
                GROUP BY posting_status
            `, [eraFileId]);

            connection.release();

            return {
                eraFile: eraFile[0],
                matchingDetails,
                postingResults,
                summary: {
                    processingStatus: eraFile[0].processing_status,
                    totalLineItems: eraFile[0].total_line_items || 0,
                    matchedItems: eraFile[0].matched_items || 0,
                    unmatchedItems: eraFile[0].unmatched_items || 0,
                    matchRate: eraFile[0].total_line_items > 0 
                        ? (eraFile[0].matched_items / eraFile[0].total_line_items) * 100 
                        : 0,
                    totalPaymentAmount: eraFile[0].total_payment_amount || 0
                }
            };

        } catch (error) {
            console.error('Error getting ERA processing status:', error);
            throw error;
        }
    }

    /**
     * Generate variance report for unmatched payments
     */
    async generateVarianceReport(eraFileId) {
        try {
            const connection = await this.pool.getConnection();

            const [variances] = await connection.execute(`
                SELECT 
                    eli.id,
                    eli.claim_number,
                    eli.payment_amount,
                    eli.total_charges,
                    eli.processing_status,
                    'No matching claim found' as variance_reason
                FROM rcm_era_line_items eli
                WHERE eli.era_file_id = ? 
                AND eli.processing_status = 'unmatched'
                
                UNION ALL
                
                SELECT 
                    eli.id,
                    eli.claim_number,
                    eli.payment_amount,
                    c.total_amount as claim_amount,
                    'Amount variance' as processing_status,
                    CONCAT('Payment amount (', eli.payment_amount, ') differs from claim amount (', c.total_amount, ')') as variance_reason
                FROM rcm_era_line_items eli
                JOIN rcm_payment_matches pm ON eli.id = pm.era_line_item_id
                JOIN claims c ON pm.claim_id = c.id
                WHERE eli.era_file_id = ?
                AND ABS(eli.payment_amount - c.total_amount) > 0.01
            `, [eraFileId, eraFileId]);

            connection.release();

            return {
                eraFileId,
                variances,
                summary: {
                    totalVariances: variances.length,
                    unmatchedPayments: variances.filter(v => v.processing_status === 'unmatched').length,
                    amountVariances: variances.filter(v => v.processing_status === 'Amount variance').length,
                    totalVarianceAmount: variances.reduce((sum, v) => sum + parseFloat(v.payment_amount), 0)
                }
            };

        } catch (error) {
            console.error('Error generating variance report:', error);
            throw error;
        }
    }
}

module.exports = EnhancedERAProcessor;