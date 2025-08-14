import { BASE_URL } from '../apis';

// Analytics API service functions
export const getAnalyticsAPI = {
  // Dashboard analytics
  getDashboard: async (token, timeframe = '30d', specialty = null) => {
    try {
      const params = new URLSearchParams({ timeframe });
      if (specialty) params.append('specialty', specialty);
      
      const response = await fetch(`${BASE_URL}/analytics/dashboard?${params}`, {
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
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  },

  // Patient analytics
  getPatients: async (token, timeframe = '30d', segment = null) => {
    try {
      const params = new URLSearchParams({ timeframe });
      if (segment) params.append('segment', segment);
      
      const response = await fetch(`${BASE_URL}/analytics/patients?${params}`, {
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
      console.error('Error fetching patient analytics:', error);
      throw error;
    }
  },

  // Financial analytics
  getFinancial: async (token, timeframe = '30d', breakdown = 'daily') => {
    try {
      const params = new URLSearchParams({ timeframe, breakdown });
      
      const response = await fetch(`${BASE_URL}/analytics/financial?${params}`, {
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
      console.error('Error fetching financial analytics:', error);
      throw error;
    }
  },

  // Operational analytics
  getOperational: async (token, timeframe = '30d') => {
    try {
      const params = new URLSearchParams({ timeframe });
      
      const response = await fetch(`${BASE_URL}/analytics/operational?${params}`, {
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
      console.error('Error fetching operational analytics:', error);
      throw error;
    }
  },

  // Generate custom report
  generateCustomReport: async (token, reportConfig) => {
    try {
      const response = await fetch(`${BASE_URL}/analytics/custom-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }
};

// Analytics utility functions
export const analyticsUtils = {
  // Format currency values
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  },

  // Format percentage values
  formatPercentage: (value, decimals = 1) => {
    return `${(value || 0).toFixed(decimals)}%`;
  },

  // Format large numbers
  formatNumber: (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value?.toString() || '0';
  },

  // Calculate percentage change
  calculatePercentageChange: (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },

  // Get trend direction
  getTrendDirection: (current, previous) => {
    const change = analyticsUtils.calculatePercentageChange(current, previous);
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
  },

  // Format time duration
  formatDuration: (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  },

  // Get color for metric based on performance
  getMetricColor: (value, thresholds) => {
    if (value >= thresholds.excellent) return 'green';
    if (value >= thresholds.good) return 'blue';
    if (value >= thresholds.fair) return 'yellow';
    return 'red';
  },

  // Calculate collection rate
  calculateCollectionRate: (collected, billed) => {
    if (!billed || billed === 0) return 0;
    return (collected / billed) * 100;
  },

  // Calculate denial rate
  calculateDenialRate: (denied, total) => {
    if (!total || total === 0) return 0;
    return (denied / total) * 100;
  },

  // Get age group from date of birth
  getAgeGroup: (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 18) return 'Under 18';
    if (age <= 35) return '18-35';
    if (age <= 50) return '36-50';
    if (age <= 65) return '51-65';
    return 'Over 65';
  },

  // Generate chart colors
  generateChartColors: (count) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  },

  // Export data to CSV
  exportToCSV: (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Group data by time period
  groupByTimePeriod: (data, period = 'daily') => {
    const grouped = {};
    
    data.forEach(item => {
      const date = new Date(item.date || item.created_at);
      let key;
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  },

  // Calculate moving average
  calculateMovingAverage: (data, window = 7) => {
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const subset = data.slice(start, i + 1);
      const average = subset.reduce((sum, value) => sum + value, 0) / subset.length;
      result.push(average);
    }
    
    return result;
  }
};

// Analytics chart configurations
export const chartConfigs = {
  // Default chart options
  defaultOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },

  // Revenue chart configuration
  revenueChart: {
    type: 'line',
    options: {
      ...chartConfigs.defaultOptions,
      scales: {
        ...chartConfigs.defaultOptions.scales,
        y: {
          ...chartConfigs.defaultOptions.scales.y,
          ticks: {
            callback: function(value) {
              return analyticsUtils.formatCurrency(value);
            }
          }
        }
      }
    }
  },

  // Pie chart configuration
  pieChart: {
    type: 'pie',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${percentage}%`;
            }
          }
        }
      }
    }
  },

  // Bar chart configuration
  barChart: {
    type: 'bar',
    options: {
      ...chartConfigs.defaultOptions,
      plugins: {
        ...chartConfigs.defaultOptions.plugins,
        legend: {
          display: false,
        },
      },
    }
  }
};

export default {
  getAnalyticsAPI,
  analyticsUtils,
  chartConfigs
};