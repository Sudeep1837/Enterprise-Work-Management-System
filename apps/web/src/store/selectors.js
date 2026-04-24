import { createSelector } from "@reduxjs/toolkit";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES } from "../constants/roles";

const selectWork = (state) => state.work;
const selectAuth = (state) => state.auth;

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export const selectDashboardMetrics = createSelector([selectWork], (work) => {
  const now = new Date();
  const overdue = work.tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Done"
  );
  const completed = work.tasks.filter((t) => t.status === "Done");

  // Tasks completed this week (updatedAt within 7 days and status Done)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const completedThisWeek = completed.filter(
    (t) => t.updatedAt && new Date(t.updatedAt) >= weekAgo
  );

  return {
    totalProjects: work.projects.length,
    totalTasks: work.tasks.length,
    completedTasks: completed.length,
    pendingTasks: work.tasks.length - completed.length,
    overdueTasks: overdue.length,
    completedThisWeek: completedThisWeek.length,
    unreadNotifications: work.notifications.filter((n) => !n.read).length,
    statusData: TASK_STATUSES.map((status) => ({
      name: status,
      value: work.tasks.filter((t) => t.status === status).length,
    })),
    priorityData: TASK_PRIORITIES.map((priority) => ({
      name: priority,
      value: work.tasks.filter((t) => t.priority === priority).length,
    })),
    typeData: TASK_TYPES.map((type) => ({
      name: type,
      value: work.tasks.filter((t) => t.type === type).length,
    })),
    completionRate: work.tasks.length
      ? Math.round((completed.length / work.tasks.length) * 100)
      : 0,
  };
});

// ─── Project Health ───────────────────────────────────────────────────────────
export const selectProjectHealth = createSelector([selectWork], (work) => {
  return work.projects.map((project) => {
    const projectTasks = work.tasks.filter(
      (t) => t.projectId?.toString() === project.id?.toString()
    );
    const completed = projectTasks.filter((t) => t.status === "Done").length;
    const progress = projectTasks.length
      ? Math.round((completed / projectTasks.length) * 100)
      : 0;

    return {
      ...project,
      taskCount: projectTasks.length,
      completedCount: completed,
      progress,
      health: progress >= 75 ? "excellent" : progress >= 40 ? "good" : "at-risk",
    };
  });
});

// ─── At-Risk Projects ─────────────────────────────────────────────────────────
export const selectAtRiskProjects = createSelector(
  [selectProjectHealth],
  (projectHealth) =>
    projectHealth
      .filter((p) => p.health === "at-risk" && p.taskCount > 0 && p.status !== "Completed")
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 3)
);

// ─── Overdue Critical Tasks ───────────────────────────────────────────────────
export const selectOverdueCriticalTasks = createSelector([selectWork], (work) => {
  const now = new Date();
  return work.tasks
    .filter(
      (t) =>
        t.status !== "Done" &&
        (t.priority === "Critical" || t.priority === "High") &&
        t.dueDate &&
        new Date(t.dueDate) < now
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);
});

// ─── Bottleneck Stage ─────────────────────────────────────────────────────────
export const selectBottleneckStage = createSelector([selectWork], (work) => {
  const counts = TASK_STATUSES.map((status) => ({
    status,
    count: work.tasks.filter((t) => t.status === status && status !== "Done").length,
  })).filter((s) => s.status !== "Done");

  const bottleneck = counts.reduce(
    (max, s) => (s.count > max.count ? s : max),
    { status: null, count: 0 }
  );
  return bottleneck;
});

// ─── Kanban Metrics ───────────────────────────────────────────────────────────
export const selectKanbanMetrics = createSelector([selectWork], (work) => {
  const tasks = work.tasks;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const review = tasks.filter((t) => t.status === "Review").length;
  const done = tasks.filter((t) => t.status === "Done").length;

  return {
    totalActive: tasks.filter((t) => t.status !== "Done").length,
    inProgress,
    bottlenecks: review,
    done,
    velocity: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
  };
});

