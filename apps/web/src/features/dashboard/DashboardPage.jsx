import { useSelector } from "react-redux";
import { PageHeader, PageCard, Badge } from "../common/components/UI";
import { InsightCard, DonutChartCard, MiniTrendChart, StripMetric } from "../common/components/Analytics";
import {
  selectDashboardMetrics,
  selectWeeklyTrend,
  selectProjectHealth,
  selectWorkloadMetrics,
  selectAtRiskProjects,
  selectOverdueCriticalTasks,
  selectBottleneckStage,
  selectMyTasks,
  selectDueSoonTasks,
} from "../../store/selectors";
import {
  FolderKanban, CheckSquare, Target, Activity,
  CheckCircle2, AlertTriangle, Clock, Flame,
  TrendingDown, User, Zap, MessageSquare, ArrowRight, Radio,
  Archive, Trash2, UserCheck,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = new Date() - new Date(dateStr);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysOverdue(dateStr) {
  const diff = new Date() - new Date(dateStr);
  return Math.floor(diff / 86400000);
}

// ─── sub-components ───────────────────────────────────────────────────────────
function AtRiskCard({ projects }) {
  if (!projects.length) return null;
  return (
    <PageCard title="⚠ Projects At Risk" subtitle="Low completion, action required">
      <div className="space-y-3 mt-2">
        {projects.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
              <p className="text-xs text-slate-500">{p.taskCount} tasks · {p.completedCount} done</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{p.progress}%</p>
              </div>
              <Badge value="At Risk" tone="amber" />
            </div>
          </div>
        ))}
      </div>
    </PageCard>
  );
}

function OverdueTasksCard({ tasks }) {
  if (!tasks.length) return null;
  return (
    <PageCard title="🔥 Overdue Critical Tasks" subtitle="High-priority tasks past due date">
      <div className="space-y-2 mt-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl bg-red-50/60 dark:bg-red-500/5 border border-red-200/60 dark:border-red-500/20 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.title}</p>
              <p className="text-xs text-slate-500">{t.projectName || "No project"} · {t.assigneeName || "Unassigned"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{daysOverdue(t.dueDate)}d overdue</p>
              <Badge value={t.priority} tone="red" />
            </div>
          </div>
        ))}
      </div>
    </PageCard>
  );
}

