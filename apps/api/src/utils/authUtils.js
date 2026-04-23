/**
 * Centralized authorization utilities for the backend.
 *
 * Manager scope rule (applied consistently everywhere):
 * A manager can act on a target if ANY of these is true:
 *   1. target.team === manager.team  (same-team scope)
 *   2. target is a member of a project the manager owns  (project-member scope)
 *
 * Admin overrides all checks.
 * Employee scope is restricted to self-only actions.
 */

// ─── Basic Role Checks ────────────────────────────────────────────────────────
export const isAdmin   = (user) => user?.role === "admin";
export const isManager = (user) => user?.role === "manager";
export const isEmployee = (user) => user?.role === "employee";

// ─── Manager scope helper ─────────────────────────────────────────────────────
/**
 * Returns true if the manager's scope covers the targetUser.
 * scope = same team OR targetUser is in a project the manager owns.
 */
function managerCanScopeUser(managerUser, targetUser, project) {
  // Same-team scope
  if (
    targetUser?.team &&
    managerUser?.team &&
    targetUser.team === managerUser.team
  ) return true;

  // Project-member scope: target is in a project the manager owns
  if (
    project &&
    project.ownerId &&
    project.ownerId.toString() === managerUser.sub &&
    project.members &&
    project.members.some(
      (id) => id.toString() === (targetUser?.id || targetUser?._id?.toString())
    )
  ) return true;

  return false;
}

// ─── Project Permissions ──────────────────────────────────────────────────────
export const canManageProject = (user, project) => {
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    // Manager can only manage projects they own
    return project.ownerId && project.ownerId.toString() === user.sub;
  }
  return false;
};

export const canDeleteProject = (user, project) => {
  return canManageProject(user, project);
};

// ─── Task Permissions ─────────────────────────────────────────────────────────
export const canDeleteTask = (user, task, project) => {
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    // Manager owns the project
    if (project && project.ownerId && project.ownerId.toString() === user.sub) return true;
    // Manager is the reporter of the task
    if (task && task.reporterId && task.reporterId.toString() === user.sub) return true;
  }
  // Employees cannot delete tasks
  return false;
};

export const canMoveTask = (user, task, project) => {
  if (isAdmin(user)) return true;

  const userId = user.sub;

  if (isManager(user)) {
    // Manager owns the project
    if (project && project.ownerId && project.ownerId.toString() === userId) return true;
    // Manager is a member of the project
    if (project && project.members && project.members.some((id) => id.toString() === userId)) return true;
    // Manager is the reporter of the task
    if (task.reporterId && task.reporterId.toString() === userId) return true;
    // Task is assigned to the manager
    if (task.assigneeId && task.assigneeId.toString() === userId) return true;
  }

  if (isEmployee(user)) {
    // Employees can ONLY move tasks assigned to themselves
    if (task.assigneeId && task.assigneeId.toString() === userId) return true;
  }

  return false;
};

export const canUpdateTask = (user, task, project) => {
  if (isAdmin(user)) return true;

  const userId = user.sub;

  if (isManager(user)) {
    if (project && project.ownerId && project.ownerId.toString() === userId) return true;
    if (project && project.members && project.members.some((id) => id.toString() === userId)) return true;
    if (task.reporterId && task.reporterId.toString() === userId) return true;
    if (task.assigneeId && task.assigneeId.toString() === userId) return true;
  }

  if (isEmployee(user)) {
    // Employee can only update tasks assigned to themselves
    if (task.assigneeId && task.assigneeId.toString() === userId) return true;
  }

  return false;
};

// ─── Assignment Permissions ───────────────────────────────────────────────────
/**
 * Can currentUser assign a task to targetUser?
 * targetUser is null when unassigning — always allowed if they can edit the task.
 *
 * Manager scope: same-team OR targetUser is in a project the manager owns.
 */
export const canAssignTaskToUser = (currentUser, targetUser, project) => {
  // Unassigning is always allowed if the caller has edit rights on the task
  if (!targetUser) return true;

  if (isAdmin(currentUser)) return true;

  if (isManager(currentUser)) {
    // Self-assign
    const targetId = targetUser.id || targetUser._id?.toString();
    if (targetId === currentUser.sub) return true;

    // Explicit manager scope check
    return managerCanScopeUser(currentUser, targetUser, project);
  }

  if (isEmployee(currentUser)) {
    // Employee can only self-assign
    const targetId = targetUser.id || targetUser._id?.toString();
    return targetId === currentUser.sub;
  }

  return false;
};

// ─── User Management Permissions ─────────────────────────────────────────────
/**
 * Can currentUser edit targetUser's profile?
 * Admin: always. Manager: only users in same team. User: own profile only.
 */
export const canEditUser = (currentUser, targetUser) => {
  if (isAdmin(currentUser)) return true;

  const targetId = targetUser?.id || targetUser?._id?.toString();
  const currentId = currentUser.sub;

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
  // Only Admin can deactivate/activate users
  return isAdmin(currentUser);
};
