import type { Meta, StoryObj } from '@storybook/react';
import { CurrencyDisplay } from './CurrencyDisplay';

const meta: Meta<typeof CurrencyDisplay> = {
  title: 'RCM/Shared/CurrencyDisplay',
  component: CurrencyDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The CurrencyDisplay component provides consistent formatting and display of monetary values
throughout the RCM system. It handles various currencies, formatting options, and visual styles.

## Features
- Automatic currency formatting with proper symbols and separators
- Support for multiple currencies (USD, EUR, GBP, etc.)
- Customizable precision and rounding
- Color coding for positive/negative values
- Compact notation for large numbers
- Loading and error states
- Accessibility compliant with proper ARIA labels
- Responsive typography

## Usage
Use CurrencyDisplay anywhere monetary values need to be shown, including dashboards,
tables, forms, and reports. It ensures consistent formatting across the application.
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    amount: {
      control: 'number',
      description: 'The monetary amount to display'
    },
    currency: {
      control: 'select',
      options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      description: 'Currency code (ISO 4217)'
    },
    precision: {
      control: 'number',
      min: 0,
      max: 4,
      description: 'Number of decimal places to show'
    },
    showSign: {
      control: 'boolean',
      description: 'Whether to show + sign for positive values'
    },
    colorCode: {
      control: 'boolean',
      description: 'Whether to color code positive (green) and negative (red) values'
    },
    compact: {
      control: 'boolean',
      description: 'Whether to use compact notation (e.g., $1.2K instead of $1,200)'
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Text size variant'
    },
    weight: {
      control: 'select',
      options: ['normal', 'medium', 'semibold', 'bold'],
      description: 'Font weight'
    },
    loading: {
      control: 'boolean',
      description: 'Whether to show loading state'
    },
    error: {
      control: 'text',
      description: 'Error message to display instead of amount'
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
    amount: 1234.56,
    currency: 'USD'
  }
};

export const Negative: Story = {
  args: {
    amount: -1234.56,
    currency: 'USD',
    colorCode: true
  }
};

export const WithSign: Story = {
  args: {
    amount: 1234.56,
    currency: 'USD',
    showSign: true,
    colorCode: true
  }
};

export const Zero: Story = {
  args: {
    amount: 0,
    currency: 'USD'
  }
};

// Currency Examples
export const Currencies: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <CurrencyDisplay amount={1234.56} currency="USD" />
      <CurrencyDisplay amount={1234.56} currency="EUR" />
      <CurrencyDisplay amount={1234.56} currency="GBP" />
      <CurrencyDisplay amount={1234.56} currency="CAD" />
      <CurrencyDisplay amount={1234.56} currency="AUD" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different currency formats with their respective symbols.'
      }
    }
  }
};

// Precision Examples
export const Precision: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>0 decimals:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" precision={0} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>1 decimal:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" precision={1} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>2 decimals:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" precision={2} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>4 decimals:</span>
        <CurrencyDisplay amount={1234.5678} currency="USD" precision={4} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different precision levels for decimal places.'
      }
    }
  }
};

// Compact Notation
export const CompactNotation: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '120px', fontSize: '14px' }}>$1,200:</span>
        <CurrencyDisplay amount={1200} currency="USD" />
        <span style={{ color: '#6b7280' }}>→</span>
        <CurrencyDisplay amount={1200} currency="USD" compact />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '120px', fontSize: '14px' }}>$45,000:</span>
        <CurrencyDisplay amount={45000} currency="USD" />
        <span style={{ color: '#6b7280' }}>→</span>
        <CurrencyDisplay amount={45000} currency="USD" compact />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '120px', fontSize: '14px' }}>$1,250,000:</span>
        <CurrencyDisplay amount={1250000} currency="USD" />
        <span style={{ color: '#6b7280' }}>→</span>
        <CurrencyDisplay amount={1250000} currency="USD" compact />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '120px', fontSize: '14px' }}>$2.5B:</span>
        <CurrencyDisplay amount={2500000000} currency="USD" />
        <span style={{ color: '#6b7280' }}>→</span>
        <CurrencyDisplay amount={2500000000} currency="USD" compact />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Compact notation for large numbers to save space.'
      }
    }
  }
};

