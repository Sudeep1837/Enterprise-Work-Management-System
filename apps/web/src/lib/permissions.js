/**
 * Centralized authorization utilities for the frontend UI.
 * Mirrors backend logic to hide/disable UI elements appropriately.
 *
 * Manager scope rule (identical to backend):
 *   Manager can act if target is in same team OR is a project member
 *   of a project the manager owns.
 *
 * All role comparisons use lowercase strings.
 */

export const isAdmin   = (user) => user?.role === "admin";
export const isManager = (user) => user?.role === "manager";
export const isEmployee = (user) => user?.role === "employee";

// ─── Manager scope helper ─────────────────────────────────────────────────────
function managerCanScopeUser(managerUser, targetUser, project) {
  // Same-team scope
  if (
    targetUser?.team &&
    managerUser?.team &&
    targetUser.team === managerUser.team
  ) return true;

  // Project-member scope
  const managerId = managerUser?.id || managerUser?._id?.toString();
  const targetId  = targetUser?.id  || targetUser?._id?.toString();
  if (
    project &&
    (project.ownerId?._id || project.ownerId)?.toString() === managerId &&
    project.members?.some((id) => (id._id || id).toString() === targetId)
  ) return true;

  return false;
}

// ─── Project Permissions ──────────────────────────────────────────────────────
export const canManageProject = (user, project) => {
  if (!user || !project) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    const userId  = user.id || user._id;
    const ownerId = project.ownerId?._id || project.ownerId;
    return ownerId && ownerId.toString() === userId?.toString();
  }
  return false;
};

export const canDeleteProject = (user, project) => {
  return canManageProject(user, project);
};

export const canCreateProject = (user) => {
  if (!user) return false;
  return isAdmin(user) || isManager(user);
};

// ─── Task Permissions ─────────────────────────────────────────────────────────
export const canDeleteTask = (user, task, project) => {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    const userId   = user.id || user._id?.toString();
    const ownerId  = project?.ownerId?._id || project?.ownerId;
    const reporter = task.reporterId?._id  || task.reporterId;
    if (ownerId  && ownerId.toString()  === userId) return true;
    if (reporter && reporter.toString() === userId) return true;
  }
  return false;
};

export const canMoveTask = (user, task, project) => {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;

  const userId = user.id || user._id?.toString();

  if (isManager(user)) {
    const ownerId  = project?.ownerId?._id || project?.ownerId;
    const members  = project?.members || [];
    const reporter = task.reporterId?._id  || task.reporterId;
    const assignee = task.assigneeId?._id  || task.assigneeId;

    if (ownerId  && ownerId.toString()  === userId) return true;
    if (members.some((id) => (id._id || id).toString() === userId)) return true;
    if (reporter && reporter.toString() === userId) return true;
    if (assignee && assignee.toString() === userId) return true;
  }

  if (isEmployee(user)) {
    const assignee = task.assigneeId?._id || task.assigneeId;
    if (assignee && assignee.toString() === userId) return true;
  }

  return false;
};

export const canUpdateTask = (user, task, project) => {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;

  const userId = user.id || user._id?.toString();

  if (isManager(user)) {
    const ownerId  = project?.ownerId?._id || project?.ownerId;
    const members  = project?.members || [];
    const reporter = task.reporterId?._id  || task.reporterId;
    const assignee = task.assigneeId?._id  || task.assigneeId;

    if (ownerId  && ownerId.toString()  === userId) return true;
    if (members.some((id) => (id._id || id).toString() === userId)) return true;
    if (reporter && reporter.toString() === userId) return true;
    if (assignee && assignee.toString() === userId) return true;
  }

  if (isEmployee(user)) {
    const assignee = task.assigneeId?._id || task.assigneeId;
    if (assignee && assignee.toString() === userId) return true;
  }

  return false;
};

// ─── Assignment Permissions ───────────────────────────────────────────────────
export const canAssignTaskToUser = (currentUser, targetUser, project) => {
  if (!currentUser) return false;
  // Unassign is always allowed if user can edit the task
  if (!targetUser) return true;

  if (isAdmin(currentUser)) return true;

  const currentId = currentUser.id || currentUser._id?.toString();
  const targetId  = targetUser.id  || targetUser._id?.toString();

  if (isManager(currentUser)) {
    // Self-assign
    if (targetId === currentId) return true;
    // Explicit manager scope
    return managerCanScopeUser(currentUser, targetUser, project);
  }

  if (isEmployee(currentUser)) {
    // Employee can only self-assign
    return targetId === currentId;
  }

  return false;
};

// ─── User Management Permissions ─────────────────────────────────────────────
/**
 * Can currentUser edit targetUser?
 * Admin: always. Manager: only users in same team. Self: own profile.
 */
export const canEditUser = (currentUser, targetUser) => {
  if (!currentUser) return false;
  if (isAdmin(currentUser)) return true;

  const currentId = currentUser.id || currentUser._id?.toString();
  const targetId  = targetUser?.id || targetUser?._id?.toString();

  // Self edit
  if (targetId === currentId) return true;

  // Manager can edit employees in their team
  if (isManager(currentUser)) {
    return (
      targetUser?.team &&
      currentUser.team &&
      targetUser.team === currentUser.team
    );
  }

  return false;
};

export const canDeactivateUser = (currentUser) => {
  return isAdmin(currentUser);
};