// ─── Workload Metrics ─────────────────────────────────────────────────────────
export const selectWorkloadMetrics = createSelector([selectWork], (work) => {
  if (!work.users || !work.users.length) return [];

  return work.users
    .map((user) => {
      const activeTasks = work.tasks.filter(
        (t) => t.assigneeId?.toString() === user.id?.toString() && t.status !== "Done"
      );
      const completedTasks = work.tasks.filter(
        (t) => t.assigneeId?.toString() === user.id?.toString() && t.status === "Done"
      );
      const overdueTasks = activeTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date()
      );

      return {
        ...user,
        activeTaskCount: activeTasks.length,
        completedTaskCount: completedTasks.length,
        overdueTaskCount: overdueTasks.length,
        workloadScore: activeTasks.length + overdueTasks.length * 2,
      };
    })
    .sort((a, b) => b.workloadScore - a.workloadScore);
});

// ─── My Tasks (for Employee role-based view) ────────────────────────────────────
export const selectMyTasks = createSelector([selectWork, selectAuth], (work, auth) => {
  if (!auth.user) return [];
  const userId = auth.user.id || auth.user._id;
  return work.tasks.filter(
    (t) => t.assigneeId?.toString() === userId?.toString() && t.status !== "Done"
  );
});

// ─── Tasks Due Soon (next 7 days, not Done) ───────────────────────────────────
export const selectDueSoonTasks = createSelector([selectWork, selectAuth], (work, auth) => {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);
  const userId = auth.user?.id || auth.user?._id;

  return work.tasks
    .filter((t) => {
      if (!t.dueDate || t.status === "Done") return false;
      const due = new Date(t.dueDate);
      if (due < now || due > cutoff) return false;
      // For employees: only their own tasks
      if (auth.user?.role === "employee") {
        return t.assigneeId?.toString() === userId?.toString();
      }
      return true;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);
});

// ─── Workspace-Scoped Collections ──────────────────────────────────────────────
/**
 * Since the backend now returns role-scoped data per workspace,
 * these selectors are pass-throughs that declare workspace intent explicitly.
 */
export const selectScopedTasks = createSelector([selectWork], (work) => work.tasks);
export const selectScopedProjects = createSelector([selectWork], (work) => work.projects);

// ─── Project Status Distribution ──────────────────────────────────────────────
export const selectProjectStatusData = createSelector([selectWork], (work) => {
  const statuses = ["Planning", "Active", "On Hold", "Completed"];
  return statuses
    .map((s) => ({
      name: s,
      value: work.projects.filter((p) => p.status === s).length,
    }))
    .filter((s) => s.value > 0);
});

// ─── Weekly Trend (REAL — computed from actual task timestamps) ───────────────
/**
 * For each of the last 7 days:
 *  - `created`: tasks with createdAt on that calendar day
 *  - `completed`: tasks with status=Done and updatedAt on that calendar day
 *  - `value`: completed count (used as the primary series for backwards compat)
 *
 * No Math.random(). Data reflects the actual workspace state.
 */
export const selectWeeklyTrend = createSelector([selectWork], (work) => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const dayStr = start.toLocaleDateString("en-US", { weekday: "short" });

    const created = work.tasks.filter((t) => {
      if (!t.createdAt) return false;
      const d = new Date(t.createdAt);
      return d >= start && d <= end;
    }).length;

    const completed = work.tasks.filter((t) => {
      if (t.status !== "Done" || !t.updatedAt) return false;
      const d = new Date(t.updatedAt);
      return d >= start && d <= end;
    }).length;

    data.push({ name: dayStr, created, completed, value: completed });
  }
  return data;
});

// ─── Overdue vs Completed Bar Data ────────────────────────────────────────────
export const selectOverdueVsCompleted = createSelector([selectWork], (work) => {
  const now = new Date();
  return TASK_PRIORITIES.map((priority) => {
    const priorityTasks = work.tasks.filter((t) => t.priority === priority);
    return {
      name: priority,
      Completed: priorityTasks.filter((t) => t.status === "Done").length,
      Overdue: priorityTasks.filter(
        (t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < now
      ).length,
    };
  });
});
