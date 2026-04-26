import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "../features/notifications/NotificationsPage";
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

  test("keeps bulk notification controls hidden from managers", () => {
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
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
  });

  test("renders rich notification content and lets users clear their own notifications", async () => {
    const user = userEvent.setup();
    apiClient.delete.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        auth: { user: { id: "admin-1", role: "admin" }, token: "token", initialized: true, status: "succeeded", error: null },
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

    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear mine/i }));
    await user.click(screen.getByRole("button", { name: /confirm action/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/all caught up/i).length).toBeGreaterThan(0);
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/notifications/clear");
  });

  test("renders notification actor names from current user identity", () => {
    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        auth: { user: { id: "emp-1", role: "employee" }, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [],
          tasks: [],
          users: [{ id: "actor-1", name: "Sudeep Dehury" }],
          notifications: [
            {
              id: "notif-1",
              type: "assignment",
              actorId: "actor-1",
              actorName: "Olivia Chen",
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

    expect(screen.getByText("Sudeep Dehury")).toBeInTheDocument();
    expect(screen.queryByText("Olivia Chen")).not.toBeInTheDocument();
  });

  test("lets a user delete their own notification", async () => {
    const user = userEvent.setup();
    apiClient.delete.mockResolvedValue({ data: { success: true, id: "notif-1" } });

    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        auth: { user: { id: "emp-1", role: "employee" }, token: "token", initialized: true, status: "succeeded", error: null },
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

    await user.click(screen.getByRole("button", { name: /delete notification/i }));

    expect(apiClient.delete).toHaveBeenCalledWith("/notifications/notif-1");
    await waitFor(() => {
      expect(screen.queryByText("Launch Portal")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
  });
});
