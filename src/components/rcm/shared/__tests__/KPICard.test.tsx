import React from 'react';
import { render, screen } from '@testing-library/react';
import { DollarSign } from 'lucide-react';
import KPICard from '../KPICard';

describe('KPICard', () => {
  const defaultProps = {
    title: 'Test KPI',
    value: '$1,000'
  };

  it('renders basic KPI card correctly', () => {
    render(<KPICard {...defaultProps} />);
    
    expect(screen.getByText('Test KPI')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('displays change indicator when provided', () => {
    render(
      <KPICard 
        {...defaultProps}
        change={12.5}
        changeType="increase"
      />
    );
    
    expect(screen.getByText('+12.5% from last period')).toBeInTheDocument();
  });

  it('displays negative change correctly', () => {
    render(
      <KPICard 
        {...defaultProps}
        change={-5.2}
        changeType="decrease"
      />
    );
    
    expect(screen.getByText('-5.2% from last period')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <KPICard 
        {...defaultProps}
        icon={<DollarSign data-testid="dollar-icon" />}
      />
    );
    
    expect(screen.getByTestId('dollar-icon')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    render(
      <KPICard 
        {...defaultProps}
        description="Test description"
      />
    );
    
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(
      <KPICard {...defaultProps} variant="compact" />
    );
    
    let valueElement = screen.getByText('$1,000');
    expect(valueElement).toHaveClass('text-lg');
    
    rerender(<KPICard {...defaultProps} variant="detailed" />);
    valueElement = screen.getByText('$1,000');
    expect(valueElement).toHaveClass('text-3xl');
  });

  it('applies custom className', () => {
    const { container } = render(
      <KPICard {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles numeric values', () => {
    render(<KPICard title="Count" value={42} />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies correct change type colors', () => {
    const { rerender } = render(
      <KPICard 
        {...defaultProps}
        change={10}
        changeType="increase"
      />
    );
    
    let changeElement = screen.getByText('+10% from last period');
    expect(changeElement.parentElement).toHaveClass('text-green-600');
    
    rerender(
      <KPICard 
        {...defaultProps}
        change={-10}
        changeType="decrease"
      />
    );
    
    changeElement = screen.getByText('-10% from last period');
    expect(changeElement.parentElement).toHaveClass('text-red-600');
    
    rerender(
      <KPICard 
        {...defaultProps}
        change={0}
        changeType="neutral"
      />
    );
    
    changeElement = screen.getByText('0% from last period');
    expect(changeElement.parentElement).toHaveClass('text-gray-600');
  });
});