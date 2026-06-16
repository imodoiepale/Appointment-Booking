// @ts-nocheck
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, Table2, LayoutGrid,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface ColumnDef {
  key: string;
  header: string;
  sortable?: boolean;
  /** Clicks inside this cell won't bubble up to the row's onClick */
  stopPropagation?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: any, index: number) => React.ReactNode;
}

export interface RowGroup {
  rank: number;
  label: string;
  emoji: string;
}

interface DataTableProps {
  columns: ColumnDef[];
  rows: any[];
  rowKey: (row: any) => string | number;
  onRowClick?: (row: any) => void;
  rowClassName?: (row: any) => string;

  // ── Toolbar ──
  tabs?: { key: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  renderCard?: (row: any) => React.ReactNode;
  /** Extra content rendered on the right side of the toolbar */
  toolbarActions?: React.ReactNode;

  // ── Sort ──
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;

  // ── Pagination ──
  currentPage: number;
  totalPages: number;
  totalRows: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;

  // ── Row grouping (e.g. "Today" tab sections) ──
  getRowGroup?: (row: any, index: number, allRows: any[]) => RowGroup | null;

  emptyMessage?: string;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function DataTable({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  tabs,
  activeTab,
  onTabChange,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  viewMode = 'table',
  onViewModeChange,
  renderCard,
  toolbarActions,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  currentPage,
  totalPages,
  totalRows,
  itemsPerPage,
  onPageChange,
  getRowGroup,
  emptyMessage = 'No records found',
}: DataTableProps) {

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortColumn !== colKey) return <ChevronsUpDown size={12} className="text-slate-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  };

  const GROUP_COLORS: Record<number, string> = {
    0: 'bg-red-50 text-red-700 border-red-100',
    1: 'bg-amber-50 text-amber-700 border-amber-100',
    2: 'bg-slate-50 text-slate-500 border-slate-100',
  };

  const start = totalRows > 0 ? currentPage * itemsPerPage + 1 : 0;
  const end = Math.min((currentPage + 1) * itemsPerPage, totalRows);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* ── TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                className={cn(
                  'rounded-md px-4 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900',
                  activeTab === key && 'bg-white text-blue-600 shadow-sm'
                )}
                onClick={() => onTabChange?.(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {onSearchChange && (
            <div className="relative w-[260px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 rounded-full border-slate-200 bg-white pl-9 text-[13px] focus-visible:ring-blue-100"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
          )}

          {onViewModeChange && (
            <div className="flex rounded-lg bg-slate-100 p-1">
              <Button
                variant="ghost" size="sm"
                className={cn('h-7 px-2', viewMode === 'table' && 'bg-white shadow-sm')}
                onClick={() => onViewModeChange('table')}
              >
                <Table2 size={14} />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn('h-7 px-2', viewMode === 'cards' && 'bg-white shadow-sm')}
                onClick={() => onViewModeChange('cards')}
              >
                <LayoutGrid size={14} />
              </Button>
            </div>
          )}

          {toolbarActions}
        </div>
      </div>

      {/* ── CARDS VIEW ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 gap-6 bg-slate-50/50 p-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.length > 0
            ? rows.map(row => renderCard?.(row))
            : (
              <div className="col-span-full py-16 text-center text-sm font-medium text-slate-400">
                {emptyMessage}
              </div>
            )
          }
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="overflow-x-auto border p-4">
          <Table className="overflow-auto rounded-2xl border">
            <TableHeader className="border bg-slate-50">
              <TableRow className="border hover:bg-transparent">
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'border-r',
                      col.sortable && 'cursor-pointer select-none',
                      col.headerClassName
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length > 0 ? rows.map((row, index) => {
                const group = getRowGroup?.(row, index, rows) ?? null;
                const prevGroup = index > 0 ? (getRowGroup?.(rows[index - 1], index - 1, rows) ?? null) : null;
                const showGroupHeader = group && (index === 0 || group.rank !== prevGroup?.rank);

                return (
                  <React.Fragment key={rowKey(row)}>
                    {showGroupHeader && (
                      <TableRow className="pointer-events-none hover:bg-transparent">
                        <TableCell
                          colSpan={columns.length}
                          className={cn('border-y px-5 py-2', GROUP_COLORS[group.rank])}
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">
                            {group.emoji} {group.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      className={cn('group cursor-pointer', rowClassName?.(row))}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map(col => (
                        <TableCell
                          key={col.key}
                          className={cn('border-r', col.cellClassName)}
                          onClick={col.stopPropagation ? e => e.stopPropagation() : undefined}
                        >
                          {col.render(row, index)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </React.Fragment>
                );
              }) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="py-16 text-center text-sm font-medium text-slate-400"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── PAGINATION ── */}
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <div className="text-xs font-medium text-slate-500">
          Showing{' '}
          <span className="font-bold text-slate-900">{start}</span>
          {' '}to{' '}
          <span className="font-bold text-slate-900">{end}</span>
          {' '}of {totalRows}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline" size="sm"
            className="h-8 border-none bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
          >
            {currentPage + 1}
          </Button>
          <Button
            variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
