import express from "express";
import {
  clearMyActivityFeed,
  clearMyTelemetryFeed,
  getActivities,
  purgeActivities,
  purgeTelemetry,
} from "../../controllers/activity/activityController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", getActivities);
router.delete("/clear", clearMyActivityFeed);
router.delete("/telemetry/clear", clearMyTelemetryFeed);
router.delete("/purge", roleMiddleware(["admin"]), purgeActivities);
router.delete("/telemetry/purge", roleMiddleware(["admin"]), purgeTelemetry);

export default router;
