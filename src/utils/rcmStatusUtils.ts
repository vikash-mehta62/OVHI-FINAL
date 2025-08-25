/**
 * RCM Status Utilities
 * Centralized status management and badge configuration for all RCM entities
 */

import { BadgeProps } from './rcmFormatters';

export interface StatusConfig {
  color: string;
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  description?: string;
  priority?: number;
}

export interface StatusMapping {
  [key: string]: StatusConfig;
}

/**
 * Claim status configurations
 */
export const CLAIM_STATUS_CONFIG: StatusMapping = {
  // Numeric statuses (legacy support)
  '0': { 
    color: 'bg-gray-500', 
    text: 'Draft', 
    variant: 'secondary',
    description: 'Claim is in draft state',
    priority: 1
  },
  '1': { 
    color: 'bg-yellow-500', 
    text: 'Submitted', 
    variant: 'outline',
    description: 'Claim has been submitted to payer',
    priority: 3
  },
  '2': { 
    color: 'bg-green-500', 
    text: 'Paid', 
    variant: 'default',
    description: 'Claim has been paid in full',
    priority: 5
  },
  '3': { 
    color: 'bg-red-500', 
    text: 'Denied', 
    variant: 'destructive',
    description: 'Claim has been denied by payer',
    priority: 4
  },
  '4': { 
    color: 'bg-blue-500', 
    text: 'Appealed', 
    variant: 'outline',
    description: 'Claim denial has been appealed',
    priority: 4
  },
  
  // String statuses
  'draft': { 
    color: 'bg-gray-500', 
    text: 'Draft', 
    variant: 'secondary',
    description: 'Claim is in draft state',
    priority: 1
  },
  'submitted': { 
    color: 'bg-yellow-500', 
    text: 'Submitted', 
    variant: 'outline',
    description: 'Claim has been submitted to payer',
    priority: 3
  },
  'in_review': { 
    color: 'bg-blue-500', 
    text: 'In Review', 
    variant: 'outline',
    description: 'Claim is under review by payer',
    priority: 3
  },
  'paid': { 
    color: 'bg-green-500', 
    text: 'Paid', 
    variant: 'default',
    description: 'Claim has been paid in full',
    priority: 5
  },
  'partially_paid': { 
    color: 'bg-green-400', 
    text: 'Partially Paid', 
    variant: 'outline',
    description: 'Claim has been partially paid',
    priority: 4
  },
  'denied': { 
    color: 'bg-red-500', 
    text: 'Denied', 
    variant: 'destructive',
    description: 'Claim has been denied by payer',
    priority: 4
  },
  'appealed': { 
    color: 'bg-blue-500', 
    text: 'Appealed', 
    variant: 'outline',
    description: 'Claim denial has been appealed',
    priority: 4
  },
  'pending': { 
    color: 'bg-yellow-500', 
    text: 'Pending', 
    variant: 'outline',
    description: 'Claim is pending processing',
    priority: 2
  },
  'processing': { 
    color: 'bg-blue-500', 
    text: 'Processing', 
    variant: 'outline',
    description: 'Claim is being processed',
    priority: 3
  },
  'cancelled': { 
    color: 'bg-gray-500', 
    text: 'Cancelled', 
    variant: 'secondary',
    description: 'Claim has been cancelled',
    priority: 1
  },
  'voided': { 
    color: 'bg-gray-500', 
    text: 'Voided', 
    variant: 'secondary',
    description: 'Claim has been voided',
    priority: 1
  }
};

/**
 * Payment status configurations
 */
export const PAYMENT_STATUS_CONFIG: StatusMapping = {
  'pending': { 
    color: 'bg-yellow-500', 
    text: 'Pending', 
    variant: 'outline',
    description: 'Payment is pending processing',
    priority: 2
  },
  'processing': { 
    color: 'bg-blue-500', 
    text: 'Processing', 
    variant: 'outline',
    description: 'Payment is being processed',
    priority: 3
  },
  'completed': { 
    color: 'bg-green-500', 
    text: 'Completed', 
    variant: 'default',
    description: 'Payment has been completed successfully',
    priority: 5
  },
  'posted': { 
    color: 'bg-green-500', 
    text: 'Posted', 
    variant: 'default',
    description: 'Payment has been posted to account',
    priority: 5
  },
  'failed': { 
    color: 'bg-red-500', 
    text: 'Failed', 
    variant: 'destructive',
    description: 'Payment processing failed',
    priority: 1
  },
  'cancelled': { 
    color: 'bg-gray-500', 
    text: 'Cancelled', 
    variant: 'secondary',
    description: 'Payment was cancelled',
    priority: 1
  },
  'refunded': { 
    color: 'bg-orange-500', 
    text: 'Refunded', 
    variant: 'outline',
    description: 'Payment has been refunded',
    priority: 3
  },
  'disputed': { 
    color: 'bg-red-500', 
    text: 'Disputed', 
    variant: 'destructive',
    description: 'Payment is under dispute',
    priority: 4
  },
  'matched': { 
    color: 'bg-green-500', 
    text: 'Matched', 
    variant: 'default',
    description: 'Payment has been matched to claim',
    priority: 5
  },
  'unmatched': { 
    color: 'bg-red-500', 
    text: 'Unmatched', 
    variant: 'destructive',
    description: 'Payment could not be matched to claim',
    priority: 2
  },
  'reconciled': { 
    color: 'bg-green-600', 
    text: 'Reconciled', 
    variant: 'default',
    description: 'Payment has been reconciled',
    priority: 5
  }
};

