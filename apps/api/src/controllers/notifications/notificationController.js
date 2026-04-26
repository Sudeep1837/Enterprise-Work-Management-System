import Notification from "../../models/Notification.js";
import { emitToAll, emitToUser } from "../../sockets/socketServer.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.sub })
      .populate("actorId", "name email profileImageUrl role")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json(notification.toJSON());
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.sub, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const clearNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user.sub });
    emitToUser(req.user.sub, "notifications:cleared", { scope: "personal" });
    res.json({ message: "Notifications cleared", deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    emitToUser(req.user.sub, "notification:deleted", { id: req.params.id });
    return res.json({ success: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
};

export const markAllWorkspaceNotificationsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { $set: { read: true } }
    );
    emitToAll("notification:all-read", { scope: "workspace" });
    res.json({ success: true, modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    next(error);
  }
};

export const purgeAllWorkspaceNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({});
    emitToAll("notification:purged", { scope: "workspace" });
    res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
};
