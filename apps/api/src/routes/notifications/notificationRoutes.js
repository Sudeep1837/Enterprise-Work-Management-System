import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  deleteNotification,
  markAllWorkspaceNotificationsRead,
  purgeAllWorkspaceNotifications,
} from "../../controllers/notifications/notificationController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.put("/workspace/read-all", roleMiddleware(["admin"]), markAllWorkspaceNotificationsRead);
router.delete("/workspace/purge", roleMiddleware(["admin"]), purgeAllWorkspaceNotifications);
router.put("/read-all", markAllNotificationsRead);
router.delete("/clear", clearNotifications);
router.put("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);

export default router;
