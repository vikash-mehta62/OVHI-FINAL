import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'RCM/Shared/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The StatusBadge component displays status information with consistent styling and color coding.
It automatically applies appropriate colors based on the status type and supports custom styling.

## Features
- Automatic color coding based on status
- Support for custom colors and variants
- Consistent sizing and typography
- Accessibility compliant with proper ARIA labels
- Responsive design
- Icon support for enhanced visual communication

## Usage
Use StatusBadge to display claim status, payment status, or any other categorical information
that benefits from visual status indicators.
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'text',
      description: 'The status text to display'
    },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'solid', 'soft'],
      description: 'Visual variant of the badge'
    },
    color: {
      control: 'select',
      options: ['auto', 'primary', 'success', 'warning', 'danger', 'info', 'gray'],
      description: 'Color theme (auto determines color based on status)'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the badge'
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show an icon with the status'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Examples
export const Default: Story = {
  args: {
    status: 'pending'
  }
};

export const Approved: Story = {
  args: {
    status: 'approved'
  }
};

export const Denied: Story = {
  args: {
    status: 'denied'
  }
};

export const Paid: Story = {
  args: {
    status: 'paid'
  }
};

export const Cancelled: Story = {
  args: {
    status: 'cancelled'
  }
};

// Claim Status Examples
export const ClaimStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <StatusBadge status="pending" />
      <StatusBadge status="submitted" />
      <StatusBadge status="in-review" />
      <StatusBadge status="approved" />
      <StatusBadge status="denied" />
      <StatusBadge status="paid" />
      <StatusBadge status="cancelled" />
      <StatusBadge status="expired" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Common claim status badges with automatic color coding.'
      }
    }
  }
};

// Payment Status Examples
export const PaymentStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <StatusBadge status="unpaid" />
      <StatusBadge status="partial" />
      <StatusBadge status="paid" />
      <StatusBadge status="refunded" />
      <StatusBadge status="failed" />
      <StatusBadge status="processing" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Payment status badges with appropriate color coding.'
      }
    }
  }
};

// Variant Examples
export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ minWidth: '80px', fontSize: '14px', fontWeight: '500' }}>Default:</span>
        <StatusBadge status="approved" variant="default" />
        <StatusBadge status="pending" variant="default" />
        <StatusBadge status="denied" variant="default" />
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ minWidth: '80px', fontSize: '14px', fontWeight: '500' }}>Outline:</span>
        <StatusBadge status="approved" variant="outline" />
        <StatusBadge status="pending" variant="outline" />
        <StatusBadge status="denied" variant="outline" />
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ minWidth: '80px', fontSize: '14px', fontWeight: '500' }}>Solid:</span>
        <StatusBadge status="approved" variant="solid" />
        <StatusBadge status="pending" variant="solid" />
        <StatusBadge status="denied" variant="solid" />
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ minWidth: '80px', fontSize: '14px', fontWeight: '500' }}>Soft:</span>
        <StatusBadge status="approved" variant="soft" />
        <StatusBadge status="pending" variant="soft" />
        <StatusBadge status="denied" variant="soft" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different visual variants of status badges.'
      }
    }
  }
};

// Size Examples
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <StatusBadge status="approved" size="sm" />
      <StatusBadge status="approved" size="md" />
      <StatusBadge status="approved" size="lg" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different sizes of status badges.'
      }
    }
  }
};

// With Icons
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <StatusBadge status="approved" showIcon />
      <StatusBadge status="pending" showIcon />
      <StatusBadge status="denied" showIcon />
      <StatusBadge status="paid" showIcon />
      <StatusBadge status="cancelled" showIcon />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status badges with icons for enhanced visual communication.'
      }
    }
  }
};

// Custom Colors
export const CustomColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <StatusBadge status="custom" color="primary" />
      <StatusBadge status="custom" color="success" />
      <StatusBadge status="custom" color="warning" />
      <StatusBadge status="custom" color="danger" />
      <StatusBadge status="custom" color="info" />
      <StatusBadge status="custom" color="gray" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status badges with custom color overrides.'
      }
    }
  }
};

// Real-world Usage Example
export const ClaimsTable: Story = {
  render: () => (
    <div style={{ 
      border: '1px solid #e2e8f0', 
      borderRadius: '8px', 
      overflow: 'hidden',
      backgroundColor: 'white'
    }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontWeight: '600'
      }}>
        Claims Overview
      </div>
      <div style={{ padding: '0' }}>
        {[
          { id: 'CLM-001', patient: 'John Doe', amount: '$150.00', status: 'approved' },
          { id: 'CLM-002', patient: 'Jane Smith', amount: '$275.50', status: 'pending' },
          { id: 'CLM-003', patient: 'Bob Johnson', amount: '$89.25', status: 'denied' },
          { id: 'CLM-004', patient: 'Alice Brown', amount: '$320.00', status: 'paid' },
          { id: 'CLM-005', patient: 'Charlie Wilson', amount: '$195.75', status: 'cancelled' }
        ].map((claim, index) => (
          <div 
            key={claim.id}
            style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 120px',
              gap: '16px',
              padding: '12px 16px',
              borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none',
              alignItems: 'center'
            }}
          >
            <div style={{ fontWeight: '500' }}>{claim.id}</div>
            <div>{claim.patient}</div>
            <div>{claim.amount}</div>
            <StatusBadge status={claim.status} size="sm" />
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of status badges used in a claims table.'
      }
    }
  }
};

// Interactive Example
export const Interactive: Story = {
  args: {
    status: 'pending',
    variant: 'default',
    color: 'auto',
    size: 'md',
    showIcon: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Try changing the controls to see how the status badge responds to different props.'
      }
    }
  }
};