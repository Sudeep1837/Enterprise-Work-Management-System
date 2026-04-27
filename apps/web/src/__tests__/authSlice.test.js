import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  changePasswordThunk,
  clearError,
  fetchMeThunk,
  loginThunk,
  logout,
  removeProfileImageThunk,
  signupThunk,
  updateProfileImageThunk,
  updateProfileThunk,
} from "../store/authSlice";
import { socketUserUpdated, updateUserAsync } from "../store/workSlice";
import apiClient from "../services/apiClient";

jest.mock("../services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

function makeAuthStore(preloadedAuth) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        initialized: true,
        status: "idle",
        profileImageStatus: "idle",
        error: null,
        ...preloadedAuth,
      },
    },
  });
}

describe("auth slice", () => {
  test("logout clears auth state", () => {
    localStorage.setItem("ewms:user", JSON.stringify({ id: "1" }));
    localStorage.setItem("ewms:token", "abc");

    const next = authReducer(
      { user: { id: "1" }, token: "abc", initialized: true, status: "succeeded", error: "old" },
      logout(),
    );

    expect(next.user).toBeNull();
    expect(next.token).toBeNull();
    expect(next.initialized).toBe(false);
    expect(next.error).toBeNull();
    expect(localStorage.getItem("ewms:user")).toBeNull();
    expect(localStorage.getItem("ewms:token")).toBeNull();
  });

  test("clearError removes an auth error without changing the session", () => {
    const next = authReducer(
      { user: { id: "1" }, token: "abc", initialized: true, status: "failed", error: "Nope" },
      clearError(),
    );

    expect(next.user.id).toBe("1");
    expect(next.error).toBeNull();
  });

  test("login normalizes email, stores session, and clears previous errors", async () => {
    const store = makeAuthStore({ initialized: false, error: "Old error" });
    apiClient.post.mockResolvedValue({
      data: { user: { id: "u1", name: "Asha", role: "admin" }, token: "jwt-token" },
    });

    await store.dispatch(loginThunk({ email: "  ASHA@EXAMPLE.COM ", password: "secret" }));

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "asha@example.com",
      password: "secret",
    });
    expect(store.getState().auth).toMatchObject({
      status: "succeeded",
      initialized: true,
      error: null,
      token: "jwt-token",
      user: { id: "u1", name: "Asha", role: "admin" },
    });
    expect(localStorage.getItem("ewms:token")).toBe("jwt-token");
  });

  test("signup rejection stores server validation feedback", async () => {
    const store = makeAuthStore();
    apiClient.post.mockRejectedValue({ response: { data: { message: "Email already registered" } } });

    await store.dispatch(signupThunk({ name: "Asha", email: "ASHA@EXAMPLE.COM", password: "secret" }));

    expect(apiClient.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.objectContaining({ email: "asha@example.com" }),
    );
    expect(store.getState().auth.status).toBe("failed");
    expect(store.getState().auth.error).toBe("Email already registered");
  });

  test("fetchMe hydrates a valid session and clears invalid stored sessions on auth failures", async () => {
    localStorage.setItem("ewms:user", JSON.stringify({ id: "stale" }));
    localStorage.setItem("ewms:token", "stale-token");
    const store = makeAuthStore({ user: { id: "stale" }, token: "stale-token", initialized: false });

    apiClient.get.mockResolvedValueOnce({ data: { user: { id: "fresh", name: "Fresh User" } } });
    await store.dispatch(fetchMeThunk());
    expect(store.getState().auth).toMatchObject({
      status: "succeeded",
      initialized: true,
      user: { id: "fresh", name: "Fresh User" },
    });

    apiClient.get.mockRejectedValueOnce({ response: { status: 401, data: { message: "Session expired" } } });
    await store.dispatch(fetchMeThunk());

    expect(store.getState().auth).toMatchObject({
      status: "failed",
      initialized: true,
      user: null,
      token: null,
      error: "Session expired",
    });
    expect(localStorage.getItem("ewms:token")).toBeNull();
  });

  test("profile and password thunks update success and failure state", async () => {
    const store = makeAuthStore({ user: { id: "u1", name: "Old Name", profileImageUrl: "/old.png" } });

    apiClient.patch.mockResolvedValueOnce({ data: { user: { name: "New Name", team: "Platform" } } });
    await store.dispatch(updateProfileThunk({ name: "New Name", team: "Platform" }));
    expect(store.getState().auth.user).toMatchObject({ id: "u1", name: "New Name", team: "Platform" });

    apiClient.patch.mockResolvedValueOnce({ data: { user: { profileImageUrl: "/new.png" } } });
    await store.dispatch(updateProfileImageThunk(new File(["avatar"], "avatar.png", { type: "image/png" })));
    expect(store.getState().auth.profileImageStatus).toBe("succeeded");
    expect(store.getState().auth.user.profileImageUrl).toBe("/new.png");

    apiClient.delete.mockResolvedValueOnce({ data: { user: { profileImageUrl: null } } });
    await store.dispatch(removeProfileImageThunk());
    expect(store.getState().auth.user.profileImageUrl).toBeNull();

    apiClient.patch.mockRejectedValueOnce({ response: { data: { message: "Current password is incorrect" } } });
    const passwordAction = await store.dispatch(changePasswordThunk({ currentPassword: "old", newPassword: "new" }));
    expect(passwordAction.payload).toBe("Current password is incorrect");
  });

  test("profile image failures use the dedicated image status", async () => {
    const store = makeAuthStore({ user: { id: "u1" } });
    apiClient.patch.mockRejectedValue({ response: { data: { message: "Image too large" } } });

    await store.dispatch(updateProfileImageThunk(new File(["large"], "large.png")));

    expect(store.getState().auth.profileImageStatus).toBe("failed");
    expect(store.getState().auth.error).toBe("Image too large");
  });

  test("admin and socket user updates synchronize the current auth user only when ids match", () => {
    const matchingState = {
      user: { id: "u1", name: "Old", role: "employee" },
      token: "token",
      initialized: true,
      status: "succeeded",
      error: null,
    };

    const afterAdminUpdate = authReducer(
      matchingState,
      updateUserAsync.fulfilled({ id: "u1", name: "New", role: "manager" }, "req", { id: "u1" }),
    );
    expect(afterAdminUpdate.user).toMatchObject({ name: "New", role: "manager" });

    const afterOtherUserUpdate = authReducer(
      afterAdminUpdate,
      socketUserUpdated({ id: "someone-else", name: "Other" }),
    );
    expect(afterOtherUserUpdate.user).toMatchObject({ id: "u1", name: "New", role: "manager" });

    const afterSocketUpdate = authReducer(afterOtherUserUpdate, socketUserUpdated({ _id: "u1", team: "Design" }));
    expect(afterSocketUpdate.user).toMatchObject({ id: "u1", team: "Design" });
  });
});
