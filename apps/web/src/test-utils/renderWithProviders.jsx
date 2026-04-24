import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router-dom";
import authReducer from "../store/authSlice";
import workReducer from "../store/workSlice";

export function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      work: workReducer,
    },
    preloadedState,
  });
}

export function renderWithProviders(
  ui,
  { preloadedState, store = createTestStore(preloadedState), route = "/" } = {},
) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
}

export function renderRouter(routes, { preloadedState, store = createTestStore(preloadedState), initialEntries = ["/"] } = {}) {
  const router = createMemoryRouter(routes, { initialEntries });

  return {
    store,
    router,
    ...render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>,
    ),
  };
}
