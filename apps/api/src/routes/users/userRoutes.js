import express from "express";
import { getUsers, getManagers, createUser, updateUser } from "../../controllers/users/userController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Any authenticated user can list users (scoped display handled on frontend)
router.get("/", getUsers);

// Returns only active managers, optionally filtered by ?team=Engineering
router.get("/managers", getManagers);

// Only admins can create or update users
// CRITICAL FIX: was roleMiddleware(["Admin"]) — must be lowercase to match JWT role claim
router.post("/", roleMiddleware(["admin"]), createUser);
router.patch("/:userId", roleMiddleware(["admin"]), updateUser);

export default router;
