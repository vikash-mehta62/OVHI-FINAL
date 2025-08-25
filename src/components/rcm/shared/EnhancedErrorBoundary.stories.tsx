import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import React, { useState } from 'react';

// Component that throws an error for testing
const ErrorThrowingComponent = ({ shouldThrow = false, errorType = 'generic' }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Network request failed: Unable to connect to server');
      case 'validation':
        throw new Error('Validation failed: Invalid input data');
      case 'permission':
        throw new Error('Permission denied: Insufficient access rights');
      case 'timeout':
        throw new Error('Request timeout: Operation took too long');
      default:
        throw new Error('Something went wrong in the component');
    }
  }
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f9ff', 
      border: '1px solid #0ea5e9',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <h3 style={{ color: '#0369a1', margin: '0 0 8px 0' }}>Component Working Correctly</h3>
      <p style={{ color: '#075985', margin: 0 }}>This component is rendering without errors.</p>
    </div>
  );
};

const meta: Meta<typeof EnhancedErrorBoundary> = {
  title: 'RCM/Shared/EnhancedErrorBoundary',
  component: EnhancedErrorBoundary,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The EnhancedErrorBoundary component provides comprehensive error handling for React components
with user-friendly error messages, retry functionality, and error reporting capabilities.

## Features
- Catches JavaScript errors in child components
- Provides user-friendly error messages based on error type
- Retry functionality to recover from transient errors
- Error reporting and logging integration
- Fallback UI with consistent styling
- Support for different error types (network, validation, permission, etc.)
- Accessibility compliant with proper ARIA labels
- Development vs production error display modes

## Usage
Wrap components or entire sections of your application with EnhancedErrorBoundary
to provide graceful error handling and recovery options.

## Error Types
The component recognizes different error types and provides appropriate messages:
- Network errors (connection issues, timeouts)
- Validation errors (invalid data, form errors)
- Permission errors (access denied, insufficient rights)
- Generic errors (unexpected application errors)
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    fallback: {
      control: 'text',
      description: 'Custom fallback component or message'
    },
    onError: {
      action: 'error-occurred',
      description: 'Callback function called when an error occurs'
    },
    enableRetry: {
      control: 'boolean',
      description: 'Whether to show retry button'
    },
    maxRetries: {
      control: 'number',
      min: 0,
      max: 10,
      description: 'Maximum number of retry attempts'
    },
    showErrorDetails: {
      control: 'boolean',
      description: 'Whether to show detailed error information (development mode)'
    },
    reportErrors: {
      control: 'boolean',
      description: 'Whether to report errors to monitoring system'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Examples
export const Default: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={false} />
    </EnhancedErrorBoundary>
  ),
  args: {}
};

export const WithError: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="generic" />
    </EnhancedErrorBoundary>
  ),
  args: {
    enableRetry: true
  }
};

export const NetworkError: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="network" />
    </EnhancedErrorBoundary>
  ),
  args: {
    enableRetry: true,
    maxRetries: 3
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary handling network-related errors with retry functionality.'
      }
    }
  }
};

export const ValidationError: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="validation" />
    </EnhancedErrorBoundary>
  ),
  args: {
    enableRetry: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary handling validation errors (typically no retry needed).'
      }
    }
  }
};

export const PermissionError: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="permission" />
    </EnhancedErrorBoundary>
  ),
  args: {
    enableRetry: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary handling permission/authorization errors.'
      }
    }
  }
};

export const TimeoutError: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="timeout" />
    </EnhancedErrorBoundary>
  ),
  args: {
    enableRetry: true,
    maxRetries: 2
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary handling timeout errors with limited retry attempts.'
      }
    }
  }
};

// Interactive Error Testing
export const InteractiveErrorTesting: Story = {
  render: (args) => {
    const [shouldThrow, setShouldThrow] = useState(false);
    const [errorType, setErrorType] = useState('generic');
    
    return (
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Error Testing Controls</h4>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShouldThrow(!shouldThrow)}
              style={{
                padding: '8px 16px',
                backgroundColor: shouldThrow ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {shouldThrow ? 'Stop Error' : 'Trigger Error'}
            </button>
            <select
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <option value="generic">Generic Error</option>
              <option value="network">Network Error</option>
              <option value="validation">Validation Error</option>
              <option value="permission">Permission Error</option>
              <option value="timeout">Timeout Error</option>
            </select>
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Use these controls to test different error scenarios and see how the error boundary responds.
          </p>
        </div>
        
        <EnhancedErrorBoundary {...args}>
          <ErrorThrowingComponent shouldThrow={shouldThrow} errorType={errorType} />
        </EnhancedErrorBoundary>
      </div>
    );
  },
  args: {
    enableRetry: true,
    maxRetries: 3,
    showErrorDetails: true,
    reportErrors: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example to test different error scenarios and recovery options.'
      }
    }
  }
};

// Custom Fallback
export const CustomFallback: Story = {
  render: (args) => (
    <EnhancedErrorBoundary 
      {...args}
      fallback={
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          border: '2px dashed #fca5a5',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
          <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>Custom Error Fallback</h3>
          <p style={{ color: '#991b1b', margin: 0 }}>
            This is a custom fallback UI for when things go wrong.
          </p>
        </div>
      }
    >
      <ErrorThrowingComponent shouldThrow={true} />
    </EnhancedErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example with a custom fallback UI instead of the default error display.'
      }
    }
  }
};

// Multiple Error Boundaries
export const NestedErrorBoundaries: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <EnhancedErrorBoundary {...args}>
        <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>Section 1 - Working</h4>
          <ErrorThrowingComponent shouldThrow={false} />
        </div>
      </EnhancedErrorBoundary>
      
      <EnhancedErrorBoundary {...args}>
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Section 2 - Error</h4>
          <ErrorThrowingComponent shouldThrow={true} errorType="network" />
        </div>
      </EnhancedErrorBoundary>
      
      <EnhancedErrorBoundary {...args}>
        <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>Section 3 - Working</h4>
          <ErrorThrowingComponent shouldThrow={false} />
        </div>
      </EnhancedErrorBoundary>
    </div>
  ),
  args: {
    enableRetry: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple error boundaries isolating errors to specific sections.'
      }
    }
  }
};

// Development vs Production
export const DevelopmentMode: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="generic" />
    </EnhancedErrorBoundary>
  ),
  args: {
    showErrorDetails: true,
    enableRetry: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary in development mode showing detailed error information.'
      }
    }
  }
};

export const ProductionMode: Story = {
  render: (args) => (
    <EnhancedErrorBoundary {...args}>
      <ErrorThrowingComponent shouldThrow={true} errorType="generic" />
    </EnhancedErrorBoundary>
  ),
  args: {
    showErrorDetails: false,
    enableRetry: true,
    reportErrors: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary in production mode with user-friendly messages and error reporting.'
      }
    }
  }
};