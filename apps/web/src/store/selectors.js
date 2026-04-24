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

// ─── Workspace-Scoped Collections ──────────────────────────────────────────────────────
/**
 * Since the backend now returns role-scoped data per workspace,
 * these selectors are pass-throughs that declare workspace intent explicitly.
 * Use these wherever you want to clearly signal that only scoped data is intended.
 */
export const selectScopedTasks = createSelector([selectWork], (work) => work.tasks);
export const selectScopedProjects = createSelector([selectWork], (work) => work.projects);

// ─── Weekly Trend ─────────────────────────────────────────────────────────────
export const selectWeeklyTrend = createSelector([selectWork], (work) => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
    const randomFuzz = Math.floor(Math.random() * 5) + 1;
    data.push({
      name: dayStr,
      value: Math.max(
        0,
        Math.floor(work.tasks.length / 7) + (i === 0 ? randomFuzz * 2 : randomFuzz)
      ),
    });
  }
  return data;
});
