"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ClipboardList,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Building,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  User,
  Users,
  Building2,
  AlertCircle,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

/**
 * UTILS & CONSTANTS
 */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; hex: string }> = {
  wip: { label: "WIP Stage", bg: "#eff6ff", text: "#1d4ed8", hex: "#3b82f6" },
  write_up_completed: { label: "Write-Up Done", bg: "#fffbeb", text: "#b45309", hex: "#f59e0b" },
  endorsed: { label: "Endorsed", bg: "#f0fdf4", text: "#15803d", hex: "#22c55e" },
  cancel: { label: "Cancelled", bg: "#fef2f2", text: "#b91c1c", hex: "#ef4444" },
  default: { label: "Unknown", bg: "#f8fafc", text: "#64748b", hex: "#94a3b8" }
};

function StatusPill({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.default;
  return (
    <span
      style={{ background: config.bg, color: config.text, borderColor: `${config.hex}40` }}
      className="inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black tracking-wider uppercase"
    >
      {config.label}
    </span>
  );
}

const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

// Renders the correct content for each known field ID
function FieldCell({ fieldId, task }: { fieldId: string; task: any }) {
  const dash = <span className="text-slate-300 font-black text-[10px]">—</span>;

  switch (fieldId) {
    case 'applicant_name':
      return <span className="font-bold text-slate-900">{task.applicant_name || dash}</span>;
    case 'company_name':
      return (
        <div className="flex items-center gap-1.5 truncate">
          <Building size={11} className="shrink-0 text-slate-300" />
          <span className="truncate">{task.company_name || dash}</span>
        </div>
      );
    case 'sub_department':
      return <span>{task.sub_department || dash}</span>;
    case 'status':
      return <StatusPill status={task.status} />;
    // Fields that need data the API doesn't currently return — show dash
    default:
      return dash;
  }
}

// Map of field IDs → column header labels (matches ENHANCED_TABLE_HEADERS_IMMIGRATION)
const FIELD_LABELS: Record<string, string> = {
  id: 'Ref',
  r_number: 'R No.',
  passport_number: 'Passport No.',
  applicant_name: 'Applicant',
  company_name: 'Company',
  sub_department: 'Sub Dept',
  job_level: 'Class',
  renewal_status: 'Renewal',
  duration: 'Duration',
  current_stage_name: 'Current Stage',
  current_stage_status_value: 'Stage Status',
  current_stage_follow_up: 'Follow-up',
  task_manager: 'Task Manager',
  task_assistant: 'Assistant',
  status: 'Status',
  nationality: 'Nationality',
  full_name: 'Full Name',
  age: 'Age',
  immigration_document_type: 'Imm. Doc',
  immigration_expiry_date: 'Expiry Date',
  immigration_days_to_go: 'Days Left',
  job_description: 'Job Desc.',
  cancellation_reason: 'Cancel Reason',
  cancellation_date: 'Cancel Date',
  cancelled_by: 'Cancelled By',
};

type TaskSummary = {
  id: number;
  applicant_name: string;
  company_name: string;
  sub_department: string;
  status: string;
  assignee_name?: string;
};

export default function TasksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dept/subdept filter state
  const [selectedSubdeptIds, setSelectedSubdeptIds] = useState<string[]>([]);
  const [subdeptDropdownOpen, setSubdeptDropdownOpen] = useState(false);

  // Dual Filter State
  const [statusTab, setStatusTab] = useState('total');
  const [categoryTab, setCategoryTab] = useState<'officer' | 'manager' | 'client'>('officer');

  // Officer sub-tab (for filtering within officers/managers)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'applicant_name',
    direction: 'asc'
  });

  const itemsPerPage = 12;
  const { toast } = useToast();

  const fetchReport = useCallback(async (subdeptIds: string[]) => {
    setLoading(true);
    try {
      const params = subdeptIds.length > 0 ? `?subdeptIds=${subdeptIds.join(',')}` : '';
      const res = await fetch(`/api/tasks-report${params}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      setData(await res.json());
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReport(selectedSubdeptIds);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reset group tab when category changes
  useEffect(() => {
    setSelectedGroupId('all');
    setCurrentPage(0);
  }, [categoryTab]);

  // Derive columns from taskFields (fall back to defaults if empty)
  const visibleFieldIds: string[] = useMemo(() => {
    const fields: { id: string }[] = data?.report?.taskFields ?? [];
    if (fields.length === 0) return ['applicant_name', 'company_name', 'status'];
    // Keep only fields we have labels for; preserve the order from config
    return fields.map((f: any) => f.id).filter((id: string) => id in FIELD_LABELS);
  }, [data]);

  // Flatten tasks based on category tab + optional group sub-tab
  const flattenedTasks = useMemo(() => {
    if (!data) return [];

    let source: any[] = [];
    if (categoryTab === 'officer') source = data.summary.byOfficer;
    else if (categoryTab === 'manager') source = data.summary.byManager;
    else source = data.summary.byClient;

    // Filter by selected group sub-tab
    if (selectedGroupId !== 'all') {
      source = source.filter((g: any) => (g.id ?? g.clientName) === selectedGroupId);
    }

    const flattened: TaskSummary[] = [];
    source.forEach((group: any) => {
      const groupName = group.name || group.clientName;
      group.tasks.forEach((t: any) => {
        flattened.push({ ...t, assignee_name: groupName });
      });
    });
    return flattened;
  }, [data, categoryTab, selectedGroupId]);

  // Status + search filter
  const filteredTasks = useMemo(() => {
    let filtered = flattenedTasks;
    if (statusTab === 'wip') filtered = filtered.filter(t => t.status === 'wip');
    else if (statusTab === 'write_up') filtered = filtered.filter(t => t.status === 'write_up_completed');
    else if (statusTab === 'endorsed') filtered = filtered.filter(t => t.status === 'endorsed');
    else if (statusTab === 'cancelled') filtered = filtered.filter(t => t.status === 'cancel');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.applicant_name?.toLowerCase().includes(q) ||
        t.company_name?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q) ||
        t.sub_department?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [flattenedTasks, statusTab, searchQuery]);

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a: any, b: any) => {
      const aVal = (a[sortConfig.key] || '').toString().toLowerCase();
      const bVal = (b[sortConfig.key] || '').toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredTasks, sortConfig]);

  const paginated = sortedTasks.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);

  const requestSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={12} className="ml-2 text-slate-300" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={12} className="ml-2 text-blue-600" />
      : <ChevronDown size={12} className="ml-2 text-blue-600" />;
  };

  // Toggle subdept selection
  const toggleSubdept = (id: string) => {
    setSelectedSubdeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const applySubdeptFilter = () => {
    setSubdeptDropdownOpen(false);
    setCurrentPage(0);
    fetchReport(selectedSubdeptIds);
  };

  // Groups for officer/manager sub-tab strip
  const groupStripItems = useMemo(() => {
    if (!data) return [];
    const source = categoryTab === 'officer' ? data.summary.byOfficer
      : categoryTab === 'manager' ? data.summary.byManager
      : [];
    return source.sort((a: any, b: any) => b.count - a.count);
  }, [data, categoryTab]);

  const subdepartments: { id: string; name: string }[] = data?.department?.subdepartments ?? [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Loader2 className="animate-spin text-[#0057E7]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6 font-sans">
      <Toaster />

      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <ClipboardList className="text-blue-600" size={24} />
            <h1 className="text-2xl font-bold">{data?.report?.name || "Tasks Report"}</h1>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">Resource allocation and lifecycle tracking report</p>
        </div>

        {/* Dept + subdept selection */}
        <div className="flex items-center gap-3 flex-wrap">
          {data?.department?.name && (
            <div className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5">
              <Layers size={14} className="text-blue-600" />
              <span className="text-[12px] font-bold text-blue-700">{data.department.name}</span>
            </div>
          )}

          {subdepartments.length > 0 && (
            <DropdownMenu open={subdeptDropdownOpen} onOpenChange={setSubdeptDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px] font-bold border-slate-200">
                  <Filter size={12} />
                  Sub Dept
                  {selectedSubdeptIds.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] w-4 h-4 font-bold">
                      {selectedSubdeptIds.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 pb-2">Filter by Sub-Department</p>
                {subdepartments.map(sd => (
                  <div
                    key={sd.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleSubdept(sd.id)}
                  >
                    {selectedSubdeptIds.includes(sd.id)
                      ? <CheckSquare size={14} className="text-blue-600" />
                      : <Square size={14} className="text-slate-300" />
                    }
                    <span className="text-[12px] font-medium text-slate-700">{sd.name}</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-[11px] font-bold"
                    onClick={applySubdeptFilter}
                  >
                    Apply
                  </Button>
                  {selectedSubdeptIds.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] font-bold text-slate-500"
                      onClick={() => { setSelectedSubdeptIds([]); setSubdeptDropdownOpen(false); fetchReport([]); setCurrentPage(0); }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
        <div className="flex flex-col">
          {/* TOP LEVEL: STATUS TABS + SEARCH */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/20">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { id: 'total', label: 'Total Tasks' },
                { id: 'wip', label: 'WIP Stages' },
                { id: 'write_up', label: 'Write-Up Done' },
                { id: 'endorsed', label: 'Endorsed' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-[11px] font-extrabold tracking-tight transition-all",
                    statusTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                  onClick={() => { setStatusTab(tab.id); setCurrentPage(0); }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-[300px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 rounded-full border-slate-200 bg-white pl-9 text-[13px] focus-visible:ring-blue-100"
                placeholder="Search by name, company or sub dept..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              />
            </div>
          </div>

          {/* SECOND LEVEL: CATEGORY TABS (OFFICERS/MANAGERS/CLIENTS) */}
          <div className="flex items-center gap-6 px-6 py-2 bg-white border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">View By:</span>
            <div className="flex gap-4">
              {[
                { id: 'officer', label: 'Officers', icon: User },
                { id: 'manager', label: 'Managers', icon: Users },
                { id: 'client', label: 'Clients', icon: Building2 },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryTab(cat.id as any); setCurrentPage(0); }}
                  className={cn(
                    "flex items-center gap-2 py-2 text-xs font-bold border-b-2 transition-all",
                    categoryTab === cat.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <cat.icon size={14} />
                  {cat.label}
                  <span className={cn(
                    "ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full",
                    categoryTab === cat.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {cat.id === 'officer' ? data?.summary?.byOfficer?.length ?? 0
                      : cat.id === 'manager' ? data?.summary?.byManager?.length ?? 0
                      : data?.summary?.byClient?.length ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* OFFICER/MANAGER SUB-TAB STRIP */}
          {categoryTab !== 'client' && groupStripItems.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/50 border-b border-slate-100 overflow-x-auto">
              <button
                onClick={() => { setSelectedGroupId('all'); setCurrentPage(0); }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-all border",
                  selectedGroupId === 'all'
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                )}
              >
                All ({data?.summary?.total ?? 0})
              </button>
              {groupStripItems.map((group: any) => {
                const gid = group.id ?? group.clientName;
                return (
                  <button
                    key={gid}
                    onClick={() => { setSelectedGroupId(gid); setCurrentPage(0); }}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all border",
                      selectedGroupId === gid
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {group.name}
                    <span className={cn(
                      "rounded-full px-1.5 py-px text-[9px] font-black",
                      selectedGroupId === gid ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {group.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* DATA TABLE */}
          <div className="overflow-x-auto p-4">
            <Table className="border rounded-lg border-separate border-spacing-0">
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[50px] border-r border-b text-center font-bold text-slate-500 text-[10px] uppercase">#</TableHead>

                  {/* Dynamic columns from taskFields */}
                  {visibleFieldIds.map(fieldId => {
                    const label = FIELD_LABELS[fieldId] || fieldId;
                    const sortable = ['applicant_name', 'company_name', 'sub_department', 'status'].includes(fieldId);
                    return (
                      <TableHead
                        key={fieldId}
                        className={cn("border-r border-b text-[10px] font-bold uppercase text-slate-500", sortable && "cursor-pointer hover:bg-slate-100")}
                        onClick={sortable ? () => requestSort(fieldId) : undefined}
                      >
                        <div className="flex items-center">
                          {label}
                          {sortable && <SortIcon column={fieldId} />}
                        </div>
                      </TableHead>
                    );
                  })}

                  {/* Assignee column always shown */}
                  <TableHead
                    className="border-r border-b cursor-pointer hover:bg-slate-100"
                    onClick={() => requestSort('assignee_name')}
                  >
                    <div className="flex items-center text-[10px] font-bold uppercase text-slate-500">
                      {categoryTab === 'officer' ? 'Officer' : categoryTab === 'manager' ? 'Manager' : 'Client Group'}
                      <SortIcon column="assignee_name" />
                    </div>
                  </TableHead>

                  {/* Only show Status column if not already in taskFields */}
                  {!visibleFieldIds.includes('status') && (
                    <TableHead className="border-r border-b text-[10px] font-bold uppercase text-slate-500 text-center">Status</TableHead>
                  )}

                  <TableHead className="border-b text-right text-[10px] font-bold uppercase text-slate-500 px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((task: any, idx) => {
                  const isUnallocated = !task.assignee_name || task.assignee_name.toLowerCase().includes('unallocated');
                  return (
                    <TableRow key={task.id} className="group hover:bg-blue-50/30 transition-colors">
                      <TableCell className="border-r border-b text-center text-xs font-medium text-slate-400">
                        {currentPage * itemsPerPage + idx + 1}
                      </TableCell>

                      {/* Dynamic field cells */}
                      {visibleFieldIds.map(fieldId => (
                        <TableCell key={fieldId} className="border-r border-b text-xs text-slate-700 max-w-[200px]">
                          <FieldCell fieldId={fieldId} task={task} />
                        </TableCell>
                      ))}

                      {/* Assignee */}
                      <TableCell className="border-r border-b">
                        <div className="flex items-center gap-2">
                          {!isUnallocated && (
                            <Avatar className="h-6 w-6 rounded border border-slate-200">
                              <AvatarFallback className="text-[9px] font-bold bg-slate-50 text-slate-500">
                                {initials(task.assignee_name || '')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className={cn(
                            "text-xs font-bold transition-colors",
                            isUnallocated ? "text-red-600 flex items-center gap-1" : "text-slate-700"
                          )}>
                            {isUnallocated && <AlertCircle size={12} />}
                            {task.assignee_name || "Unallocated"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status if not in taskFields */}
                      {!visibleFieldIds.includes('status') && (
                        <TableCell className="border-r border-b text-center">
                          <StatusPill status={task.status} />
                        </TableCell>
                      )}

                      <TableCell className="border-b text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={14} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-xs font-bold">Manage Task</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-bold">View History</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleFieldIds.length + 3} className="text-center py-12 text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-[13px] font-medium">No tasks found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Displaying <span className="text-blue-600">{paginated.length}</span> / {sortedTasks.length} tasks
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft size={14} />
              </Button>
              <div className="flex items-center justify-center px-3 h-8 bg-blue-600 text-white rounded text-xs font-bold">
                {currentPage + 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
