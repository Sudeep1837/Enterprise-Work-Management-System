import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Signs a JWT for the given user.
 * Embeds team and managerId so permission helpers can run
 * without extra DB lookups on every request.
 */
export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id || user._id?.toString(),
      email: user.email,
      role: user.role,        // always lowercase: admin | manager | employee
      name: user.name,
      team: user.team || "",
      managerId: user.managerId ? user.managerId.toString() : null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
