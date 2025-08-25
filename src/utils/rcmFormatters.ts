/**
 * RCM Frontend Formatting Utilities
 * Consolidated formatting functions for RCM components
 */

export interface BadgeProps {
  color: string;
  text: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Format currency amount with proper validation and error handling
 * @param amount - The amount to format
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  try {
    // Handle null, undefined, or empty values
    if (amount === null || amount === undefined || amount === '') {
      return '$0.00';
    }

    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Validate numeric input
    if (isNaN(numericAmount)) {
      console.warn(`Invalid amount provided to formatCurrency: ${amount}`);
      return '$0.00';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0.00';
  }
};

/**
 * Format date with various format options and validation
 * @param dateInput - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
): string => {
  try {
    if (!dateInput) {
      return 'N/A';
    }

    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date provided to formatDate: ${dateInput}`);
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date and time together
 * @param dateInput - Date to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateInput: string | Date | null | undefined): string => {
  return formatDate(dateInput, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get status badge properties based on claim status
 * @param status - Claim status number
 * @param statusText - Optional status text override
 * @returns Badge properties object
 */
export const getStatusBadgeProps = (status: number, statusText?: string): BadgeProps => {
  const statusConfig: Record<number, BadgeProps> = {
    0: { color: 'bg-gray-500', text: 'Draft', variant: 'secondary' },
    1: { color: 'bg-yellow-500', text: 'Submitted', variant: 'outline' },
    2: { color: 'bg-green-500', text: 'Paid', variant: 'default' },
    3: { color: 'bg-red-500', text: 'Denied', variant: 'destructive' },
    4: { color: 'bg-blue-500', text: 'Appealed', variant: 'outline' }
  };
  
  const config = statusConfig[status] || { 
    color: 'bg-gray-500', 
    text: statusText || 'Unknown',
    variant: 'secondary' as const
  };
  
  return config;
};

/**
 * Get priority badge properties based on processing days
 * @param priority - Priority string or processing days
 * @param processingDays - Number of processing days
 * @returns Badge properties object
 */
export const getPriorityBadgeProps = (
  priority: string | number, 
  processingDays?: number
): BadgeProps => {
  // If priority is a number, treat it as processing days
  if (typeof priority === 'number') {
    processingDays = priority;
    priority = '';
  }

  // Determine priority based on processing days if not explicitly set
  if (processingDays !== undefined) {
    if (processingDays > 30) {
      return { color: 'bg-red-500', text: 'Urgent', variant: 'destructive' };
    } else if (processingDays > 14) {
      return { color: 'bg-yellow-500', text: 'Normal', variant: 'outline' };
    } else {
      return { color: 'bg-green-500', text: 'Recent', variant: 'default' };
    }
  }

  // Handle string priority values
  const priorityConfig: Record<string, BadgeProps> = {
    'urgent': { color: 'bg-red-500', text: 'Urgent', variant: 'destructive' },
    'high': { color: 'bg-red-500', text: 'High', variant: 'destructive' },
    'medium': { color: 'bg-yellow-500', text: 'Medium', variant: 'outline' },
    'normal': { color: 'bg-yellow-500', text: 'Normal', variant: 'outline' },
    'low': { color: 'bg-green-500', text: 'Low', variant: 'default' },
    'recent': { color: 'bg-green-500', text: 'Recent', variant: 'default' }
  };

  return priorityConfig[priority.toLowerCase()] || {
    color: 'bg-gray-500',
    text: 'Normal',
    variant: 'secondary'
  };
};

/**
 * Calculate and format percentage
 * @param numerator - Numerator value
 * @param denominator - Denominator value
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  numerator: number,
  denominator: number,
  decimalPlaces: number = 1
): string => {
  try {
    if (!denominator || denominator === 0) {
      return '0.0%';
    }

    const percentage = (numerator / denominator) * 100;
    return `${percentage.toFixed(decimalPlaces)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0.0%';
  }
};

/**
 * Format large numbers with K, M, B suffixes
 * @param num - Number to format
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted number string
 */
export const formatLargeNumber = (num: number, decimalPlaces: number = 1): string => {
  try {
    if (num === 0) return '0';
    
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (absNum >= 1e9) {
      return `${sign}${(absNum / 1e9).toFixed(decimalPlaces)}B`;
    } else if (absNum >= 1e6) {
      return `${sign}${(absNum / 1e6).toFixed(decimalPlaces)}M`;
    } else if (absNum >= 1e3) {
      return `${sign}${(absNum / 1e3).toFixed(decimalPlaces)}K`;
    }
    
    return num.toString();
  } catch (error) {
    console.error('Error formatting large number:', error);
    return '0';
  }
};

/**
 * Get collectability color class based on score
 * @param score - Collectability score (0-100)
 * @returns CSS color class
 */
export const getCollectabilityColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Format phone number
 * @param phoneNumber - Phone number string
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber) return 'N/A';
  
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phoneNumber;
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param date - Date to compare
 * @returns Relative time string
 */
