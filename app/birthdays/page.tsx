// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, Gift, Cake, MessageSquare, CalendarCheck, Users, Loader2, PartyPopper, Building2, Bell, ExternalLink, Mail, CalendarDays, CheckCircle2, AlertCircle, Clock, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Formats a date string to DD/MM/YYYY
 */
function formatDateDDMMYYYY(dob: string): string {
  if (!dob) return '—';
  // Handle DD/MM/YYYY input
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;
  
  const p = dob.split('-');
  if (p.length === 3) {
    // If format is YYYY-MM-DD
    if (p[0].length === 4) {
      return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
    }
    // If format is MM-DD-YYYY
    return `${p[1].padStart(2, '0')}/${p[0].padStart(2, '0')}/${p[2]}`;
  }
  return dob;
}

function getDaysUntil(dob: string): number | null {
  if (!dob) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let day: number, month: number;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    const p = dob.split('/');
    day = parseInt(p[0]); month = parseInt(p[1]);
  } else {
    const p = dob.split('-');
    if (p.length < 3) return null;
    if (p[0].length === 4) { month = parseInt(p[1]); day = parseInt(p[2]); }
    else { month = parseInt(p[0]); day = parseInt(p[1]); }
  }

  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

function getBirthdayGroup(days: number) {
  if (days === 0) return { rank: 0, label: 'Today', emoji: '🎉', color: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (days === 1) return { rank: 1, label: 'Tomorrow', emoji: '⏰', color: 'bg-amber-50 text-amber-700 border-amber-100' };
  if (days <= 7) return { rank: 2, label: 'This Week', emoji: '📅', color: 'bg-blue-50 text-blue-700 border-blue-100' };
  return { rank: 3, label: 'Later this Month', emoji: '✨', color: 'bg-slate-50 text-slate-500 border-slate-100' };
}

function StatusPill({ type }: { type: 'sent' | 'pending' | 'none' }) {
  const styles = {
    sent: { bg: '#ECFDF5', text: '#059669', hex: '#10B981', label: 'Wish Sent' },
    pending: { bg: '#FFF7ED', text: '#D97706', hex: '#F59E0B', label: 'Pending' },
    none: { bg: '#F1F5F9', text: '#64748B', hex: '#94A3B8', label: 'No Wish' }
  };
  const col = styles[type];
  return (
    <span style={{ background: col.bg, color: col.text, borderColor: `${col.hex}40` }} className="inline-flex items-center rounded border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
      {col.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Birthdays() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wish');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 12;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/birthdays');
        if (!res.ok) throw new Error('Failed to fetch birthdays');
        const data = await res.json();
        setRows(data);
      } catch (err) {
        console.error('Birthday load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (activeTab === 'wish') list = list.filter(r => r.gets_wish);
    if (activeTab === 'no-wish') list = list.filter(r => !r.gets_wish);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.company.toLowerCase().includes(q));
    }
    return list;
  }, [rows, activeTab, searchQuery]);

  const paginated = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-[#0057E7]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-5 font-sans">
      {/* HEADER */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-slate-900">Birthday Tracking</div>
          <div className="mt-1 text-[13px] text-slate-500">Manage wishes and gift logistics for client birthdays</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
             <PartyPopper size={14} className="text-rose-500" />
             {rows.filter(r => r.daysUntil === 0).length} Today
          </div>
          <Button className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 px-4 shadow-sm shadow-blue-100">
            <CalendarCheck size={15} /><span>Sync All to Calendar</span>
          </Button>
        </div>
      </div>

      {/* PANEL */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button className={cn("rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors", activeTab === 'wish' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900")} onClick={() => {setActiveTab('wish'); setCurrentPage(0);}}>Gets Wish</button>
            <button className={cn("rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors", activeTab === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900")} onClick={() => {setActiveTab('all'); setCurrentPage(0);}}>All People</button>
            <button className={cn("rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors", activeTab === 'no-wish' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900")} onClick={() => {setActiveTab('no-wish'); setCurrentPage(0);}}>No Wish</button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-[300px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                className="h-9 rounded-full border-slate-200 bg-white pl-9 text-[13px] focus-visible:ring-blue-100" 
                placeholder="Search individuals..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <Table className='border rounded-2xl overflow-auto'>
            <TableHeader className='bg-slate-50 border'>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="w-[44px] border-r">#</TableHead>
                <TableHead className="border-r">Individual</TableHead>
                <TableHead className="border-r">Principal / Link</TableHead>
                <TableHead className="border-r">Company / Assoc</TableHead>
                <TableHead className="border-r">Date of Birth</TableHead>
                <TableHead className="border-r">Countdown</TableHead>
                <TableHead className="border-r">Orders</TableHead>
                <TableHead className="border-r">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((row, index) => {
                const group = getBirthdayGroup(row.daysUntil);
                const prevGroup = index > 0 ? getBirthdayGroup(paginated[index - 1].daysUntil) : null;
                const showGroupHeader = index === 0 || group.rank !== prevGroup?.rank;

                return (
                  <React.Fragment key={row.id}>
                    {showGroupHeader && (
                      <TableRow className="hover:bg-transparent pointer-events-none">
                        <TableCell colSpan={9} className={cn("py-2 px-5 border-y", group.color)}>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">{group.emoji} {group.label}</span>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className={cn("hover:bg-slate-50/50 transition-colors", row.daysUntil === 0 && "bg-rose-50/30")}>
                      <TableCell className="font-medium text-slate-500 border-r text-center">{currentPage * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="border-r">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded">
                            <AvatarFallback className={cn("text-[10px] font-bold rounded", row.isDependant ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600")}>
                              {initials(row.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{row.name}</div>
                            <div className="text-[9px] flex gap-1 mt-0.5 font-bold uppercase tracking-tighter">
                               {row.isDependant && <span className="text-pink-600">Dependant</span>}
                               {row.isSpecialClient && <span className="text-purple-600">Third Party</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="border-r">
                        {row.principalName ? (
                          <div className="flex items-center gap-2">
                            <UserCheck size={12} className="text-slate-400" />
                            <span className="text-xs font-medium text-slate-700">{row.principalName}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold uppercase">—</span>
                        )}
                      </TableCell>
                      <TableCell className="border-r text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} className="text-slate-400" />
                          {row.company}
                        </div>
                      </TableCell>
                      <TableCell className="border-r text-sm text-slate-600 font-medium tabular-nums">
                        {formatDateDDMMYYYY(row.dob)}
                      </TableCell>
                      <TableCell className="border-r">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className={cn(row.daysUntil <= 1 ? "text-rose-500" : "text-slate-400")} />
                          <span className={cn("text-xs font-bold", row.daysUntil === 0 ? "text-rose-600" : "text-slate-700")}>
                            {row.daysUntil === 0 ? "Today 🎉" : row.daysUntil === 1 ? "Tomorrow" : `${row.daysUntil} days`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="border-r">
                        <div className="flex items-center gap-1.5">
                          {row.gets_cake && <span title="Cake" className="p-1 bg-amber-50 rounded-md border border-amber-100 text-sm">🎂</span>}
                          {row.gets_gift && <span title="Gift" className="p-1 bg-indigo-50 rounded-md border border-indigo-100 text-sm">🎁</span>}
                          {!row.gets_cake && !row.gets_gift && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">None</span>}
                        </div>
                      </TableCell>
                      <TableCell className="border-r">
                        <StatusPill type={row.messageSent ? 'sent' : row.gets_wish ? 'pending' : 'none'} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={14} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2"><Mail size={14} /> Send Wish Now</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><CalendarCheck size={14} /> Sync to Calendar</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-blue-600 font-medium"><ExternalLink size={14} /> View Profile</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{currentPage * itemsPerPage + 1}</span> to <span className="text-slate-900 font-bold">{Math.min((currentPage + 1) * itemsPerPage, filtered.length)}</span> of {filtered.length}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ChevronLeft size={14} /></Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold bg-[#0057E7] text-white border-none">{currentPage + 1}</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}><ChevronRight size={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}