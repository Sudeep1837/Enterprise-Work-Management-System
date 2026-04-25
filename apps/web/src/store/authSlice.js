import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../services/apiClient";
import { updateUserAsync } from "./workSlice";

const storedToken = localStorage.getItem("ewms:token");
const storedUser = JSON.parse(localStorage.getItem("ewms:user") || "null");

const initialState = {
  user: storedUser,
  token: storedToken,
  // No token = no session to initialize. Token present = wait for /me hydration.
  initialized: !storedToken,
  status: "idle",
  profileImageStatus: "idle",
  error: null,
};

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/login", {
        email: (payload.email || "").trim().toLowerCase(),
        password: payload.password,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Login failed");
    }
  }
);

export const signupThunk = createAsyncThunk(
  "auth/signup",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/signup", {
        ...payload,
        email: (payload.email || "").trim().toLowerCase(),
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Signup failed");
    }
  }
);

export const fetchMeThunk = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/auth/me");
      return response.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Session refresh failed",
        status: err.response?.status || 0,
      });
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch("/auth/profile", payload);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Update failed");
    }
  }
);

export const updateProfileImageThunk = createAsyncThunk(
  "auth/updateProfileImage",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      const response = await apiClient.patch("/auth/profile/image", formData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Image upload failed");
    }
  }
);

export const removeProfileImageThunk = createAsyncThunk(
  "auth/removeProfileImage",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete("/auth/profile/image");
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Image removal failed");
    }
  }
);

export const changePasswordThunk = createAsyncThunk(
  "auth/changePassword",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch("/auth/change-password", payload);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Password update failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.initialized = false;
      state.status = "idle";
      state.error = null;
      localStorage.removeItem("ewms:user");
      localStorage.removeItem("ewms:token");
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.initialized = true;
        state.error = null;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("ewms:user", JSON.stringify(action.payload.user));
        localStorage.setItem("ewms:token", action.payload.token);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })

      // SIGNUP
      .addCase(signupThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.initialized = true;
        state.error = null;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("ewms:user", JSON.stringify(action.payload.user));
        localStorage.setItem("ewms:token", action.payload.token);
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })

      // FETCH ME (hydrate on app load)
      .addCase(fetchMeThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.initialized = true;
        state.user = action.payload.user;
        localStorage.setItem("ewms:user", JSON.stringify(action.payload.user));
      })
      .addCase(fetchMeThunk.rejected, (state, action) => {
        const status = action.payload?.status;
        state.status = "failed";
        state.initialized = true;
        state.error = action.payload?.message || action.error.message;

        if (status === 401 || status === 403 || status === 404) {
          state.user = null;
          state.token = null;
          localStorage.removeItem("ewms:user");
          localStorage.removeItem("ewms:token");
        }
      })

      // UPDATE PROFILE
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload.user };
        localStorage.setItem("ewms:user", JSON.stringify(state.user));
      })

      // UPDATE PROFILE IMAGE
      .addCase(updateProfileImageThunk.pending, (state) => {
        state.profileImageStatus = "loading";
        state.error = null;
      })
      .addCase(updateProfileImageThunk.fulfilled, (state, action) => {
        state.profileImageStatus = "succeeded";
        state.user = { ...state.user, ...action.payload.user };
        localStorage.setItem("ewms:user", JSON.stringify(state.user));
      })
      .addCase(updateProfileImageThunk.rejected, (state, action) => {
        state.profileImageStatus = "failed";
        state.error = action.payload || action.error.message;
      })

      // REMOVE PROFILE IMAGE
      .addCase(removeProfileImageThunk.pending, (state) => {
        state.profileImageStatus = "loading";
        state.error = null;
      })
      .addCase(removeProfileImageThunk.fulfilled, (state, action) => {
        state.profileImageStatus = "succeeded";
        state.user = { ...state.user, ...action.payload.user };
        localStorage.setItem("ewms:user", JSON.stringify(state.user));
      })
      .addCase(removeProfileImageThunk.rejected, (state, action) => {
        state.profileImageStatus = "failed";
        state.error = action.payload || action.error.message;
      })

      // EC2: if admin edits the currently-logged-in user, keep auth.user in sync
      // so permission helpers (isAdmin, isManager, etc.) reflect the new role/team instantly
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        const updatedId = action.payload?.id || action.payload?._id?.toString();
        const currentId = state.user?.id   || state.user?._id?.toString();
        if (updatedId && currentId && updatedId === currentId) {
          state.user = { ...state.user, ...action.payload };
          localStorage.setItem("ewms:user", JSON.stringify(state.user));
        }
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
