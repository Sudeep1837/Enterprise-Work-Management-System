import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sanitizeUser } from "./authService.js";

export async function listUsers() {
  const users = await User.find();
  return users.map(sanitizeUser);
}

export async function createUser(payload) {
  const email = (payload.email || "").trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error("A user with this email already exists");
  const passwordHash = await bcrypt.hash(payload.password || "Temp@123", 10);
  const user = new User({
    name: payload.name,
    email,
    role: payload.role || "employee",
    active: payload.isActive ?? payload.active ?? true,
    passwordHash,
  });
  await user.save();
  return sanitizeUser(user);
}

export async function updateUser(id, payload) {
  const updateData = { ...payload };
  // Map isActive from frontend to active field in DB
  if ("isActive" in updateData) {
    updateData.active = updateData.isActive;
    delete updateData.isActive;
  }
  if (updateData.password) {
    updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
    delete updateData.password;
  }
  if (updateData.email) {
    updateData.email = updateData.email.trim().toLowerCase();
  }
  const user = await User.findByIdAndUpdate(id, updateData, { new: true });
  if (!user) return null;
  return sanitizeUser(user);
}
