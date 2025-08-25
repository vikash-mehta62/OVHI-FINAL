/**
 * Virtualized Table Component
 * Provides virtual scrolling for large datasets to improve performance
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from './LoadingSpinner';

interface Column {
  key: string;
  title: string;
  width?: number;
  render?: (value: any, record: any, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface VirtualizedTableProps {
  data: any[];
  columns: Column[];
  height?: number;
  itemHeight?: number;
  loading?: boolean;
  title?: string;
  onRowClick?: (record: any, index: number) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  columns,
  height = 400,
  itemHeight = 50,
  loading = false,
  title,
  onRowClick,
  sortBy,
  sortDirection = 'asc',
  onSort,
  className = ''
}) => {
  const [sortedData, setSortedData] = useState(data);

  // Memoize columns to prevent recreation
  const memoizedColumns = useMemo(() => columns, [columns]);

  // Sort data when sortBy or sortDirection changes
  useEffect(() => {
    if (sortBy && onSort) {
      const sorted = [...data].sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
      setSortedData(sorted);
    } else {
      setSortedData(data);
    }
  }, [data, sortBy, sortDirection, onSort]);

  // Memoized row renderer for virtual scrolling
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = sortedData[index];
    
    if (!record) return null;

    return (
      <div 
        style={style} 
        className={`flex border-b hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
        onClick={() => onRowClick?.(record, index)}
      >
        {memoizedColumns.map((column) => (
          <div
            key={column.key}
            className="flex items-center px-4 py-2 text-sm"
            style={{ 
              width: column.width || `${100 / memoizedColumns.length}%`,
              minWidth: column.width || 'auto'
            }}
          >
            {column.render 
              ? column.render(record[column.key], record, index)
              : record[column.key]
            }
          </div>
        ))}
      </div>
    );
  }, [sortedData, memoizedColumns, onRowClick]);

  // Memoized header click handler
  const handleHeaderClick = useCallback((columnKey: string) => {
    if (!onSort) return;
    
    const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  }, [sortBy, sortDirection, onSort]);

  // Memoized header renderer
  const tableHeader = useMemo(() => (
    <div className="flex border-b bg-gray-50 font-medium">
      {memoizedColumns.map((column) => (
        <div
          key={column.key}
          className={`flex items-center px-4 py-3 text-sm font-medium text-gray-900 ${
            column.sortable && onSort ? 'cursor-pointer hover:bg-gray-100' : ''
          }`}
          style={{ 
            width: column.width || `${100 / memoizedColumns.length}%`,
            minWidth: column.width || 'auto'
          }}
          onClick={() => column.sortable && handleHeaderClick(column.key)}
        >
          {column.title}
          {column.sortable && sortBy === column.key && (
            <span className="ml-1">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      ))}
    </div>
  ), [memoizedColumns, sortBy, sortDirection, onSort, handleHeaderClick]);

  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner message="Loading data..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sortedData.length) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="border rounded-lg overflow-hidden">
          {tableHeader}
          <List
            height={height}
            itemCount={sortedData.length}
            itemSize={itemHeight}
            width="100%"
          >
            {Row}
          </List>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(VirtualizedTable);