export const getRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const now = new Date();
    const inputDate = new Date(date);
    
    if (isNaN(inputDate.getTime())) {
      return 'Invalid Date';
    }
    
    const diffMs = now.getTime() - inputDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return formatDate(date);
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'N/A';
  }
};

/**
 * Calculate days between two dates
 * @param startDate - Start date
 * @param endDate - End date (default: current date)
 * @returns Number of days
 */
export const calculateDaysBetween = (
  startDate: string | Date,
  endDate: string | Date = new Date()
): number => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days between dates:', error);
    return 0;
  }
};

/**
 * Format aging bucket display
 * @param daysInAR - Days in accounts receivable
 * @returns Aging bucket string
 */
export const formatAgingBucket = (daysInAR: number): string => {
  if (daysInAR <= 30) return '0-30 days';
  if (daysInAR <= 60) return '31-60 days';
  if (daysInAR <= 90) return '61-90 days';
  if (daysInAR <= 120) return '91-120 days';
  return '120+ days';
};

/**
 * Get aging bucket color class
 * @param daysInAR - Days in accounts receivable
 * @returns CSS color class
 */
export const getAgingBucketColor = (daysInAR: number): string => {
  if (daysInAR <= 30) return 'text-green-600';
  if (daysInAR <= 60) return 'text-yellow-600';
  if (daysInAR <= 90) return 'text-orange-600';
  if (daysInAR <= 120) return 'text-red-600';
  return 'text-red-800';
};

/**
 * Format collection priority
 * @param daysInAR - Days in accounts receivable
 * @param amount - Account amount
 * @returns Priority level
 */
export const getCollectionPriority = (daysInAR: number, amount: number): {
  level: 'low' | 'medium' | 'high' | 'urgent';
  color: string;
  text: string;
} => {
  if (daysInAR > 120 || amount > 10000) {
    return { level: 'urgent', color: 'text-red-800', text: 'Urgent' };
  }
  if (daysInAR > 90 || amount > 5000) {
    return { level: 'high', color: 'text-red-600', text: 'High' };
  }
  if (daysInAR > 60 || amount > 1000) {
    return { level: 'medium', color: 'text-orange-600', text: 'Medium' };
  }
  return { level: 'low', color: 'text-green-600', text: 'Low' };
};

/**
 * Format insurance information
 * @param insuranceInfo - Insurance information object
 * @returns Formatted insurance string
 */
export const formatInsuranceInfo = (insuranceInfo: {
  payerName?: string;
  policyNumber?: string;
  groupNumber?: string;
} | null | undefined): string => {
  if (!insuranceInfo || !insuranceInfo.payerName) {
    return 'Self Pay';
  }
  
  const parts = [insuranceInfo.payerName];
  
  if (insuranceInfo.policyNumber) {
    parts.push(`Policy: ${insuranceInfo.policyNumber}`);
  }
  
  if (insuranceInfo.groupNumber) {
    parts.push(`Group: ${insuranceInfo.groupNumber}`);
  }
  
  return parts.join(' | ');
};

/**
 * Format CPT codes for display
 * @param cptCodes - Array of CPT codes
 * @param maxDisplay - Maximum number of codes to display
 * @returns Formatted CPT codes string
 */
