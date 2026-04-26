import Task from "../../models/Task.js";
import Comment from "../../models/Comment.js";
import ActivityLog from "../../models/ActivityLog.js";
import Notification from "../../models/Notification.js";
import Project from "../../models/Project.js";
import User from "../../models/User.js";
import { emitToUser, emitToAll } from "../../sockets/socketServer.js";
import { canUpdateTask, canMoveTask, canDeleteTask, canAssignTaskToUser, canViewTask, isEmployee, isManager, canManageProject } from "../../utils/authUtils.js";
import {
  deleteCloudinaryAsset,
  getCloudinaryDownloadUrl,
  uploadTaskAttachment,
} from "../../services/cloudinaryService.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a notification document and emit it to the recipient's socket room.
 */
async function createAndEmitNotification(recipientId, payload) {
  if (!recipientId) return;
  const actorId = payload.actorId?.toString();
  if (actorId && actorId === recipientId.toString()) return;
  try {
    const notif = await Notification.create({
      userId: recipientId,
      ...payload,
    });
    const serialized = notif.toJSON();
    emitToUser(recipientId.toString(), "notification:created", serialized);
    return serialized;
  } catch (err) {
    console.error("[createAndEmitNotification] failed:", err.message);
  }
}

/**
 * Create an ActivityLog entry and emit it to all connected clients.
 */
async function logActivity(payload) {
  try {
    const log = await ActivityLog.create(payload);
    emitToAll("activity:created", log.toJSON());
    return log.toJSON();
  } catch (err) {
    console.error("[logActivity] failed:", err.message);
  }
}

function extractMentions(content = "") {
  const matches = content.match(/@([a-zA-Z][a-zA-Z0-9._-]{1,40})/g) || [];
  return [...new Set(matches.map((match) => match.slice(1).trim().toLowerCase()))];
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

function taskActivityAudience(task, project, actorId) {
  return uniqueObjectIds([
    actorId,
    task.assigneeId,
    task.reporterId,
    project?.ownerId,
    ...(project?.members || []),
  ]);
}

async function getEditableTask(req, res) {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return {};
  }

  const project = task.projectId ? await Project.findById(task.projectId) : null;
  if (!canUpdateTask(req.user, task, project)) {
    res.status(403).json({ message: "You do not have permission to update this task." });
    return {};
  }

  return { task, project };
}

function parseDueDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isPastDueDate(value) {
  const dueDate = parseDueDate(value);
  if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < startOfToday();
}

function sameDateValue(left, right) {
  if (!left && !right) return true;
  const leftDate = parseDueDate(left);
  const rightDate = parseDueDate(right);
  if (!leftDate || !rightDate || Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false;
  }
  return leftDate.toDateString() === rightDate.toDateString();
}

