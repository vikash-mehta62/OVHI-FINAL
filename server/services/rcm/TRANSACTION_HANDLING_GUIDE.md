# RCM Transaction Handling Guide

## Overview

This guide provides comprehensive documentation for transaction handling in the Revenue Cycle Management (RCM) system. It covers atomic operations, rollback mechanisms, and best practices for maintaining data consistency.

## Transaction Architecture

### Core Components

1. **TransactionManager**: Advanced transaction management with retry logic and savepoints
2. **TransactionalRCMService**: Enhanced RCM service with comprehensive transaction support
3. **Database Utilities**: Connection pooling and query execution with transaction support
4. **Error Handling**: Standardized error handling with rollback capabilities

### Transaction Isolation Levels

```javascript
const IsolationLevels = {
  READ_UNCOMMITTED: 'READ UNCOMMITTED',  // Lowest isolation, highest performance
  READ_COMMITTED: 'READ COMMITTED',      // Default for most operations
  REPEATABLE_READ: 'REPEATABLE READ',    // For consistent reads
  SERIALIZABLE: 'SERIALIZABLE'           // Highest isolation for financial operations
};
```

## Critical Operations Requiring Transactions

### 1. Payment Processing

**Operations Covered:**
- Payment posting with claim updates
- Patient account balance adjustments
- Audit trail logging

**Transaction Flow:**
```javascript
await executeTransaction(async (connection, context) => {
  // 1. Create savepoint for payment record
  await context.createSavepoint('payment_record');
  
  // 2. Insert payment
  const paymentId = await context.execute(insertPaymentQuery, params);
  
  // 3. Create savepoint for claim updates
  await context.createSavepoint('claim_updates');
  
  // 4. Update claim status and amounts
  await context.execute(updateClaimQuery, params);
  
  // 5. Update patient account balance
  await context.execute(updateAccountQuery, params);
  
  // 6. Log audit trail
  await auditLog(auditData);
  
  return result;
}, {
  isolationLevel: IsolationLevels.READ_COMMITTED,
  timeout: 30000,
  retryAttempts: 3
});
```

**Rollback Scenarios:**
- Invalid claim ID
- Insufficient account balance
- Database constraint violations
- Network timeouts

### 2. ERA Processing

**Operations Covered:**
- ERA file record creation
- Payment detail batch insertion
- Auto-posting of valid payments
- Claim status updates

**Transaction Flow:**
```javascript
await executeTransaction(async (connection, context) => {
  // 1. Store ERA record
  const eraId = await context.execute(insertERAQuery, params);
  
  // 2. Process payment details in batch
  const paymentOperations = payments.map(payment => ({
    query: insertPaymentDetailQuery,
    params: paymentParams
  }));
  
  const paymentResults = await context.executeBatch(paymentOperations);
  
  // 3. Auto-post valid payments with individual savepoints
  for (let i = 0; i < payments.length; i++) {
    const savepointName = `autopost_${i}`;
    await context.createSavepoint(savepointName);
    
    try {
      await autoPostPayment(payments[i], context);
    } catch (error) {
      await context.rollbackToSavepoint(savepointName);
      // Continue with next payment
    }
  }
  
  return result;
});
```

### 3. Bulk Operations

**Operations Covered:**
- Bulk claim status updates
- Batch payment processing
- Mass data corrections

**Savepoint Strategy:**
```javascript
// Individual savepoints for partial rollback
for (let i = 0; i < items.length; i++) {
  const savepointName = `item_${i}`;
  await context.createSavepoint(savepointName);
  
  try {
    await processItem(items[i], context);
    await context.releaseSavepoint(savepointName);
  } catch (error) {
    await context.rollbackToSavepoint(savepointName);
    // Log failure but continue with next item
  }
}
```

### 4. Balance Transfers

**Operations Covered:**
- Source account debit
- Target account credit
- Transfer record creation
- Audit logging

**Locking Strategy:**
```javascript
await executeTransaction(async (connection, context) => {
  // Acquire locks on both accounts to prevent concurrent modifications
  const fromLock = await context.acquireLock(`patient_${fromId}`, 10);
  const toLock = await context.acquireLock(`patient_${toId}`, 10);
  
  if (!fromLock || !toLock) {
    throw new Error('Failed to acquire account locks');
  }
  
  try {
    // Perform balance transfer operations
    await transferBalance(fromId, toId, amount, context);
  } finally {
    // Always release locks
    await context.releaseLock(`patient_${fromId}`);
    await context.releaseLock(`patient_${toId}`);
  }
}, {
  isolationLevel: IsolationLevels.SERIALIZABLE, // Highest isolation for financial ops
  timeout: 30000
});
```

## Error Handling and Rollback Mechanisms

### Automatic Rollback Triggers

1. **Database Errors:**
   - Constraint violations
   - Deadlocks
   - Connection timeouts
   - Data type mismatches

2. **Business Logic Errors:**
   - Insufficient funds
   - Invalid status transitions
   - Missing required data
   - Authorization failures

3. **System Errors:**
   - Network failures
   - Service unavailability
   - Resource exhaustion
   - Timeout conditions

### Retry Logic

```javascript
const retryableErrors = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ER_LOCK_WAIT_TIMEOUT',
  'ER_LOCK_DEADLOCK'
];

// Automatic retry with exponential backoff
await executeTransaction(callback, {
  retryAttempts: 3,
  retryDelay: 1000, // Base delay
  onRetry: (attempt, error) => {
    console.warn(`Transaction attempt ${attempt} failed:`, error.message);
  }
});
```

