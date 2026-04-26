import React from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserForm from "../features/users/components/UserForm";
import { renderWithProviders } from "../test-utils/renderWithProviders";

const admin = { id: "admin-1", name: "Asha Admin", role: "admin", isActive: true };
const productManager = { id: "mgr-1", name: "Mina Manager", role: "manager", team: "Engineering", isActive: true };
const inactiveManager = { id: "mgr-2", name: "Inactive Manager", role: "manager", team: "Engineering", isActive: false };
const designManager = { id: "mgr-3", name: "Dara Manager", role: "manager", team: "Design", isActive: true };

function renderUserForm(props = {}) {
  return renderWithProviders(
    <UserForm initialValues={{}} onSubmit={jest.fn()} onCancel={jest.fn()} {...props} />,
    {
      preloadedState: {
        auth: { user: admin, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [],
          tasks: [],
          users: [admin, productManager, inactiveManager, designManager],
          notifications: [],
          activity: [],
          status: "idle",
          error: null,
        },
      },
    },
  );
}

describe("UserForm", () => {
  test("requires employee team, reporting manager, and new-user password", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderUserForm({ onSubmit });

    await user.type(screen.getByLabelText(/name/i), "New Employee");
    await user.type(screen.getByLabelText(/email/i), "new.employee@demo.com");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByText(/team is required/i)).toBeInTheDocument();
    expect(screen.getByText(/reporting manager is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("filters reporting managers by selected team and excludes inactive managers", async () => {
    const user = userEvent.setup();
    renderUserForm();

    await user.selectOptions(screen.getByLabelText(/team/i), "Engineering");

    const managerSelect = screen.getByLabelText(/reporting manager/i);
    expect(within(managerSelect).getByRole("option", { name: /mina manager/i })).toBeInTheDocument();
    expect(within(managerSelect).queryByRole("option", { name: /inactive manager/i })).not.toBeInTheDocument();
    expect(within(managerSelect).queryByRole("option", { name: /dara manager/i })).not.toBeInTheDocument();
  });

  test("hides team and manager fields for admins and submits without a password on edit", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderUserForm({
      initialValues: { id: "admin-1", name: "Asha Admin", email: "asha@demo.com", role: "admin" },
      onSubmit,
    });

    expect(screen.queryByLabelText(/team/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reporting manager/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), "Asha Updated");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Asha Updated",
        email: "asha@demo.com",
        role: "admin",
        password: "",
      }),
      expect.anything(),
    );
  });
});
