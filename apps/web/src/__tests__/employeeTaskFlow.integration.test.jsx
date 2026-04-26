import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const employee = { id: "emp-1", name: "Priya Product", role: "employee", team: "Product" };
const otherEmployee = { id: "emp-2", name: "Dara Designer", role: "employee", team: "Design" };
const project = { id: "proj-1", name: "Project Atlas", ownerId: "mgr-1", members: ["emp-1"] };
const ownTask = {
  id: "task-1",
  title: "Update onboarding copy",
  projectId: "proj-1",
  projectName: "Project Atlas",
  assigneeId: "emp-1",
  assigneeName: "Priya Product",
  status: "Todo",
  priority: "Medium",
  type: "Feature",
  updatedAt: "2099-01-01T00:00:00.000Z",
};
const otherTask = {
  id: "task-2",
  title: "Design review",
  projectId: "proj-1",
  projectName: "Project Atlas",
  assigneeId: "emp-2",
  assigneeName: "Dara Designer",
  status: "Todo",
  priority: "High",
  type: "Bug",
  updatedAt: "2099-01-02T00:00:00.000Z",
};

describe("Employee task execution integration flow", () => {
  test("employee cannot create tasks, can update own status, and sees other tasks locked", async () => {
    const user = userEvent.setup();
    apiClient.put.mockResolvedValue({ data: { ...ownTask, status: "Done" } });

    renderWithProviders(<TasksPage />, {
      preloadedState: {
        auth: { user: employee, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [project],
          tasks: [ownTask, otherTask],
          users: [employee, otherEmployee],
          notifications: [],
          activity: [],
          status: "idle",
          error: null,
        },
      },
    });

    expect(screen.queryByRole("button", { name: /new task/i })).not.toBeInTheDocument();

    const ownCard = screen.getByText("Update onboarding copy").closest("article");
    const otherCard = screen.getByText("Design review").closest("article");

    await user.click(within(ownCard).getByRole("button", { name: /edit/i }));

    expect(await screen.findByText(/you can update the/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/assigned project/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/priority/i)).not.toBeInTheDocument();
    expect(within(otherCard).getByText(/locked/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^done$/i }));
    await user.click(screen.getByRole("button", { name: /save status/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/tasks/task-1", { status: "Done" });
    });
  });
});
