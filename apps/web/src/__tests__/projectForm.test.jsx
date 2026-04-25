import React from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectForm from "../features/projects/components/ProjectForm";
import { renderWithProviders } from "../test-utils/renderWithProviders";

describe("ProjectForm", () => {
  test("locks managers to themselves as project owners on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const currentManager = { id: "mgr-1", name: "Mina Manager", role: "manager", team: "Product" };

    renderWithProviders(<ProjectForm initialValues={{}} onSubmit={onSubmit} onCancel={jest.fn()} />, {
      preloadedState: {
        auth: { user: currentManager, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [],
          tasks: [],
          users: [
            currentManager,
            { id: "mgr-2", name: "Other Manager", role: "manager", team: "Design", isActive: true },
            { id: "emp-1", name: "Employee One", role: "employee", team: "Product", isActive: true },
          ],
          notifications: [],
          activity: [],
          status: "idle",
          error: null,
        },
      },
    });

    expect(screen.getByText(/auto-set to you/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/name/i), "Project Atlas");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Project Atlas",
      ownerId: "mgr-1",
      owner: "Mina Manager",
      status: "Active",
    });
  });

  test("shows only admin and manager owner options for admins", () => {
    const currentAdmin = { id: "admin-1", name: "Asha Admin", role: "admin" };

    renderWithProviders(<ProjectForm initialValues={{}} onSubmit={jest.fn()} onCancel={jest.fn()} />, {
      preloadedState: {
        auth: { user: currentAdmin, token: "token", initialized: true, status: "succeeded", error: null },
        work: {
          theme: "light",
          ui: {},
          projects: [],
          tasks: [],
          users: [
            currentAdmin,
            { id: "mgr-1", name: "Mina Manager", role: "manager", team: "Product", isActive: true },
            { id: "mgr-2", name: "Ishan Manager", role: "manager", team: "Design", isActive: false },
            { id: "emp-1", name: "Employee One", role: "employee", team: "Product", isActive: true },
          ],
          notifications: [],
          activity: [],
          status: "idle",
          error: null,
        },
      },
    });

    const ownerSelect = screen.getAllByRole("combobox")[0];

    expect(within(ownerSelect).getByRole("option", { name: /asha admin/i })).toBeInTheDocument();
    expect(within(ownerSelect).getByRole("option", { name: /mina manager/i })).toBeInTheDocument();
    expect(within(ownerSelect).queryByRole("option", { name: /ishan manager/i })).not.toBeInTheDocument();
    expect(within(ownerSelect).queryByRole("option", { name: /employee one/i })).not.toBeInTheDocument();
  });
});