### Custom Rollback Handlers

```javascript
await executeTransaction(callback, {
  onRollback: async (error) => {
    // Custom cleanup logic
    await notifyAdministrators(error);
    await logCriticalError(error);
    await resetSystemState();
  },
  onCommit: async (result) => {
    // Post-commit actions
    await sendNotifications(result);
    await updateCache(result);
  }
});
```

## Performance Optimization

### Connection Pooling

```javascript
const poolConfig = {
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: false
};
```

### Transaction Timeout Management

```javascript
// Different timeouts for different operation types
const timeouts = {
  payment: 30000,      // 30 seconds
  bulk: 120000,        // 2 minutes
  era: 180000,         // 3 minutes
  report: 300000       // 5 minutes
};
```

### Savepoint Optimization

```javascript
// Use savepoints judiciously
if (operationCount > 10) {
  // Use savepoints for large operations
  options.savepoints = true;
} else {
  // Simple rollback for small operations
  options.savepoints = false;
}
```

## Monitoring and Alerting

### Transaction Metrics

```javascript
const metrics = transactionManager.getTransactionStats();
// {
//   active: 5,
//   committed: 1250,
//   rolledBack: 23,
//   failed: 2,
//   total: 1280
// }
```

### Performance Monitoring

```javascript
// Monitor slow transactions
const slowTransactions = transactionManager.getSlowTransactions(5000); // > 5 seconds
slowTransactions.forEach(txn => {
  console.warn('Slow transaction detected:', {
    id: txn.id,
    duration: txn.duration,
    operation: txn.operation
  });
});
```

### Alert Conditions

1. **High Rollback Rate:** > 5% of transactions
2. **Long-Running Transactions:** > 30 seconds
3. **Lock Timeouts:** > 3 per hour
4. **Connection Pool Exhaustion:** > 90% utilization
5. **Deadlock Detection:** > 1 per hour

## Best Practices

### 1. Transaction Scope

**DO:**
- Keep transactions as short as possible
- Group related operations together
- Use appropriate isolation levels
- Handle errors gracefully

**DON'T:**
- Include user interactions in transactions
- Perform external API calls within transactions
- Use transactions for read-only operations
- Nest transactions unnecessarily

### 2. Error Handling

```javascript
try {
  const result = await executeTransaction(async (connection, context) => {
    // Transaction operations
    return await performOperations(context);
  });
  
  return result;
} catch (error) {
  if (error.isOperational) {
    // Expected business logic error
    throw error;
  } else {
    // Unexpected system error
    console.error('Unexpected transaction error:', error);
    throw createDatabaseError('Transaction failed', {
      originalError: error.message
    });
  }
}
```

### 3. Audit Logging

```javascript
// Always log critical operations
await auditLog({
  table_name: 'billings',
  record_id: claimId,
  action: 'PAYMENT_POST',
  old_values: JSON.stringify(oldData),
  new_values: JSON.stringify(newData),
  user_id: userId,
  timestamp: new Date(),
  transaction_id: context.transactionId
});
```

### 4. Testing Rollback Scenarios

```javascript
// Test rollback scenarios in development
describe('Transaction Rollback Tests', () => {
  test('should rollback payment when claim update fails', async () => {
    const initialState = await captureState();
    
    try {
      await processPaymentWithSimulatedFailure();
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      const finalState = await captureState();
      expect(finalState).toEqual(initialState);
    }
  });
});
```

## Troubleshooting

### Common Issues

1. **Deadlocks:**
   - Always acquire locks in consistent order
   - Use shorter transactions
   - Implement retry logic

2. **Lock Timeouts:**
   - Increase lock timeout settings
   - Optimize query performance
   - Reduce transaction scope

3. **Connection Pool Exhaustion:**
   - Increase pool size
   - Fix connection leaks
   - Optimize transaction duration

4. **Rollback Failures:**
   - Check for nested transactions
   - Verify savepoint usage
   - Review error handling logic

### Debugging Tools

```javascript
// Enable transaction debugging
process.env.DEBUG_TRANSACTIONS = 'true';

// Monitor active transactions
console.log('Active transactions:', transactionManager.getActiveTransactionCount());

// Analyze transaction performance
const report = transactionManager.generateOptimizationReport();
console.log('Transaction performance report:', report);
```

## Migration Guide

### Updating Existing Services

1. **Identify Operations Needing Transactions:**
   - Multi-table updates
   - Financial operations
   - Batch processing
   - Critical business logic

2. **Wrap Operations in Transactions:**
   ```javascript
   // Before
   async function updateClaim(claimId, data) {
     await executeQuery(updateQuery, params);
     await executeQuery(auditQuery, auditParams);
   }
   
   // After
   async function updateClaim(claimId, data) {
     return await executeTransaction(async (connection, context) => {
       await context.execute(updateQuery, params);
       await context.execute(auditQuery, auditParams);
     });
   }
   ```

3. **Add Error Handling:**
   ```javascript
   try {
     const result = await transactionalOperation();
     return result;
   } catch (error) {
     if (error.isOperational) {
       throw error;
     }
     throw createDatabaseError('Operation failed', {
       originalError: error.message
     });
   }
   ```

4. **Test Rollback Scenarios:**
   - Create comprehensive test cases
   - Simulate various failure conditions
   - Verify data consistency after rollbacks

This guide ensures robust transaction handling across all RCM operations, maintaining data integrity and providing reliable rollback mechanisms for critical business processes.