/**
 * Centralized authorization utilities for the frontend UI.
 * Mirrors the backend logic to hide/disable UI elements.
 */

export const isAdmin = (user) => user?.role === "admin";
export const isManager = (user) => user?.role === "manager";
export const isEmployee = (user) => user?.role === "employee";

/**
 * Project permissions
 */
export const canManageProject = (user, project) => {
  if (!user || !project) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    const userId = user.id || user._id;
    const ownerId = project.ownerId?._id || project.ownerId; // Handle populated vs unpopulated
    return ownerId && ownerId.toString() === userId.toString();
  }
  return false;
};

export const canDeleteProject = (user, project) => {
  return canManageProject(user, project);
};

export const canCreateProject = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isManager(user)) return true;
  return false;
};

/**
 * Task permissions
 */
export const canDeleteTask = (user, task, project) => {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    const userId = user.id || user._id?.toString();
    const ownerId = project?.ownerId?._id || project?.ownerId;
    const reporterId = task.reporterId?._id || task.reporterId;
    if (ownerId && ownerId.toString() === userId) return true;
    if (reporterId && reporterId.toString() === userId) return true;
  }
  return false;
};

export const canMoveTask = (user, task, project) => {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;
  const userId = user.id || user._id?.toString();
  
  if (isManager(user)) {
    const ownerId = project?.ownerId?._id || project?.ownerId;
    const members = project?.members || [];
    const reporterId = task.reporterId?._id || task.reporterId;
    const assigneeId = task.assigneeId?._id || task.assigneeId;

    if (ownerId && ownerId.toString() === userId) return true;
    if (members.some(id => (id._id || id).toString() === userId)) return true;
    if (reporterId && reporterId.toString() === userId) return true;
    if (assigneeId && assigneeId.toString() === userId) return true;
  }
  
  if (isEmployee(user)) {
    const assigneeId = task.assigneeId?._id || task.assigneeId;
    if (assigneeId && assigneeId.toString() === userId) return true;
  }
  return false;
};

export const canUpdateTask = (user, task, project) => {
  return canMoveTask(user, task, project); // Same logic for general edits vs moves.
};

// Target user assignment
export const canAssignTaskToUser = (currentUser, targetUser, project) => {
  if (!currentUser) return false;
  if (!targetUser) return true; // Can always unassign if they can edit

  if (isAdmin(currentUser)) return true;

  const currentId = currentUser.id || currentUser._id?.toString();
  const targetId = targetUser.id || targetUser._id?.toString();

  if (isManager(currentUser)) {
    if (targetId === currentId) return true;
    if (targetUser.team && currentUser.team && targetUser.team === currentUser.team) return true;
    
    const members = project?.members || [];
    if (members.some(id => (id._id || id).toString() === targetId)) return true;
    return false;
  }

  if (isEmployee(currentUser)) {
    return targetId === currentId;
  }

  return false;
};
