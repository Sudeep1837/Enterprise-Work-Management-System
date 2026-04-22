import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

export function sanitizeUser(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  const { passwordHash, active, ...rest } = obj;
  // Normalize DB `active` -> frontend `isActive` to keep shape consistent
  return { ...rest, isActive: active ?? true };
}

export async function signup(payload) {
  const { name, role = "employee" } = payload;
  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";
  if (!name || !email || !password) throw new Error("Name, email, and password are required");
  
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new Error("User already exists");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = new User({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role.toLowerCase(),
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
  const user = await User.findById(id);
  if (!user) return null;
  return sanitizeUser(user);
}
