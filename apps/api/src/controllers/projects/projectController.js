import Project from "../../models/Project.js";
import Task from "../../models/Task.js";
import ActivityLog from "../../models/ActivityLog.js";
import Notification from "../../models/Notification.js";
import { emitToUser, emitToAll } from "../../sockets/socketServer.js";

// ─── Helper ───────────────────────────────────────────────────────────────────
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

// ─── Endpoints ────────────────────────────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
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
    const project = new Project({ ...req.body, createdBy: req.user.sub });
    const savedProject = await project.save();
    const serialized = savedProject.toJSON();

    await ActivityLog.create({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Project Created",
      entityType: "project",
      entityId: savedProject._id,
      entityName: savedProject.name,
      metadata: { projectName: savedProject.name },
    });

    emitToAll("project:created", { project: serialized });

    // Always notify the CREATOR about the project they created.
    // This ensures the notification page is populated even in single-user
    // admin scenarios where the creator and owner are the same person.
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

    // If a separate owner was designated, notify them too.
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
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: "Project not found" });
    emitToAll("project:updated", { project: project.toJSON() });

    // Notify the owner if someone else updated their project.
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
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Cascade: remove all tasks belonging to deleted project
    await Task.deleteMany({ projectId: project._id });

    emitToAll("project:deleted", { id: req.params.id });
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
};
