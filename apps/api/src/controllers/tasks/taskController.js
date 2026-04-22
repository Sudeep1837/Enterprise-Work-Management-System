import Task from "../../models/Task.js";
import Comment from "../../models/Comment.js";
import ActivityLog from "../../models/ActivityLog.js";
import Notification from "../../models/Notification.js";
import { emitToUser, emitToAll } from "../../sockets/socketServer.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a notification document and emit it to the recipient's socket room.
 * Always creates the notification regardless of whether actor === recipient
 * (self-assignment is a legitimate case: "You were assigned to X").
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

    await ActivityLog.create({
      actorId: req.user.sub,
      actorName: req.user.name,
      action: "Task Created",
      entityType: "task",
      entityId: savedTask._id,
      entityName: savedTask.title,
      metadata: { taskTitle: savedTask.title },
    });

    emitToAll("task:created", serialized);

    // Always notify the assignee — including self-assignment.
    // This ensures the actor (admin assigning to themselves) also gets
    // the notification on their Notifications page.
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

    emitToAll("task:updated", task.toJSON());

    // Notify assignee when someone else updates their task.
    // Also notify if actor is the assignee (they may want confirmation).
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

    emitToAll("task:moved", task.toJSON());

    // Notify assignee when their task is moved by someone else.
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

    // Also notify the ACTOR when they move a task (self-confirmation).
    // This ensures solo-user / admin testing still populates the page.
    if (task.assigneeId && task.assigneeId.toString() === req.user.sub) {
      await createAndEmitNotification(task.assigneeId, {
        title: "Task Moved",
        message: `You moved "${task.title}" to ${status}`,
        type: "success",
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
    if (task && task.assigneeId) {
      // Always notify the assignee about a new comment (even if they wrote it —
      // unlikely but harmless; real apps can filter self-comments if desired).
      if (task.assigneeId.toString() !== req.user.sub) {
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
