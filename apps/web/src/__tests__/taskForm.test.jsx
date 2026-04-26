import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskForm from "../features/tasks/components/TaskForm";
import { renderWithProviders } from "../test-utils/renderWithProviders";

const manager = { id: "mgr-1", name: "Mina Manager", role: "manager", team: "Product" };
const baseProjects = [
  { id: "proj-owned", name: "Owned Platform", ownerId: "mgr-1", members: ["emp-2"] },
  { id: "proj-other", name: "Other Team Project", ownerId: "mgr-2", members: [] },
];
const baseUsers = [
  { id: "mgr-1", name: "Mina Manager", role: "manager", team: "Product", isActive: true },
  { id: "mgr-2", name: "Omar Manager", role: "manager", team: "Design", isActive: true },
  { id: "admin-1", name: "Asha Admin", role: "admin", team: null, isActive: true },
  { id: "emp-1", name: "Priya Product", role: "employee", team: "Product", isActive: true },
  { id: "emp-2", name: "Dara Designer", role: "employee", team: "Design", isActive: true },
  { id: "emp-3", name: "Inactive Dev", role: "employee", team: "Product", isActive: false },
];

describe("TaskForm", () => {
  test("validates the required business fields before saving a task", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    renderWithProviders(<TaskForm initialValues={{}} onSubmit={onSubmit} onCancel={jest.fn()} />, {
      preloadedState: {
        auth: { user: manager, token: "token", initialized: true, status: "succeeded", error: null },
        work: { theme: "light", ui: {}, projects: baseProjects, tasks: [], users: baseUsers, notifications: [], activity: [], status: "idle", error: null },
      },
    });

    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/project assignment is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("limits manager project and assignee options to their allowed scope", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TaskForm initialValues={{ status: "Todo", priority: "Medium", type: "Feature" }} onSubmit={jest.fn()} onCancel={jest.fn()} />, {
      preloadedState: {
        auth: { user: manager, token: "token", initialized: true, status: "succeeded", error: null },
        work: { theme: "light", ui: {}, projects: baseProjects, tasks: [], users: baseUsers, notifications: [], activity: [], status: "idle", error: null },
      },
    });

    const projectSelect = screen.getByLabelText(/assigned project/i);
    const assigneeSelect = screen.getByLabelText(/assignee/i);

    expect(within(projectSelect).getByRole("option", { name: /owned platform/i })).toBeInTheDocument();
    expect(within(projectSelect).queryByRole("option", { name: /other team project/i })).not.toBeInTheDocument();

    await user.selectOptions(projectSelect, "proj-owned");

    expect(within(assigneeSelect).getByRole("option", { name: /mina manager/i })).toBeInTheDocument();
    expect(within(assigneeSelect).getByRole("option", { name: /priya product/i })).toBeInTheDocument();
    expect(within(assigneeSelect).getByRole("option", { name: /dara designer/i })).toBeInTheDocument();
    expect(within(assigneeSelect).queryByRole("option", { name: /asha admin/i })).not.toBeInTheDocument();
    expect(within(assigneeSelect).queryByRole("option", { name: /omar manager/i })).not.toBeInTheDocument();
    expect(within(assigneeSelect).queryByRole("option", { name: /inactive dev/i })).not.toBeInTheDocument();
  });

  test("prevents saving a task with a past due date", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().slice(0, 10);

    renderWithProviders(
      <TaskForm
        initialValues={{ status: "Todo", priority: "Medium", type: "Feature" }}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
      {
        preloadedState: {
          auth: { user: manager, token: "token", initialized: true, status: "succeeded", error: null },
          work: { theme: "light", ui: {}, projects: baseProjects, tasks: [], users: baseUsers, notifications: [], activity: [], status: "idle", error: null },
        },
      },
    );

    await user.type(screen.getByLabelText(/title/i), "Past due task");
    await user.selectOptions(screen.getByLabelText(/assigned project/i), "proj-owned");
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: pastDate } });
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByText(/due date cannot be in the past/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toHaveAttribute("min");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
