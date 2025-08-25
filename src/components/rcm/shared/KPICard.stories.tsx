import type { Meta, StoryObj } from '@storybook/react';
import { KPICard } from './KPICard';

const meta: Meta<typeof KPICard> = {
  title: 'RCM/Shared/KPICard',
  component: KPICard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The KPICard component displays key performance indicators with consistent styling and formatting.
It supports various data types including currency, percentages, and counts with optional trend indicators.

## Features
- Responsive design that works on all screen sizes
- Support for different value types (currency, percentage, count)
- Optional trend indicators with up/down arrows
- Loading state with skeleton animation
- Error state handling
- Customizable colors and styling
- Accessibility compliant with ARIA labels

## Usage
Use KPICard to display important metrics in dashboards, reports, and analytics views.
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The title/label for the KPI'
    },
    value: {
      control: 'text',
      description: 'The main value to display'
    },
    type: {
      control: 'select',
      options: ['currency', 'percentage', 'count', 'text'],
      description: 'The type of value being displayed'
    },
    trend: {
      control: 'select',
      options: ['up', 'down', 'neutral', undefined],
      description: 'Optional trend indicator'
    },
    trendValue: {
      control: 'text',
      description: 'The trend value (e.g., "+5.2%")'
    },
    loading: {
      control: 'boolean',
      description: 'Whether to show loading state'
    },
    error: {
      control: 'text',
      description: 'Error message to display'
    },
    color: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger', 'info'],
      description: 'Color theme for the card'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the card'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Examples
export const Default: Story = {
  args: {
    title: 'Total Revenue',
    value: '$125,430.50',
    type: 'currency'
  }
};

export const WithPositiveTrend: Story = {
  args: {
    title: 'Monthly Revenue',
    value: '$45,230.00',
    type: 'currency',
    trend: 'up',
    trendValue: '+12.5%',
    color: 'success'
  }
};

export const WithNegativeTrend: Story = {
  args: {
    title: 'Claim Denials',
    value: '23',
    type: 'count',
    trend: 'down',
    trendValue: '-8.3%',
    color: 'danger'
  }
};

export const Percentage: Story = {
  args: {
    title: 'Collection Rate',
    value: '87.5%',
    type: 'percentage',
    trend: 'up',
    trendValue: '+2.1%',
    color: 'primary'
  }
};

export const Count: Story = {
  args: {
    title: 'Pending Claims',
    value: '156',
    type: 'count',
    color: 'warning'
  }
};

export const Loading: Story = {
  args: {
    title: 'Total Revenue',
    loading: true
  }
};

export const Error: Story = {
  args: {
    title: 'Total Revenue',
    error: 'Failed to load revenue data'
  }
};

// Size Variants
export const SmallSize: Story = {
  args: {
    title: 'Claims',
    value: '1,234',
    type: 'count',
    size: 'sm'
  }
};

export const LargeSize: Story = {
  args: {
    title: 'Annual Revenue',
    value: '$1,250,430.50',
    type: 'currency',
    trend: 'up',
    trendValue: '+15.2%',
    size: 'lg',
    color: 'success'
  }
};

// Color Variants
export const ColorVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <KPICard title="Primary" value="$12,345" type="currency" color="primary" />
      <KPICard title="Success" value="95.2%" type="percentage" color="success" />
      <KPICard title="Warning" value="23" type="count" color="warning" />
      <KPICard title="Danger" value="5" type="count" color="danger" />
      <KPICard title="Info" value="1,234" type="count" color="info" />
    </div>
  )
};

// Real-world Examples
export const DashboardExample: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      <KPICard 
        title="Total Revenue" 
        value="$1,245,678.90" 
        type="currency" 
        trend="up" 
        trendValue="+8.5%" 
        color="success"
      />
      <KPICard 
        title="Claims Processed" 
        value="2,847" 
        type="count" 
        trend="up" 
        trendValue="+156" 
        color="primary"
      />
      <KPICard 
        title="Collection Rate" 
        value="89.3%" 
        type="percentage" 
        trend="down" 
        trendValue="-1.2%" 
        color="warning"
      />
      <KPICard 
        title="Avg Days in A/R" 
        value="42.5" 
        type="text" 
        trend="down" 
        trendValue="-3.2 days" 
        color="success"
      />
      <KPICard 
        title="Denied Claims" 
        value="89" 
        type="count" 
        trend="up" 
        trendValue="+12" 
        color="danger"
      />
      <KPICard 
        title="Net Collection Rate" 
        value="94.7%" 
        type="percentage" 
        trend="up" 
        trendValue="+0.8%" 
        color="success"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of how KPI cards would appear in a real dashboard layout.'
      }
    }
  }
};

// Interactive Example
export const Interactive: Story = {
  args: {
    title: 'Interactive KPI',
    value: '$50,000',
    type: 'currency',
    trend: 'up',
    trendValue: '+5.2%',
    color: 'primary'
  },
  parameters: {
    docs: {
      description: {
        story: 'Try changing the controls to see how the KPI card responds to different props.'
      }
    }
  }
};