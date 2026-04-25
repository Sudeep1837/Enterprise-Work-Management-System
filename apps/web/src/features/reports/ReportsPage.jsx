import { useMemo, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend, PieChart, Pie, Cell,
} from "recharts";
import { PageCard, PageHeader, Badge, EmptyState, Button } from "../common/components/UI";
import { DonutChartCard, StripMetric, InsightCard, CustomChartTooltip } from "../common/components/Analytics";
import {
  selectDashboardMetrics, selectWorkloadMetrics, selectWeeklyTrend,
  selectProjectStatusData, selectOverdueVsCompleted, selectDueSoonTasks, selectProjectHealth,
} from "../../store/selectors";
import {
  BarChart3, Filter, ShieldAlert, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, Download, X, FolderKanban,
} from "lucide-react";
import { isAdmin, isManager, isEmployee } from "../../lib/permissions";

// ─── Palette ──────────────────────────────────────────────────────────────────
const PROJECT_STATUS_COLORS = { Planning: "#818cf8", Active: "#10b981", "On Hold": "#f59e0b", Completed: "#6366f1" };

// ─── CSV Export helper ────────────────────────────────────────────────────────
function exportToCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
      {label}
      <button onClick={onRemove} className="ml-0.5 rounded-full hover:text-indigo-900 dark:hover:text-indigo-100 transition">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Scope Banner ─────────────────────────────────────────────────────────────
function ScopeBanner({ role }) {
  if (role === "admin") return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/60 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/5 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
      <span>
        {role === "manager"
          ? "Showing analytics for your managed projects and team scope only."
          : "Showing your personal task metrics and performance data only."}
      </span>
    </div>
  );
}

// ─── Delivery Trend Chart ─────────────────────────────────────────────────────
function DeliveryTrendCard({ trendData }) {
  const totalCreated = trendData.reduce((a, d) => a + d.created, 0);
  const totalCompleted = trendData.reduce((a, d) => a + d.completed, 0);
  const peak = Math.max(...trendData.map((d) => d.created), 1);
  return (
    <PageCard title="Throughput Trajectory" subtitle="Tasks created vs completed over the last 7 days">
      <div className="mt-6 flex flex-col gap-4 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-5 md:w-40">
          <StripMetric label="Created (7d)" value={totalCreated} sub="New Tasks" />
          <StripMetric label="Completed (7d)" value={totalCompleted} sub="Done" />
          <StripMetric label="Peak Day" value={peak} sub="Tasks" />
        </div>
        <div className="h-[260px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Area type="monotone" dataKey="created" name="Created" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#gradCreated)" animationDuration={1200} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradCompleted)" animationDuration={1400} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageCard>
  );
}

// ─── Overdue vs Completed Grouped Bar ─────────────────────────────────────────
function OverdueVsCompletedCard({ data }) {
  const hasData = data.some((d) => d.Completed > 0 || d.Overdue > 0);
  return (
    <PageCard title="Risk vs Delivery" subtitle="Overdue vs completed tasks by priority level">
      {!hasData ? (
        <div className="py-16 text-center text-sm text-slate-400">No task data available yet</div>
      ) : (
        <div className="mt-6 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={22} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="Completed" name="Completed" fill="#10b981" radius={[5, 5, 0, 0]} animationDuration={1200} />
              <Bar dataKey="Overdue" name="Overdue" fill="#f43f5e" radius={[5, 5, 0, 0]} animationDuration={1400} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageCard>
  );
}

// ─── Project Performance Comparison ───────────────────────────────────────────
function ProjectPerformanceCard({ projectHealth }) {
  const data = projectHealth.slice(0, 8).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    Progress: p.progress,
    Tasks: p.taskCount,
  }));
  if (!data.length) return null;
  return (
    <PageCard title="Project Performance" subtitle="Completion progress across all projects">
      <div className="mt-6 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} angle={-15} textAnchor="end" interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} unit="%" />
            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Bar dataKey="Progress" name="Progress %" fill="#6366f1" radius={[5, 5, 0, 0]} animationDuration={1200} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PageCard>
  );
}

