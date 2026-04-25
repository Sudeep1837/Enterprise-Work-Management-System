import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordForm from "../features/settings/components/PasswordForm";
import { renderWithProviders } from "../test-utils/renderWithProviders";

describe("PasswordForm", () => {
  const fields = () => ({
    currentPassword: screen.getByLabelText("Current Password", { selector: "input" }),
    newPassword: screen.getByLabelText("New Password", { selector: "input" }),
    confirmPassword: screen.getByLabelText("Confirm New Password", { selector: "input" }),
  });

  test("requires matching confirmation before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await user.type(fields().currentPassword, "OldPass123");
    await user.type(fields().newPassword, "NewPass123");
    await user.type(fields().confirmPassword, "Mismatch123");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits current, new, and confirm password values", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue();

    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await user.type(fields().currentPassword, "OldPass123");
    await user.type(fields().newPassword, "NewPass123");
    await user.type(fields().confirmPassword, "NewPass123");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      currentPassword: "OldPass123",
      newPassword: "NewPass123",
      confirmPassword: "NewPass123",
    });
  });
});