function validateDueDateInput(value, res) {
  if (value === undefined || value === null || value === "") return true;
  const dueDate = parseDueDate(value);
  if (Number.isNaN(dueDate.getTime())) {
    res.status(400).json({ message: "Due date is invalid." });
    return false;
  }
  if (isPastDueDate(value)) {
    res.status(400).json({ message: "Due date cannot be in the past." });
    return false;
  }
  return true;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const getTasks = async (req, res, next) => {
  try {
    let query = {};

    if (isManager(req.user)) {
      // Manager sees: tasks in their owned projects + tasks they reported or are assigned
      const ownedProjects = await Project.find({ ownerId: req.user.sub }).select("_id");
      const ownedProjectIds = ownedProjects.map((p) => p._id);
      query = {
        $or: [
          { projectId: { $in: ownedProjectIds } },
          { reporterId: req.user.sub },
          { assigneeId: req.user.sub },
        ],
      };
    } else if (isEmployee(req.user)) {
      // Employee sees only tasks assigned to them
      query = { assigneeId: req.user.sub };
    }
    // Admin: query = {} → all tasks

    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};


export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const project = task.projectId ? await Project.findById(task.projectId) : null;
    if (!canViewTask(req.user, task, project)) {
      return res.status(403).json({ message: "You do not have permission to view this task." });
    }
    const comments = await Comment.find({ taskId: task._id }).sort({ createdAt: -1 });
    res.json({ ...task.toJSON(), comments });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    if (!validateDueDateInput(req.body.dueDate, res)) return;

    // Assignment validation
    const { assigneeId, projectId } = req.body;
    let project = null;
    if (projectId) project = await Project.findById(projectId);

    // Bug 1 fix: manager can only create tasks in projects they own/manage
    if (isManager(req.user) && projectId) {
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (!canManageProject(req.user, project)) {
        return res.status(403).json({
          message: "You do not have permission to manage this project.",
        });
      }
    }

    if (assigneeId) {
      const targetUser = await User.findById(assigneeId);
      if (!targetUser) return res.status(404).json({ message: "Assignee not found" });
      if (!canAssignTaskToUser(req.user, targetUser, project)) {
        return res.status(403).json({ message: "You cannot assign tasks to this user outside your scope." });
      }
    }

    const task = new Task(req.body);
    const savedTask = await task.save();
    const serialized = savedTask.toJSON();

    // Determine assignee name for richer activity text
    const assigneeName = req.body.assigneeName || null;
    const activityAction = assigneeName
      ? `assigned "${savedTask.title}" to ${assigneeName}`
      : `created task "${savedTask.title}"`;

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Task Created",
      entityType: "task",
      entityId: savedTask._id,
      entityName: savedTask.title,
      visibleTo: taskActivityAudience(savedTask, project, req.user.sub),
      metadata: {
        taskTitle: savedTask.title,
        assigneeName: assigneeName || "Unassigned",
        projectName: req.body.projectName || "",
        richText: assigneeName
          ? `${req.user.name} assigned "${savedTask.title}" to ${assigneeName}`
          : `${req.user.name} created task "${savedTask.title}"`,
      },
    });

    emitToAll("task:created", serialized);

    if (savedTask.assigneeId) {
      await createAndEmitNotification(savedTask.assigneeId, {
        title: "New Task Assignment",
        message: `${req.user.name} assigned you to "${savedTask.title}"`,
        type: "assignment",
        relatedEntityType: "task",
        relatedEntityId: savedTask._id,
        actorId: req.user.sub,
        actorName: req.user.name,
        action: "assigned you to",
        entityName: savedTask.title,
      });
    }

    res.status(201).json(savedTask);
  } catch (error) {
    console.error("[createTask] error:", error.message);
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    let project = null;
    if (task.projectId) project = await Project.findById(task.projectId);

    if (!canUpdateTask(req.user, task, project)) {
      return res.status(403).json({ message: "You do not have permission to update this task." });
    }

    if (req.body.attachments !== undefined) {
      return res.status(400).json({ message: "Use the attachment upload/remove endpoints to manage files." });
    }

    if (
      req.body.dueDate !== undefined &&
      !sameDateValue(req.body.dueDate, task.dueDate) &&
      !validateDueDateInput(req.body.dueDate, res)
    ) {
      return;
    }

    // Bug 2 fix: employee field whitelist — only status and attachments allowed
    if (isEmployee(req.user)) {
      const EMPLOYEE_ALLOWED = new Set(["status"]);
      const blocked = Object.keys(req.body).filter((k) => !EMPLOYEE_ALLOWED.has(k));
      if (blocked.length > 0) {
        return res.status(403).json({
          message: "Employees can only update status on their own assigned tasks. Use the file endpoints for attachments.",
        });
      }
    }

    // Assignment re-validation if assignee is being changed
    if (req.body.assigneeId !== undefined && req.body.assigneeId !== (task.assigneeId ? task.assigneeId.toString() : null)) {
      if (req.body.assigneeId) {
        const targetUser = await User.findById(req.body.assigneeId);
        if (!targetUser) return res.status(404).json({ message: "Assignee not found" });
        if (!canAssignTaskToUser(req.user, targetUser, project)) {
          return res.status(403).json({ message: "You cannot assign tasks to this user outside your scope." });
        }
      } else {
        // Unassigning
        if (!canAssignTaskToUser(req.user, null, project)) {
          return res.status(403).json({ message: "You cannot unassign this task." });
        }
      }
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // FIX: declare assigneeName here, not after it's already referenced
    const assigneeName = req.body.assigneeName || task.assigneeName || null;

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Task Updated",
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      visibleTo: taskActivityAudience(task, project, req.user.sub),
      metadata: {
        taskTitle: task.title,
        assigneeName: assigneeName,
        projectName: req.body.projectName || task.projectName || "",
        richText: `${req.user.name} updated task "${task.title}"`,
      },
    });

    emitToAll("task:updated", task.toJSON());

    if (task.assigneeId && task.assigneeId.toString() !== req.user.sub) {
      await createAndEmitNotification(task.assigneeId, {
        title: "Task Updated",
        message: `${req.user.name} updated "${task.title}"`,
        type: "info",
        relatedEntityType: "task",
        relatedEntityId: task._id,
        actorId: req.user.sub,
        actorName: req.user.name,
        action: "updated",
        entityName: task.title,
      });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const addAttachment = async (req, res, next) => {
  try {
    const { task, project } = await getEditableTask(req, res);
    if (!task) return;
    if (!req.file) return res.status(400).json({ message: "Choose a file to attach." });

    const uploaded = await uploadTaskAttachment(req.file, task._id);
    const resourceType = uploaded.resource_type || "auto";
    const attachment = {
      id: uploaded.asset_id || `${Date.now()}-${req.file.originalname}`,
      name: req.file.originalname,
      url: uploaded.secure_url,
      downloadUrl: getCloudinaryDownloadUrl(uploaded.public_id, resourceType),
      publicId: uploaded.public_id,
      resourceType,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.sub,
      uploadedByName: req.user.name,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Attachment Added",
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      visibleTo: taskActivityAudience(task, project, req.user.sub),
      metadata: {
        taskTitle: task.title,
        fileName: attachment.name,
        richText: `${req.user.name} attached "${attachment.name}" to "${task.title}"`,
      },
    });

    emitToAll("task:updated", task.toJSON());
    return res.status(201).json({ task: task.toJSON(), attachment });
  } catch (error) {
    next(error);
  }
};