// ─── Resource Allocation ──────────────────────────────────────────────────────
function ResourceAllocationCard({ workload }) {
  const workloadData = workload.slice(0, 8).map((u) => ({
    name: u.name.split(" ")[0],
    Active: u.activeTaskCount,
    Overdue: u.overdueTaskCount,
  }));
  if (!workloadData.length) return null;
  return (
    <PageCard title="Resource Allocation" subtitle="Active and overdue task load per team member">
      <div className="mt-6 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={workloadData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }} barSize={28} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Bar dataKey="Active" name="Active Tasks" fill="#818cf8" radius={[5, 5, 0, 0]} animationDuration={1200} />
            <Bar dataKey="Overdue" name="Overdue Tasks" fill="#f43f5e" radius={[5, 5, 0, 0]} animationDuration={1400} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PageCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const metrics       = useSelector(selectDashboardMetrics);
  const workload      = useSelector(selectWorkloadMetrics);
  const trendData     = useSelector(selectWeeklyTrend);
  const projectStatus = useSelector(selectProjectStatusData);
  const overdueVsComp = useSelector(selectOverdueVsCompleted);
  const dueSoon       = useSelector(selectDueSoonTasks);
  const projectHealth = useSelector(selectProjectHealth);
  const allTasks      = useSelector((state) => state.work.tasks);
  const allProjects   = useSelector((state) => state.work.projects);
  const currentUser   = useSelector((state) => state.auth.user);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const role        = currentUser?.role ?? "employee";
  const adminView   = isAdmin(currentUser);
  const managerView = isManager(currentUser);
  const empView     = isEmployee(currentUser);

  const pageTitle = adminView ? "Cross-Functional Analytics" : managerView ? "Team Analytics" : "My Performance";
  const pageSubtitle = adminView
    ? "Organisation-wide velocity, workload, and delivery metrics"
    : managerView ? "Delivery metrics for your managed projects and team scope"
    : "Your task completion, deadlines, and personal velocity";

  // Filtered tasks for export
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterProject && t.projectId?.toString() !== filterProject) return false;
      if (filterAssignee && !t.assigneeName?.toLowerCase().includes(filterAssignee.toLowerCase())) return false;
      return true;
    });
  }, [allTasks, filterStatus, filterPriority, filterProject, filterAssignee]);

  const hasFilters = filterStatus || filterPriority || filterProject || filterAssignee;

  const clearFilters = () => {
    setFilterStatus(""); setFilterPriority(""); setFilterProject(""); setFilterAssignee("");
  };

  const handleExportTasks = useCallback(() => {
    const rows = filteredTasks.map((t) => ({
      Title: t.title,
      Status: t.status,
      Priority: t.priority,
      Type: t.type,
      Assignee: t.assigneeName || "",
      Project: t.projectName || "",
      DueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
      CreatedAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
    }));
    exportToCSV("ewms-tasks-export.csv", rows);
  }, [filteredTasks]);

  const handleExportProjects = useCallback(() => {
    const rows = allProjects.map((p) => ({
      Name: p.name,
      Status: p.status,
      Description: p.description || "",
      CreatedAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
    }));
    exportToCSV("ewms-projects-export.csv", rows);
  }, [allProjects]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTasks}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title="Export tasks as CSV"
            >
              <Download className="h-4 w-4" /> Export Tasks
            </button>
            {(adminView || managerView) && (
              <button
                onClick={handleExportProjects}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Download className="h-4 w-4" /> Export Projects
              </button>
            )}
          </div>
        }
      />

      <ScopeBanner role={role} />

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <PageCard className="overflow-visible z-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />

            <select
              className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {["Todo", "In Progress", "Review", "Done"].map((s) => <option key={s}>{s}</option>)}
            </select>

            <select
              className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
            </select>

            {(adminView || managerView) && (
              <select
                className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="">All Projects</option>
                {allProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {filterStatus && <FilterChip label={`Status: ${filterStatus}`} onRemove={() => setFilterStatus("")} />}
              {filterPriority && <FilterChip label={`Priority: ${filterPriority}`} onRemove={() => setFilterPriority("")} />}
              {filterProject && (
                <FilterChip
                  label={`Project: ${allProjects.find((p) => p.id === filterProject)?.name || filterProject}`}
                  onRemove={() => setFilterProject("")}
                />
              )}
              <span className="self-center text-xs text-slate-400">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} match</span>
            </div>
          )}
        </div>
      </PageCard>

      {/* ── KPI Row ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard title={empView ? "My Open Tasks" : "Active Tasks"} value={metrics.pendingTasks}
          insight={metrics.overdueTasks > 0 ? `${metrics.overdueTasks} overdue` : "All on schedule"} icon={CheckCircle2} trend={metrics.completionRate > 50 ? 6 : -4} />
        <InsightCard title="Completion Rate" value={`${metrics.completionRate}%`}
          insight={`${metrics.completedThisWeek} delivered this week`} icon={TrendingUp} trend={metrics.completedThisWeek > 0 ? 8 : 0} />
        <InsightCard title="Overdue Tasks" value={metrics.overdueTasks}
          insight={metrics.overdueTasks === 0 ? "No overdue tasks" : "Needs attention"} icon={AlertTriangle} trend={metrics.overdueTasks > 0 ? -(metrics.overdueTasks * 3) : 0} />
        <InsightCard title="Due This Week" value={dueSoon.length}
          insight={dueSoon.length === 0 ? "Nothing urgent" : `${dueSoon[0]?.title?.slice(0, 22)}…`} icon={Clock} trend={0} />
      </div>

      {/* ── Delivery Trend ─────────────────────────────────────────────── */}
      <DeliveryTrendCard trendData={trendData} />

      {/* ── Donut Charts ──────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DonutChartCard title="Task Status" subtitle="Distribution across workflow stages" data={metrics.statusData} />
        <DonutChartCard title="Priority Mapping" subtitle="Severity analysis across scoped tasks" data={metrics.priorityData} />
        <DonutChartCard title="Task Categories" subtitle="Categorical breakdown of work types" data={metrics.typeData} />
      </div>

      {/* ── Risk vs Delivery ──────────────────────────────────────────── */}
      <OverdueVsCompletedCard data={overdueVsComp} />

      {/* ── Admin/Manager only: Project Performance + Resource Allocation */}
      {(adminView || managerView) && (
        <>
          <ProjectPerformanceCard projectHealth={projectHealth} />
          <ResourceAllocationCard workload={workload} />

          <PageCard title="Key Performance Indicators" subtitle="Macro workspace health signals">
            <div className="mt-4 flex flex-col gap-5">
              {[
                { label: "Overall Completion Rate", value: `${metrics.completionRate}%`, color: "text-emerald-500" },
                { label: "Active Tasks Pending", value: metrics.pendingTasks, color: "text-indigo-500" },
                { label: "Overdue (all priorities)", value: metrics.overdueTasks, color: "text-red-500" },
                { label: "Delivered This Week", value: metrics.completedThisWeek, color: "text-sky-500" },
                { label: "Total Projects", value: metrics.totalProjects, color: "text-violet-500" },
                { label: "Unread Notifications", value: metrics.unreadNotifications, color: "text-amber-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </PageCard>
        </>
      )}

      {/* ── Employee personal summary ──────────────────────────────────── */}
      {empView && (
        <PageCard title="Personal Summary" subtitle="Your workspace at a glance">
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 p-4 text-center border border-indigo-100 dark:border-indigo-500/20">
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.pendingTasks}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Open Tasks</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center border border-emerald-100 dark:border-emerald-500/20">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.completedTasks}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Completed</p>
            </div>
            <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-center border border-red-100 dark:border-red-500/20">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics.overdueTasks}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Overdue</p>
            </div>
          </div>
        </PageCard>
      )}
    </div>
  );
}
