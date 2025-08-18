const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');

class CollectionWorkflowManagerService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.workflowTemplates = {
            standard: [
                { name: 'initial_statement', order: 1, type: 'statement', delayDays: 0 },
                { name: 'first_reminder', order: 2, type: 'reminder', delayDays: 30 },
                { name: 'second_reminder', order: 3, type: 'reminder', delayDays: 60 },
                { name: 'final_notice', order: 4, type: 'notice', delayDays: 90 },
                { name: 'collection_call', order: 5, type: 'call', delayDays: 105 },
                { name: 'external_collection', order: 6, type: 'external', delayDays: 120 }
            ],
            aggressive: [
                { name: 'initial_statement', order: 1, type: 'statement', delayDays: 0 },
                { name: 'first_reminder', order: 2, type: 'reminder', delayDays: 15 },
                { name: 'collection_call', order: 3, type: 'call', delayDays: 30 },
                { name: 'final_notice', order: 4, type: 'notice', delayDays: 45 },
                { name: 'external_collection', order: 5, type: 'external', delayDays: 60 }
            ],
            gentle: [
                { name: 'initial_statement', order: 1, type: 'statement', delayDays: 0 },
                { name: 'first_reminder', order: 2, type: 'reminder', delayDays: 45 },
                { name: 'second_reminder', order: 3, type: 'reminder', delayDays: 90 },
                { name: 'payment_plan_offer', order: 4, type: 'offer', delayDays: 120 },
                { name: 'final_notice', order: 5, type: 'notice', delayDays: 150 }
            ]
        };
    }

    /**
     * Initiate collection workflow for an account
     */
    async initiateWorkflow(accountId, workflowType = 'standard') {
        try {
            const connection = await this.pool.getConnection();

            // Get account details
            const [accountData] = await connection.execute(`
                SELECT 
                    pa.*,
                    p.first_name,
                    p.last_name,
                    p.email,
                    p.phone,
                    DATEDIFF(CURDATE(), pa.last_payment_date) as days_outstanding
                FROM patient_accounts pa
                JOIN patients p ON pa.patient_id = p.id
                WHERE pa.id = ?
            `, [accountId]);

            if (!accountData.length) {
                throw new Error('Account not found');
            }

            const account = accountData[0];

            // Check if workflow already exists
            const [existingWorkflow] = await connection.execute(`
                SELECT id FROM rcm_collection_workflows 
                WHERE account_id = ? AND status = 'active'
            `, [accountId]);

            if (existingWorkflow.length > 0) {
                throw new Error('Active workflow already exists for this account');
            }

            // Determine workflow type based on account characteristics
            const determinedWorkflowType = await this.determineWorkflowType(account, workflowType);
            const workflowStages = this.workflowTemplates[determinedWorkflowType];

            // Create workflow instance
            const [workflowResult] = await connection.execute(`
                INSERT INTO rcm_collection_workflows 
                (account_id, patient_id, workflow_type, current_stage, stage_sequence, status, next_action_date, workflow_data)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
            `, [
                accountId,
                account.patient_id,
                determinedWorkflowType,
                workflowStages[0].name,
                JSON.stringify(workflowStages),
                new Date(),
                JSON.stringify({
                    accountBalance: account.current_balance,
                    daysOutstanding: account.days_outstanding,
                    patientContact: {
                        email: account.email,
                        phone: account.phone
                    }
                })
            ]);

            const workflowId = workflowResult.insertId;

            // Create workflow stages
            for (const stage of workflowStages) {
                await connection.execute(`
                    INSERT INTO rcm_collection_stages 
                    (workflow_id, stage_name, stage_order, stage_type, stage_config, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    workflowId,
                    stage.name,
                    stage.order,
                    stage.type,
                    JSON.stringify({
                        delayDays: stage.delayDays,
                        template: `${stage.name}_template`,
                        priority: this.calculateStagePriority(stage, account)
                    }),
                    stage.order === 1 ? 'active' : 'pending'
                ]);
            }

            // Schedule first action
            await this.scheduleNextAction(workflowId);

            connection.release();

            return {
                workflowId,
                workflowType: determinedWorkflowType,
                currentStage: workflowStages[0].name,
                totalStages: workflowStages.length,
                nextActionDate: new Date()
            };

        } catch (error) {
            console.error('Error initiating collection workflow:', error);
            throw error;
        }
    }

    /**
     * Generate personalized patient statement
     */
    async generateStatement(accountId, templateType = 'standard') {
        try {
            const connection = await this.pool.getConnection();

            // Get account and patient details
            const [accountData] = await connection.execute(`
                SELECT 
                    pa.*,
                    p.first_name,
                    p.last_name,
                    p.email,
                    p.phone,
                    pa_addr.address,
                    pa_addr.city,
                    pa_addr.state,
                    pa_addr.zip_code
                FROM patient_accounts pa
                JOIN patients p ON pa.patient_id = p.id
                LEFT JOIN patient_addresses pa_addr ON p.id = pa_addr.patient_id
                WHERE pa.id = ?
            `, [accountId]);

            if (!accountData.length) {
                throw new Error('Account not found');
            }

            const account = accountData[0];

            // Get recent charges and payments
            const [charges] = await connection.execute(`
                SELECT 
                    c.claim_number,
                    c.service_date,
                    c.total_amount,
                    c.paid_amount,
                    c.patient_responsibility,
                    pr.practice_name as provider_name
                FROM claims c
                LEFT JOIN providers pr ON c.provider_id = pr.id
                WHERE c.patient_id = ? 
                AND c.patient_responsibility > 0
                ORDER BY c.service_date DESC
                LIMIT 10
            `, [account.patient_id]);

            const [payments] = await connection.execute(`
                SELECT 
                    payment_date,
                    amount,
                    payment_method
                FROM payments 
                WHERE patient_id = ?
                ORDER BY payment_date DESC
                LIMIT 5
            `, [account.patient_id]);

            // Generate statement content
            const statement = {
                statementId: `STMT-${accountId}-${Date.now()}`,
                statementDate: new Date(),
                accountNumber: accountId,
                patientInfo: {
                    name: `${account.first_name} ${account.last_name}`,
                    address: {
                        street: account.address,
                        city: account.city,
                        state: account.state,
                        zipCode: account.zip_code
                    },
                    phone: account.phone,
                    email: account.email
                },
                accountSummary: {
                    currentBalance: parseFloat(account.current_balance),
                    totalCharges: parseFloat(account.total_charges),
                    totalPayments: parseFloat(account.total_payments),
                    lastPaymentDate: account.last_payment_date,
                    daysOutstanding: this.calculateDaysOutstanding(account.last_payment_date)
                },
                charges: charges.map(charge => ({
                    claimNumber: charge.claim_number,
                    serviceDate: charge.service_date,
                    provider: charge.provider_name,
                    totalAmount: parseFloat(charge.total_amount),
                    paidAmount: parseFloat(charge.paid_amount),
                    patientResponsibility: parseFloat(charge.patient_responsibility)
                })),
                recentPayments: payments.map(payment => ({
                    date: payment.payment_date,
                    amount: parseFloat(payment.amount),
                    method: payment.payment_method
                })),
                paymentOptions: await this.generatePaymentOptions(account),
                template: templateType,
                generatedAt: new Date()
            };

            // Store statement generation record
            await connection.execute(`
                INSERT INTO rcm_patient_documents 
                (patient_account_id, document_type, document_name, document_date)
                VALUES (?, 'statement', ?, CURDATE())
            `, [accountId, statement.statementId]);

            connection.release();
            return statement;

        } catch (error) {
            console.error('Error generating statement:', error);
            throw error;
        }
    }

    /**
     * Schedule follow-up action
     */
    async scheduleFollowUp(accountId, actionType, scheduledDate = null) {
        try {
            const connection = await this.pool.getConnection();

            // Get active workflow
            const [workflow] = await connection.execute(`
                SELECT * FROM rcm_collection_workflows 
                WHERE account_id = ? AND status = 'active'
            `, [accountId]);

            if (!workflow.length) {
                throw new Error('No active workflow found for account');
            }

            const workflowId = workflow[0].id;

            // Calculate scheduled date if not provided
            if (!scheduledDate) {
                scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + this.getActionDelay(actionType));
            }

            // Create follow-up action
            const [result] = await connection.execute(`
                INSERT INTO rcm_collection_actions 
                (workflow_id, action_type, action_description, scheduled_date, status, action_data)
                VALUES (?, ?, ?, ?, 'scheduled', ?)
            `, [
                workflowId,
                actionType,
                this.getActionDescription(actionType),
                scheduledDate,
                JSON.stringify({
                    priority: this.getActionPriority(actionType),
                    template: `${actionType}_template`,
                    autoExecute: this.isAutoExecutable(actionType)
                })
            ]);

            // Update workflow next action date
            await connection.execute(`
                UPDATE rcm_collection_workflows 
                SET next_action_date = ?
                WHERE id = ?
            `, [scheduledDate, workflowId]);

            connection.release();

            return {
                actionId: result.insertId,
                actionType,
                scheduledDate,
                workflowId
            };

        } catch (error) {
            console.error('Error scheduling follow-up:', error);
            throw error;
        }
    }

    /**
     * Setup payment plan for patient
     */
    async setupPaymentPlan(accountId, planDetails) {
        try {
            const connection = await this.pool.getConnection();

            // Get account details
            const [account] = await connection.execute(`
                SELECT * FROM patient_accounts WHERE id = ?
            `, [accountId]);

            if (!account.length) {
                throw new Error('Account not found');
            }

            const accountData = account[0];
            const totalAmount = parseFloat(accountData.current_balance);

            // Validate payment plan
            const validation = this.validatePaymentPlan(totalAmount, planDetails);
            if (!validation.isValid) {
                throw new Error(`Payment plan validation failed: ${validation.errors.join(', ')}`);
            }

            // Calculate payment schedule
            const paymentSchedule = this.calculatePaymentSchedule(totalAmount, planDetails);

            // Create payment plan
            const [result] = await connection.execute(`
                INSERT INTO rcm_payment_plans 
                (account_id, patient_id, total_amount, monthly_payment, number_of_payments, 
                 remaining_balance, start_date, next_payment_date, auto_pay_enabled, payment_method_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                accountId,
                accountData.patient_id,
                totalAmount,
                planDetails.monthlyPayment,
                planDetails.numberOfPayments,
                totalAmount,
                planDetails.startDate,
                paymentSchedule.firstPaymentDate,
                planDetails.autoPayEnabled || false,
                planDetails.paymentMethodId || null
            ]);

            const paymentPlanId = result.insertId;

            // Update account status
            await connection.execute(`
                UPDATE patient_accounts 
                SET payment_plan_active = TRUE
                WHERE id = ?
            `, [accountId]);

            // Pause collection workflow if active
            await connection.execute(`
                UPDATE rcm_collection_workflows 
                SET status = 'paused'
                WHERE account_id = ? AND status = 'active'
            `, [accountId]);

            connection.release();

            return {
                paymentPlanId,
                totalAmount,
                monthlyPayment: planDetails.monthlyPayment,
                numberOfPayments: planDetails.numberOfPayments,
                firstPaymentDate: paymentSchedule.firstPaymentDate,
                paymentSchedule: paymentSchedule.schedule
            };

        } catch (error) {
            console.error('Error setting up payment plan:', error);
            throw error;
        }
    }

    /**
     * Process workflow actions
     */
    async processWorkflowActions() {
        try {
            const connection = await this.pool.getConnection();

            // Get due actions
            const [dueActions] = await connection.execute(`
                SELECT 
                    ca.*,
                    cw.account_id,
                    cw.patient_id,
                    pa.current_balance,
                    p.first_name,
                    p.last_name,
                    p.email,
                    p.phone
                FROM rcm_collection_actions ca
                JOIN rcm_collection_workflows cw ON ca.workflow_id = cw.id
                JOIN patient_accounts pa ON cw.account_id = pa.id
                JOIN patients p ON cw.patient_id = p.id
                WHERE ca.status = 'scheduled'
                AND ca.scheduled_date <= NOW()
                ORDER BY ca.scheduled_date ASC
                LIMIT 50
            `);

            const processedActions = [];

            for (const action of dueActions) {
                try {
                    const result = await this.executeAction(action);
                    processedActions.push({
                        actionId: action.id,
                        success: true,
                        result
                    });
                } catch (error) {
                    processedActions.push({
                        actionId: action.id,
                        success: false,
                        error: error.message
                    });
                }
            }

            connection.release();
            return processedActions;

        } catch (error) {
            console.error('Error processing workflow actions:', error);
            throw error;
        }
    }

    /**
     * Get collection workflow dashboard data
     */
    async getCollectionDashboard() {
        try {
            const connection = await this.pool.getConnection();

            // Get workflow statistics
            const [workflowStats] = await connection.execute(`
                SELECT 
                    workflow_type,
                    status,
                    COUNT(*) as count
                FROM rcm_collection_workflows 
                WHERE started_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY workflow_type, status
            `);

            // Get action statistics
            const [actionStats] = await connection.execute(`
                SELECT 
                    action_type,
                    status,
                    COUNT(*) as count
                FROM rcm_collection_actions 
                WHERE scheduled_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY action_type, status
            `);

            // Get payment plan statistics
            const [paymentPlanStats] = await connection.execute(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(total_amount) as total_amount,
                    SUM(remaining_balance) as remaining_balance
                FROM rcm_payment_plans 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY status
            `);

            // Get active workflows
            const [activeWorkflows] = await connection.execute(`
                SELECT 
                    cw.*,
                    pa.current_balance,
                    p.first_name,
                    p.last_name,
                    DATEDIFF(NOW(), cw.started_date) as days_active
                FROM rcm_collection_workflows cw
                JOIN patient_accounts pa ON cw.account_id = pa.id
                JOIN patients p ON cw.patient_id = p.id
                WHERE cw.status = 'active'
                ORDER BY cw.next_action_date ASC
                LIMIT 20
            `);

            connection.release();

            return {
                workflowStats,
                actionStats,
                paymentPlanStats,
                activeWorkflows,
                summary: {
                    totalActiveWorkflows: workflowStats.filter(s => s.status === 'active').reduce((sum, s) => sum + s.count, 0),
                    totalPaymentPlans: paymentPlanStats.reduce((sum, s) => sum + s.count, 0),
                    totalCollectionAmount: paymentPlanStats.reduce((sum, s) => sum + (s.total_amount || 0), 0)
                }
            };

        } catch (error) {
            console.error('Error getting collection dashboard:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    async determineWorkflowType(account, requestedType) {
        const balance = parseFloat(account.current_balance);
        const daysOutstanding = account.days_outstanding || 0;

        // Override with business rules
        if (balance > 10000 || daysOutstanding > 120) {
            return 'aggressive';
        } else if (balance < 500 && daysOutstanding < 60) {
            return 'gentle';
        }

        return requestedType;
    }

    calculateStagePriority(stage, account) {
        const balance = parseFloat(account.current_balance);
        let priority = 'medium';

        if (stage.type === 'external' || balance > 5000) {
            priority = 'high';
        } else if (stage.type === 'statement' || balance < 500) {
            priority = 'low';
        }

        return priority;
    }

    async scheduleNextAction(workflowId) {
        try {
            const connection = await this.pool.getConnection();

            // Get current stage
            const [currentStage] = await connection.execute(`
                SELECT * FROM rcm_collection_stages 
                WHERE workflow_id = ? AND status = 'active'
                ORDER BY stage_order ASC
                LIMIT 1
            `, [workflowId]);

            if (currentStage.length > 0) {
                const stage = currentStage[0];
                const stageConfig = JSON.parse(stage.stage_config);
                
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + (stageConfig.delayDays || 0));

                await connection.execute(`
                    INSERT INTO rcm_collection_actions 
                    (workflow_id, stage_id, action_type, action_description, scheduled_date, status, action_data)
                    VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
                `, [
                    workflowId,
                    stage.id,
                    stage.stage_type,
                    this.getActionDescription(stage.stage_type),
                    scheduledDate,
                    JSON.stringify({
                        template: stageConfig.template,
                        priority: stageConfig.priority
                    })
                ]);
            }

            connection.release();

        } catch (error) {
            console.error('Error scheduling next action:', error);
            throw error;
        }
    }

    calculateDaysOutstanding(lastPaymentDate) {
        if (!lastPaymentDate) return 0;
        const today = new Date();
        const paymentDate = new Date(lastPaymentDate);
        const diffTime = Math.abs(today - paymentDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async generatePaymentOptions(account) {
        const balance = parseFloat(account.current_balance);
        const options = [];

        // Full payment option
        options.push({
            type: 'full_payment',
            amount: balance,
            description: 'Pay full balance',
            discount: 0
        });

        // Payment plan options
        if (balance > 500) {
            options.push({
                type: 'payment_plan_6',
                monthlyAmount: Math.ceil(balance / 6),
                numberOfPayments: 6,
                description: '6-month payment plan'
            });
        }

        if (balance > 1000) {
            options.push({
                type: 'payment_plan_12',
                monthlyAmount: Math.ceil(balance / 12),
                numberOfPayments: 12,
                description: '12-month payment plan'
            });
        }

        return options;
    }

    validatePaymentPlan(totalAmount, planDetails) {
        const errors = [];

        if (!planDetails.monthlyPayment || planDetails.monthlyPayment <= 0) {
            errors.push('Monthly payment amount is required');
        }

        if (!planDetails.numberOfPayments || planDetails.numberOfPayments <= 0) {
            errors.push('Number of payments is required');
        }

        if (planDetails.monthlyPayment * planDetails.numberOfPayments < totalAmount * 0.95) {
            errors.push('Payment plan total must cover at least 95% of balance');
        }

        if (planDetails.numberOfPayments > 24) {
            errors.push('Payment plans cannot exceed 24 months');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    calculatePaymentSchedule(totalAmount, planDetails) {
        const schedule = [];
        const startDate = new Date(planDetails.startDate);
        
        for (let i = 0; i < planDetails.numberOfPayments; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + i);
            
            schedule.push({
                paymentNumber: i + 1,
                dueDate: paymentDate,
                amount: planDetails.monthlyPayment
            });
        }

        return {
            firstPaymentDate: schedule[0].dueDate,
            schedule
        };
    }

    async executeAction(action) {
        const connection = await this.pool.getConnection();

        try {
            // Mark action as in progress
            await connection.execute(`
                UPDATE rcm_collection_actions 
                SET status = 'in_progress'
                WHERE id = ?
            `, [action.id]);

            let result = {};

            switch (action.action_type) {
                case 'statement':
                    result = await this.generateStatement(action.account_id);
                    break;
                case 'reminder':
                    result = await this.sendReminder(action);
                    break;
                case 'call':
                    result = await this.scheduleCall(action);
                    break;
                case 'notice':
                    result = await this.sendNotice(action);
                    break;
                default:
                    result = { message: 'Action type not implemented' };
            }

            // Mark action as completed
            await connection.execute(`
                UPDATE rcm_collection_actions 
                SET status = 'completed', completed_date = NOW(), result_data = ?
                WHERE id = ?
            `, [JSON.stringify(result), action.id]);

            connection.release();
            return result;

        } catch (error) {
            // Mark action as failed
            await connection.execute(`
                UPDATE rcm_collection_actions 
                SET status = 'cancelled', result_data = ?
                WHERE id = ?
            `, [JSON.stringify({ error: error.message }), action.id]);

            connection.release();
            throw error;
        }
    }

    async sendReminder(action) {
        // Implementation for sending reminder
        return { message: 'Reminder sent', method: 'email' };
    }

    async scheduleCall(action) {
        // Implementation for scheduling collection call
        return { message: 'Call scheduled', scheduledFor: new Date() };
    }

    async sendNotice(action) {
        // Implementation for sending notice
        return { message: 'Notice sent', method: 'mail' };
    }

    getActionDelay(actionType) {
        const delays = {
            'statement': 0,
            'reminder': 30,
            'call': 7,
            'notice': 14,
            'external': 30
        };
        return delays[actionType] || 7;
    }

    getActionDescription(actionType) {
        const descriptions = {
            'statement': 'Generate and send patient statement',
            'reminder': 'Send payment reminder',
            'call': 'Schedule collection call',
            'notice': 'Send collection notice',
            'external': 'Refer to external collection agency'
        };
        return descriptions[actionType] || 'Collection action';
    }

    getActionPriority(actionType) {
        const priorities = {
            'statement': 'low',
            'reminder': 'medium',
            'call': 'high',
            'notice': 'high',
            'external': 'urgent'
        };
        return priorities[actionType] || 'medium';
    }

    isAutoExecutable(actionType) {
        const autoExecutable = ['statement', 'reminder', 'notice'];
        return autoExecutable.includes(actionType);
    }
}

module.exports = CollectionWorkflowManagerService;