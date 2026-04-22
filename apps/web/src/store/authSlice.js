import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../services/apiClient";

const storedToken = localStorage.getItem("ewms:token");
const storedUser = JSON.parse(localStorage.getItem("ewms:user") || "null");

const initialState = {
  user: storedUser,
  token: storedToken,
  // No token = no session to initialize. Token present = wait for /me hydration.
  initialized: !storedToken,
  status: "idle",
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
      return rejectWithValue(err.response?.data?.message || err.message);
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
      .addCase(fetchMeThunk.rejected, (state) => {
        // Token invalid / expired — clear session
        state.status = "failed";
        state.initialized = true;
        state.user = null;
        state.token = null;
        localStorage.removeItem("ewms:user");
        localStorage.removeItem("ewms:token");
      })

      // UPDATE PROFILE
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload.user };
        localStorage.setItem("ewms:user", JSON.stringify(state.user));
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
