import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "../features/notifications/NotificationsPage";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import apiClient from "../services/apiClient";

vi.mock("../services/apiClient", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("NotificationsPage", () => {
  test("renders a reassuring empty state when no notifications exist", () => {
    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        auth: { user: { id: "emp-1", role: "employee" }, token: "token", initialized: true, status: "succeeded", error: null },
        work: { theme: "light", ui: {}, projects: [], tasks: [], users: [], notifications: [], activity: [], status: "idle", error: null },
      },
    });

    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
  });

  test("renders rich notification content and marks all items as read", async () => {
    const user = userEvent.setup();
    apiClient.put.mockResolvedValue({ data: {} });

    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        auth: { user: { id: "mgr-1", role: "manager" }, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [],
          tasks: [],
          users: [],
          notifications: [
            {
              id: "notif-1",
              type: "assignment",
              actorName: "Asha Admin",
              action: "assigned",
              entityName: "Launch Portal",
              relatedEntityType: "task",
              read: false,
              createdAt: "2099-01-01T00:00:00.000Z",
            },
          ],
          activity: [],
          status: "idle",
          error: null,
        },
      },
    });

    expect(screen.getByText(/1 unread notification/i)).toBeInTheDocument();
    expect(screen.getByText("Asha Admin")).toBeInTheDocument();
    expect(screen.getByText("Launch Portal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mark all read/i }));

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
  });
});
