import ActivityLog from "../../models/ActivityLog.js";
import { emitToAll, emitToUser } from "../../sockets/socketServer.js";

import User from "../../models/User.js";

export const getActivities = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const { action, entityType, actorId, feed = "activity" } = req.query;
    
    let query = {};
    
    // RBAC Scoping
    const userId = req.user.sub || req.user._id;
    const currentUser = await User.findById(userId).select("activityClearedAt telemetryClearedAt");
    const clearedAt = feed === "telemetry"
      ? currentUser?.telemetryClearedAt
      : currentUser?.activityClearedAt;

    if (clearedAt) {
      query.createdAt = { $gt: clearedAt };
    }

    if (req.user.role === "manager") {
      const teamUsers = await User.find({ managerId: userId }).select("_id");
      const teamIds = teamUsers.map((u) => u._id);
      teamIds.push(userId); // include manager's own activity
      query.$or = [
        { actorId: { $in: teamIds } },
        { visibleTo: userId },
      ];
    } else if (req.user.role === "employee") {
      query.$or = [
        { actorId: userId },
        { visibleTo: userId },
      ];
    }

    // Explicit Filters
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (actorId && req.user.role === "admin") query.actorId = actorId;

    const activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
      
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

export const clearMyActivityFeed = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.sub, { activityClearedAt: new Date() });
    emitToUser(req.user.sub, "activity:cleared", { scope: "personal" });
    res.json({ success: true, scope: "personal" });
  } catch (error) {
    next(error);
  }
};

export const clearMyTelemetryFeed = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.sub, { telemetryClearedAt: new Date() });
    emitToUser(req.user.sub, "telemetry:cleared", { scope: "personal" });
    res.json({ success: true, scope: "personal" });
  } catch (error) {
    next(error);
  }
};

const purgeActivityFeed = async (res, eventName, source) => {
  const result = await ActivityLog.deleteMany({});
  emitToAll(eventName, { source });
  res.json({ success: true, deletedCount: result.deletedCount || 0 });
};

export const purgeActivities = async (req, res, next) => {
  try {
    await purgeActivityFeed(res, "activity:purged", "activity-log");
  } catch (error) {
    next(error);
  }
};

export const purgeTelemetry = async (req, res, next) => {
  try {
    await purgeActivityFeed(res, "telemetry:purged", "workspace-telemetry");
  } catch (error) {
    next(error);
  }
};