// Color Coding
export const ColorCoding: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Positive:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" colorCode showSign />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Negative:</span>
        <CurrencyDisplay amount={-1234.56} currency="USD" colorCode />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Zero:</span>
        <CurrencyDisplay amount={0} currency="USD" colorCode />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Color coding for positive (green) and negative (red) values.'
      }
    }
  }
};

// Size Variants
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '80px', fontSize: '14px' }}>XS:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" size="xs" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '80px', fontSize: '14px' }}>SM:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" size="sm" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '80px', fontSize: '14px' }}>MD:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" size="md" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '80px', fontSize: '14px' }}>LG:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" size="lg" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '80px', fontSize: '14px' }}>XL:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" size="xl" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different text size variants for various use cases.'
      }
    }
  }
};

// Font Weights
export const FontWeights: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Normal:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" weight="normal" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Medium:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" weight="medium" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Semibold:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" weight="semibold" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ minWidth: '100px', fontSize: '14px' }}>Bold:</span>
        <CurrencyDisplay amount={1234.56} currency="USD" weight="bold" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different font weights for emphasis and hierarchy.'
      }
    }
  }
};

// States
export const Loading: Story = {
  args: {
    loading: true
  }
};

export const Error: Story = {
  args: {
    error: 'Failed to load amount'
  }
};

// Real-world Examples
export const DashboardKPIs: Story = {
  render: () => (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '20px',
      padding: '20px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'white', borderRadius: '6px' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Revenue</div>
        <CurrencyDisplay amount={1245678.90} currency="USD" size="lg" weight="bold" />
        <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
          <CurrencyDisplay amount={85432.10} currency="USD" size="sm" showSign colorCode /> this month
        </div>
      </div>
      
      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'white', borderRadius: '6px' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Outstanding A/R</div>
        <CurrencyDisplay amount={234567.45} currency="USD" size="lg" weight="bold" />
        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
          <CurrencyDisplay amount={-12345.67} currency="USD" size="sm" colorCode /> from last month
        </div>
      </div>
      
      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'white', borderRadius: '6px' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Claim Value</div>
        <CurrencyDisplay amount={456.78} currency="USD" size="lg" weight="bold" />
        <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
          <CurrencyDisplay amount={23.45} currency="USD" size="sm" showSign colorCode /> vs last period
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of currency displays used in dashboard KPIs.'
      }
    }
  }
};

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
        Recent Claims
      </div>
      <div style={{ padding: '0' }}>
        {[
          { id: 'CLM-001', patient: 'John Doe', amount: 150.00, paid: 150.00, balance: 0 },
          { id: 'CLM-002', patient: 'Jane Smith', amount: 275.50, paid: 200.00, balance: 75.50 },
          { id: 'CLM-003', patient: 'Bob Johnson', amount: 89.25, paid: 0, balance: 89.25 },
          { id: 'CLM-004', patient: 'Alice Brown', amount: 320.00, paid: 320.00, balance: 0 }
        ].map((claim, index) => (
          <div 
            key={claim.id}
            style={{ 
              display: 'grid',
              gridTemplateColumns: '100px 1fr 100px 100px 100px',
              gap: '16px',
              padding: '12px 16px',
              borderBottom: index < 3 ? '1px solid #f1f5f9' : 'none',
              alignItems: 'center'
            }}
          >
            <div style={{ fontWeight: '500' }}>{claim.id}</div>
            <div>{claim.patient}</div>
            <CurrencyDisplay amount={claim.amount} currency="USD" size="sm" />
            <CurrencyDisplay amount={claim.paid} currency="USD" size="sm" />
            <CurrencyDisplay 
              amount={claim.balance} 
              currency="USD" 
              size="sm" 
              colorCode 
              weight={claim.balance > 0 ? 'semibold' : 'normal'}
            />
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of currency displays used in a claims table.'
      }
    }
  }
};

// Interactive Example
export const Interactive: Story = {
  args: {
    amount: 1234.56,
    currency: 'USD',
    precision: 2,
    showSign: false,
    colorCode: false,
    compact: false,
    size: 'md',
    weight: 'normal'
  },
  parameters: {
    docs: {
      description: {
        story: 'Try changing the controls to see how the currency display responds to different props.'
      }
    }
  }
};