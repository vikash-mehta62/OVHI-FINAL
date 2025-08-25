import React, { useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from './LoadingSpinner';
import StatusBadge from './StatusBadge';
import CurrencyDisplay from './CurrencyDisplay';
import { usePerformanceMonitor, useRenderTracker } from '@/hooks/usePerformanceMonitor';

export interface Column<T = any> {
  key: string;
  title: string;
  dataIndex: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
}

function DataTable<T = any>({
  columns,
  data,
  loading = false,
  title,
  description,
  emptyMessage = 'No data available',
  className = '',
  maxHeight,
  showHeader = true,
  striped = true,
  hoverable = true
}: DataTableProps<T>) {
  // Performance monitoring
  const { metrics } = usePerformanceMonitor({ 
    componentName: 'DataTable',
    threshold: 10 // 10ms threshold for table rendering
  });
  
  const renderInfo = useRenderTracker('DataTable', { 
    dataLength: data.length, 
    columnsLength: columns.length 
  });

  // Memoized columns to prevent recreation
  const memoizedColumns = useMemo(() => columns, [columns]);

  // Memoized cell content renderer
  const renderCellContent = useCallback((column: Column<T>, record: T, index: number) => {
    const value = record[column.dataIndex as keyof T];
    
    if (column.render) {
      return column.render(value, record, index);
    }
    
    return value as React.ReactNode;
  }, []);

  // Memoized loading row
  const loadingRow = useMemo(() => (
    <TableRow>
      <TableCell colSpan={memoizedColumns.length} className="text-center py-8">
        <LoadingSpinner size="sm" message="Loading data..." />
      </TableCell>
    </TableRow>
  ), [memoizedColumns.length]);

  // Memoized empty row
  const emptyRow = useMemo(() => (
    <TableRow>
      <TableCell colSpan={memoizedColumns.length} className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </TableCell>
    </TableRow>
  ), [memoizedColumns.length, emptyMessage]);

  // Memoized table header
  const tableHeader = useMemo(() => {
    if (!showHeader) return null;
    
    return (
      <TableHeader>
        <TableRow>
          {memoizedColumns.map((column) => (
            <TableHead 
              key={column.key}
              className={`
                ${column.align === 'center' ? 'text-center' : ''}
                ${column.align === 'right' ? 'text-right' : ''}
                ${column.width ? `w-[${column.width}]` : ''}
              `}
            >
              {column.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
    );
  }, [showHeader, memoizedColumns]);

  // Memoized table rows
  const tableRows = useMemo(() => {
    if (loading) return loadingRow;
    if (data.length === 0) return emptyRow;

    return data.map((record, index) => (
      <TableRow 
        key={index}
        className={`
          ${striped && index % 2 === 1 ? 'bg-muted/50' : ''}
          ${hoverable ? 'hover:bg-muted/50' : ''}
        `}
      >
        {memoizedColumns.map((column) => (
          <TableCell 
            key={column.key}
            className={`
              ${column.align === 'center' ? 'text-center' : ''}
              ${column.align === 'right' ? 'text-right' : ''}
            `}
          >
            {renderCellContent(column, record, index)}
          </TableCell>
        ))}
      </TableRow>
    ));
  }, [data, loading, loadingRow, emptyRow, striped, hoverable, memoizedColumns, renderCellContent]);

  // Memoized table content
  const tableContent = useMemo(() => (
    <div 
      className={`overflow-auto ${maxHeight ? `max-h-[${maxHeight}]` : ''}`}
    >
      <Table>
        {tableHeader}
        <TableBody>
          {tableRows}
        </TableBody>
      </Table>
    </div>
  ), [maxHeight, tableHeader, tableRows]);

  // Memoized card header
  const cardHeader = useMemo(() => {
    if (!title && !description) return null;
    
    return (
      <CardHeader>
        {title && (
          <CardTitle className="flex items-center justify-between">
            {title}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500">
                Renders: {renderInfo.count} | Avg: {metrics.averageRenderTime.toFixed(1)}ms
              </div>
            )}
          </CardTitle>
        )}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
    );
  }, [title, description, renderInfo.count, metrics.averageRenderTime]);

  if (title || description) {
    return (
      <Card className={className}>
        {cardHeader}
        <CardContent className="p-0">
          {tableContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {tableContent}
    </div>
  );
}

// Helper functions for common column renderers
export const columnRenderers = {
  currency: (amount: number, currency = 'USD') => (
    <CurrencyDisplay amount={amount} currency={currency} />
  ),
  
  status: (status: string, customText?: string) => (
    <StatusBadge status={status as any} text={customText} />
  ),
  
  date: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  },
  
  percentage: (value: number, decimals = 1) => (
    <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
      {value.toFixed(decimals)}%
    </span>
  ),
  
  badge: (text: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default') => (
    <Badge variant={variant}>{text}</Badge>
  )
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(DataTable) as typeof DataTable;