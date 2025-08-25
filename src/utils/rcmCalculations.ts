/**
 * RCM Frontend Calculation Utilities
 * Business logic calculations for RCM components
 */

export interface KPICalculations {
  collectionRate: number;
  denialRate: number;
  daysInAR: number;
  netCollectionRate: number;
  grossCollectionRate: number;
  adjustmentRate: number;
  writeOffRate: number;
}

export interface AgingAnalysis {
  bucket: string;
  amount: number;
  count: number;
  percentage: number;
  daysRange: { min: number; max: number | null };
}

export interface CollectionMetrics {
  totalBalance: number;
  collectableBalance: number;
  uncollectableBalance: number;
  collectionOpportunity: number;
  priorityAccounts: number;
}

/**
 * Calculate collection rate
 * @param collected - Amount collected
 * @param billed - Amount billed
 * @returns Collection rate as percentage
 */
export const calculateCollectionRate = (collected: number, billed: number): number => {
  if (billed === 0) return 0;
  return Math.round((collected / billed) * 100 * 10) / 10; // Round to 1 decimal
};

/**
 * Calculate net collection rate
 * @param collected - Amount collected
 * @param billed - Amount billed
 * @param adjustments - Total adjustments
 * @returns Net collection rate as percentage
 */
export const calculateNetCollectionRate = (
  collected: number, 
  billed: number, 
  adjustments: number
): number => {
  const netBilled = billed - adjustments;
  if (netBilled === 0) return 0;
  return Math.round((collected / netBilled) * 100 * 10) / 10;
};

/**
 * Calculate denial rate
 * @param denied - Number of denied claims
 * @param total - Total number of claims
 * @returns Denial rate as percentage
 */
export const calculateDenialRate = (denied: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((denied / total) * 100 * 10) / 10;
};

/**
 * Calculate days in A/R
 * @param totalAR - Total accounts receivable
 * @param averageDailyCharges - Average daily charges
 * @returns Days in A/R
 */
export const calculateDaysInAR = (totalAR: number, averageDailyCharges: number): number => {
  if (averageDailyCharges === 0) return 0;
  return Math.round(totalAR / averageDailyCharges);
};

/**
 * Calculate average daily charges
 * @param totalCharges - Total charges for period
 * @param days - Number of days in period
 * @returns Average daily charges
 */
export const calculateAverageDailyCharges = (totalCharges: number, days: number): number => {
  if (days === 0) return 0;
  return totalCharges / days;
};

/**
 * Calculate aging analysis
 * @param accounts - Array of account data
 * @returns Aging analysis by buckets
 */
export const calculateAgingAnalysis = (accounts: Array<{
  balance: number;
  daysInAR: number;
}>): AgingAnalysis[] => {
  const buckets: AgingAnalysis[] = [
    { bucket: '0-30', amount: 0, count: 0, percentage: 0, daysRange: { min: 0, max: 30 } },
    { bucket: '31-60', amount: 0, count: 0, percentage: 0, daysRange: { min: 31, max: 60 } },
    { bucket: '61-90', amount: 0, count: 0, percentage: 0, daysRange: { min: 61, max: 90 } },
    { bucket: '91-120', amount: 0, count: 0, percentage: 0, daysRange: { min: 91, max: 120 } },
    { bucket: '120+', amount: 0, count: 0, percentage: 0, daysRange: { min: 121, max: null } }
  ];

  const totalAmount = accounts.reduce((sum, account) => sum + account.balance, 0);

  accounts.forEach(account => {
    const { balance, daysInAR } = account;
    
    if (daysInAR <= 30) {
      buckets[0].amount += balance;
      buckets[0].count += 1;
    } else if (daysInAR <= 60) {
      buckets[1].amount += balance;
      buckets[1].count += 1;
    } else if (daysInAR <= 90) {
      buckets[2].amount += balance;
      buckets[2].count += 1;
    } else if (daysInAR <= 120) {
      buckets[3].amount += balance;
      buckets[3].count += 1;
    } else {
      buckets[4].amount += balance;
      buckets[4].count += 1;
    }
  });

  // Calculate percentages
  buckets.forEach(bucket => {
    bucket.percentage = totalAmount > 0 ? 
      Math.round((bucket.amount / totalAmount) * 100 * 10) / 10 : 0;
  });

  return buckets;
};

/**
 * Calculate collection metrics
 * @param accounts - Array of account data
 * @returns Collection metrics summary
 */
export const calculateCollectionMetrics = (accounts: Array<{
  balance: number;
  daysInAR: number;
  collectionStatus?: string;
}>): CollectionMetrics => {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Accounts over 120 days are considered less collectable
  const collectableAccounts = accounts.filter(account => account.daysInAR <= 120);
  const collectableBalance = collectableAccounts.reduce((sum, account) => sum + account.balance, 0);
  
  const uncollectableBalance = totalBalance - collectableBalance;
  
  // High priority accounts (over 90 days or over $5000)
  const priorityAccounts = accounts.filter(account => 
    account.daysInAR > 90 || account.balance > 5000
  ).length;
  
  // Collection opportunity is the amount in 31-120 day range
  const collectionOpportunity = accounts
    .filter(account => account.daysInAR > 30 && account.daysInAR <= 120)
    .reduce((sum, account) => sum + account.balance, 0);

  return {
    totalBalance,
    collectableBalance,
    uncollectableBalance,
    collectionOpportunity,
    priorityAccounts
  };
};

