import * as userService from "../../services/userService.js";
import User from "../../models/User.js";

/**
 * GET /users
 * Returns all users with managerId populated (name + email).
 * Available to all authenticated users (scoped display handled on frontend).
 */
export async function getUsers(req, res, next) {
  try {
    const users = await userService.listUsers(req.user);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /users/managers
 * Returns only active managers, optionally filtered by ?team=Engineering
 * Used by the UserForm reporting manager dropdown.
 */
export async function getManagers(req, res, next) {
  try {
    const { team } = req.query;
    const filter = { role: "manager", active: true };
    if (team) filter.team = team;

    const managers = await User.find(filter).select("name email team role").lean();
    const result = managers.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      team: m.team,
      role: m.role,
    }));

    res.json({ managers: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /users
 * Admin only. Creates a new user with strict hierarchy validation.
 */
export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    // Surface validation errors as 400 Bad Request
    if (
      error.message.includes("must") ||
      error.message.includes("does not") ||
      error.message.includes("already exists")
    ) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

/**
 * PATCH /users/:userId
 * Admin only. Updates user with strict hierarchy re-validation.
 */
export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.userId, req.body);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (error) {
    if (
      error.message.includes("must") ||
      error.message.includes("does not") ||
      error.message.includes("already exists")
    ) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}