export const formatCPTCodes = (
  cptCodes: string[] | null | undefined,
  maxDisplay: number = 3
): string => {
  if (!cptCodes || cptCodes.length === 0) {
    return 'N/A';
  }
  
  if (cptCodes.length <= maxDisplay) {
    return cptCodes.join(', ');
  }
  
  const displayed = cptCodes.slice(0, maxDisplay).join(', ');
  const remaining = cptCodes.length - maxDisplay;
  return `${displayed} +${remaining} more`;
};

/**
 * Format diagnosis codes for display
 * @param diagnosisCodes - Array of diagnosis codes
 * @param maxDisplay - Maximum number of codes to display
 * @returns Formatted diagnosis codes string
 */
export const formatDiagnosisCodes = (
  diagnosisCodes: string[] | null | undefined,
  maxDisplay: number = 2
): string => {
  if (!diagnosisCodes || diagnosisCodes.length === 0) {
    return 'N/A';
  }
  
  if (diagnosisCodes.length <= maxDisplay) {
    return diagnosisCodes.join(', ');
  }
  
  const displayed = diagnosisCodes.slice(0, maxDisplay).join(', ');
  const remaining = diagnosisCodes.length - maxDisplay;
  return `${displayed} +${remaining} more`;
};

/**
 * Format patient name with proper capitalization
 * @param firstName - First name
 * @param lastName - Last name
 * @param middleName - Middle name (optional)
 * @returns Formatted patient name
 */
export const formatPatientName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  middleName?: string | null | undefined
): string => {
  const capitalize = (str: string) => 
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  
  const parts: string[] = [];
  
  if (firstName) parts.push(capitalize(firstName.trim()));
  if (middleName) parts.push(capitalize(middleName.trim()));
  if (lastName) parts.push(capitalize(lastName.trim()));
  
  return parts.length > 0 ? parts.join(' ') : 'Unknown Patient';
};

/**
 * Format address for display
 * @param address - Address object
 * @returns Formatted address string
 */
