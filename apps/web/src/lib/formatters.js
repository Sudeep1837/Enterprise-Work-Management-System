/**
 * Centralized display formatters for the frontend UI.
 * Always format for display here — never scatter raw values.
 *
 * Internal values are always lowercase (admin/manager/employee).
 * Display labels are Title Case for the UI.
 */

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

const STATUS_LABELS = {
  true: "Active",
  false: "Inactive",
  online: "Online",
  offline: "Offline",
  busy: "Busy",
};

/**
 * Formats a lowercase role string into a display label.
 * @param {string} role - "admin" | "manager" | "employee"
 * @returns {string} "Admin" | "Manager" | "Employee" | role (fallback)
 */
export function formatRoleLabel(role) {
  if (!role) return "—";
  return ROLE_LABELS[role.toLowerCase()] || role;
}

/**
 * Returns a Tailwind color classes object for a role badge.
 * @param {string} role
 * @returns {{ bg: string, text: string }}
 */
export function getRoleColors(role) {
  switch (role?.toLowerCase()) {
    case "admin":
      return {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-700 dark:text-purple-300",
        dot: "bg-purple-500",
      };
    case "manager":
      return {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        text: "text-indigo-700 dark:text-indigo-300",
        dot: "bg-indigo-500",
      };
    case "employee":
    default:
      return {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-400",
        dot: "bg-slate-400",
      };
  }
}

/**
 * Formats a team string for display.
 * Teams are already Title Case; this is a pass-through with null safety.
 * @param {string} team
 * @returns {string}
 */
export function formatTeamLabel(team) {
  if (!team || !team.trim()) return "—";
  return team;
}

/**
 * Formats an active boolean into a display label.
 * @param {boolean} isActive
 * @returns {string}
 */
export function formatStatusLabel(isActive) {
  return isActive ? "Active" : "Inactive";
}

/**
 * Resolves the display name for a managerId field.
 * Handles: populated object { id, name, email }, raw string, or null.
 * @param {object|string|null} managerId
 * @returns {string}
 */
export function formatManagerName(managerId) {
  if (!managerId) return "—";
  if (typeof managerId === "object" && managerId.name) return managerId.name;
  // Raw ObjectId string — we can't resolve it without looking it up; show fallback
  return "—";
}
