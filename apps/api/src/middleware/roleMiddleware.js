export function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}
