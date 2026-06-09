"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
// ... (imports remain exactly the same)
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
 * Keep your existing STATUS_CONFIG, StatusPill, initials, RENEWAL_CONFIG, 
 * FOLLOW_UP_CONFIG, FieldCell, and FIELD_LABELS constants here...
 */
// [EXISTING CONSTANTS REMOVED FOR BREVITY - KEEP THEM IN YOUR CODE]

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

const RENEWAL_CONFIG: Record<string, { label: string; color: string }> = {
  New: { label: "New", color: "text-blue-600 bg-blue-50 border-blue-200" },
  Renewal: { label: "Renewal", color: "text-amber-700 bg-amber-50 border-amber-200" },
};

const FOLLOW_UP_CONFIG: Record<string, { label: string; color: string }> = {
  officer: { label: "Officer", color: "text-violet-700 bg-violet-50 border-violet-200" },
  Officer: { label: "Officer", color: "text-violet-700 bg-violet-50 border-violet-200" },
  BCL: { label: "BCL", color: "text-blue-700 bg-blue-50 border-blue-200" },
  client: { label: "Client", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  Client: { label: "Client", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

// Renders the correct content for each known field ID
function FieldCell({ fieldId, task }: { fieldId: string; task: any }) {
  const dash = <span className="text-slate-300 font-black text-[10px]">—</span>;
  const val = (v: string | undefined | null) => v?.trim() ? v : null;

  switch (fieldId) {
    case 'applicant_name':
      return <span className="font-bold text-slate-900">{val(task.applicant_name) ?? dash}</span>;
    case 'company_name':
      return (
        <div className="flex items-center gap-1.5 truncate">
          <Building size={11} className="shrink-0 text-slate-300" />
          <span className="truncate">{val(task.company_name) ?? dash}</span>
        </div>
      );
    case 'sub_department':
      return <span>{val(task.sub_department) ?? dash}</span>;
    case 'job_level':
      return <span className="font-medium text-slate-700">{val(task.job_level) ?? dash}</span>;
    case 'r_number':
      return val(task.r_number)
        ? <span className="font-mono text-[11px] text-slate-700">{task.r_number}</span>
        : dash;
    case 'passport_number':
      return val(task.passport_number)
        ? <span className="font-mono text-[11px] text-slate-700">{task.passport_number}</span>
        : dash;
    case 'duration':
      return val(task.duration)
        ? <span className="text-slate-700">{task.duration}</span>
        : dash;
    case 'renewal_status': {
      const cfg = RENEWAL_CONFIG[task.renewal_status ?? ""] ?? null;
      return cfg
        ? <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${cfg.color}`}>{cfg.label}</span>
        : <span className="text-slate-500 text-[11px]">{val(task.renewal_status) ?? dash}</span>;
    }
    case 'current_stage_name':
      return val(task.current_stage_name)
        ? <span className="font-medium text-slate-700">{task.current_stage_name}</span>
        : dash;
    case 'current_stage_follow_up': {
      const fu = task.current_stage_follow_up;
      const cfg = FOLLOW_UP_CONFIG[fu ?? ""] ?? null;
      return cfg
        ? <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${cfg.color}`}>{cfg.label}</span>
        : val(fu) ? <span className="text-slate-700 text-[11px]">{fu}</span> : dash;
    }
    case 'task_manager':
      return val(task.task_manager)
        ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 rounded border border-slate-200 shrink-0">
              <AvatarFallback className="text-[8px] font-bold bg-slate-50 text-slate-500">
                {initials(task.task_manager)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-slate-700 truncate">{task.task_manager}</span>
          </div>
        )
        : <span className="text-red-500 text-[10px] font-bold">Unallocated</span>;
    case 'task_assistant':
      return val(task.task_assistant)
        ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 rounded border border-slate-200 shrink-0">
              <AvatarFallback className="text-[8px] font-bold bg-slate-50 text-slate-500">
                {initials(task.task_assistant)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-slate-700 truncate">{task.task_assistant}</span>
          </div>
        )
        : dash;
    case 'status':
      return <StatusPill status={task.status} />;
    default:
      return dash;
  }
}

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
  sub_department_id: string;
  job_level: string;
  r_number: string;
  passport_number: string;
  duration: string;
  renewal_status: string;
  current_stage_name: string;
  current_stage_follow_up: string;
  task_manager: string;
  task_assistant: string;
  status: string;
  assignee_name?: string;
};

export default function TasksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubdeptIds, setSelectedSubdeptIds] = useState<string[]>([]);
  const [subdeptDropdownOpen, setSubdeptDropdownOpen] = useState(false);
  const [statusTab, setStatusTab] = useState('total');
  const [categoryTab, setCategoryTab] = useState<'officer' | 'manager' | 'client'>('officer');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'applicant_name',
    direction: 'asc'
  });

  const itemsPerPage = 12;
  const { toast } = useToast();

  // Fetch once — all status filtering and subdept filtering are done client-side
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks-report');
      if (!res.ok) throw new Error("Failed to fetch report");
      setData(await res.json());
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset group selection when category or subdept filter changes
  useEffect(() => { setSelectedGroupId('all'); setCurrentPage(0); }, [categoryTab, selectedSubdeptIds]);

  const subdepartments: { id: string; name: string }[] = data?.department?.subdepartments ?? [];

  const visibleFieldIds: string[] = useMemo(() => {
    const fields: { id: string }[] = data?.report?.taskFields ?? [];
    if (fields.length === 0) return ['applicant_name', 'company_name', 'status'];
    return fields.map((f: any) => f.id).filter((id: string) => id in FIELD_LABELS);
  }, [data]);

  // Status filter — mirrors ReportsPage logic exactly
  const isWip = (t: any) => !['write_up_completed', 'endorsed', 'cancel', 'completed', 'archived'].includes(t.status);

  const filterByStatus = useCallback((tasks: any[]) => {
    if (statusTab === 'total') return tasks;
    if (statusTab === 'wip') return tasks.filter(isWip);
    if (statusTab === 'write_up') return tasks.filter((t: any) => t.status === 'write_up_completed');
    if (statusTab === 'endorsed') return tasks.filter((t: any) => t.status === 'endorsed');
    if (statusTab === 'cancelled') return tasks.filter((t: any) => t.status === 'cancel');
    return tasks;
  }, [statusTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subdept filter helper applied to task row arrays
  const filterBySubdept = useCallback((tasks: any[]) =>
    selectedSubdeptIds.length === 0 ? tasks : tasks.filter((t: any) => selectedSubdeptIds.includes(t.sub_department_id))
  , [selectedSubdeptIds]);

  // Flatten all tasks for current category (before status filter) with subdept applied
  const flattenedTasks = useMemo(() => {
    if (!data) return [];
    let source: any[] = categoryTab === 'officer' ? data.summary.byOfficer ?? []
      : categoryTab === 'manager' ? data.summary.byManager ?? []
      : data.summary.byClient ?? [];

    if (selectedGroupId !== 'all') {
      source = source.filter((g: any) => (g.id ?? g.clientName) === selectedGroupId);
    }

    const out: TaskSummary[] = [];
    source.forEach((g: any) => {
      const name = g.name ?? g.clientName;
      filterBySubdept(g.tasks ?? []).forEach((t: any) => out.push({ ...t, assignee_name: name }));
    });
    return out;
  }, [data, categoryTab, selectedGroupId, filterBySubdept]);

  // Status-tab counts — group-aware: derived from flattenedTasks so that selecting a specific
  // officer/manager updates the counts, mirroring the reports page where person selection
  // affects the status tab badges.
  const wipCount       = useMemo(() => flattenedTasks.filter(isWip).length, [flattenedTasks]); // eslint-disable-line react-hooks/exhaustive-deps
  const writeUpCount   = useMemo(() => flattenedTasks.filter((t: any) => t.status === 'write_up_completed').length, [flattenedTasks]);
  const endorsedCount  = useMemo(() => flattenedTasks.filter((t: any) => t.status === 'endorsed').length, [flattenedTasks]);
  const cancelledCount = useMemo(() => flattenedTasks.filter((t: any) => t.status === 'cancel').length, [flattenedTasks]);

  // Group strip — officer/manager tabs only; counts reflect subdept + status filter
  const groupStripItems = useMemo(() => {
    if (!data || categoryTab === 'client') return [];
    const source: any[] = categoryTab === 'officer' ? data.summary.byOfficer ?? [] : data.summary.byManager ?? [];
    return source.map((g: any) => ({
      ...g,
      dynamicCount: filterByStatus(filterBySubdept(g.tasks ?? [])).length,
    })).filter((g: any) => g.dynamicCount > 0).sort((a: any, b: any) => b.dynamicCount - a.dynamicCount);
  }, [data, categoryTab, filterBySubdept, filterByStatus]);

  // Reset selected group when it disappears after filtering
  useEffect(() => {
    if (selectedGroupId !== 'all' && !groupStripItems.find((g: any) => (g.id ?? g.clientName) === selectedGroupId)) {
      setSelectedGroupId('all');
    }
  }, [groupStripItems, selectedGroupId]);

  const filteredTasks = useMemo(() => {
    let list = filterByStatus(flattenedTasks);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.applicant_name?.toLowerCase().includes(q) ||
        t.company_name?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q) ||
        t.sub_department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [flattenedTasks, filterByStatus, searchQuery]);

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a: any, b: any) => {
      const aVal = (a[sortConfig.key] ?? '').toString().toLowerCase();
      const bVal = (b[sortConfig.key] ?? '').toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredTasks, sortConfig]);

  const paginated = sortedTasks.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);

  const requestSort = (key: string) => setSortConfig(prev => ({
    key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
  }));

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={12} className="ml-2 text-slate-300" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={12} className="ml-2 text-blue-600" />
      : <ChevronDown size={12} className="ml-2 text-blue-600" />;
  };

  const toggleSubdept = (id: string) =>
    setSelectedSubdeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const removeSubdept = (id: string) => { setSelectedSubdeptIds(prev => prev.filter(x => x !== id)); setCurrentPage(0); };

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
          <div className="flex items-center gap-2">
            <ClipboardList className="text-blue-600" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">{data?.report?.name || "Tasks Report"}</h1>
          </div>

          {/* Dept + active subdept breadcrumb */}
          {data?.department?.name && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1">
                <Layers size={11} className="text-white/80 shrink-0" />
                <span className="text-[11px] font-black text-white">{data.department.name}</span>
              </div>
              {selectedSubdeptIds.length === 0 ? (
                <span className="text-[11px] text-slate-400 font-medium">All Sub-Departments</span>
              ) : (
                selectedSubdeptIds.map(id => {
                  const sd = subdepartments.find(s => s.id === id);
                  return sd ? (
                    <div key={id} className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
                      <span className="text-[11px] font-bold text-slate-600">{sd.name}</span>
                      <button
                        onClick={() => removeSubdept(id)}
                        className="ml-0.5 text-[13px] leading-none text-slate-400 hover:text-slate-700"
                        aria-label={`Remove ${sd.name}`}
                      >×</button>
                    </div>
                  ) : null;
                })
              )}
            </div>
          )}
        </div>

        {/* Subdept filter dropdown */}
        {subdepartments.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap self-start">
            <DropdownMenu open={subdeptDropdownOpen} onOpenChange={setSubdeptDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px] font-bold border-slate-200">
                  <Filter size={12} /> Sub Dept
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
                  <div key={sd.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer" onClick={() => toggleSubdept(sd.id)}>
                    {selectedSubdeptIds.includes(sd.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-slate-300" />}
                    <span className="text-[12px] font-medium text-slate-700">{sd.name}</span>
                  </div>
                ))}
                {selectedSubdeptIds.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] font-bold text-slate-500"
                      onClick={() => { setSelectedSubdeptIds([]); setSubdeptDropdownOpen(false); }}>
                      Clear All
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
        <div className="flex flex-col">
          {/* STATUS TABS + SEARCH */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/20">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { id: 'total',     label: 'All',        count: flattenedTasks.length },
                { id: 'wip',       label: 'WIP',        count: wipCount },
                { id: 'write_up',  label: 'Write-Up',   count: writeUpCount },
                { id: 'endorsed',  label: 'Endorsed',   count: endorsedCount },
                { id: 'cancelled', label: 'Cancelled',  count: cancelledCount },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-extrabold tracking-tight transition-all",
                    statusTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                  onClick={() => { setStatusTab(tab.id); setCurrentPage(0); }}
                >
                  {tab.label}
                  <span className={cn(
                    "rounded-full px-1.5 py-px text-[9px] font-black",
                    statusTab === tab.id ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
                  )}>{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="relative w-[280px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 rounded-full border-slate-200 bg-white pl-9 text-[13px] focus-visible:ring-blue-100"
                placeholder="Search by name, company or sub dept..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              />
            </div>
          </div>

          {/* CATEGORY TABS */}
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
                    categoryTab === cat.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <cat.icon size={14} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* SUB-TAB STRIP (DYNAMIC COUNTS HERE) */}
          {categoryTab !== 'client' && groupStripItems.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/50 border-b border-slate-100 overflow-x-auto">
              <button
                onClick={() => { setSelectedGroupId('all'); setCurrentPage(0); }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-all border",
                  selectedGroupId === 'all' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                )}
              >
                All ({groupStripItems.reduce((s: number, g: any) => s + g.dynamicCount, 0)})
              </button>
              {groupStripItems.map((group: any) => {
                const gid = group.id ?? group.clientName;
                return (
                  <button
                    key={gid}
                    onClick={() => { setSelectedGroupId(gid); setCurrentPage(0); }}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all border",
                      selectedGroupId === gid ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {group.name}
                    <span className={cn(
                      "rounded-full px-1.5 py-px text-[9px] font-black",
                      selectedGroupId === gid ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {group.dynamicCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TABLE */}
          <div className="overflow-x-auto p-4">
            <Table className="border rounded-lg border-separate border-spacing-0">
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[50px] border-r border-b text-center font-bold text-slate-500 text-[10px] uppercase">#</TableHead>
                  {visibleFieldIds.map(fieldId => (
                    <TableHead
                      key={fieldId}
                      className={cn("border-r border-b text-[10px] font-bold uppercase text-slate-500", ['applicant_name', 'company_name'].includes(fieldId) && "cursor-pointer hover:bg-slate-100")}
                      onClick={['applicant_name', 'company_name'].includes(fieldId) ? () => requestSort(fieldId) : undefined}
                    >
                      <div className="flex items-center">
                        {FIELD_LABELS[fieldId] || fieldId}
                        {['applicant_name', 'company_name'].includes(fieldId) && <SortIcon column={fieldId} />}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="border-r border-b cursor-pointer hover:bg-slate-100" onClick={() => requestSort('assignee_name')}>
                    <div className="flex items-center text-[10px] font-bold uppercase text-slate-500">
                      {categoryTab === 'officer' ? 'Officer' : categoryTab === 'manager' ? 'Manager' : 'Client'}
                      <SortIcon column="assignee_name" />
                    </div>
                  </TableHead>
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
                      <TableCell className="border-r border-b text-center text-xs font-medium text-slate-400">{currentPage * itemsPerPage + idx + 1}</TableCell>
                      {visibleFieldIds.map(fieldId => (
                        <TableCell key={fieldId} className="border-r border-b text-xs text-slate-700 max-w-[200px]"><FieldCell fieldId={fieldId} task={task} /></TableCell>
                      ))}
                      <TableCell className="border-r border-b">
                        <div className="flex items-center gap-2">
                          {!isUnallocated && <Avatar className="h-6 w-6 rounded border border-slate-200"><AvatarFallback className="text-[9px] font-bold bg-slate-50 text-slate-500">{initials(task.assignee_name)}</AvatarFallback></Avatar>}
                          <span className={cn("text-xs font-bold", isUnallocated ? "text-red-600 flex items-center gap-1" : "text-slate-700")}>
                            {isUnallocated && <AlertCircle size={12} />} {task.assignee_name || "Unallocated"}
                          </span>
                        </div>
                      </TableCell>
                      {!visibleFieldIds.includes('status') && <TableCell className="border-r border-b text-center"><StatusPill status={task.status} /></TableCell>}
                      <TableCell className="border-b text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end"><DropdownMenuItem className="text-xs font-bold">Manage</DropdownMenuItem></DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Displaying <span className="text-blue-600">{paginated.length}</span> / {sortedTasks.length} tasks</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ChevronLeft size={14} /></Button>
              <div className="flex items-center justify-center px-3 h-8 bg-blue-600 text-white rounded text-xs font-bold">{currentPage + 1}</div>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}><ChevronRight size={14} /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}