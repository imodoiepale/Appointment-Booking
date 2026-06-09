import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REPORT_ID = "d0d23f1c-8073-46fa-9cef-681dc7ca2d44";

// ─── Stage helpers (mirrors reports/page.tsx logic) ───────────────────────────

function parseStageDate(stageData: any): Date | null {
  const raw =
    stageData?.completedAt ||
    stageData?.skippedAt ||
    stageData?.date_completed ||
    stageData?.date ||
    stageData?.lastUpdated ||
    null;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Mirrors getCurrentStageTracking: stage with the LATEST date across all stage entries.
 * This is the "most recently touched" stage — used for BCL / client grouping.
 */
function getCurrentStageTracking(
  task: any,
  stages: any[]
): { stage: any; handledAt: Date } | null {
  let latest: { stage: any; handledAt: Date } | null = null;

  for (const stage of stages) {
    const stageData = task?.stages?.[stage.id];
    if (!stageData) continue;
    const d = parseStageDate(stageData);
    if (d && (!latest || d.getTime() > latest.handledAt.getTime())) {
      latest = { stage, handledAt: d };
    }
  }

  return latest;
}

/**
 * Mirrors getCurrentOfficerStage: FIRST stage (by order_num) where follow_up='officer',
 * stageData exists, and status is not completed/skipped.
 * Used for officer grouping.
 */
function getCurrentOfficerStage(task: any, stages: any[]): any | null {
  const sorted = [...stages].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  return (
    sorted.find((stage) => {
      const stageData = task?.stages?.[stage.id];
      if (!stageData) return false;
      const status = stageData?.status?.toString().toLowerCase();
      return (
        stage.follow_up?.toLowerCase() === "officer" &&
        status !== "completed" &&
        status !== "skipped"
      );
    }) ?? null
  );
}

function normalizeIds(ids: any): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id: any) => id?.toString()).filter(Boolean);
}

// ─── Participant helpers ───────────────────────────────────────────────────────

function getParticipant(task: any, rolePredicate: (role: string, type: string) => boolean) {
  return (task.participants_details ?? []).find((p: any) => {
    const role = (p.role ?? "").toString().toLowerCase();
    const type = (p.type ?? "").toString().toLowerCase();
    return rolePredicate(role, type);
  });
}

function getCompanyParticipant(task: any) {
  return getParticipant(task, (role, type) =>
    type === "company" || role.includes("sponsor") || role.includes("company")
  );
}

function getTaskManagerParticipant(task: any) {
  return getParticipant(task, (role) => role.includes("task_manager"));
}