export const removeAttachment = async (req, res, next) => {
  try {
    const { task, project } = await getEditableTask(req, res);
    if (!task) return;

    const attachment = task.attachments.find((item) => item.id === req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });

    task.attachments = task.attachments.filter((item) => item.id !== req.params.attachmentId);
    await task.save();

    if (attachment.publicId) {
      deleteCloudinaryAsset(attachment.publicId, attachment.resourceType || "auto").catch((error) => {
        console.warn(`Failed to delete attachment ${attachment.publicId}: ${error.message}`);
      });
    }

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Attachment Removed",
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      visibleTo: taskActivityAudience(task, project, req.user.sub),
      metadata: {
        taskTitle: task.title,
        fileName: attachment.name,
        richText: `${req.user.name} removed "${attachment.name}" from "${task.title}"`,
      },
    });

    emitToAll("task:updated", task.toJSON());
    return res.json({ task: task.toJSON(), removedAttachmentId: req.params.attachmentId });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    let project = null;
    if (task.projectId) project = await Project.findById(task.projectId);

    if (!canDeleteTask(req.user, task, project)) {
      return res.status(403).json({ message: "You do not have permission to delete this task." });
    }

    const taskJson = task.toJSON();

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Task Deleted",
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      visibleTo: taskActivityAudience(task, project, req.user.sub),
      metadata: {
        taskTitle: task.title,
        projectName: task.projectName || project?.name || "",
        richText: `${req.user.name} deleted task "${task.title}"`,
      },
    });

    await Promise.all(
      (task.attachments || [])
        .filter((attachment) => attachment.publicId)
        .map((attachment) =>
          deleteCloudinaryAsset(attachment.publicId, attachment.resourceType || "auto").catch((error) => {
            console.warn(`Failed to delete attachment ${attachment.publicId}: ${error.message}`);
          })
        )
    );
    await Comment.deleteMany({ taskId: task._id });
    await Notification.deleteMany({ relatedEntityType: "task", relatedEntityId: task._id });
    await Task.findByIdAndDelete(req.params.id);

    emitToAll("task:deleted", {
      id: req.params.id,
      task: taskJson,
      projectId: task.projectId?.toString(),
    });
    res.json({ message: "Task deleted successfully", id: req.params.id });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateTasks = async (req, res, next) => {
  try {
    const { ids = [], status, assigneeId, assigneeName } = req.body;
    const taskIds = [...new Set(ids)].filter(Boolean);
    if (!taskIds.length) return res.status(400).json({ message: "Select at least one task." });

    const tasks = await Task.find({ _id: { $in: taskIds } });
    if (!tasks.length) return res.status(404).json({ message: "No matching tasks found." });

    const updates = {};
    if (status) updates.status = status;
    if (assigneeId !== undefined) {
      updates.assigneeId = assigneeId || null;
      updates.assigneeName = assigneeName || "";
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No bulk update action was provided." });
    }

    const allowedTasks = [];
    for (const task of tasks) {
      const project = task.projectId ? await Project.findById(task.projectId) : null;
      const allowed = canUpdateTask(req.user, task, project);
      if (!allowed) continue;

      if (assigneeId !== undefined && assigneeId) {
        const targetUser = await User.findById(assigneeId);
        if (!targetUser || !canAssignTaskToUser(req.user, targetUser, project)) continue;
      }
      allowedTasks.push(task);
    }

    if (!allowedTasks.length) {
      return res.status(403).json({ message: "You do not have permission to update the selected tasks." });
    }

    const allowedIds = allowedTasks.map((task) => task._id);
    await Task.updateMany({ _id: { $in: allowedIds } }, { $set: updates });
    const updated = await Task.find({ _id: { $in: allowedIds } }).sort({ updatedAt: -1 });

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Tasks Bulk Updated",
      entityType: "task",
      entityName: `${updated.length} tasks`,
      visibleTo: uniqueObjectIds([
        req.user.sub,
        ...allowedTasks.flatMap((task) => [task.assigneeId, task.reporterId]),
      ]),
      metadata: {
        count: updated.length,
        status,
        assigneeName,
        richText: `${req.user.name} bulk updated ${updated.length} task${updated.length === 1 ? "" : "s"}`,
      },
    });

    updated.forEach((task) => {
      emitToAll("task:updated", task.toJSON());
    });

    res.json(updated.map((task) => task.toJSON()));
  } catch (error) {
    next(error);
  }
};

