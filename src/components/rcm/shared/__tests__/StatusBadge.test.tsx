import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders basic status badge correctly', () => {
    render(<StatusBadge status="paid" />);
    
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('displays custom text when provided', () => {
    render(<StatusBadge status="paid" text="Custom Text" />);
    
    expect(screen.getByText('Custom Text')).toBeInTheDocument();
  });

  it('shows icon by default', () => {
    render(<StatusBadge status="paid" />);
    
    // Check if icon is present (CheckCircle for paid status)
    const badge = screen.getByText('Paid').parentElement;
    expect(badge?.querySelector('svg')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(<StatusBadge status="paid" showIcon={false} />);
    
    const badge = screen.getByText('Paid').parentElement;
    expect(badge?.querySelector('svg')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<StatusBadge status="paid" size="sm" />);
    
    let badge = screen.getByText('Paid').parentElement;
    expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
    
    rerender(<StatusBadge status="paid" size="lg" />);
    badge = screen.getByText('Paid').parentElement;
    expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<StatusBadge status="paid" variant="outline" />);
    
    let badge = screen.getByText('Paid').parentElement;
    expect(badge).toHaveClass('border');
    
    rerender(<StatusBadge status="paid" variant="secondary" />);
    badge = screen.getByText('Paid').parentElement;
    expect(badge).toHaveClass('bg-secondary');
  });

  it('handles different status types correctly', () => {
    const statuses = [
      { status: 'paid', expectedText: 'Paid' },
      { status: 'denied', expectedText: 'Denied' },
      { status: 'pending', expectedText: 'Pending' },
      { status: 'processing', expectedText: 'Processing' },
      { status: 'overdue', expectedText: 'Overdue' }
    ];

    statuses.forEach(({ status, expectedText }) => {
      render(<StatusBadge status={status as any} />);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<StatusBadge status="paid" className="custom-class" />);
    
    const badge = screen.getByText('Paid').parentElement;
    expect(badge).toHaveClass('custom-class');
  });

  it('handles unknown status gracefully', () => {
    render(<StatusBadge status={'unknown' as any} />);
    
    // Should fallback to pending configuration
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('applies correct color schemes for different statuses', () => {
    const { rerender } = render(<StatusBadge status="paid" />);
    
    let badge = screen.getByText('Paid').parentElement;
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    
    rerender(<StatusBadge status="denied" />);
    badge = screen.getByText('Denied').parentElement;
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    
    rerender(<StatusBadge status="pending" />);
    badge = screen.getByText('Pending').parentElement;
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });
});