export const formatAddress = (address: {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
} | null | undefined): string => {
  if (!address) return 'N/A';
  
  const parts: string[] = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

/**
 * Format claim amount with status context
 * @param amount - Claim amount
 * @param paidAmount - Paid amount (optional)
 * @param status - Claim status
 * @returns Formatted amount with context
 */
export const formatClaimAmount = (
  amount: number,
  paidAmount?: number,
  status?: string
): string => {
  const formattedAmount = formatCurrency(amount);
  
  if (status === 'paid' && paidAmount !== undefined) {
    if (paidAmount === amount) {
      return `${formattedAmount} (Paid in Full)`;
    } else if (paidAmount > 0) {
      return `${formattedAmount} (Paid: ${formatCurrency(paidAmount)})`;
    }
  }
  
  if (status === 'denied') {
    return `${formattedAmount} (Denied)`;
  }
  
  return formattedAmount;
};

/**
 * Format collection rate with color coding
 * @param collected - Amount collected
 * @param billed - Amount billed
 * @returns Object with rate, color, and formatted string
 */
export const formatCollectionRate = (collected: number, billed: number): {
  rate: number;
  formatted: string;
  color: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
} => {
  const rate = billed > 0 ? (collected / billed) * 100 : 0;
  const formatted = `${rate.toFixed(1)}%`;
  
  let color: string;
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  
  if (rate >= 95) {
    color = 'text-green-700';
    status = 'excellent';
  } else if (rate >= 85) {
    color = 'text-green-600';
    status = 'good';
  } else if (rate >= 70) {
    color = 'text-yellow-600';
    status = 'fair';
  } else {
    color = 'text-red-600';
    status = 'poor';
  }
  
  return { rate, formatted, color, status };
};

/**
 * Format denial rate with context
 * @param denied - Number of denied claims
 * @param total - Total number of claims
 * @returns Object with rate, color, and status
 */
export const formatDenialRate = (denied: number, total: number): {
  rate: number;
  formatted: string;
  color: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
} => {
  const rate = total > 0 ? (denied / total) * 100 : 0;
  const formatted = `${rate.toFixed(1)}%`;
  
  let color: string;
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  
  if (rate <= 2) {
    color = 'text-green-700';
    status = 'excellent';
  } else if (rate <= 5) {
    color = 'text-green-600';
    status = 'good';
  } else if (rate <= 10) {
    color = 'text-yellow-600';
    status = 'fair';
  } else {
    color = 'text-red-600';
    status = 'poor';
  }
  
  return { rate, formatted, color, status };
};

/**
 * Get comprehensive status badge properties for various entity types
 * @param status - Status value
 * @param entityType - Type of entity (claim, payment, referral, etc.)
 * @returns Badge properties object
 */
export const getUniversalStatusBadgeProps = (
  status: string | number,
  entityType: 'claim' | 'payment' | 'referral' | 'appointment' | 'compliance' | 'denial' | 'era' = 'claim'
): BadgeProps => {
  const statusStr = String(status).toLowerCase();
  
  // Claim status configurations
  if (entityType === 'claim') {
    const claimStatusConfig: Record<string, BadgeProps> = {
      '0': { color: 'bg-gray-500', text: 'Draft', variant: 'secondary' },
      'draft': { color: 'bg-gray-500', text: 'Draft', variant: 'secondary' },
      '1': { color: 'bg-yellow-500', text: 'Submitted', variant: 'outline' },
      'submitted': { color: 'bg-yellow-500', text: 'Submitted', variant: 'outline' },
      'in_review': { color: 'bg-blue-500', text: 'In Review', variant: 'outline' },
      '2': { color: 'bg-green-500', text: 'Paid', variant: 'default' },
      'paid': { color: 'bg-green-500', text: 'Paid', variant: 'default' },
      '3': { color: 'bg-red-500', text: 'Denied', variant: 'destructive' },
      'denied': { color: 'bg-red-500', text: 'Denied', variant: 'destructive' },
      '4': { color: 'bg-blue-500', text: 'Appealed', variant: 'outline' },
      'appealed': { color: 'bg-blue-500', text: 'Appealed', variant: 'outline' },
      'pending': { color: 'bg-yellow-500', text: 'Pending', variant: 'outline' },
      'processing': { color: 'bg-blue-500', text: 'Processing', variant: 'outline' },
      'cancelled': { color: 'bg-gray-500', text: 'Cancelled', variant: 'secondary' },
      'voided': { color: 'bg-gray-500', text: 'Voided', variant: 'secondary' }
    };
    return claimStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // Payment status configurations
  if (entityType === 'payment') {
    const paymentStatusConfig: Record<string, BadgeProps> = {
      'pending': { color: 'bg-yellow-500', text: 'Pending', variant: 'outline' },
      'processing': { color: 'bg-blue-500', text: 'Processing', variant: 'outline' },
      'completed': { color: 'bg-green-500', text: 'Completed', variant: 'default' },
      'posted': { color: 'bg-green-500', text: 'Posted', variant: 'default' },
      'failed': { color: 'bg-red-500', text: 'Failed', variant: 'destructive' },
      'cancelled': { color: 'bg-gray-500', text: 'Cancelled', variant: 'secondary' },
      'refunded': { color: 'bg-orange-500', text: 'Refunded', variant: 'outline' },
      'disputed': { color: 'bg-red-500', text: 'Disputed', variant: 'destructive' },
      'matched': { color: 'bg-green-500', text: 'Matched', variant: 'default' },
      'unmatched': { color: 'bg-red-500', text: 'Unmatched', variant: 'destructive' }
    };
    return paymentStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // Referral status configurations
  if (entityType === 'referral') {
    const referralStatusConfig: Record<string, BadgeProps> = {
      'pending': { color: 'bg-yellow-500', text: 'Pending', variant: 'outline' },
      'approved': { color: 'bg-green-500', text: 'Approved', variant: 'default' },
      'denied': { color: 'bg-red-500', text: 'Denied', variant: 'destructive' },
      'expired': { color: 'bg-gray-500', text: 'Expired', variant: 'secondary' },
      'scheduled': { color: 'bg-blue-500', text: 'Scheduled', variant: 'outline' },
      'completed': { color: 'bg-green-500', text: 'Completed', variant: 'default' }
    };
    return referralStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // Appointment status configurations
  if (entityType === 'appointment') {
    const appointmentStatusConfig: Record<string, BadgeProps> = {
      'scheduled': { color: 'bg-blue-500', text: 'Scheduled', variant: 'outline' },
      'confirmed': { color: 'bg-green-500', text: 'Confirmed', variant: 'default' },
      'cancelled': { color: 'bg-red-500', text: 'Cancelled', variant: 'destructive' },
      'completed': { color: 'bg-green-500', text: 'Completed', variant: 'default' },
      'no_show': { color: 'bg-orange-500', text: 'No Show', variant: 'outline' },
      'rescheduled': { color: 'bg-yellow-500', text: 'Rescheduled', variant: 'outline' }
    };
    return appointmentStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // Compliance status configurations
  if (entityType === 'compliance') {
    const complianceStatusConfig: Record<string, BadgeProps> = {
      'active': { color: 'bg-green-500', text: 'Active', variant: 'default' },
      'expired': { color: 'bg-red-500', text: 'Expired', variant: 'destructive' },
      'expiring_soon': { color: 'bg-yellow-500', text: 'Expiring Soon', variant: 'outline' },
      'pending': { color: 'bg-blue-500', text: 'Pending', variant: 'outline' },
      'suspended': { color: 'bg-red-500', text: 'Suspended', variant: 'destructive' }
    };
    return complianceStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // Denial case status configurations
  if (entityType === 'denial') {
    const denialStatusConfig: Record<string, BadgeProps> = {
      'new': { color: 'bg-blue-500', text: 'New', variant: 'outline' },
      'under_review': { color: 'bg-yellow-500', text: 'Under Review', variant: 'outline' },
      'appealed': { color: 'bg-blue-500', text: 'Appealed', variant: 'outline' },
      'resolved': { color: 'bg-green-500', text: 'Resolved', variant: 'default' },
      'closed': { color: 'bg-gray-500', text: 'Closed', variant: 'secondary' }
    };
    return denialStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // ERA processing status configurations
  if (entityType === 'era') {
    const eraStatusConfig: Record<string, BadgeProps> = {
      'pending': { color: 'bg-yellow-500', text: 'Pending', variant: 'outline' },
      'processing': { color: 'bg-blue-500', text: 'Processing', variant: 'outline' },
      'processed': { color: 'bg-green-500', text: 'Processed', variant: 'default' },
      'error': { color: 'bg-red-500', text: 'Error', variant: 'destructive' },
      'partially_processed': { color: 'bg-orange-500', text: 'Partial', variant: 'outline' }
    };
    return eraStatusConfig[statusStr] || { color: 'bg-gray-500', text: 'Unknown', variant: 'secondary' };
  }
  
  // Default fallback
  return { color: 'bg-gray-500', text: String(status), variant: 'secondary' };
};

/**
 * Format time duration in human readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${Math.round(remainingSeconds)}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

/**
 * Format success rate with color coding
 * @param successful - Number of successful items
 * @param total - Total number of items
 * @returns Object with rate, color, and formatted string
 */
export const formatSuccessRate = (successful: number, total: number): {
  rate: number;
  formatted: string;
  color: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
} => {
  const rate = total > 0 ? (successful / total) * 100 : 0;
  const formatted = `${rate.toFixed(1)}%`;
  
  let color: string;
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  
  if (rate >= 98) {
    color = 'text-green-700';
    status = 'excellent';
  } else if (rate >= 95) {
    color = 'text-green-600';
    status = 'good';
  } else if (rate >= 90) {
    color = 'text-yellow-600';
    status = 'fair';
  } else {
    color = 'text-red-600';
    status = 'poor';
  }
  
  return { rate, formatted, color, status };
};

/**
 * Format processing time with appropriate units
 * @param milliseconds - Processing time in milliseconds
 * @returns Formatted processing time string
 */
export const formatProcessingTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
};

/**
 * Format medical codes (CPT, ICD, etc.) with validation
 * @param codes - Array of medical codes
 * @param codeType - Type of codes (CPT, ICD, etc.)
 * @param maxDisplay - Maximum number of codes to display
 * @returns Formatted codes string
 */
export const formatMedicalCodes = (
  codes: string[] | null | undefined,
  codeType: 'CPT' | 'ICD' | 'HCPCS' | 'DRG' = 'CPT',
  maxDisplay: number = 3
): string => {
  if (!codes || codes.length === 0) {
    return 'N/A';
  }
  
  // Filter out invalid codes
  const validCodes = codes.filter(code => code && code.trim().length > 0);
  
  if (validCodes.length === 0) {
    return 'N/A';
  }
  
  if (validCodes.length <= maxDisplay) {
    return validCodes.join(', ');
  }
  
  const displayed = validCodes.slice(0, maxDisplay).join(', ');
  const remaining = validCodes.length - maxDisplay;
  return `${displayed} +${remaining} more`;
};

/**
 * Format provider name with credentials
 * @param firstName - Provider first name
 * @param lastName - Provider last name
 * @param credentials - Provider credentials (MD, NP, etc.)
 * @param title - Provider title (Dr., etc.)
 * @returns Formatted provider name
 */
export const formatProviderName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  credentials?: string | null | undefined,
  title?: string | null | undefined
): string => {
  const parts: string[] = [];
  
  if (title) {
    parts.push(title.trim());
  }
  
  if (firstName) {
    parts.push(firstName.trim());
  }
  
  if (lastName) {
    parts.push(lastName.trim());
  }
  
  let name = parts.join(' ');
  
  if (credentials) {
    name += `, ${credentials.trim()}`;
  }
  
  return name || 'Unknown Provider';
};

/**
 * Format account balance with aging context
 * @param balance - Account balance
 * @param daysInAR - Days in accounts receivable
 * @returns Object with formatted balance and context
 */
export const formatAccountBalance = (balance: number, daysInAR?: number): {
  formatted: string;
  color: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  context: string;
} => {
  const formatted = formatCurrency(balance);
  
  let color: string;
  let urgency: 'low' | 'medium' | 'high' | 'urgent';
  let context: string;
  
  if (balance <= 0) {
    color = 'text-gray-500';
    urgency = 'low';
    context = 'Paid in Full';
  } else if (daysInAR !== undefined) {
    if (daysInAR <= 30) {
      color = 'text-green-600';
      urgency = 'low';
      context = 'Current';
    } else if (daysInAR <= 60) {
      color = 'text-yellow-600';
      urgency = 'medium';
      context = '31-60 Days';
    } else if (daysInAR <= 90) {
      color = 'text-orange-600';
      urgency = 'high';
      context = '61-90 Days';
    } else {
      color = 'text-red-600';
      urgency = 'urgent';
      context = '90+ Days';
    }
  } else {
    // No aging info, base on amount only
    if (balance < 100) {
      color = 'text-green-600';
      urgency = 'low';
      context = 'Low Balance';
    } else if (balance < 1000) {
      color = 'text-yellow-600';
      urgency = 'medium';
      context = 'Medium Balance';
    } else {
      color = 'text-red-600';
      urgency = 'high';
      context = 'High Balance';
    }
  }
  
  return { formatted, color, urgency, context };
};

/**
 * Format variance with positive/negative indicators
 * @param current - Current value
 * @param previous - Previous value
 * @param isPercentage - Whether to format as percentage
 * @returns Object with formatted variance and indicators
 */
export const formatVariance = (
  current: number,
  previous: number,
  isPercentage: boolean = false
): {
  value: number;
  formatted: string;
  color: string;
  direction: 'up' | 'down' | 'neutral';
  indicator: string;
} => {
  const variance = current - previous;
  const percentChange = previous !== 0 ? (variance / previous) * 100 : 0;
  
  let formatted: string;
  if (isPercentage) {
    formatted = `${Math.abs(percentChange).toFixed(1)}%`;
  } else {
    formatted = formatLargeNumber(Math.abs(variance));
  }
  
  let color: string;
  let direction: 'up' | 'down' | 'neutral';
  let indicator: string;
  
  if (variance > 0) {
    color = 'text-green-600';
    direction = 'up';
    indicator = '↗';
  } else if (variance < 0) {
    color = 'text-red-600';
    direction = 'down';
    indicator = '↘';
  } else {
    color = 'text-gray-600';
    direction = 'neutral';
    indicator = '→';
  }
  
  return {
    value: isPercentage ? percentChange : variance,
    formatted,
    color,
    direction,
    indicator
  };
};