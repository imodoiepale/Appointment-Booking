"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Users,
  Building2,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type TaskSummary = {
  id: number;
  applicant_name: string;
  company_name: string;
  status: string;
};

type OfficerGroup = {
  id: string;
  name: string;
  count: number;
  tasks: TaskSummary[];
};

type ManagerGroup = OfficerGroup;

type ClientGroup = {
  clientName: string;
  count: number;
  tasks: TaskSummary[];
};

type ReportData = {
  report: { id: string; name: string; department_id: number };
  summary: {
    total: number;
    byOfficer: OfficerGroup[];
    byManager: ManagerGroup[];
    byClient: ClientGroup[];
  };
};

const STATUS_COLORS: Record<string, string> = {
  wip: "bg-blue-100 text-blue-700",
  write_up_completed: "bg-amber-100 text-amber-700",
  endorsed: "bg-green-100 text-green-700",
  cancel: "bg-red-100 text-red-700",
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    wip: "In Progress",
    write_up_completed: "Write-Up Done",
    endorsed: "Endorsed",
    cancel: "Cancelled",
  };
  return map[status] ?? status;
}

function TaskRow({ task }: { task: TaskSummary }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{task.applicant_name}</p>
        {task.company_name && (
          <p className="text-xs text-slate-500 truncate">{task.company_name}</p>
        )}
      </div>
      <Badge
        className={`ml-3 shrink-0 text-xs font-medium border-0 ${STATUS_COLORS[task.status] ?? "bg-slate-100 text-slate-600"}`}
      >
        {statusLabel(task.status)}
      </Badge>
    </div>
  );
}

function GroupCard({
  label,
  count,
  tasks,
  accent,
}: {
  label: string;
  count: number;
  tasks: TaskSummary[];
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${accent}`} />
            <span className="text-sm font-semibold text-slate-800 truncate">{label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{count}</Badge>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>
      </button>
      {expanded && (
        <CardContent className="pt-0 pb-2 px-2 border-t border-slate-100">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function TasksPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tasks-report");
        if (!res.ok) throw new Error("Failed to fetch report");
        setData(await res.json());
      } catch (e: any) {
        setError(e.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#061D43] via-[#0A3072] to-[#1565C0] px-4 pt-10 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="h-6 w-6 text-white/80" />
            <h1 className="text-2xl font-bold text-white">
              {data?.report?.name ?? "Tasks Report"}
            </h1>
          </div>
          {data && (
            <p className="text-white/70 text-sm ml-9">
              {data.summary.total} active task{data.summary.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="text-center text-red-500 py-8">{error}</div>
        )}

        {!error && (
          <Tabs defaultValue="officers">
            <TabsList className="w-full mb-6 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <TabsTrigger
                value="officers"
                className="flex-1 flex items-center gap-1.5 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
              >
                <User className="h-3.5 w-3.5" />
                Officers
                {data && (
                  <span className="ml-1 text-xs opacity-70">
                    ({data.summary.byOfficer.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="managers"
                className="flex-1 flex items-center gap-1.5 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
              >
                <Users className="h-3.5 w-3.5" />
                Managers
                {data && (
                  <span className="ml-1 text-xs opacity-70">
                    ({data.summary.byManager.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="flex-1 flex items-center gap-1.5 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"
              >
                <Building2 className="h-3.5 w-3.5" />
                Clients
                {data && (
                  <span className="ml-1 text-xs opacity-70">
                    ({data.summary.byClient.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="officers">
              {loading ? (
                <SectionSkeleton />
              ) : (
                <div className="space-y-3">
                  {data?.summary.byOfficer.length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm">
                      No tasks currently with officers
                    </p>
                  )}
                  {(data?.summary.byOfficer ?? [])
                    .sort((a, b) => b.count - a.count)
                    .map((g) => (
                      <GroupCard
                        key={g.id}
                        label={g.name}
                        count={g.count}
                        tasks={g.tasks}
                        accent="bg-blue-500"
                      />
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="managers">
              {loading ? (
                <SectionSkeleton />
              ) : (
                <div className="space-y-3">
                  {data?.summary.byManager.length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm">
                      No tasks currently with managers
                    </p>
                  )}
                  {(data?.summary.byManager ?? [])
                    .sort((a, b) => b.count - a.count)
                    .map((g) => (
                      <GroupCard
                        key={g.id}
                        label={g.name}
                        count={g.count}
                        tasks={g.tasks}
                        accent="bg-violet-500"
                      />
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="clients">
              {loading ? (
                <SectionSkeleton />
              ) : (
                <div className="space-y-3">
                  {data?.summary.byClient.length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm">
                      No tasks currently waiting on clients
                    </p>
                  )}
                  {(data?.summary.byClient ?? [])
                    .sort((a, b) => b.count - a.count)
                    .map((g) => (
                      <GroupCard
                        key={g.clientName}
                        label={g.clientName}
                        count={g.count}
                        tasks={g.tasks}
                        accent="bg-orange-500"
                      />
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
