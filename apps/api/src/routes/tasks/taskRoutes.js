import express from "express";
import { getTasks, getTaskById, createTask, updateTask, deleteTask, moveTaskStatus, addComment, bulkUpdateTasks } from "../../controllers/tasks/taskController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.patch("/bulk", bulkUpdateTasks);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.put("/:id/status", moveTaskStatus);
router.post("/:id/comments", addComment);

export default router;
