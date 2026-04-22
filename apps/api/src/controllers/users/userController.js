import * as userService from "../../services/userService.js";

export async function getUsers(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.userId, req.body);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (error) {
    next(error);
  }
}
