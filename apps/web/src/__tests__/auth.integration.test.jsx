import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/AuthPages";
import ProtectedRoute from "../routes/ProtectedRoute";
import RoleGuard from "../routes/RoleGuard";
import UsersPage from "../features/users/UsersPage";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import apiClient from "../services/apiClient";

vi.mock("../services/apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function DashboardStub() {
  return (
    <div>
      <h1>Dashboard Home</h1>
      <Link to="/users">Users</Link>
    </div>
  );
}

describe("Authentication integration flow", () => {
  test("logs in as an admin and reaches a protected admin route through real navigation", async () => {
    const user = userEvent.setup();

    apiClient.post.mockResolvedValue({
      data: {
        token: "jwt-token",
        user: { id: "admin-1", name: "Asha Admin", role: "admin" },
      },
    });

    apiClient.get.mockImplementation((url) => {
      if (url === "/users") {
        return Promise.resolve({
          data: {
            users: [
              { id: "admin-1", name: "Asha Admin", email: "admin@demo.com", role: "admin", isActive: true },
              { id: "mgr-1", name: "Mina Manager", email: "manager@demo.com", role: "manager", team: "Product", isActive: true },
            ],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const view = renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardStub />} />
          <Route element={<RoleGuard roles={["Admin", "Manager"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Routes>,
      {
        route: "/login",
        preloadedState: {
          auth: { user: null, token: null, initialized: true, status: "idle", error: null },
          work: { theme: "light", ui: {}, projects: [], tasks: [], users: [], notifications: [], activity: [], status: "idle", error: null },
        },
      },
    );

    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "ADMIN@DEMO.COM");
    await user.type(view.container.querySelector('input[type="password"]'), "Admin@123");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByRole("heading", { name: /dashboard home/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /^users$/i }));

    expect(await screen.findByRole("heading", { name: /team directory/i })).toBeInTheDocument();
    expect(screen.getByText("Mina Manager")).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "admin@demo.com",
      password: "Admin@123",
    });
    expect(apiClient.get).toHaveBeenCalledWith("/users");
  });
});