/**
 * Collection status configurations
 */
export const COLLECTION_STATUS_CONFIG: StatusMapping = {
  'not_started': { 
    color: 'bg-gray-500', 
    text: 'Not Started', 
    variant: 'secondary',
    description: 'Collection process has not started',
    priority: 1
  },
  'first_notice': { 
    color: 'bg-yellow-500', 
    text: 'First Notice', 
    variant: 'outline',
    description: 'First collection notice sent',
    priority: 2
  },
  'second_notice': { 
    color: 'bg-orange-500', 
    text: 'Second Notice', 
    variant: 'outline',
    description: 'Second collection notice sent',
    priority: 3
  },
  'final_notice': { 
    color: 'bg-red-500', 
    text: 'Final Notice', 
    variant: 'destructive',
    description: 'Final collection notice sent',
    priority: 4
  },
  'collections_agency': { 
    color: 'bg-red-600', 
    text: 'Collections Agency', 
    variant: 'destructive',
    description: 'Account sent to collections agency',
    priority: 5
  },
  'legal_action': { 
    color: 'bg-red-700', 
    text: 'Legal Action', 
    variant: 'destructive',
    description: 'Legal action initiated',
    priority: 6
  },
  'settled': { 
    color: 'bg-green-500', 
    text: 'Settled', 
    variant: 'default',
    description: 'Account has been settled',
    priority: 5
  },
  'uncollectible': { 
    color: 'bg-gray-600', 
    text: 'Uncollectible', 
    variant: 'secondary',
    description: 'Account deemed uncollectible',
    priority: 1
  }
};

/**
 * Appointment status configurations
 */
export const APPOINTMENT_STATUS_CONFIG: StatusMapping = {
  'scheduled': { 
    color: 'bg-blue-500', 
    text: 'Scheduled', 
    variant: 'outline',
    description: 'Appointment is scheduled',
    priority: 3
  },
  'confirmed': { 
    color: 'bg-green-500', 
    text: 'Confirmed', 
    variant: 'default',
    description: 'Appointment has been confirmed',
    priority: 4
  },
  'cancelled': { 
    color: 'bg-red-500', 
    text: 'Cancelled', 
    variant: 'destructive',
    description: 'Appointment was cancelled',
    priority: 1
  },
  'completed': { 
    color: 'bg-green-600', 
    text: 'Completed', 
    variant: 'default',
    description: 'Appointment was completed',
    priority: 5
  },
  'no_show': { 
    color: 'bg-orange-500', 
    text: 'No Show', 
    variant: 'outline',
    description: 'Patient did not show for appointment',
    priority: 2
  },
  'rescheduled': { 
    color: 'bg-yellow-500', 
    text: 'Rescheduled', 
    variant: 'outline',
    description: 'Appointment has been rescheduled',
    priority: 3
  },
  'in_progress': { 
    color: 'bg-blue-600', 
    text: 'In Progress', 
    variant: 'outline',
    description: 'Appointment is currently in progress',
    priority: 4
  }
};

/**
 * Referral status configurations
 */
export const REFERRAL_STATUS_CONFIG: StatusMapping = {
  'pending': { 
    color: 'bg-yellow-500', 
    text: 'Pending', 
    variant: 'outline',
    description: 'Referral is pending approval',
    priority: 2
  },
  'approved': { 
    color: 'bg-green-500', 
    text: 'Approved', 
    variant: 'default',
    description: 'Referral has been approved',
    priority: 4
  },
  'denied': { 
    color: 'bg-red-500', 
    text: 'Denied', 
    variant: 'destructive',
    description: 'Referral has been denied',
    priority: 3
  },
  'expired': { 
    color: 'bg-gray-500', 
    text: 'Expired', 
    variant: 'secondary',
    description: 'Referral has expired',
    priority: 1
  },
  'scheduled': { 
    color: 'bg-blue-500', 
    text: 'Scheduled', 
    variant: 'outline',
    description: 'Referral appointment is scheduled',
    priority: 4
  },
  'completed': { 
    color: 'bg-green-600', 
    text: 'Completed', 
    variant: 'default',
    description: 'Referral has been completed',
    priority: 5
  }
};

