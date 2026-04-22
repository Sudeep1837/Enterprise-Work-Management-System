import express from "express";
import { getActivities } from "../../controllers/activity/activityController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", getActivities);

export default router;
