// Internal role values — always lowercase.
// These are what get stored in DB and sent in API payloads.
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
};

// Teams available across the org.
// Kept as a plain string array — no separate Team schema needed.
export const TEAMS = ["Engineering", "Design", "Marketing", "Operations"];

export const TASK_STATUSES = ["Todo", "In Progress", "Review", "Done"];
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const TASK_TYPES = ["Bug", "Feature", "Improvement"];
export const PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed"];
