import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend,
} from "recharts";
import { PageCard, PageHeader } from "../common/components/UI";
import { DonutChartCard, StripMetric, InsightCard, CustomChartTooltip } from "../common/components/Analytics";
import {
  selectDashboardMetrics,
  selectWorkloadMetrics,
  selectWeeklyTrend,
  selectProjectStatusData,
  selectOverdueVsCompleted,
  selectDueSoonTasks,
} from "../../store/selectors";
import { BarChart3, Filter, ShieldAlert, TrendingUp, Clock, CheckCircle2, AlertTriangle, FolderKanban } from "lucide-react";
import { isAdmin, isManager, isEmployee } from "../../lib/permissions";

// ─── Palette for project status colours ──────────────────────────────────────
const PROJECT_STATUS_COLORS = {
  Planning:  "#818cf8",
  Active:    "#10b981",
  "On Hold": "#f59e0b",
  Completed: "#6366f1",
};

// ─── Scoped context banner for non-admins ────────────────────────────────────
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

// ─── KPI Card Row ─────────────────────────────────────────────────────────────
function KpiRow({ metrics, role, dueSoon }) {
  const employee = role === "employee";
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <InsightCard
        title={employee ? "My Open Tasks" : "Active Tasks"}
        value={metrics.pendingTasks}
        insight={metrics.overdueTasks > 0 ? `${metrics.overdueTasks} overdue` : "All on schedule"}
        icon={CheckCircle2}
        trend={metrics.completionRate > 50 ? 6 : -4}
      />
      <InsightCard
        title="Completion Rate"
        value={`${metrics.completionRate}%`}
        insight={`${metrics.completedThisWeek} delivered this week`}
        icon={TrendingUp}
        trend={metrics.completedThisWeek > 0 ? 8 : 0}
      />
      <InsightCard
        title="Overdue Tasks"
        value={metrics.overdueTasks}
        insight={metrics.overdueTasks === 0 ? "No overdue tasks" : "Needs attention"}
        icon={AlertTriangle}
        trend={metrics.overdueTasks > 0 ? -(metrics.overdueTasks * 3) : 0}
      />
      <InsightCard
        title="Due This Week"
        value={dueSoon.length}
        insight={dueSoon.length === 0 ? "Nothing urgent" : `${dueSoon[0]?.title?.slice(0, 22)}…`}
        icon={Clock}
        trend={0}
      />
    </div>
  );
}

// ─── Delivery Trend Card ──────────────────────────────────────────────────────
function DeliveryTrendCard({ trendData }) {
  const totalCreated   = trendData.reduce((a, d) => a + d.created, 0);
  const totalCompleted = trendData.reduce((a, d) => a + d.completed, 0);
  const peak = Math.max(...trendData.map((d) => d.created), 1);

  return (
    <PageCard
      title="Throughput Trajectory"
      subtitle="Tasks created vs completed over the last 7 days"
    >
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
                  <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Area type="monotone" dataKey="created"   name="Created"   stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#gradCreated)"   animationDuration={1200} />
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
              <Bar dataKey="Overdue"   name="Overdue"   fill="#f43f5e" radius={[5, 5, 0, 0]} animationDuration={1400} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageCard>
  );
}

// ─── Project Status Chart ─────────────────────────────────────────────────────
function ProjectStatusCard({ data }) {
  if (!data.length) return null;
  return (
    <PageCard title="Project Portfolio" subtitle="Status breakdown of managed projects">
      <div className="mt-6 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.12} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={70} />
            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Bar
              dataKey="value"
              name="Projects"
              radius={[0, 6, 6, 0]}
              animationDuration={1200}
              label={{ position: "right", fontSize: 11, fill: "#64748b" }}
              fill="#6366f1"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PageCard>
  );
}