function MyTasksCard({ tasks }) {
  return (
    <PageCard title="My Open Tasks" subtitle="Tasks currently assigned to you">
      {!tasks.length ? (
        <p className="mt-4 text-sm text-slate-500 text-center py-6">No active tasks assigned to you 🎉</p>
      ) : (
        <div className="space-y-2 mt-2">
          {tasks.slice(0, 5).map((t) => {
            const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 dark:border-white/10 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</p>
                  {t.projectName && <p className="text-xs text-indigo-500">{t.projectName}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {t.dueDate && (
                    <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                      <Clock className="h-3 w-3" />
                      {isOverdue ? `${daysOverdue(t.dueDate)}d overdue` : new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <Badge value={t.priority} tone={t.priority === "Critical" ? "red" : t.priority === "High" ? "amber" : "indigo"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageCard>
  );
}

function getManagerInfo(user) {
  const manager = user?.managerId;
  return manager && typeof manager === "object" && manager.name ? manager : null;
}

function WorkingUnderCard({ user }) {
  const manager = getManagerInfo(user);

  return (
    <PageCard title="Working Under" subtitle="Your reporting relationship">
      <div className="mt-2 flex items-center gap-4 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-slate-800/30">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          manager
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
        }`}>
          <UserCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Reports To
          </p>
          <p className="mt-0.5 truncate text-base font-bold text-slate-900 dark:text-white">
            {manager?.name || "Unassigned"}
          </p>
          {manager ? (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {[manager.email, manager.team].filter(Boolean).join(" · ")}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              No reporting manager is currently assigned.
            </p>
          )}
        </div>
      </div>
    </PageCard>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const metrics        = useSelector(selectDashboardMetrics);
  const trendData      = useSelector(selectWeeklyTrend);
  const projectHealth  = useSelector(selectProjectHealth);
  const workload       = useSelector(selectWorkloadMetrics);
  const atRisk         = useSelector(selectAtRiskProjects);
  const overdueCritical = useSelector(selectOverdueCriticalTasks);
  const bottleneck     = useSelector(selectBottleneckStage);
  const myTasks        = useSelector(selectMyTasks);
  const dueSoon        = useSelector(selectDueSoonTasks);
  const activity       = useSelector((state) => state.work.activity);
  const authUser       = useSelector((state) => state.auth.user);

  const role           = authUser?.role || "employee";
  const isAdmin        = role === "admin";
  const isManager      = role === "manager";

  const highestWorkload = workload[0] ?? null;
  const recentProject   = [...projectHealth].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  )[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin ? "Command Center" : isManager ? "Team Operations" : "My Workspace"}
        subtitle={
          isAdmin
            ? "Organisation-wide execution overview"
            : isManager
            ? "Project and team delivery status"
            : "Your tasks, deadlines and workload"
        }
        icon={isAdmin ? Target : isManager ? FolderKanban : CheckSquare}
      />

      {/* ── Insight KPI Row ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin || isManager ? (
          <>
            <InsightCard
              title="Active Execution"
              value={metrics.pendingTasks}
              insight={metrics.overdueTasks > 0 ? `${metrics.overdueTasks} tasks overdue` : "All on schedule"}
              icon={Activity}
              trend={metrics.completionRate > 50 ? 12 : -4}
            />
            <InsightCard
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              insight={`${metrics.completedThisWeek} delivered this week`}
              icon={CheckCircle2}
              trend={metrics.completedThisWeek > 0 ? 8 : 0}
            />
            <InsightCard
              title="Team Workload"
              value={highestWorkload ? highestWorkload.activeTaskCount : 0}
              insight={highestWorkload ? `Highest: ${highestWorkload.name}` : "No assignments"}
              icon={User}
            />
            <InsightCard
              title="Bottleneck Stage"
              value={bottleneck.count}
              insight={bottleneck.status ? `${bottleneck.count} tasks in "${bottleneck.status}"` : "No bottleneck"}
              icon={Zap}
              trend={bottleneck.count > 3 ? -8 : 0}
            />
          </>
        ) : (
          /* Employee: personal-focused KPI row */
          <>
            <InsightCard
              title="My Open Tasks"
              value={myTasks.length}
              insight={myTasks.length === 0 ? "All clear! 🎉" : `${metrics.overdueTasks} overdue`}
              icon={Activity}
              trend={metrics.overdueTasks > 0 ? -6 : 4}
            />
            <InsightCard
              title="Completed Tasks"
              value={metrics.completedTasks}
              insight={`${metrics.completedThisWeek} this week`}
              icon={CheckCircle2}
              trend={metrics.completedThisWeek > 0 ? 10 : 0}
            />
            <InsightCard
              title="Due This Week"
              value={dueSoon.length}
              insight={dueSoon.length === 0 ? "Nothing urgent" : `Next: ${dueSoon[0]?.title?.slice(0, 18)}…`}
              icon={Clock}
              trend={dueSoon.length > 3 ? -5 : 0}
            />
            <InsightCard
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              insight="Personal delivery rate"
              icon={Zap}
              trend={metrics.completionRate > 60 ? 8 : 0}
            />
          </>
        )}
      </div>


      {/* ── Role-specific risk / personal view ──────────────────────────── */}
      {(isAdmin || isManager) && (atRisk.length > 0 || overdueCritical.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {atRisk.length > 0 && <AtRiskCard projects={atRisk} />}
          {overdueCritical.length > 0 && <OverdueTasksCard tasks={overdueCritical} />}
        </div>
      )}

      {/* Employee: hierarchy and personal tasks */}
      {!isAdmin && !isManager && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <WorkingUnderCard user={authUser} />
          <MyTasksCard tasks={myTasks} />
        </div>
      )}

      {/* ── Analytics + Activity ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <DonutChartCard
              title="Execution Status"
              subtitle="Tasks by column"
              data={metrics.statusData}
            />
            <DonutChartCard
              title="Priority Distribution"
              subtitle="Tasks by urgency"
              data={metrics.priorityData}
            />
          </div>

          <PageCard title="Delivery Trend" subtitle="Task output over 7 days">
            <div className="h-[250px] w-full mt-4 flex items-end justify-between gap-4">
              <div className="flex flex-col gap-8 mb-4">
                <StripMetric label="7-Day Output" value={trendData.reduce((a, d) => a + d.value, 0)} sub="Tasks" />
                <StripMetric label="Peak Velocity" value={Math.max(...trendData.map((d) => d.value))} sub="Tasks/day" />
              </div>
              <div className="h-full flex-1">
                <MiniTrendChart data={trendData} color="#10b981" />
              </div>
            </div>
          </PageCard>
        </div>

        {/* Sidebar: Project Health + Telemetry */}
        <div className="space-y-6">
          {/* Project Health */}
          <PageCard title="Project Health" subtitle="Completion overview">
            <div className="space-y-3 mt-2">
              {projectHealth.length === 0 ? (
                <p className="text-sm text-slate-500">No projects yet</p>
              ) : (
                projectHealth.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.health === "excellent"
                              ? "bg-emerald-500"
                              : p.health === "good"
                              ? "bg-indigo-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${
                      p.health === "excellent" ? "text-emerald-500" : p.health === "good" ? "text-indigo-500" : "text-amber-500"
                    }`}>
                      {p.progress}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </PageCard>

          {/* Workspace Telemetry */}
          <PageCard title="Workspace Telemetry" subtitle="Live operational feed" className="min-h-[320px]">
            {activity.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Radio className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No activity yet</p>
                  <p className="text-xs text-slate-400 mt-1">Events will appear here as your team works</p>
                </div>
              </div>
            ) : (
              <div className="relative mt-4 space-y-0 before:absolute before:inset-0 before:ml-[15px] before:h-full before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                {activity.slice(0, 10).map((item) => {
                  // Determine icon + color by action type
                  let Icon = Activity;
                  let iconBg = "bg-slate-100 dark:bg-slate-800";
                  let iconText = "text-slate-500";

                  const action = item.action || "";
                  const normalizedAction = action.toLowerCase();
                  if (normalizedAction.includes("deleted") || normalizedAction.includes("removed")) {
                    Icon = Trash2; iconBg = "bg-red-100 dark:bg-red-500/20"; iconText = "text-red-600 dark:text-red-400";
                  } else if (normalizedAction.includes("archived")) {
                    Icon = Archive; iconBg = "bg-amber-100 dark:bg-amber-500/20"; iconText = "text-amber-600 dark:text-amber-400";
                  } else if (action === "Task Completed") {
                    Icon = CheckCircle2; iconBg = "bg-emerald-100 dark:bg-emerald-500/20"; iconText = "text-emerald-600 dark:text-emerald-400";
                  } else if (action === "Task Moved") {
                    Icon = ArrowRight; iconBg = "bg-sky-100 dark:bg-sky-500/20"; iconText = "text-sky-600 dark:text-sky-400";
                  } else if (action === "Task Created") {
                    Icon = CheckSquare; iconBg = "bg-indigo-100 dark:bg-indigo-500/20"; iconText = "text-indigo-600 dark:text-indigo-400";
                  } else if (action === "Task Updated") {
                    Icon = CheckSquare; iconBg = "bg-violet-100 dark:bg-violet-500/20"; iconText = "text-violet-600 dark:text-violet-400";
                  } else if (action === "Comment Added") {
                    Icon = MessageSquare; iconBg = "bg-amber-100 dark:bg-amber-500/20"; iconText = "text-amber-600 dark:text-amber-400";
                  } else if (action === "Project Created" || action === "Project Updated") {
                    Icon = FolderKanban; iconBg = "bg-emerald-100 dark:bg-emerald-500/20"; iconText = "text-emerald-600 dark:text-emerald-400";
                  }

                  // Build human-readable text: prefer rich metadata text
                  const displayText = item.metadata?.richText
                    || (item.actorName && item.entityName
                        ? `${item.actorName} ${(action || "").toLowerCase()} "${item.entityName}"`
                        : item.action || "System event");

                  return (
                    <div key={item.id} className="relative flex items-start gap-3 mb-5 last:mb-0">
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 ${iconBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${iconText}`} />
                      </div>
                      <div className="flex-1 pt-0.5 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                          {displayText}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{relativeTime(item.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PageCard>
        </div>
      </div>

      {/* ── Workload Intelligence (Admin / Manager only) ─────────────────── */}
      {(isAdmin || isManager) && workload.length > 0 && (
        <PageCard title="Team Workload Distribution" subtitle="Active task load per member">
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workload.slice(0, 6).map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200/60 dark:border-white/10 px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-bold">
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                  <p className="text-xs text-slate-500">
                    {u.activeTaskCount} active · {u.overdueTaskCount > 0 && (
                      <span className="text-red-500 font-medium">{u.overdueTaskCount} overdue</span>
                    )}
                    {u.overdueTaskCount === 0 && "on track"}
                  </p>
                </div>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                  u.workloadScore > 8
                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    : u.workloadScore > 4
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                }`}>
                  {u.workloadScore > 8 ? "Heavy" : u.workloadScore > 4 ? "Moderate" : "Light"}
                </div>
              </div>
            ))}
          </div>
        </PageCard>
      )}
    </div>
  );
}
