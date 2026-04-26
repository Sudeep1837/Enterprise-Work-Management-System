import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  deleteNotification,
} from "../../controllers/notifications/notificationController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.put("/read-all", markAllNotificationsRead);
router.delete("/clear", clearNotifications);
router.put("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);

export default router;
