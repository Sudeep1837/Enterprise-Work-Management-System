import React from "react";
import { screen } from "@testing-library/react";
import DashboardPage from "../features/dashboard/DashboardPage";
import { renderWithProviders } from "../test-utils/renderWithProviders";

const manager = { id: "mgr-1", name: "Mina Manager", role: "manager", team: "Product" };
const employee = {
  id: "emp-1",
  name: "Priya Product",
  role: "employee",
  team: "Product",
  managerId: { id: "mgr-1", name: "Mina Manager", email: "mina@demo.com", team: "Product" },
};

const baseWork = {
  theme: "light",
  ui: {},
  projects: [
    { id: "proj-1", name: "Project Atlas", status: "Active", ownerId: "mgr-1", members: ["emp-1"], updatedAt: "2099-01-01T00:00:00.000Z" },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Launch checklist",
      projectId: "proj-1",
      projectName: "Project Atlas",
      assigneeId: "emp-1",
      assigneeName: "Priya Product",
      priority: "High",
      status: "Todo",
      dueDate: "2099-01-05T00:00:00.000Z",
      updatedAt: "2099-01-02T00:00:00.000Z",
    },
    {
      id: "task-2",
      title: "Done task",
      projectId: "proj-1",
      assigneeId: "emp-1",
      priority: "Low",
      status: "Done",
      updatedAt: "2099-01-03T00:00:00.000Z",
    },
  ],
  users: [manager, employee],
  notifications: [],
  activity: [],
  telemetry: [
    {
      id: "telemetry-1",
      action: "Task Created",
      actorName: "Mina Manager",
      entityName: "Launch checklist",
      entityType: "task",
      createdAt: new Date().toISOString(),
    },
  ],
  status: "idle",
  error: null,
};

function renderDashboard(currentUser, workOverrides = {}) {
  return renderWithProviders(<DashboardPage />, {
    preloadedState: {
      auth: { user: currentUser, token: "token", initialized: true, status: "succeeded", error: null },
      work: { ...baseWork, ...workOverrides },
    },
  });
}

describe("DashboardPage", () => {
  test("renders manager operations metrics and team telemetry controls", () => {
    renderDashboard(manager);

    expect(screen.getByRole("heading", { name: /team operations/i })).toBeInTheDocument();
    expect(screen.getByText(/project and team delivery status/i)).toBeInTheDocument();
    expect(screen.getByText(/active execution/i)).toBeInTheDocument();
    expect(screen.getByText("Team Workload")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear mine/i })).toBeInTheDocument();
  });

  test("renders employee personal dashboard without admin-manager workload section", () => {
    renderDashboard(employee);

    expect(screen.getByRole("heading", { name: /my workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/your tasks, deadlines and workload/i)).toBeInTheDocument();
    expect(screen.getByText(/working under/i)).toBeInTheDocument();
    expect(screen.getByText("Mina Manager")).toBeInTheDocument();
    expect(screen.getByText("Launch checklist")).toBeInTheDocument();
    expect(screen.queryByText(/team workload distribution/i)).not.toBeInTheDocument();
  });
});
