import Task from "../../models/Task.js";
import Comment from "../../models/Comment.js";
import ActivityLog from "../../models/ActivityLog.js";
import Notification from "../../models/Notification.js";
import { emitToUser, emitToAll } from "../../sockets/socketServer.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a notification document and emit it to the recipient's socket room.
 */
async function createAndEmitNotification(recipientId, payload) {
  if (!recipientId) return;
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

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const comments = await Comment.find({ taskId: task._id }).sort({ createdAt: -1 });
    res.json({ ...task.toJSON(), comments });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
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
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const assigneeName = req.body.assigneeName || null;

    await logActivity({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Task Updated",
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
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

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    await Comment.deleteMany({ taskId: req.params.id });
    emitToAll("task:deleted", req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const moveTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });

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
        actorName: req.user.name,
        action: `moved to ${status}`,
        entityName: task.title,
      });
    }

    if (task.assigneeId && task.assigneeId.toString() === req.user.sub) {
      await createAndEmitNotification(task.assigneeId, {
        title: status === "Done" ? "Task Completed" : "Task Moved",
        message: `You ${statusLabel} "${task.title}"`,
        type: status === "Done" ? "success" : "info",
        relatedEntityType: "task",
        relatedEntityId: task._id,
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
      await logActivity({
        actorId: req.user.sub,
        actorName: req.user.name,
        action: "Comment Added",
        entityType: "task",
        entityId: task._id,
        entityName: task.title,
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
          actorName: req.user.name,
          action: "commented on",
          entityName: task.title,
        });
      }
    }

    res.status(201).json(savedComment);
  } catch (error) {
    next(error);
  }
};
