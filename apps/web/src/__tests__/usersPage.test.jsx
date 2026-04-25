import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPage from "../features/users/UsersPage";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import apiClient from "../services/apiClient";

jest.mock("../services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const users = [
  { id: "mgr-1", name: "Mina Manager", email: "mina@company.com", role: "manager", team: "Product", isActive: true },
  { id: "emp-1", name: "Priya Product", email: "priya@company.com", role: "employee", team: "Product", managerId: "mgr-1", isActive: true },
];

function getState(currentUser) {
  return {
    auth: { user: currentUser, token: "token", initialized: true, status: "succeeded", error: null },
    work: {
      theme: "light",
      ui: {},
      projects: [],
      tasks: [
        { id: "task-1", assigneeId: "emp-1", status: "Todo", dueDate: "2099-01-01T00:00:00.000Z" },
      ],
      users,
      notifications: [],
      activity: [],
      status: "idle",
      error: null,
    },
  };
}

describe("UsersPage", () => {
  test("keeps managers in a read-only scoped directory view", async () => {
    apiClient.get.mockResolvedValue({ data: { users } });

    renderWithProviders(<UsersPage />, {
      preloadedState: getState(users[0]),
    });

    expect(await screen.findByText(/your team/i)).toBeInTheDocument();
    expect(screen.getByText(/showing team members in your scope/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add user/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /actions/i })).not.toBeInTheDocument();
    expect(screen.getByText("Priya Product")).toBeInTheDocument();
    expect(screen.getAllByText("Mina Manager").length).toBeGreaterThan(0);
  });

  test("lets admins deactivate a user and updates the row state", async () => {
    const user = userEvent.setup();
    apiClient.get.mockResolvedValue({ data: { users } });
    apiClient.patch.mockResolvedValue({
      data: {
        user: { ...users[1], isActive: false },
      },
    });

    const { store } = renderWithProviders(<UsersPage />, {
      preloadedState: getState({ id: "admin-1", name: "Asha Admin", role: "admin" }),
    });

    const employeeRow = await screen.findByRole("row", { name: /priya product/i });
    await user.click(within(employeeRow).getByRole("button", { name: /deactivate/i }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/users/emp-1", { active: false });
      expect(store.getState().work.users.find((item) => item.id === "emp-1")?.isActive).toBe(false);
    });
  });
});
