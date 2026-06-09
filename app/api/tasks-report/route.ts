import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

function getTaskAssistantParticipant(task: any) {
  return getParticipant(task, (role) => role.includes("task_assistant"));
}

function getClassNameFromJobLevel(jl: any, subdepartments: { id: string; name: string; classes?: any[] }[]): string {
  if (!jl || typeof jl !== "object") return "";
  const subdept = subdepartments.find((s) => s.id === String(jl.subdepartment_id ?? ""));
  if (!subdept) return "";
  if (jl.class_id && Array.isArray(subdept.classes)) {
    const cls = subdept.classes.find((c: any) => String(c.id) === String(jl.class_id));
    return cls?.name ?? "";
  }
  return subdept.name ?? "";
}

function getApplicantName(task: any): string {
  return task.applicant_details?.name || task.applicant_name || "Unknown";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
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
    const taskFields: { id: string; isDefault: boolean }[] =
      report.configuration?.taskFields ?? [];

    // 2a. Fetch department (original single-table query that we know works)
    const { data: dept } = await supabase
      .from("tm_departments")
      .select("id, name, stages")
      .eq("id", deptId)
      .single();

    const stages: any[] = (dept?.stages ?? []).sort(
      (a: any, b: any) => (a.order_num || 0) - (b.order_num || 0)
    );

    // 2b. Fetch subdepartments (with classes for job_level class name resolution)
    const { data: subdeptRows } = await supabase
      .from("tm_subdepartments")
      .select("id, name, classes")
      .eq("department_id", deptId)
      .order("id");

    const subdepartments: { id: string; name: string; classes?: any[] }[] = (subdeptRows ?? []).map(
      (s: any) => ({ id: String(s.id), name: s.name, classes: s.classes ?? [] })
    );

    // 3. Fetch all tasks for this department (all statuses — frontend handles status filtering)
    const tasksQuery = supabase
      .from("tm_tasks")
      .select("*")
      .eq("job_level->>department_id", String(deptId))
      .not("status", "in", "(completed,archived)");

    const { data: rawTasks, error: tasksError } = await tasksQuery;
    if (tasksError) throw tasksError;

    // 3b. Batch fetch registry_individuals for r_number / passport_number
    const individualIds = Array.from(new Set((rawTasks ?? []).map((t: any) => t.individual_id).filter(Boolean)));
    const individualMap = new Map<number, any>();
    if (individualIds.length > 0) {
      const { data: individuals } = await supabase
        .from("registry_individuals")
        .select("id, r_number, passport_number")
        .in("id", individualIds);
      (individuals ?? []).forEach((ind: any) => individualMap.set(ind.id, ind));
    }

    // 4. Process tasks — derive virtual fields from participants_details + job_level
    const tasks = (rawTasks ?? []).map((task) => {
      const jl = task.job_level ?? {};
      const subdeptId = jl.subdepartment_id?.toString() ?? "";
      const subdeptEntry = subdepartments.find((s) => s.id === subdeptId);
      const individual = individualMap.get(task.individual_id);
      const jobAnswers = task.job_specific_answers ?? {};
      const tracking = getCurrentStageTracking(task, stages);
      return {
        ...task,
        applicant_name: getApplicantName(task),
        company_name: getCompanyParticipant(task)?.name ?? "",
        sub_department: subdeptEntry?.name ?? "",
        job_level_class: getClassNameFromJobLevel(jl, subdepartments),
        r_number: individual?.r_number ?? "",
        passport_number: individual?.passport_number ?? task.passport_number ?? "",
        duration: jobAnswers["1769582847128"] ?? "",
        renewal_status: jobAnswers["1769582847129"] ?? task.renewal_status ?? "New",
        current_stage_name: tracking?.stage?.name ?? "",
        current_stage_follow_up: tracking?.stage?.follow_up ?? "",
        task_manager_name: getTaskManagerParticipant(task)?.name ?? "",
        task_assistant_name: getTaskAssistantParticipant(task)?.name ?? "",
      };
    });

    // 5. Collect officer IDs to resolve names
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

    // 6. Group tasks
    type TaskRow = {
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
    };

    const officerGroups = new Map<string, { name: string; tasks: TaskRow[] }>();
    const managerGroups = new Map<string, { name: string; tasks: TaskRow[] }>();
    const clientGroups = new Map<string, { tasks: TaskRow[] }>();

    tasks.forEach((task) => {
      const row: TaskRow = {
        id: task.id,
        applicant_name: task.applicant_name,
        company_name: task.company_name,
        sub_department: task.sub_department,
        sub_department_id: (task.job_level?.subdepartment_id ?? "").toString(),
        job_level: task.job_level_class,
        r_number: task.r_number,
        passport_number: task.passport_number,
        duration: task.duration,
        renewal_status: task.renewal_status,
        current_stage_name: task.current_stage_name,
        current_stage_follow_up: task.current_stage_follow_up,
        task_manager: task.task_manager_name,
        task_assistant: task.task_assistant_name,
        status: task.status ?? "wip",
      };

      // Officers
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

      // Managers (BCL)
      const tracking = getCurrentStageTracking(task, stages);
      if (tracking?.stage?.follow_up === "BCL") {
        const mgrParticipant = getTaskManagerParticipant(task);
        const mgrId = mgrParticipant?.id ? String(mgrParticipant.id) : "__unallocated__";
        const mgrName = mgrParticipant?.name ?? "Unallocated";
        if (!managerGroups.has(mgrId)) managerGroups.set(mgrId, { name: mgrName, tasks: [] });
        managerGroups.get(mgrId)!.tasks.push(row);
      }

      // Clients
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
        taskFields,
      },
      department: {
        id: String(deptId),
        name: dept?.name ?? "",
        subdepartments,
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
