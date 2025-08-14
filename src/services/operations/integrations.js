import { BASE_URL } from '../apis';

// Integrations API service functions
export const integrationsAPI = {
  // Get all integrations
  getIntegrations: async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/integrations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw error;
    }
  },

  // Save integration (create or update)
  saveIntegration: async (token, integrationData) => {
    try {
      const response = await fetch(`${BASE_URL}/integrations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(integrationData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving integration:', error);
      throw error;
    }
  },

  // Test integration connection
  testIntegration: async (token, integrationId) => {
    try {
      const response = await fetch(`${BASE_URL}/integrations/${integrationId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error testing integration:', error);
      throw error;
    }
  },

  // Sync integration data
  syncIntegration: async (token, integrationId, forceSync = false) => {
    try {
      const response = await fetch(`${BASE_URL}/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force_sync: forceSync })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error syncing integration:', error);
      throw error;
    }
  },

  // Delete integration
  deleteIntegration: async (token, integrationId) => {
    try {
      const response = await fetch(`${BASE_URL}/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting integration:', error);
      throw error;
    }
  },

  // Get integration audit log
  getAuditLog: async (token, integrationId = null, page = 1, limit = 50) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (integrationId) params.append('integration_id', integrationId.toString());

      const response = await fetch(`${BASE_URL}/integrations/audit-log?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  },

  // Get available integration types
  getIntegrationTypes: async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/integrations/types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching integration types:', error);
      throw error;
    }
  }
};

// Integration utility functions
export const integrationUtils = {
  // Get integration status color
  getStatusColor: (status) => {
    const colors = {
      'active': 'green',
      'inactive': 'gray',
      'error': 'red',
      'testing': 'yellow'
    };
    return colors[status] || 'gray';
  },

  // Get integration status icon
  getStatusIcon: (status) => {
    const icons = {
      'active': '✅',
      'inactive': '⚪',
      'error': '❌',
      'testing': '🔄'
    };
    return icons[status] || '⚪';
  },

  // Format sync frequency
  formatSyncFrequency: (frequency) => {
    const frequencies = {
      'hourly': 'Every Hour',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly'
    };
    return frequencies[frequency] || frequency;
  },

  // Get next sync time
  getNextSyncTime: (lastSync, frequency) => {
    if (!lastSync) return 'Not scheduled';
    
    const last = new Date(lastSync);
    const intervals = {
      'hourly': 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000,
      'weekly': 7 * 24 * 60 * 60 * 1000,
      'monthly': 30 * 24 * 60 * 60 * 1000
    };
    
    const interval = intervals[frequency] || intervals.daily;
    const nextSync = new Date(last.getTime() + interval);
    
    return nextSync.toLocaleString();
  },

  // Validate integration configuration
  validateConfiguration: (integrationType, config) => {
    const validationRules = {
      'ehr': {
        required: ['api_endpoint', 'client_id', 'client_secret', 'username'],
        optional: ['environment', 'version']
      },
      'lab': {
        required: ['api_key', 'facility_id', 'username'],
        optional: ['test_mode', 'result_format']
      },
      'pharmacy': {
        required: ['api_key', 'provider_npi', 'dea_number'],
        optional: ['test_mode', 'preferred_pharmacy']
      },
      'imaging': {
        required: ['dicom_endpoint', 'ae_title', 'username', 'password'],
        optional: ['port', 'encryption']
      },
      'billing': {
        required: ['api_key', 'submitter_id', 'username'],
        optional: ['test_mode', 'batch_size']
      },
      'telehealth': {
        required: ['api_key', 'account_id'],
        optional: ['webhook_url', 'recording_enabled']
      }
    };

    const rules = validationRules[integrationType];
    if (!rules) {
      return { valid: false, errors: ['Unknown integration type'] };
    }

    const errors = [];
    
    // Check required fields
    rules.required.forEach(field => {
      if (!config[field] || config[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    });

    // Validate specific field formats
    if (integrationType === 'pharmacy' && config.provider_npi) {
      if (!/^\d{10}$/.test(config.provider_npi)) {
        errors.push('Provider NPI must be 10 digits');
      }
    }

    if (integrationType === 'pharmacy' && config.dea_number) {
      if (!/^[A-Z]{2}\d{7}$/.test(config.dea_number)) {
        errors.push('DEA number format is invalid');
      }
    }

    if (config.api_endpoint && !isValidUrl(config.api_endpoint)) {
      errors.push('API endpoint must be a valid URL');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Mask sensitive configuration data for display
  maskSensitiveData: (config) => {
    const masked = { ...config };
    const sensitiveFields = ['api_key', 'client_secret', 'password', 'token', 'secret'];
    
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        const value = masked[field];
        if (value.length > 4) {
          masked[field] = '***' + value.slice(-4);
        } else {
          masked[field] = '***';
        }
      }
    });
    
    return masked;
  },

  // Get integration type icon
  getIntegrationIcon: (type) => {
    const icons = {
      'ehr': '🏥',
      'lab': '🧪',
      'pharmacy': '💊',
      'imaging': '📷',
      'billing': '💰',
      'telehealth': '📹'
    };
    return icons[type] || '🔗';
  },

  // Format integration error message
  formatErrorMessage: (error) => {
    if (!error) return '';
    
    // Common error patterns and user-friendly messages
    const errorPatterns = {
      'ECONNREFUSED': 'Connection refused - check if the service is running',
      'ENOTFOUND': 'Service not found - check the endpoint URL',
      'ETIMEDOUT': 'Connection timeout - the service may be slow or unavailable',
      'UNAUTHORIZED': 'Authentication failed - check your credentials',
      'FORBIDDEN': 'Access denied - check your permissions',
      'NOT_FOUND': 'Resource not found - check the configuration',
      'INVALID_CREDENTIALS': 'Invalid credentials - please verify your login information',
      'API_LIMIT_EXCEEDED': 'API rate limit exceeded - please try again later'
    };

    for (const [pattern, message] of Object.entries(errorPatterns)) {
      if (error.includes(pattern)) {
        return message;
      }
    }

    return error;
  },

  // Generate integration test data
  generateTestData: (integrationType) => {
    const testData = {
      'ehr': {
        patients: [
          { id: 'TEST001', name: 'John Doe', dob: '1980-01-01' },
          { id: 'TEST002', name: 'Jane Smith', dob: '1975-05-15' }
        ],
        appointments: [
          { id: 'APPT001', patient_id: 'TEST001', date: '2024-02-15', time: '10:00' }
        ]
      },
      'lab': {
        results: [
          { test_id: 'CBC001', patient_id: 'TEST001', status: 'completed', result: 'Normal' }
        ]
      },
      'pharmacy': {
        prescriptions: [
          { rx_id: 'RX001', patient_id: 'TEST001', medication: 'Lisinopril 10mg', status: 'filled' }
        ]
      }
    };

    return testData[integrationType] || {};
  },

  // Export integration configuration
  exportConfiguration: (integrations) => {
    const exportData = integrations.map(integration => ({
      integration_type: integration.integration_type,
      integration_name: integration.integration_name,
      configuration: integrationUtils.maskSensitiveData(integration.configuration),
      sync_frequency: integration.sync_frequency,
      status: integration.status,
      created_at: integration.created_at
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `integrations-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Import integration configuration
  importConfiguration: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          // Validate import data structure
          if (!Array.isArray(importData)) {
            throw new Error('Import data must be an array');
          }
          
          const validatedData = importData.map(integration => {
            const required = ['integration_type', 'integration_name', 'configuration'];
            const missing = required.filter(field => !integration[field]);
            
            if (missing.length > 0) {
              throw new Error(`Missing required fields: ${missing.join(', ')}`);
            }
            
            return integration;
          });
          
          resolve(validatedData);
        } catch (error) {
          reject(new Error(`Invalid import file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read import file'));
      };
      
      reader.readAsText(file);
    });
  }
};

// Helper function to validate URLs
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Integration status monitoring
export const integrationMonitoring = {
  // Start monitoring integration status
  startMonitoring: (integrations, onStatusChange) => {
    const checkStatus = async () => {
      for (const integration of integrations) {
        try {
          // In a real implementation, this would check the actual integration status
          const isHealthy = Math.random() > 0.1; // 90% uptime simulation
          
          if (!isHealthy && integration.status === 'active') {
            onStatusChange(integration.id, 'error', 'Health check failed');
          } else if (isHealthy && integration.status === 'error') {
            onStatusChange(integration.id, 'active', null);
          }
        } catch (error) {
          onStatusChange(integration.id, 'error', error.message);
        }
      }
    };

    // Check status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    
    // Initial check
    checkStatus();
    
    return interval;
  },

  // Stop monitoring
  stopMonitoring: (intervalId) => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
};

export default {
  integrationsAPI,
  integrationUtils,
  integrationMonitoring
};