/**
 * Compliance status configurations
 */
export const COMPLIANCE_STATUS_CONFIG: StatusMapping = {
  'active': { 
    color: 'bg-green-500', 
    text: 'Active', 
    variant: 'default',
    description: 'Compliance item is active and valid',
    priority: 5
  },
  'expired': { 
    color: 'bg-red-500', 
    text: 'Expired', 
    variant: 'destructive',
    description: 'Compliance item has expired',
    priority: 1
  },
  'expiring_soon': { 
    color: 'bg-yellow-500', 
    text: 'Expiring Soon', 
    variant: 'outline',
    description: 'Compliance item is expiring soon',
    priority: 3
  },
  'pending': { 
    color: 'bg-blue-500', 
    text: 'Pending', 
    variant: 'outline',
    description: 'Compliance item is pending approval',
    priority: 2
  },
  'suspended': { 
    color: 'bg-red-600', 
    text: 'Suspended', 
    variant: 'destructive',
    description: 'Compliance item has been suspended',
    priority: 1
  },
  'under_review': { 
    color: 'bg-orange-500', 
    text: 'Under Review', 
    variant: 'outline',
    description: 'Compliance item is under review',
    priority: 3
  }
};

/**
 * Denial case status configurations
 */
export const DENIAL_STATUS_CONFIG: StatusMapping = {
  'new': { 
    color: 'bg-blue-500', 
    text: 'New', 
    variant: 'outline',
    description: 'New denial case',
    priority: 3
  },
  'under_review': { 
    color: 'bg-yellow-500', 
    text: 'Under Review', 
    variant: 'outline',
    description: 'Denial case is under review',
    priority: 3
  },
  'appealed': { 
    color: 'bg-blue-600', 
    text: 'Appealed', 
    variant: 'outline',
    description: 'Denial has been appealed',
    priority: 4
  },
  'resolved': { 
    color: 'bg-green-500', 
    text: 'Resolved', 
    variant: 'default',
    description: 'Denial case has been resolved',
    priority: 5
  },
  'closed': { 
    color: 'bg-gray-500', 
    text: 'Closed', 
    variant: 'secondary',
    description: 'Denial case has been closed',
    priority: 1
  }
};

/**
 * ERA processing status configurations
 */
export const ERA_STATUS_CONFIG: StatusMapping = {
  'pending': { 
    color: 'bg-yellow-500', 
    text: 'Pending', 
    variant: 'outline',
    description: 'ERA file is pending processing',
    priority: 2
  },
  'processing': { 
    color: 'bg-blue-500', 
    text: 'Processing', 
    variant: 'outline',
    description: 'ERA file is being processed',
    priority: 3
  },
  'processed': { 
    color: 'bg-green-500', 
    text: 'Processed', 
    variant: 'default',
    description: 'ERA file has been processed successfully',
    priority: 5
  },
  'error': { 
    color: 'bg-red-500', 
    text: 'Error', 
    variant: 'destructive',
    description: 'Error occurred during ERA processing',
    priority: 1
  },
  'partially_processed': { 
    color: 'bg-orange-500', 
    text: 'Partial', 
    variant: 'outline',
    description: 'ERA file was partially processed',
    priority: 3
  }
};

/**
 * Priority level configurations
 */
export const PRIORITY_CONFIG: StatusMapping = {
  'low': { 
    color: 'bg-green-500', 
    text: 'Low', 
    variant: 'default',
    description: 'Low priority item',
    priority: 1
  },
  'normal': { 
    color: 'bg-yellow-500', 
    text: 'Normal', 
    variant: 'outline',
    description: 'Normal priority item',
    priority: 2
  },
  'medium': { 
    color: 'bg-yellow-500', 
    text: 'Medium', 
    variant: 'outline',
    description: 'Medium priority item',
    priority: 3
  },
  'high': { 
    color: 'bg-red-500', 
    text: 'High', 
    variant: 'destructive',
    description: 'High priority item',
    priority: 4
  },
  'urgent': { 
    color: 'bg-red-600', 
    text: 'Urgent', 
    variant: 'destructive',
    description: 'Urgent priority item',
    priority: 5
  },
  'critical': { 
    color: 'bg-red-700', 
    text: 'Critical', 
    variant: 'destructive',
    description: 'Critical priority item',
    priority: 6
  }
};

/**
 * Get status configuration for a specific entity type
 * @param status - Status value
 * @param entityType - Type of entity
 * @returns Status configuration object
 */
