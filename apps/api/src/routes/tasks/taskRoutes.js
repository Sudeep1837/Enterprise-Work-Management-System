import express from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  moveTaskStatus,
  addComment,
  bulkUpdateTasks,
  addAttachment,
  removeAttachment,
} from "../../controllers/tasks/taskController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { taskAttachmentUpload } from "../../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.patch("/bulk", bulkUpdateTasks);
router.post("/:id/attachments", taskAttachmentUpload.single("file"), addAttachment);
router.delete("/:id/attachments/:attachmentId", removeAttachment);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.put("/:id/status", moveTaskStatus);
router.post("/:id/comments", addComment);

export default router;