export const moveTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    let project = null;
    if (task.projectId) project = await Project.findById(task.projectId);

    if (!canMoveTask(req.user, task, project)) {
      return res.status(403).json({ message: "You do not have permission to move this task." });
    }

    task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });

    // Build a rich human-readable status move message
    const statusLabel = status === "Done" ? "completed" : `moved to ${status}`;
    const richText = `${req.user.name} ${statusLabel} "${task.title}"`;

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: status === "Done" ? "Task Completed" : "Task Moved",
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      visibleTo: taskActivityAudience(task, project, req.user.sub),
      metadata: {
        taskTitle: task.title,
        fromStatus: task.status,
        toStatus: status,
        richText,
      },
    });

    emitToAll("task:moved", task.toJSON());

    if (task.assigneeId && task.assigneeId.toString() !== req.user.sub) {
      await createAndEmitNotification(task.assigneeId, {
        title: "Task Status Changed",
        message: `${req.user.name} moved "${task.title}" to ${status}`,
        type: "info",
        relatedEntityType: "task",
        relatedEntityId: task._id,
        actorId: req.user.sub,
        actorName: req.user.name,
        action: `moved to ${status}`,
        entityName: task.title,
      });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const comment = new Comment({
      taskId: req.params.id,
      authorId: req.user.sub,
      authorName: req.user.name,
      content,
    });
    const savedComment = await comment.save();
    await Task.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });
    emitToAll("comment:added", savedComment.toJSON());

    const task = await Task.findById(req.params.id);

    // Log activity for comment regardless of who wrote it
    if (task) {
      const project = task.projectId ? await Project.findById(task.projectId) : null;
      await logActivity({
        actorId: req.user.sub,
        actorName: req.user.name,
        action: "Comment Added",
        entityType: "task",
        entityId: task._id,
        entityName: task.title,
        visibleTo: taskActivityAudience(task, project, req.user.sub),
        metadata: {
          taskTitle: task.title,
          commentPreview: content.length > 60 ? content.slice(0, 60) + "…" : content,
          richText: `${req.user.name} commented on "${task.title}"`,
        },
      });

      if (task.assigneeId && task.assigneeId.toString() !== req.user.sub) {
        await createAndEmitNotification(task.assigneeId, {
          title: "New Comment",
          message: `${req.user.name} commented on "${task.title}"`,
          type: "info",
          relatedEntityType: "comment",
          relatedEntityId: task._id,
          actorId: req.user.sub,
          actorName: req.user.name,
          action: "commented on",
          entityName: task.title,
        });
      }

      const mentionNames = extractMentions(content);
      if (mentionNames.length) {
        const mentionedUsers = await User.find({
          _id: { $ne: req.user.sub },
          $or: mentionNames.map((name) => ({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i") })),
        }).limit(10);

        for (const mentionedUser of mentionedUsers) {
          await createAndEmitNotification(mentionedUser._id, {
            title: "You were mentioned",
            message: `${req.user.name} mentioned you on "${task.title}"`,
            type: "mention",
            relatedEntityType: "comment",
            relatedEntityId: task._id,
            actorId: req.user.sub,
            actorName: req.user.name,
            action: "mentioned you on",
            entityName: task.title,
          });
        }
      }
    }

    res.status(201).json(savedComment);
  } catch (error) {
    next(error);
  }
};
