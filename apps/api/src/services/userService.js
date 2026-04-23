import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sanitizeUser } from "./authService.js";

/**
 * Strict employee hierarchy validation.
 * Called before create and update to enforce business rules.
 */
async function validateHierarchy(role, team, managerId) {
  if (role === "employee") {
    if (!team || !team.trim()) {
      throw new Error("Employees must belong to a team.");
    }
    if (!managerId) {
      throw new Error("Employees must have a reporting manager.");
    }
    const manager = await User.findById(managerId);
    if (!manager) {
      throw new Error("Selected reporting manager does not exist.");
    }
    if (manager.role !== "manager") {
      throw new Error("Reporting manager must have the 'manager' role.");
    }
    if (manager.team !== team.trim()) {
      throw new Error(
        `Employee team '${team}' does not match manager's team '${manager.team}'. Cross-team reporting requires an explicit business override.`
      );
    }
  }

  if (role === "manager") {
    if (!team || !team.trim()) {
      throw new Error("Managers must belong to a team.");
    }
  }
}

/**
 * Returns all users with managerId populated (name + email + _id).
 * Sanitizes each user before returning.
 */
export async function listUsers() {
  const users = await User.find()
    .populate("managerId", "name email")
    .lean();

  return users.map((u) => {
    // Remove passwordHash from lean objects
    const { passwordHash, active, ...rest } = u;
    return {
      ...rest,
      id: u._id.toString(),
      isActive: active ?? true,
      // managerId is now populated: { _id, name, email } or null
      managerId: u.managerId
        ? {
            id: u.managerId._id.toString(),
            name: u.managerId.name,
            email: u.managerId.email,
          }
        : null,
    };
  });
}

/**
 * Create a new user. Enforces strict hierarchy rules.
 */
export async function createUser(payload) {
  const email = (payload.email || "").trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error("A user with this email already exists.");

  // Normalize role to lowercase
  const role = (payload.role || "employee").trim().toLowerCase();
  const team = (payload.team || "").trim();
  const managerId = payload.managerId || null;

  await validateHierarchy(role, team, managerId);

  const passwordHash = await bcrypt.hash(payload.password || "Temp@123", 10);
  const user = new User({
    name: payload.name,
    email,
    role,
    team,
    managerId: managerId || null,
    active: payload.isActive ?? payload.active ?? true,
    avatar: payload.avatar || "",
    passwordHash,
  });

  await user.save();

  // Re-fetch with populated managerId for consistent response shape
  const populated = await User.findById(user._id).populate("managerId", "name email");
  return sanitizeUserWithManager(populated);
}

/**
 * Update an existing user. Enforces strict hierarchy rules on role/team/managerId changes.
 */
export async function updateUser(id, payload) {
  const updateData = { ...payload };

  // Map isActive → active
  if ("isActive" in updateData) {
    updateData.active = updateData.isActive;
    delete updateData.isActive;
  }

  // Hash password if being changed
  if (updateData.password) {
    updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
    delete updateData.password;
  }

  // Normalize email
  if (updateData.email) {
    updateData.email = updateData.email.trim().toLowerCase();
  }

  // Normalize role to lowercase
  if (updateData.role) {
    updateData.role = updateData.role.trim().toLowerCase();
  }

  // Normalize team
  if (updateData.team !== undefined) {
    updateData.team = (updateData.team || "").trim();
  }

  // Determine effective role/team/managerId for validation
  // We need to check against the existing document for fields not being updated
  const existingUser = await User.findById(id);
  if (!existingUser) return null;

  const effectiveRole = updateData.role ?? existingUser.role;
  const effectiveTeam = "team" in updateData ? updateData.team : existingUser.team;
  const effectiveManagerId =
    "managerId" in updateData ? updateData.managerId : existingUser.managerId?.toString();

  await validateHierarchy(effectiveRole, effectiveTeam, effectiveManagerId);

  const user = await User.findByIdAndUpdate(id, updateData, { new: true }).populate(
    "managerId",
    "name email"
  );
  if (!user) return null;

  return sanitizeUserWithManager(user);
}

/**
 * Sanitize a user document that has a populated managerId.
 */
function sanitizeUserWithManager(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  const { passwordHash, active, ...rest } = obj;
  return {
    ...rest,
    isActive: active ?? true,
    managerId: user.managerId
      ? {
          id: user.managerId._id?.toString() || user.managerId.id,
          name: user.managerId.name,
          email: user.managerId.email,
        }
      : null,
  };
}
