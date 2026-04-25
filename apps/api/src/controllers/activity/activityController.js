import ActivityLog from "../../models/ActivityLog.js";

import User from "../../models/User.js";

export const getActivities = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const { action, entityType, actorId } = req.query;
    
    let query = {};
    
    // RBAC Scoping
    const userId = req.user.sub || req.user._id;

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
