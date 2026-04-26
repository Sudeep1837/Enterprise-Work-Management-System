import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/AuthPages";
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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Auth loading and error states", () => {
  test("shows an authenticating state while login is in flight and displays API errors", async () => {
    const user = userEvent.setup();
    const loginRequest = deferred();

    apiClient.post.mockReturnValue(loginRequest.promise);

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<h1>Dashboard Home</h1>} />
      </Routes>,
      {
        route: "/login",
        preloadedState: {
          auth: { user: null, token: null, initialized: true, status: "idle", error: null },
          work: { theme: "light", ui: {}, projects: [], tasks: [], users: [], notifications: [], activity: [], status: "idle", error: null },
        },
      },
    );

    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "admin@demo.com");
    await user.type(document.querySelector('input[type="password"]'), "WrongPass123");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    const loadingButton = await screen.findByRole("button", { name: /authenticating/i });
    expect(loadingButton).toBeDisabled();
    expect(screen.getByPlaceholderText(/you@company\.com/i)).toBeDisabled();

    loginRequest.reject({
      response: {
        data: {
          message: "Invalid email or password",
        },
      },
    });

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in to workspace/i })).toBeEnabled();
    });
    expect(screen.queryByRole("heading", { name: /dashboard home/i })).not.toBeInTheDocument();
  });
});
