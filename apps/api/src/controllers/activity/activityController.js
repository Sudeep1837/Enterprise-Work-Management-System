import ActivityLog from "../../models/ActivityLog.js";

export const getActivities = async (req, res, next) => {
  try {
    const activities = await ActivityLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(activities);
  } catch (error) {
    next(error);
  }
};