/**
 * Calculate payment success rate
 * @param successful - Number of successful payments
 * @param total - Total number of payment attempts
 * @returns Success rate as percentage
 */
export const calculatePaymentSuccessRate = (successful: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((successful / total) * 100 * 10) / 10;
};

/**
 * Calculate average payment processing time
 * @param payments - Array of payment data with processing times
 * @returns Average processing time in seconds
 */
export const calculateAverageProcessingTime = (payments: Array<{
  processingTime: number;
}>): number => {
  if (payments.length === 0) return 0;
  
  const totalTime = payments.reduce((sum, payment) => sum + payment.processingTime, 0);
  return Math.round((totalTime / payments.length) * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate revenue trend
 * @param currentPeriod - Current period revenue
 * @param previousPeriod - Previous period revenue
 * @returns Trend object with percentage change and direction
 */
export const calculateRevenueTrend = (
  currentPeriod: number, 
  previousPeriod: number
): {
  change: number;
  percentage: number;
  direction: 'up' | 'down' | 'flat';
  status: 'positive' | 'negative' | 'neutral';
} => {
  const change = currentPeriod - previousPeriod;
  const percentage = previousPeriod > 0 ? 
    Math.round((change / previousPeriod) * 100 * 10) / 10 : 0;
  
  let direction: 'up' | 'down' | 'flat';
  let status: 'positive' | 'negative' | 'neutral';
  
  if (change > 0) {
    direction = 'up';
    status = 'positive';
  } else if (change < 0) {
    direction = 'down';
    status = 'negative';
  } else {
    direction = 'flat';
    status = 'neutral';
  }
  
  return { change, percentage, direction, status };
};

/**
 * Calculate claim processing efficiency
 * @param claims - Array of claim data
 * @returns Efficiency metrics
 */
export const calculateClaimProcessingEfficiency = (claims: Array<{
  submissionDate: string;
  paymentDate?: string;
  status: string;
}>): {
  averageProcessingDays: number;
  firstPassRate: number;
  cleanClaimRate: number;
} => {
  const paidClaims = claims.filter(claim => claim.status === 'paid' && claim.paymentDate);
  
  // Calculate average processing days for paid claims
  let totalProcessingDays = 0;
  paidClaims.forEach(claim => {
    if (claim.paymentDate) {
      const submissionDate = new Date(claim.submissionDate);
      const paymentDate = new Date(claim.paymentDate);
      const processingDays = Math.ceil(
        (paymentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalProcessingDays += processingDays;
    }
  });
  
  const averageProcessingDays = paidClaims.length > 0 ? 
    Math.round(totalProcessingDays / paidClaims.length) : 0;
  
  // First pass rate (claims paid without denial)
  const firstPassClaims = claims.filter(claim => claim.status === 'paid').length;
  const firstPassRate = claims.length > 0 ? 
    Math.round((firstPassClaims / claims.length) * 100 * 10) / 10 : 0;
  
  // Clean claim rate (not denied)
  const cleanClaims = claims.filter(claim => claim.status !== 'denied').length;
  const cleanClaimRate = claims.length > 0 ? 
    Math.round((cleanClaims / claims.length) * 100 * 10) / 10 : 0;
  
  return {
    averageProcessingDays,
    firstPassRate,
    cleanClaimRate
  };
};

/**
 * Calculate payer performance metrics
 * @param claims - Array of claim data with payer information
 * @returns Payer performance summary
 */
export const calculatePayerPerformance = (claims: Array<{
  payerName: string;
  amount: number;
  paidAmount?: number;
  status: string;
  submissionDate: string;
  paymentDate?: string;
}>): Array<{
  payerName: string;
  totalClaims: number;
  totalAmount: number;
  paidAmount: number;
  denialRate: number;
  averagePaymentDays: number;
  collectionRate: number;
}> => {
  const payerGroups = claims.reduce((groups, claim) => {
    if (!groups[claim.payerName]) {
      groups[claim.payerName] = [];
    }
    groups[claim.payerName].push(claim);
    return groups;
  }, {} as Record<string, typeof claims>);

  return Object.entries(payerGroups).map(([payerName, payerClaims]) => {
    const totalClaims = payerClaims.length;
    const totalAmount = payerClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const paidAmount = payerClaims.reduce((sum, claim) => sum + (claim.paidAmount || 0), 0);
    
    const deniedClaims = payerClaims.filter(claim => claim.status === 'denied').length;
    const denialRate = totalClaims > 0 ? 
      Math.round((deniedClaims / totalClaims) * 100 * 10) / 10 : 0;
    
    const paidClaims = payerClaims.filter(claim => claim.status === 'paid' && claim.paymentDate);
    let totalPaymentDays = 0;
    
    paidClaims.forEach(claim => {
      if (claim.paymentDate) {
        const submissionDate = new Date(claim.submissionDate);
        const paymentDate = new Date(claim.paymentDate);
        const paymentDays = Math.ceil(
          (paymentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalPaymentDays += paymentDays;
      }
    });
    
    const averagePaymentDays = paidClaims.length > 0 ? 
      Math.round(totalPaymentDays / paidClaims.length) : 0;
    
    const collectionRate = totalAmount > 0 ? 
      Math.round((paidAmount / totalAmount) * 100 * 10) / 10 : 0;

    return {
      payerName,
      totalClaims,
      totalAmount,
      paidAmount,
      denialRate,
      averagePaymentDays,
      collectionRate
    };
  });
};

/**
 * Calculate financial projections
 * @param historicalData - Array of historical revenue data
 * @param projectionMonths - Number of months to project
 * @returns Projected revenue data
 */
export const calculateFinancialProjections = (
  historicalData: Array<{ month: string; revenue: number }>,
  projectionMonths: number = 6
): Array<{ month: string; revenue: number; isProjected: boolean }> => {
  if (historicalData.length < 3) {
    return []; // Need at least 3 months of data for meaningful projections
  }

  // Calculate trend using linear regression
  const revenues = historicalData.map(data => data.revenue);
  const n = revenues.length;
  const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
  const sumY = revenues.reduce((sum, revenue) => sum + revenue, 0);
  const sumXY = revenues.reduce((sum, revenue, index) => sum + (index * revenue), 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate projections
  const projections: Array<{ month: string; revenue: number; isProjected: boolean }> = [
    ...historicalData.map(data => ({ ...data, isProjected: false }))
  ];

  for (let i = 1; i <= projectionMonths; i++) {
    const projectedRevenue = Math.max(0, intercept + slope * (n + i - 1));
    const projectedMonth = getNextMonth(historicalData[historicalData.length - 1].month, i);
    
    projections.push({
      month: projectedMonth,
      revenue: Math.round(projectedRevenue),
      isProjected: true
    });
  }

  return projections;
};

/**
 * Helper function to get next month string
 * @param currentMonth - Current month string (e.g., "2024-01")
 * @param monthsAhead - Number of months ahead
 * @returns Next month string
 */
const getNextMonth = (currentMonth: string, monthsAhead: number): string => {
  const [year, month] = currentMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + monthsAhead, 1);
  
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Calculate benchmark comparisons
 * @param currentMetrics - Current performance metrics
 * @param benchmarks - Industry benchmark values
 * @returns Comparison results
 */
export const calculateBenchmarkComparisons = (
  currentMetrics: {
    collectionRate: number;
    denialRate: number;
    daysInAR: number;
  },
  benchmarks: {
    collectionRate: number;
    denialRate: number;
    daysInAR: number;
  } = {
    collectionRate: 95, // Industry standard
    denialRate: 5,      // Industry standard
    daysInAR: 30        // Industry standard
  }
): {
  collectionRate: { current: number; benchmark: number; variance: number; status: string };
  denialRate: { current: number; benchmark: number; variance: number; status: string };
  daysInAR: { current: number; benchmark: number; variance: number; status: string };
} => {
  const getStatus = (current: number, benchmark: number, lowerIsBetter: boolean = false) => {
    const variance = ((current - benchmark) / benchmark) * 100;
    const threshold = 10; // 10% variance threshold
    
    if (lowerIsBetter) {
      if (current <= benchmark * 0.9) return 'excellent';
      if (current <= benchmark) return 'good';
      if (current <= benchmark * 1.1) return 'fair';
      return 'poor';
    } else {
      if (current >= benchmark * 1.1) return 'excellent';
      if (current >= benchmark) return 'good';
      if (current >= benchmark * 0.9) return 'fair';
      return 'poor';
    }
  };

  return {
    collectionRate: {
      current: currentMetrics.collectionRate,
      benchmark: benchmarks.collectionRate,
      variance: Math.round(((currentMetrics.collectionRate - benchmarks.collectionRate) / benchmarks.collectionRate) * 100 * 10) / 10,
      status: getStatus(currentMetrics.collectionRate, benchmarks.collectionRate)
    },
    denialRate: {
      current: currentMetrics.denialRate,
      benchmark: benchmarks.denialRate,
      variance: Math.round(((currentMetrics.denialRate - benchmarks.denialRate) / benchmarks.denialRate) * 100 * 10) / 10,
      status: getStatus(currentMetrics.denialRate, benchmarks.denialRate, true)
    },
    daysInAR: {
      current: currentMetrics.daysInAR,
      benchmark: benchmarks.daysInAR,
      variance: Math.round(((currentMetrics.daysInAR - benchmarks.daysInAR) / benchmarks.daysInAR) * 100 * 10) / 10,
      status: getStatus(currentMetrics.daysInAR, benchmarks.daysInAR, true)
    }
  };
};