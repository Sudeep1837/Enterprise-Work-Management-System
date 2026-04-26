import { createSelector } from "@reduxjs/toolkit";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES } from "../constants/roles";

const selectWork = (state) => state.work;
const selectAuth = (state) => state.auth;
const selectProjects = (state) => state.work.projects;
const selectTasks = (state) => state.work.tasks;
const selectUsers = (state) => state.work.users;
const selectNotifications = (state) => state.work.notifications;

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return (entity.id || entity._id || "").toString();
};

const makeEntityMap = (items) =>
  new Map((items || []).map((item) => [getEntityId(item), item]).filter(([id]) => Boolean(id)));

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export const selectDashboardMetrics = createSelector([selectProjects, selectTasks, selectNotifications], (projects, tasks, notifications) => {
  const now = new Date();
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Done"
  );
  const completed = tasks.filter((t) => t.status === "Done");

  // Tasks completed this week (updatedAt within 7 days and status Done)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const completedThisWeek = completed.filter(
    (t) => t.updatedAt && new Date(t.updatedAt) >= weekAgo
  );

  return {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks: completed.length,
    pendingTasks: tasks.length - completed.length,
    overdueTasks: overdue.length,
    completedThisWeek: completedThisWeek.length,
    unreadNotifications: notifications.filter((n) => !n.read).length,
    statusData: TASK_STATUSES.map((status) => ({
      name: status,
      value: tasks.filter((t) => t.status === status).length,
    })),
    priorityData: TASK_PRIORITIES.map((priority) => ({
      name: priority,
      value: tasks.filter((t) => t.priority === priority).length,
    })),
    typeData: TASK_TYPES.map((type) => ({
      name: type,
      value: tasks.filter((t) => t.type === type).length,
    })),
    completionRate: tasks.length
      ? Math.round((completed.length / tasks.length) * 100)
      : 0,
  };
});

// ─── Project Health ───────────────────────────────────────────────────────────
export const selectProjectHealth = createSelector([selectProjects, selectTasks], (projects, tasks) => {
  return projects.map((project) => {
    const projectTasks = tasks.filter(
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

export const selectKanbanColumns = createSelector(
  [selectTasks, selectProjects, selectUsers],
  (tasks, projects, users) => {
    const projectById = makeEntityMap(projects);
    const userById = makeEntityMap(users);

    const cards = tasks.map((task) => {
      const project = projectById.get(getEntityId(task.projectId));
      const assignee = userById.get(getEntityId(task.assigneeId));

      return {
        ...task,
        displayProjectName: project?.name || task.projectName || "",
        displayAssigneeName: assignee?.name || task.assigneeName || "Unassigned",
      };
    });

    return TASK_STATUSES.map((status) => ({
      status,
      tasks: cards.filter((task) => task.status === status),
    }));
  }
);

export const selectResolvedNotifications = createSelector(
  [selectNotifications, selectUsers, selectAuth],
  (notifications, users, auth) => {
    const userById = makeEntityMap(users);
    const currentUserId = getEntityId(auth.user);

    return notifications.map((notification) => {
      const actorId = getEntityId(notification.actorId);
      const populatedActor =
        notification.actorId && typeof notification.actorId === "object"
          ? notification.actorId
          : null;
      const actor =
        (actorId && actorId === currentUserId ? auth.user : null) ||
        userById.get(actorId) ||
        populatedActor;

      return {
        ...notification,
        actorName: actor?.name || notification.actorName,
      };
    });
  }
);

// ─── Workload Metrics ─────────────────────────────────────────────────────────
export const selectWorkloadMetrics = createSelector([selectUsers, selectTasks], (users, tasks) => {
  if (!users || !users.length) return [];

  return users
    .map((user) => {
      const activeTasks = tasks.filter(
        (t) => t.assigneeId?.toString() === user.id?.toString() && t.status !== "Done"
      );
      const completedTasks = tasks.filter(
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
export const selectDueSoonTasks = createSelector([selectTasks, selectAuth], (tasks, auth) => {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);
  const userId = auth.user?.id || auth.user?._id;

  return tasks
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
export const selectProjectStatusData = createSelector([selectProjects], (projects) => {
  const statuses = ["Planning", "Active", "On Hold", "Completed"];
  return statuses
    .map((s) => ({
      name: s,
      value: projects.filter((p) => p.status === s).length,
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
export const selectWeeklyTrend = createSelector([selectTasks], (tasks) => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const dayStr = start.toLocaleDateString("en-US", { weekday: "short" });

    const created = tasks.filter((t) => {
      if (!t.createdAt) return false;
      const d = new Date(t.createdAt);
      return d >= start && d <= end;
    }).length;

    const completed = tasks.filter((t) => {
      if (t.status !== "Done" || !t.updatedAt) return false;
      const d = new Date(t.updatedAt);
      return d >= start && d <= end;
    }).length;

    data.push({ name: dayStr, created, completed, value: completed });
  }
  return data;
});

// ─── Overdue vs Completed Bar Data ────────────────────────────────────────────
export const selectOverdueVsCompleted = createSelector([selectTasks], (tasks) => {
  const now = new Date();
  return TASK_PRIORITIES.map((priority) => {
    const priorityTasks = tasks.filter((t) => t.priority === priority);
    return {
      name: priority,
      Completed: priorityTasks.filter((t) => t.status === "Done").length,
      Overdue: priorityTasks.filter(
        (t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < now
      ).length,
    };
  });
});
