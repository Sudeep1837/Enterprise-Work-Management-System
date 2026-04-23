/**
 * Centralized authorization utilities for the backend.
 * Provides granular checks for RBAC and scoped permissions based on team/project.
 */

// Basic Role Checks
export const isAdmin = (user) => user?.role === "admin";
export const isManager = (user) => user?.role === "manager";
export const isEmployee = (user) => user?.role === "employee";

/**
 * Project permissions
 */
export const canManageProject = (user, project) => {
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    // Only manage if they own it.
    return project.ownerId && project.ownerId.toString() === user.sub;
  }
  return false;
};

export const canDeleteProject = (user, project) => {
  return canManageProject(user, project);
};

/**
 * Task permissions
 */
export const canDeleteTask = (user, task, project) => {
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    // Manager can delete if they own the project or if they reported the task.
    if (project && project.ownerId && project.ownerId.toString() === user.sub) return true;
    if (task && task.reporterId && task.reporterId.toString() === user.sub) return true;
  }
  return false;
};

export const canMoveTask = (user, task, project) => {
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    // Manager can move tasks in projects they own or are members of, or if they created the task, or if assigned to them.
    if (project && project.ownerId && project.ownerId.toString() === user.sub) return true;
    if (project && project.members && project.members.some(id => id.toString() === user.sub)) return true;
    if (task.reporterId && task.reporterId.toString() === user.sub) return true;
    if (task.assigneeId && task.assigneeId.toString() === user.sub) return true;
  }
  if (isEmployee(user)) {
    // Employee can ONLY move tasks explicitly assigned to them.
    if (task.assigneeId && task.assigneeId.toString() === user.sub) return true;
  }
  return false;
};

export const canUpdateTask = (user, task, project) => {
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    if (project && project.ownerId && project.ownerId.toString() === user.sub) return true;
    if (project && project.members && project.members.some(id => id.toString() === user.sub)) return true;
    if (task.reporterId && task.reporterId.toString() === user.sub) return true;
    if (task.assigneeId && task.assigneeId.toString() === user.sub) return true;
  }
  if (isEmployee(user)) {
    if (task.assigneeId && task.assigneeId.toString() === user.sub) return true;
  }
  return false;
};

// Target user assignment
export const canAssignTaskToUser = (currentUser, targetUser, project) => {
  // targetUser can be null if unassigning
  if (!targetUser) return true;

  if (isAdmin(currentUser)) return true;

  if (isManager(currentUser)) {
    // Can assign to self
    if (targetUser.id === currentUser.sub || targetUser._id?.toString() === currentUser.sub) return true;
    // Can assign to team members
    if (targetUser.team && currentUser.team && targetUser.team === currentUser.team) return true;
    // Can assign to project members
    if (project && project.members && project.members.some(id => id.toString() === targetUser.id || id.toString() === targetUser._id?.toString())) return true;
    return false;
  }

  if (isEmployee(currentUser)) {
    // Employee can only self-assign
    return targetUser.id === currentUser.sub || targetUser._id?.toString() === currentUser.sub;
  }

  return false;
};

/**
 * User management permissions
 */
export const canEditUser = (currentUser, targetUser) => {
  if (isAdmin(currentUser)) return true;
  // A user can edit their own basic profile.
  if (targetUser && (targetUser.id === currentUser.sub || targetUser._id?.toString() === currentUser.sub)) return true;
  return false;
};

export const canDeactivateUser = (currentUser, targetUser) => {
  // Only Admin can deactivate/activate users.
  if (isAdmin(currentUser)) return true;
  return false;
};
