import React from "react";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "../routes/ProtectedRoute";
import RoleGuard from "../routes/RoleGuard";
import { renderWithProviders } from "../test-utils/renderWithProviders";

describe("Route guards", () => {
  test("redirects unauthenticated users away from protected routes", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
        </Route>
      </Routes>,
      {
        route: "/dashboard",
        preloadedState: {
          auth: { user: null, token: null, initialized: true, status: "idle", error: null },
          work: { theme: "light", ui: {}, projects: [], tasks: [], users: [], notifications: [], activity: [], status: "idle", error: null },
        },
      },
    );

    expect(await screen.findByText("Login Screen")).toBeInTheDocument();
    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument();
  });

  test("shows the hydration loader while a token exists but auth is not initialized", () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
        </Route>
      </Routes>,
      {
        route: "/dashboard",
        preloadedState: {
          auth: { user: null, token: "jwt-token", initialized: false, status: "idle", error: null },
          work: { theme: "light", ui: {}, projects: [], tasks: [], users: [], notifications: [], activity: [], status: "idle", error: null },
        },
      },
    );

    expect(screen.getByText(/loading workspace/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument();
  });

  test("redirects users without the required role to the unauthorized page", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
        <Route element={<RoleGuard roles={["Admin", "Manager"]} />}>
          <Route path="/users" element={<div>Users Area</div>} />
        </Route>
      </Routes>,
      {
        route: "/users",
        preloadedState: {
          auth: {
            user: { id: "emp-1", role: "employee", name: "Employee User" },
            token: "token",
            initialized: true,
            status: "succeeded",
            error: null,
          },
          work: { theme: "light", ui: {}, projects: [], tasks: [], users: [], notifications: [], activity: [], status: "idle", error: null },
        },
      },
    );

    expect(await screen.findByText("Unauthorized")).toBeInTheDocument();
    expect(screen.queryByText("Users Area")).not.toBeInTheDocument();
  });
});
