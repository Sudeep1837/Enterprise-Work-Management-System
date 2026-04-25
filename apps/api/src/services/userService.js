import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sanitizeUser } from "./authService.js";
import { deleteCloudinaryAsset, uploadProfileImage } from "./cloudinaryService.js";

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
    if (!manager.active) {
      throw new Error("Selected reporting manager is deactivated.");
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
 * Returns users visible to the requesting user:
 *   Admin  → all users
 *   Manager → employees who report to them (managerId) OR are in same team
 *   Others  → all users (route guards handle access)
 */
export async function listUsers(requestingUser) {
  let query = {};

  if (requestingUser?.role === "manager") {
    // Prefer direct reports first; fall back to same-team employees
    query = {
      $or: [
        { managerId: requestingUser.sub },
        { team: requestingUser.team, role: "employee" },
      ],
    };
  }

  const users = await User.find(query)
    .populate("managerId", "name email team active profileImageUrl")
    .lean();

  return users.map((u) => {
    const { passwordHash, active, ...rest } = u;
    return {
      ...rest,
      id: u._id.toString(),
      isActive: active ?? true,
      managerId: u.managerId && u.managerId.active !== false
        ? {
            id: u.managerId._id.toString(),
            name: u.managerId.name,
            email: u.managerId.email,
            team: u.managerId.team || "",
            profileImageUrl: u.managerId.profileImageUrl || "",
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
  const populated = await User.findById(user._id).populate("managerId", "name email team active profileImageUrl");
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
    "name email team active profileImageUrl"
  );
  if (!user) return null;

  return sanitizeUserWithManager(user);
}

export async function updateOwnProfileImage(id, file) {
  const existingUser = await User.findById(id);
  if (!existingUser) return null;

  const uploaded = await uploadProfileImage(file, id);
  const previousPublicId = existingUser.profileImagePublicId;

  existingUser.profileImageUrl = uploaded.secure_url;
  existingUser.profileImagePublicId = uploaded.public_id;
  await existingUser.save();

  if (previousPublicId && previousPublicId !== uploaded.public_id) {
    deleteCloudinaryAsset(previousPublicId).catch((error) => {
      console.warn(`Failed to delete previous profile image ${previousPublicId}: ${error.message}`);
    });
  }

  const populated = await User.findById(id).populate("managerId", "name email team active profileImageUrl");
  return sanitizeUserWithManager(populated);
}

export async function removeOwnProfileImage(id) {
  const existingUser = await User.findById(id);
  if (!existingUser) return null;

  const previousPublicId = existingUser.profileImagePublicId;
  if (previousPublicId) {
    await deleteCloudinaryAsset(previousPublicId);
  }

  existingUser.profileImageUrl = "";
  existingUser.profileImagePublicId = "";
  await existingUser.save();

  const populated = await User.findById(id).populate("managerId", "name email team active profileImageUrl");
  return sanitizeUserWithManager(populated);
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
    managerId: user.managerId && user.managerId.active !== false
      ? {
          id: user.managerId._id?.toString() || user.managerId.id,
          name: user.managerId.name,
          email: user.managerId.email,
          team: user.managerId.team || "",
          profileImageUrl: user.managerId.profileImageUrl || "",
        }
      : null,
  };
}
