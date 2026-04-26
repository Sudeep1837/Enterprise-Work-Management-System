import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import EmployeeTaskUpdate from "../features/tasks/components/EmployeeTaskUpdate";
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
const task = {
  id: "task-1",
  title: "Ship profile polish",
  projectName: "Project Atlas",
  status: "Todo",
  priority: "High",
  assigneeId: "emp-1",
};

function renderEmployeePanel(props = {}) {
  return renderWithProviders(
    <EmployeeTaskUpdate task={task} onCancel={jest.fn()} onSuccess={jest.fn()} {...props} />,
    {
      preloadedState: {
        auth: { user: employee, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [{ id: "proj-1", name: "Project Atlas", ownerId: "mgr-1" }],
          tasks: [task],
          users: [employee],
          notifications: [],
          activity: [],
          status: "idle",
          error: null,
        },
      },
    },
  );
}

describe("EmployeeTaskUpdate", () => {
  test("shows execution-only controls and hides restricted task-editing fields", () => {
    renderEmployeePanel();

    expect(screen.getByText(/you can update the/i)).toBeInTheDocument();
    expect(screen.getByText(/project, assignee, priority, and description are managed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save status/i })).toBeDisabled();
    expect(screen.queryByLabelText(/assigned project/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/priority/i)).not.toBeInTheDocument();
  });

  test("lets an employee update status through the task API", async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    apiClient.put.mockResolvedValue({ data: { ...task, status: "In Progress" } });

    renderEmployeePanel({ onSuccess });

    await user.click(screen.getByRole("button", { name: /in progress/i }));
    await user.click(screen.getByRole("button", { name: /save status/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/tasks/task-1", { status: "In Progress" });
    });
    expect(toast.success).toHaveBeenCalledWith("Task status updated.");
    expect(onSuccess).toHaveBeenCalled();
  });

  test("surfaces backend whitelist errors for unauthorized employee updates", async () => {
    const user = userEvent.setup();
    apiClient.put.mockRejectedValue(new Error("Employees can only update assigned task status"));

    renderEmployeePanel();

    await user.click(screen.getByRole("button", { name: /review/i }));
    await user.click(screen.getByRole("button", { name: /save status/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You can only update status on your own assigned tasks.");
    });
  });

  test("adds comments and clears the input after success", async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValue({ data: { id: "comment-1", content: "Looks good" } });

    renderEmployeePanel();

    await user.type(screen.getByPlaceholderText(/write a comment/i), "Looks good");
    await user.click(screen.getByRole("button", { name: /send comment/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/tasks/task-1/comments", { content: "Looks good" });
    });
    expect(screen.getByPlaceholderText(/write a comment/i)).toHaveValue("");
    expect(toast.success).toHaveBeenCalledWith("Comment added.");
  });
});