// ─── Resource Allocation Bar Chart ────────────────────────────────────────────
function ResourceAllocationCard({ workload }) {
  const workloadData = useMemo(
    () =>
      workload.slice(0, 8).map((u) => ({
        name: u.name.split(" ")[0],
        Active: u.activeTaskCount,
        Overdue: u.overdueTaskCount,
      })),
    [workload]
  );
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
            <Bar dataKey="Active"  name="Active Tasks"  fill="#818cf8" radius={[5, 5, 0, 0]} animationDuration={1200} />
            <Bar dataKey="Overdue" name="Overdue Tasks" fill="#f43f5e" radius={[5, 5, 0, 0]} animationDuration={1400} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PageCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const metrics         = useSelector(selectDashboardMetrics);
  const workload        = useSelector(selectWorkloadMetrics);
  const trendData       = useSelector(selectWeeklyTrend);
  const projectStatus   = useSelector(selectProjectStatusData);
  const overdueVsComp   = useSelector(selectOverdueVsCompleted);
  const dueSoon         = useSelector(selectDueSoonTasks);
  const currentUser     = useSelector((state) => state.auth.user);

  const [filterMode, setFilterMode] = useState("all");

  const role = currentUser?.role ?? "employee";
  const adminView   = isAdmin(currentUser);
  const managerView = isManager(currentUser);
  const empView     = isEmployee(currentUser);

  const pageTitle = adminView
    ? "Cross-Functional Analytics"
    : managerView
    ? "Team Analytics"
    : "My Performance";

  const pageSubtitle = adminView
    ? "Organisation-wide velocity, workload, and delivery metrics"
    : managerView
    ? "Delivery metrics for your managed projects and team scope"
    : "Your task completion, deadlines, and personal velocity";

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900/50 shadow-sm backdrop-blur">
            <Filter className="h-4 w-4" />
            <select
              className="bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="all">Last 7 Days</option>
              <option value="quarter">This Quarter</option>
              <option value="year">Year to Date</option>
            </select>
          </div>
        }
      />

      {/* Scope context banner */}
      <ScopeBanner role={role} />

      {/* KPI Row */}
      <KpiRow metrics={metrics} role={role} dueSoon={dueSoon} />

      {/* Delivery Trend — dual line (created vs completed) */}
      <DeliveryTrendCard trendData={trendData} />

      {/* Donut Charts Row — Task distribution */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DonutChartCard
          title="Task Status"
          subtitle="Distribution across workflow stages"
          data={metrics.statusData}
        />
        <DonutChartCard
          title="Priority Mapping"
          subtitle="Severity analysis across scoped tasks"
          data={metrics.priorityData}
        />
        <DonutChartCard
          title="Task Categories"
          subtitle="Categorical breakdown of work types"
          data={metrics.typeData}
        />
      </div>

      {/* Project Portfolio Status — admin/manager only */}
      {(adminView || managerView) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProjectStatusCard data={projectStatus} />

          {/* KPI summary panel */}
          <PageCard title="Key Performance Indicators" subtitle="Macro workspace health signals">
            <div className="mt-4 flex flex-col gap-5">
              {[
                { label: "Overall Completion Rate", value: `${metrics.completionRate}%`, color: "text-emerald-500" },
                { label: "Active Tasks Pending",    value: metrics.pendingTasks,          color: "text-indigo-500" },
                { label: "Overdue (all priorities)", value: metrics.overdueTasks,          color: "text-red-500" },
                { label: "Delivered This Week",     value: metrics.completedThisWeek,     color: "text-sky-500" },
                { label: "Unread Notifications",    value: metrics.unreadNotifications,   color: "text-amber-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </PageCard>
        </div>
      )}

      {/* Risk vs Delivery grouped bar */}
      <OverdueVsCompletedCard data={overdueVsComp} />

      {/* Resource Allocation — admin / manager only */}
      {(adminView || managerView) && workload.length > 0 && (
        <ResourceAllocationCard workload={workload} />
      )}

      {/* Employee personal summary */}
      {empView && (
        <PageCard title="Personal Summary" subtitle="Your workspace at a glance">
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.pendingTasks}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Open Tasks</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.completedTasks}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Completed</p>
            </div>
            <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-center">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics.overdueTasks}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Overdue</p>
            </div>
          </div>
        </PageCard>
      )}
    </div>
  );
}