function getApplicantName(task: any): string {
  return task.applicant_details?.name || task.applicant_name || "Unknown";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Fetch report config
    const { data: report, error: reportError } = await supabase
      .from("tm_memorized_reports")
      .select("id, name, department_id, configuration")
      .eq("id", REPORT_ID)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const deptId = report.department_id;

    // 2. Fetch department stages (stored as JSONB array in tm_departments.stages)
    const { data: dept } = await supabase
      .from("tm_departments")
      .select("id, name, stages")
      .eq("id", deptId)
      .single();

    const stages: any[] = (dept?.stages ?? []).sort(
      (a: any, b: any) => (a.order_num || 0) - (b.order_num || 0)
    );

    // 3. Fetch all tasks for this department using select('*') — derived fields are
    //    processed below, not selected as columns (avoids column-not-found errors)
    const { data: rawTasks, error: tasksError } = await supabase
      .from("tm_tasks")
      .select("*")
      .eq("job_level->>department_id", String(deptId))
      .not("status", "in", "(cancel,endorsed,archived)");

    if (tasksError) throw tasksError;

    // 4. Process tasks — derive virtual fields from participants_details
    const tasks = (rawTasks ?? []).map((task) => ({
      ...task,
      applicant_name: getApplicantName(task),
      company_name: getCompanyParticipant(task)?.name ?? "",
      task_manager: getTaskManagerParticipant(task) ?? null,
    }));

    // 5. Collect all officer IDs across all stage data to resolve names in one query
    const allOfficerIds = new Set<string>();
    tasks.forEach((task) => {
      Object.values(task.stages ?? {}).forEach((stageData: any) => {
        normalizeIds(stageData?.officer_ids).forEach((id) => allOfficerIds.add(id));
      });
    });

    const officerNameMap = new Map<string, string>();
    if (allOfficerIds.size > 0) {
      const { data: users } = await supabase
        .from("scanner_users")
        .select("id, first_name, last_name, username")
        .in("id", Array.from(allOfficerIds));

      (users ?? []).forEach((u) => {
        const name =
          [u.first_name, u.last_name].filter(Boolean).join(" ") ||
          u.username ||
          String(u.id);
        officerNameMap.set(String(u.id), name);
      });
    }

    // 6. Group tasks into the three perspectives

    type TaskRow = {
      id: number;
      applicant_name: string;
      company_name: string;
      status: string;
    };

    // By Officer — uses getCurrentOfficerStage (first active officer stage)
    const officerGroups = new Map<string, { name: string; tasks: TaskRow[] }>();

    // By Manager (BCL) — uses getCurrentStageTracking (latest touched stage)
    const managerGroups = new Map<string, { name: string; tasks: TaskRow[] }>();

    // By Client — uses getCurrentStageTracking (latest touched stage)
    const clientGroups = new Map<string, { tasks: TaskRow[] }>();

    tasks.forEach((task) => {
      const row: TaskRow = {
        id: task.id,
        applicant_name: task.applicant_name,
        company_name: task.company_name,
        status: task.status ?? "wip",
      };

      // ── Officers ──────────────────────────────────────────────────────────
      const officerStage = getCurrentOfficerStage(task, stages);
      if (officerStage) {
        const ids = normalizeIds(task.stages?.[officerStage.id]?.officer_ids);
        if (ids.length === 0) {
          const key = "__unallocated__";
          if (!officerGroups.has(key)) officerGroups.set(key, { name: "Unallocated", tasks: [] });
          officerGroups.get(key)!.tasks.push(row);
        } else {
          ids.forEach((id) => {
            const name = officerNameMap.get(id) ?? `Officer ${id}`;
            if (!officerGroups.has(id)) officerGroups.set(id, { name, tasks: [] });
            officerGroups.get(id)!.tasks.push(row);
          });
        }
      }

      // ── Managers (BCL) ────────────────────────────────────────────────────
      const tracking = getCurrentStageTracking(task, stages);
      if (tracking?.stage?.follow_up === "BCL") {
        const mgr = task.task_manager;
        const mgrId = mgr?.id ? String(mgr.id) : "__unallocated__";
        const mgrName = mgr?.name ?? "Unallocated";
        if (!managerGroups.has(mgrId)) managerGroups.set(mgrId, { name: mgrName, tasks: [] });
        managerGroups.get(mgrId)!.tasks.push(row);
      }

      // ── Clients ───────────────────────────────────────────────────────────
      const trackingFollowUp = tracking?.stage?.follow_up?.toString().toLowerCase();
      if (trackingFollowUp === "client") {
        const company = getCompanyParticipant(task);
        const clientName = company?.name ?? task.company_name ?? "Unknown";
        if (!clientGroups.has(clientName)) clientGroups.set(clientName, { tasks: [] });
        clientGroups.get(clientName)!.tasks.push(row);
      }
    });

    return NextResponse.json({
      report: {
        id: report.id,
        name: report.name,
        department_id: report.department_id,
      },
      summary: {
        total: tasks.length,
        byOfficer: Array.from(officerGroups.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          count: data.tasks.length,
          tasks: data.tasks,
        })),
        byManager: Array.from(managerGroups.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          count: data.tasks.length,
          tasks: data.tasks,
        })),
        byClient: Array.from(clientGroups.entries()).map(([name, data]) => ({
          clientName: name,
          count: data.tasks.length,
          tasks: data.tasks,
        })),
      },
    });
  } catch (err) {
    console.error("[tasks-report]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
