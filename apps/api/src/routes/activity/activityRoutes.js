import express from "express";
import {
  clearMyActivityFeed,
  clearMyTelemetryFeed,
  getActivities,
} from "../../controllers/activity/activityController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", getActivities);
router.delete("/clear", clearMyActivityFeed);
router.delete("/telemetry/clear", clearMyTelemetryFeed);

export default router;
