import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { LoginPage, SignupPage } from "../pages/AuthPages";
import { renderWithProviders } from "../test-utils/renderWithProviders";

describe("Auth pages", () => {
  test("renders the login form with the key workspace fields", () => {
    const view = renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    );

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@company\.com/i)).toBeInTheDocument();
    expect(view.container.querySelector('input[type="password"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in to workspace/i })).toBeInTheDocument();
  });

  test("blocks invalid login submission with meaningful validation messages", async () => {
    const user = userEvent.setup();

    const view = renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    );

    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "bad-email");
    await user.type(view.container.querySelector('input[type="password"]'), "short");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum 8 characters/i)).toBeInTheDocument();
  });

  test("enforces signup confirm-password validation before dispatching", async () => {
    const user = userEvent.setup();

    const view = renderWithProviders(
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
      </Routes>,
      { route: "/signup" },
    );

    const passwordInputs = view.container.querySelectorAll('input[type="password"]');

    await user.type(screen.getByPlaceholderText(/alex johnson/i), "Alex Johnson");
    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "alex@company.com");
    await user.type(passwordInputs[0], "Password123");
    await user.type(passwordInputs[1], "Password124");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
