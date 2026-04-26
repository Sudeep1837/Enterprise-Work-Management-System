import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette from "../features/search/CommandPalette";
import { renderWithProviders } from "../test-utils/renderWithProviders";

const baseState = {
  auth: {
    user: { id: "admin-1", role: "admin", name: "Olivia Chen" },
    token: "token",
    initialized: true,
    status: "succeeded",
    error: null,
  },
  work: {
    theme: "light",
    ui: {},
    projects: [],
    tasks: [],
    users: [],
    notifications: [],
    activity: [],
    telemetry: [],
    status: "idle",
    error: null,
  },
};

function renderPalette(props = {}) {
  const restoreFocusRef = { current: { focus: jest.fn() } };
  const onClose = jest.fn();

  renderWithProviders(
    <CommandPalette
      open
      onOpen={jest.fn()}
      onClose={onClose}
      restoreFocusRef={restoreFocusRef}
      {...props}
    />,
    { preloadedState: baseState, route: "/dashboard" },
  );

  return { onClose, restoreFocusRef };
}

describe("CommandPalette", () => {
  test("closes an empty search from the close button", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPalette();

    expect(screen.getByLabelText(/search workspace/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close search/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes an empty search on Escape", () => {
    const { onClose } = renderPalette();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes an empty search when clicking outside the dialog", () => {
    const { onClose } = renderPalette();

    fireEvent.pointerDown(screen.getByTestId("command-palette-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
