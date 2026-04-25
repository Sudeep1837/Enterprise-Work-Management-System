import Project from "../../models/Project.js";
import Task from "../../models/Task.js";
import ActivityLog from "../../models/ActivityLog.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import { emitToUser, emitToAll } from "../../sockets/socketServer.js";
import { isAdmin, isManager, isEmployee, canManageProject, canDeleteProject } from "../../utils/authUtils.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function createAndEmitNotification(recipientId, payload) {
  if (!recipientId) return;
  try {
    const notif = await Notification.create({ userId: recipientId, ...payload });
    emitToUser(recipientId.toString(), "notification:created", notif.toJSON());
    return notif.toJSON();
  } catch (err) {
    console.error("[createAndEmitNotification] failed:", err.message);
  }
}

async function logActivity(payload) {
  try {
    const log = await ActivityLog.create(payload);
    emitToAll("activity:created", log.toJSON());
    return log.toJSON();
  } catch (err) {
    console.error("[logActivity] failed:", err.message);
  }
}

function uniqueObjectIds(ids = []) {
  const seen = new Set();
  return ids.filter((id) => {
    if (!id) return false;
    const value = id.toString();
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// ─── Endpoints ────────────────────────────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    let query = {};

    if (isManager(req.user)) {
      // Manager sees only projects they own
      query = { ownerId: req.user.sub };
    } else if (isEmployee(req.user)) {
      // Employee sees only projects they are a member of
      query = { members: req.user.sub };
    }
    // Admin: query = {} → all projects

    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    next(error);
  }
};


export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    if (isEmployee(req.user)) {
      return res.status(403).json({ message: "Employees cannot create projects." });
    }

    let projectData = { ...req.body, createdBy: req.user.sub };

    if (isManager(req.user)) {
      // Managers always own what they create — force ownerId.
      projectData.ownerId = req.user.sub;
      if (!projectData.owner) projectData.owner = req.user.name;
    } else if (isAdmin(req.user)) {
      // Admin must pick a valid owner: themselves (admin) or an active manager.
      // If ownerId not provided, default to the admin themselves.
      if (!projectData.ownerId) {
        projectData.ownerId = req.user.sub;
        if (!projectData.owner) projectData.owner = req.user.name;
      } else {
        // Validate the chosen ownerId is an admin or manager, never an employee.
        const ownerUser = await User.findById(projectData.ownerId).lean();
        if (!ownerUser) {
          return res.status(400).json({ message: "Selected project owner does not exist." });
        }
        if (!['admin', 'manager'].includes(ownerUser.role)) {
          return res.status(400).json({
            message: "Project owner must be an admin or manager, not an employee."
          });
        }
        // Sync display name from DB to prevent client-supplied spoofing.
        if (!projectData.owner) projectData.owner = ownerUser.name;
      }
    }

    const project = new Project(projectData);
    const savedProject = await project.save();
    const serialized = savedProject.toJSON();

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Project Created",
      entityType: "project",
      entityId: savedProject._id,
      entityName: savedProject.name,
      metadata: {
        projectName: savedProject.name,
        richText: `${req.user.name} created project "${savedProject.name}"`,
      },
    });

    emitToAll("project:created", { project: serialized });

    await createAndEmitNotification(req.user.sub, {
      title: "Project Created",
      message: `You created project "${savedProject.name}"`,
      type: "success",
      relatedEntityType: "project",
      relatedEntityId: savedProject._id,
      actorName: req.user.name,
      action: "created project",
      entityName: savedProject.name,
    });

    if (savedProject.ownerId && savedProject.ownerId.toString() !== req.user.sub) {
      await createAndEmitNotification(savedProject.ownerId, {
        title: "New Project Assignment",
        message: `${req.user.name} made you the owner of "${savedProject.name}"`,
        type: "assignment",
        relatedEntityType: "project",
        relatedEntityId: savedProject._id,
        actorName: req.user.name,
        action: "assigned you to project",
        entityName: savedProject.name,
      });
    }

    res.status(201).json(savedProject);
  } catch (error) {
    console.error("[createProject] error:", error.message);
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!canManageProject(req.user, project)) {
      return res.status(403).json({ message: "You do not have permission to manage this project." });
    }

    // Non-admins cannot transfer project ownership via update.
    const updateBody = { ...req.body };
    if (!isAdmin(req.user)) {
      delete updateBody.ownerId;
    } else if (isAdmin(req.user) && updateBody.ownerId) {
      // Admin changing owner: validate the new owner is admin or manager.
      const newOwner = await User.findById(updateBody.ownerId).lean();
      if (!newOwner) {
        return res.status(400).json({ message: "Selected project owner does not exist." });
      }
      if (!['admin', 'manager'].includes(newOwner.role)) {
        return res.status(400).json({
          message: "Project owner must be an admin or manager, not an employee."
        });
      }
      // Sync display name
      if (!updateBody.owner) updateBody.owner = newOwner.name;
    }

    project = await Project.findByIdAndUpdate(req.params.id, updateBody, { new: true });

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Project Updated",
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      metadata: {
        projectName: project.name,
        status: project.status,
        richText: `${req.user.name} updated project "${project.name}"`,
      },
    });

    emitToAll("project:updated", { project: project.toJSON() });

    if (project.ownerId && project.ownerId.toString() !== req.user.sub) {
      await createAndEmitNotification(project.ownerId, {
        title: "Project Updated",
        message: `${req.user.name} updated project "${project.name}"`,
        type: "info",
        relatedEntityType: "project",
        relatedEntityId: project._id,
        actorName: req.user.name,
        action: "updated project",
        entityName: project.name,
      });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!canDeleteProject(req.user, project)) {
      return res.status(403).json({ message: "You do not have permission to delete this project." });
    }

    const projectTasks = await Task.find({ projectId: project._id }).select("_id title assigneeId reporterId");
    const taskIds = projectTasks.map((task) => task._id.toString());
    const visibleTo = uniqueObjectIds([
      req.user.sub,
      project.ownerId,
      project.createdBy,
      ...(project.members || []),
      ...projectTasks.flatMap((task) => [task.assigneeId, task.reporterId]),
    ]);

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Project Deleted",
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      visibleTo,
      metadata: {
        projectName: project.name,
        removedTaskCount: projectTasks.length,
        richText: `${req.user.name} deleted project "${project.name}"`,
      },
    });

    if (projectTasks.length > 0) {
      await logActivity({
        actorId: req.user.sub,
        actorName: req.user.name,
        action: "Project Tasks Removed",
        entityType: "task",
        entityId: project._id,
        entityName: project.name,
        visibleTo,
        metadata: {
          projectName: project.name,
          removedTaskCount: projectTasks.length,
          taskTitles: projectTasks.map((task) => task.title),
          richText: `${req.user.name} removed ${projectTasks.length} task${projectTasks.length === 1 ? "" : "s"} from project "${project.name}"`,
        },
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    // Cascade: remove all tasks belonging to deleted project
    await Task.deleteMany({ projectId: project._id });

    emitToAll("project:deleted", { id: req.params.id, taskIds });
    res.json({ message: "Project deleted successfully", id: req.params.id, taskIds });
  } catch (error) {
    next(error);
  }
};
