import express from "express";
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearNotifications } from "../../controllers/notifications/notificationController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);
router.delete("/clear", clearNotifications);

export default router;
