import React from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/AuthPages";
import ProtectedRoute from "../routes/ProtectedRoute";
import ProjectsPage from "../features/projects/ProjectsPage";
import TasksPage from "../features/tasks/TasksPage";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import apiClient from "../services/apiClient";

jest.mock("../services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

function DashboardStub() {
  return (
    <div>
      <h1>Dashboard Home</h1>
      <Link to="/projects">Projects</Link>
      <Link to="/tasks">Tasks</Link>
    </div>
  );
}

function TestShell({ children }) {
  return (
    <div>
      <nav>
        <Link to="/projects">Projects</Link>
        <Link to="/tasks">Tasks</Link>
      </nav>
      {children}
    </div>
  );
}

const admin = { id: "admin-1", name: "Asha Admin", email: "admin@demo.com", role: "admin", isActive: true };
const employee = { id: "emp-1", name: "Priya Product", email: "priya@demo.com", role: "employee", team: "Product", isActive: true };

describe("Project and task integration flow", () => {
  test("logs in, creates a project, and assigns a task to a user", async () => {
    const user = userEvent.setup();
    const createdProject = {
      id: "proj-1",
      name: "Project Atlas",
      ownerId: "admin-1",
      owner: "Asha Admin",
      status: "Active",
      updatedAt: "2099-01-01T00:00:00.000Z",
    };

    apiClient.post.mockImplementation((url, payload) => {
      if (url === "/auth/login") {
        return Promise.resolve({ data: { token: "jwt-token", user: admin } });
      }

      if (url === "/projects") {
        return Promise.resolve({ data: { ...createdProject, ...payload, id: "proj-1" } });
      }

      if (url === "/tasks") {
        return Promise.resolve({
          data: {
            id: "task-1",
            ...payload,
            status: payload.status || "Todo",
            priority: payload.priority || "Medium",
            type: payload.type || "Feature",
            updatedAt: "2099-01-02T00:00:00.000Z",
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardStub />} />
          <Route path="/projects" element={<TestShell><ProjectsPage /></TestShell>} />
          <Route path="/tasks" element={<TestShell><TasksPage /></TestShell>} />
        </Route>
      </Routes>,
      {
        route: "/login",
        preloadedState: {
          auth: { user: null, token: null, initialized: true, status: "idle", error: null },
          work: {
            theme: "light",
            ui: {},
            projects: [],
            tasks: [],
            users: [admin, employee],
            notifications: [],
            activity: [],
            status: "idle",
            error: null,
          },
        },
      },
    );

    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "ADMIN@DEMO.COM");
    await user.type(document.querySelector('input[type="password"]'), "Admin@123");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByRole("heading", { name: /dashboard home/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /^projects$/i }));
    await user.click(await screen.findByRole("button", { name: /new project/i }));
    await user.type(screen.getByLabelText(/^name$/i), "Project Atlas");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Project Atlas")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /^tasks$/i }));
    await user.click(await screen.findByRole("button", { name: /new task/i }));
    await user.type(screen.getByLabelText(/^title$/i), "Prepare launch checklist");
    await user.selectOptions(screen.getByLabelText(/assigned project/i), "proj-1");
    await user.selectOptions(screen.getByLabelText(/assignee/i), "emp-1");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    const taskCard = await screen.findByText("Prepare launch checklist");
    expect(taskCard).toBeInTheDocument();
    const renderedTask = within(taskCard.closest("article"));
    expect(renderedTask.getByText("Priya Product")).toBeInTheDocument();

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "admin@demo.com",
      password: "Admin@123",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/projects", {
      name: "Project Atlas",
      ownerId: "admin-1",
      owner: "Asha Admin",
      status: "Planning",
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/tasks",
      expect.objectContaining({
        title: "Prepare launch checklist",
        projectId: "proj-1",
        projectName: "Project Atlas",
        assigneeId: "emp-1",
        assigneeName: "Priya Product",
      }),
    );

    expect(renderedTask.getByText(/todo/i)).toBeInTheDocument();
  });
});
