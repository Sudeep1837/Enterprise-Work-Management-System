import ActivityLog from "../../models/ActivityLog.js";

export const getActivities = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const activities = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(activities);
  } catch (error) {
    next(error);
  }
};
