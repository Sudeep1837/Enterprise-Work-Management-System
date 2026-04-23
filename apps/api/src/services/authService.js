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
    if (typeof user.managerId === "object" && user.managerId.name) {
      // Populated
      managerIdOut = {
        id: user.managerId._id?.toString() || user.managerId.id,
        name: user.managerId.name,
        email: user.managerId.email,
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

export async function getCurrentUser(id) {
  // Populate managerId for /me endpoint too
  const user = await User.findById(id).populate("managerId", "name email");
  if (!user) return null;
  return sanitizeUser(user);
}
