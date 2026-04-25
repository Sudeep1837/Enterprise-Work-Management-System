import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

/**
 * Sanitize a user document for API responses.
 * Includes team and managerId. Renames active → isActive for frontend consistency.
 * Safe for both populated and unpopulated managerId.
 */
export function sanitizeUser(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  const { passwordHash, active, ...rest } = obj;

  // Normalize managerId: handle populated object, ObjectId, or null
  let managerIdOut = null;
  if (user.managerId) {
    if (typeof user.managerId === "object" && user.managerId.name && user.managerId.active !== false) {
      // Populated
      managerIdOut = {
        id: user.managerId._id?.toString() || user.managerId.id,
        name: user.managerId.name,
        email: user.managerId.email,
        team: user.managerId.team || "",
        profileImageUrl: user.managerId.profileImageUrl || "",
      };
    } else {
      // Raw ObjectId or string — keep as string, frontend will handle gracefully
      managerIdOut = user.managerId.toString();
    }
  }

  return {
    ...rest,
    isActive: active ?? true,
    team: user.team || "",
    managerId: managerIdOut,
  };
}

export async function signup(payload) {
  const { name, role = "employee" } = payload;
  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";
  if (!name || !email || !password) throw new Error("Name, email, and password are required");

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("User already exists");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = new User({
    name,
    email,
    passwordHash,
    role: role.toLowerCase(),  // always lowercase
    team: payload.team || "",
    active: true,
  });

  await user.save();

  return { token: signToken(user), user: sanitizeUser(user) };
}

export async function login(payload) {
  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";
  const user = await User.findOne({ email });

  if (!user) throw new Error("Invalid credentials");
  if (!user.active) throw new Error("User is deactivated");

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw new Error("Invalid credentials");

  user.lastActiveAt = new Date();
  await user.save();

  return { token: signToken(user), user: sanitizeUser(user) };
}

export async function changePassword(userId, payload) {
  const currentPassword = payload.currentPassword || "";
  const newPassword = payload.newPassword || "";
  const confirmPassword = payload.confirmPassword || "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error("Current password, new password, and confirmation are required");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation do not match");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from the current password");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.active) throw new Error("User is deactivated");

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return { message: "Password updated successfully" };
}

export async function getCurrentUser(id) {
  // Populate managerId for /me endpoint too
  const user = await User.findById(id).populate("managerId", "name email team active profileImageUrl");
  if (!user) return null;
  // EC4: deactivated users cannot refresh their session even with a valid JWT.
  // Returning null causes the /me controller to respond 401/404 →
  // fetchMeThunk.rejected clears the token and redirects to login.
  if (!user.active) return null;
  return sanitizeUser(user);
}