export const getStatusConfig = (
  status: string | number,
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority' = 'claim'
): StatusConfig => {
  const statusStr = String(status).toLowerCase();
  
  const configMaps = {
    claim: CLAIM_STATUS_CONFIG,
    payment: PAYMENT_STATUS_CONFIG,
    collection: COLLECTION_STATUS_CONFIG,
    appointment: APPOINTMENT_STATUS_CONFIG,
    referral: REFERRAL_STATUS_CONFIG,
    compliance: COMPLIANCE_STATUS_CONFIG,
    denial: DENIAL_STATUS_CONFIG,
    era: ERA_STATUS_CONFIG,
    priority: PRIORITY_CONFIG
  };
  
  const config = configMaps[entityType];
  return config[statusStr] || {
    color: 'bg-gray-500',
    text: String(status),
    variant: 'secondary',
    description: 'Unknown status',
    priority: 0
  };
};

/**
 * Get badge properties for a status
 * @param status - Status value
 * @param entityType - Type of entity
 * @returns Badge properties
 */
export const getStatusBadgeProps = (
  status: string | number,
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority' = 'claim'
): BadgeProps => {
  const config = getStatusConfig(status, entityType);
  return {
    color: config.color,
    text: config.text,
    variant: config.variant
  };
};

/**
 * Get all possible statuses for an entity type
 * @param entityType - Type of entity
 * @returns Array of status configurations
 */
export const getEntityStatuses = (
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority'
): Array<{ key: string; config: StatusConfig }> => {
  const configMaps = {
    claim: CLAIM_STATUS_CONFIG,
    payment: PAYMENT_STATUS_CONFIG,
    collection: COLLECTION_STATUS_CONFIG,
    appointment: APPOINTMENT_STATUS_CONFIG,
    referral: REFERRAL_STATUS_CONFIG,
    compliance: COMPLIANCE_STATUS_CONFIG,
    denial: DENIAL_STATUS_CONFIG,
    era: ERA_STATUS_CONFIG,
    priority: PRIORITY_CONFIG
  };
  
  const config = configMaps[entityType];
  return Object.entries(config).map(([key, config]) => ({ key, config }));
};

/**
 * Check if a status indicates completion
 * @param status - Status value
 * @param entityType - Type of entity
 * @returns True if status indicates completion
 */
export const isCompletedStatus = (
  status: string | number,
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority' = 'claim'
): boolean => {
  const completedStatuses = {
    claim: ['2', 'paid', 'completed'],
    payment: ['completed', 'posted', 'reconciled'],
    collection: ['settled', 'uncollectible'],
    appointment: ['completed'],
    referral: ['completed'],
    compliance: ['active'],
    denial: ['resolved', 'closed'],
    era: ['processed'],
    priority: [] // Priority doesn't have completion states
  };
  
  const statusStr = String(status).toLowerCase();
  return completedStatuses[entityType].includes(statusStr);
};

/**
 * Check if a status indicates an error or failure
 * @param status - Status value
 * @param entityType - Type of entity
 * @returns True if status indicates error/failure
 */
export const isErrorStatus = (
  status: string | number,
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority' = 'claim'
): boolean => {
  const errorStatuses = {
    claim: ['3', 'denied', 'cancelled', 'voided'],
    payment: ['failed', 'disputed', 'cancelled'],
    collection: ['uncollectible'],
    appointment: ['cancelled', 'no_show'],
    referral: ['denied', 'expired'],
    compliance: ['expired', 'suspended'],
    denial: [], // Denial statuses don't indicate errors
    era: ['error'],
    priority: ['critical', 'urgent'] // High priority could be considered problematic
  };
  
  const statusStr = String(status).toLowerCase();
  return errorStatuses[entityType].includes(statusStr);
};

/**
 * Get status priority for sorting
 * @param status - Status value
 * @param entityType - Type of entity
 * @returns Priority number (higher = more important)
 */
export const getStatusPriority = (
  status: string | number,
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority' = 'claim'
): number => {
  const config = getStatusConfig(status, entityType);
  return config.priority || 0;
};

/**
 * Sort items by status priority
 * @param items - Array of items with status property
 * @param statusKey - Key name for status property
 * @param entityType - Type of entity
 * @param descending - Sort in descending order (highest priority first)
 * @returns Sorted array
 */
export const sortByStatusPriority = <T extends Record<string, any>>(
  items: T[],
  statusKey: string = 'status',
  entityType: 'claim' | 'payment' | 'collection' | 'appointment' | 'referral' | 'compliance' | 'denial' | 'era' | 'priority' = 'claim',
  descending: boolean = true
): T[] => {
  return [...items].sort((a, b) => {
    const priorityA = getStatusPriority(a[statusKey], entityType);
    const priorityB = getStatusPriority(b[statusKey], entityType);
    
    return descending ? priorityB - priorityA : priorityA - priorityB;
  });
};