import {
  canAssignTaskToUser,
  canCreateProject,
  canDeleteProject,
  canDeleteTask,
  canEditUser,
  canManageProject,
  canMoveTask,
  canUpdateTask,
  canUseProjectForTask,
  canViewProject,
  canViewTask,
} from "../lib/permissions";

const admin = { id: "admin-1", role: "admin", name: "Asha Admin" };
const productManager = { id: "mgr-1", role: "manager", name: "Mina Manager", team: "Product" };
const designManager = { id: "mgr-2", role: "manager", name: "Omar Manager", team: "Design" };
const productEmployee = { id: "emp-1", role: "employee", name: "Priya Product", team: "Product" };
const designEmployee = { id: "emp-2", role: "employee", name: "Dara Designer", team: "Design" };

const ownedProject = {
  id: "proj-1",
  ownerId: "mgr-1",
  members: ["emp-2"],
};
const otherProject = {
  id: "proj-2",
  ownerId: "mgr-2",
  members: ["emp-2"],
};

describe("permission helpers", () => {
  test("admin receives global project and task capabilities", () => {
    const task = { id: "task-1", assigneeId: "emp-1", reporterId: "mgr-1" };

    expect(canCreateProject(admin)).toBe(true);
    expect(canManageProject(admin, otherProject)).toBe(true);
    expect(canDeleteProject(admin, otherProject)).toBe(true);
    expect(canUseProjectForTask(admin, otherProject)).toBe(true);
    expect(canViewTask(admin, task)).toBe(true);
    expect(canUpdateTask(admin, task, otherProject)).toBe(true);
    expect(canDeleteTask(admin, task, otherProject)).toBe(true);
  });

  test("manager capabilities stay scoped to owned projects and eligible users", () => {
    expect(canCreateProject(productManager)).toBe(true);
    expect(canManageProject(productManager, ownedProject)).toBe(true);
    expect(canManageProject(productManager, otherProject)).toBe(false);
    expect(canUseProjectForTask(productManager, ownedProject)).toBe(true);
    expect(canUseProjectForTask(productManager, otherProject)).toBe(false);

    expect(canAssignTaskToUser(productManager, productEmployee, ownedProject)).toBe(true);
    expect(canAssignTaskToUser(productManager, designEmployee, ownedProject)).toBe(true);
    expect(canAssignTaskToUser(productManager, designManager, ownedProject)).toBe(false);
    expect(canAssignTaskToUser(productManager, admin, ownedProject)).toBe(false);
  });

  test("employee access is limited to assigned tasks and member projects", () => {
    const ownTask = { id: "task-1", assigneeId: "emp-1" };
    const otherTask = { id: "task-2", assigneeId: "emp-2" };

    expect(canCreateProject(productEmployee)).toBe(false);
    expect(canViewTask(productEmployee, ownTask)).toBe(true);
    expect(canViewTask(productEmployee, otherTask)).toBe(false);
    expect(canViewProject(designEmployee, ownedProject)).toBe(true);
    expect(canViewProject(productEmployee, ownedProject)).toBe(false);
    expect(canAssignTaskToUser(productEmployee, productEmployee, ownedProject)).toBe(true);
    expect(canAssignTaskToUser(productEmployee, designEmployee, ownedProject)).toBe(false);
  });

  test("task mutation permissions include manager ownership, reporter, membership, and assignee rules", () => {
    const ownedTask = { id: "task-1", assigneeId: "emp-2", reporterId: "emp-1" };
    const reportedTask = { id: "task-2", assigneeId: "emp-2", reporterId: "mgr-1" };
    const assignedTask = { id: "task-3", assigneeId: "mgr-1", reporterId: "emp-2" };

    expect(canUpdateTask(productManager, ownedTask, ownedProject)).toBe(true);
    expect(canDeleteTask(productManager, ownedTask, ownedProject)).toBe(true);
    expect(canDeleteTask(productManager, reportedTask, otherProject)).toBe(true);
    expect(canMoveTask(productManager, assignedTask, otherProject)).toBe(true);
    expect(canUpdateTask(productManager, ownedTask, otherProject)).toBe(false);
  });

  test("user editing permissions distinguish admin, manager team scope, and self edit", () => {
    expect(canEditUser(admin, designEmployee)).toBe(true);
    expect(canEditUser(productManager, productEmployee)).toBe(true);
    expect(canEditUser(productManager, designEmployee)).toBe(false);
    expect(canEditUser(productEmployee, productEmployee)).toBe(true);
    expect(canEditUser(productEmployee, designEmployee)).toBe(false);
  });
});
