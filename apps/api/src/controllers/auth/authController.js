import * as authService from "../../services/authService.js";
import * as userService from "../../services/userService.js";
import { emitToAll } from "../../sockets/socketServer.js";

export async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  try {
    const user = await authService.getCurrentUser(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, email, avatar } = req.body;
    // We only allow users to update basic profile info for themselves
    const user = await userService.updateUser(req.user.sub, { name, email, avatar });
    if (!user) return res.status(404).json({ message: "User not found" });
    emitToAll("user:updated", user);
    return res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfileImage(req, res, next) {
  try {
    const user = await userService.updateOwnProfileImage(req.user.sub, req.file);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function removeProfileImage(req, res, next) {
  try {
    const user = await userService.removeOwnProfileImage(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user.sub, req.body);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
}
