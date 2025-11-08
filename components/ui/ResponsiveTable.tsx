'use client';

import React from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  priority?: 'always' | 'sm' | 'md' | 'lg'; // Display priority for responsive
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) {
  // Filter columns based on priority for mobile view
  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'always':
        return '';
      case 'sm':
        return 'hidden sm:table-cell';
      case 'md':
        return 'hidden md:table-cell';
      case 'lg':
        return 'hidden lg:table-cell';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block table-responsive">
        <div className="inline-block min-w-full py-2 align-middle px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        getPriorityClass(column.priority)
                      } ${column.className || ''}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                          getPriorityClass(column.priority)
                        } ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(row[column.key as keyof T], row)
                          : row[column.key as keyof T]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4 p-4">
        {data.map((row, rowIndex) => (
          <div
            key={rowIndex}
            onClick={() => onRowClick?.(row)}
            className={`bg-white rounded-lg shadow p-4 space-y-3 ${
              onRowClick ? 'cursor-pointer active:bg-gray-50' : ''
            }`}
          >
            {columns
              .filter((col) => col.priority !== 'lg' && col.priority !== 'md')
              .map((column) => (
                <div key={String(column.key)} className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    {column.header}:
                  </span>
                  <span className="text-sm text-gray-900">
                    {column.render
                      ? column.render(row[column.key as keyof T], row)
                      : row[column.key as keyof T]}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}