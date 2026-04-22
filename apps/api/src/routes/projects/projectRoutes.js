import express from "express";
import { getProjects, getProjectById, createProject, updateProject, deleteProject } from "../../controllers/projects/projectController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getProjects);
router.get("/:id", getProjectById);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
