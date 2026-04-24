import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { readStorage, writeStorage } from "../lib/storage";
import apiClient from "../services/apiClient";

// Thunks for API calls
export const fetchProjects = createAsyncThunk("work/fetchProjects", async () => {
  const response = await apiClient.get("/projects");
  return response.data;
});

export const createProject = createAsyncThunk("work/createProject", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiClient.post("/projects", payload);
    return response.data;
  } catch (err) {
    const message = err.response?.data?.message || err.message || "Failed to create project";
    return rejectWithValue(message);
  }
});

export const updateProject = createAsyncThunk("work/updateProject", async ({ id, ...payload }) => {
  const response = await apiClient.put(`/projects/${id}`, payload);
  return response.data;
});

export const deleteProjectAsync = createAsyncThunk("work/deleteProject", async (id) => {
  await apiClient.delete(`/projects/${id}`);
  return id;
});

export const fetchTasks = createAsyncThunk("work/fetchTasks", async () => {
  const response = await apiClient.get("/tasks");
  return response.data;
});

export const createTask = createAsyncThunk("work/createTask", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiClient.post("/tasks", payload);
    return response.data;
  } catch (err) {
    const message = err.response?.data?.message || err.message || "Failed to create task";
    return rejectWithValue(message);
  }
});

export const updateTaskAsync = createAsyncThunk("work/updateTask", async ({ id, ...payload }) => {
  const response = await apiClient.put(`/tasks/${id}`, payload);
  return response.data;
});

export const moveTaskStatus = createAsyncThunk("work/moveTaskStatus", async ({ id, status }) => {
  const response = await apiClient.put(`/tasks/${id}/status`, { status });
  return response.data;
});

export const deleteTaskAsync = createAsyncThunk("work/deleteTask", async (id) => {
  await apiClient.delete(`/tasks/${id}`);
  return id;
});

export const addTaskCommentAsync = createAsyncThunk("work/addTaskComment", async ({ id, content }) => {
  const response = await apiClient.post(`/tasks/${id}/comments`, { content });
  return { taskId: id, comment: response.data };
});

export const fetchNotifications = createAsyncThunk("work/fetchNotifications", async () => {
  const response = await apiClient.get("/notifications");
  return response.data;
});

export const markNotificationReadAsync = createAsyncThunk("work/markNotificationRead", async (id) => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data;
});

export const clearNotificationsAsync = createAsyncThunk("work/clearNotifications", async () => {
  await apiClient.delete("/notifications/clear");
  return [];
});

export const markAllNotificationsReadAsync = createAsyncThunk("work/markAllNotificationsRead", async () => {
  await apiClient.put("/notifications/read-all");
  return true;
});

export const fetchUsers = createAsyncThunk("work/fetchUsers", async () => {
  const response = await apiClient.get("/users");
  return response.data.users;
});

export const createUserAsync = createAsyncThunk("work/createUser", async (payload) => {
  const response = await apiClient.post("/users", payload);
  return response.data.user;
});

export const updateUserAsync = createAsyncThunk("work/updateUser", async ({ id, ...payload }) => {
  const response = await apiClient.patch(`/users/${id}`, payload);
  return response.data.user;
});

export const fetchActivity = createAsyncThunk("work/fetchActivity", async () => {
  const response = await apiClient.get("/activity");
  return response.data;
});

const persisted = readStorage();

const initialState = {
  theme: persisted.theme || "light",
  ui: persisted.ui || { taskFilters: {}, projectFilters: {} },
  projects: [],
  tasks: [],
  users: [],
  notifications: [],
  activity: [],
  status: "idle",
  error: null,
};

const workSlice = createSlice({
  name: "work",
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      writeStorage(state);
    },
    setUiFilter: (state, action) => {
      state.ui = { ...(state.ui || {}), [action.payload.key]: action.payload.value };
      writeStorage(state);
    },
    // Real-time socket updates
    socketProjectUpserted: (state, action) => {
      // Payload has id (from toJSON transform on backend)
      const pid = action.payload.id || action.payload._id?.toString();
      const index = state.projects.findIndex((p) => (p.id || p._id?.toString()) === pid);
      if (index !== -1) {
        state.projects[index] = action.payload;
      } else {
        state.projects.unshift(action.payload);
      }
    },
    socketProjectDeleted: (state, action) => {
      state.projects = state.projects.filter((p) => (p.id || p._id?.toString()) !== action.payload);
    },
    socketTaskUpserted: (state, action) => {
      const tid = action.payload.id || action.payload._id?.toString();
      const index = state.tasks.findIndex((t) => (t.id || t._id?.toString()) === tid);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      } else {
        state.tasks.unshift(action.payload);
      }
    },
    socketTaskDeleted: (state, action) => {
      state.tasks = state.tasks.filter((t) => (t.id || t._id?.toString()) !== action.payload);
    },
    socketCommentAdded: (state, action) => {
      const tid = action.payload.taskId?.toString();
      const task = state.tasks.find((t) => (t.id || t._id?.toString()) === tid);
      if (task) {
        if (!task.comments) task.comments = [];
        task.comments.unshift(action.payload);
        task.commentsCount = (task.commentsCount || 0) + 1;
      }
    },
    socketNotificationCreated: (state, action) => {
      // Deduplicate: socket may fire before or after REST fulfilled
      const nid = action.payload.id || action.payload._id?.toString();
      const exists = state.notifications.some(
        (n) => (n.id || n._id?.toString()) === nid
      );
      if (!exists) {
        state.notifications.unshift(action.payload);
      }
    },
    socketActivityCreated: (state, action) => {
      // Deduplicate and cap at 30 items
      const aid = action.payload.id || action.payload._id?.toString();
      const exists = state.activity.some(
        (a) => (a.id || a._id?.toString()) === aid
      );
      if (!exists) {
        state.activity.unshift(action.payload);
        if (state.activity.length > 30) {
          state.activity = state.activity.slice(0, 30);
        }
      }
    },
    // EC12: cross-session user sync — emitted by userController after admin update
    socketUserUpdated: (state, action) => {
      const uid = action.payload.id || action.payload._id?.toString();
      const index = state.users.findIndex((u) => (u.id || u._id?.toString()) === uid);
      if (index !== -1) {
        state.users[index] = action.payload;
      } else {
        state.users.unshift(action.payload);
      }
    },
    clearNotificationsSync: (state) => {
      state.notifications = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Projects
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projects = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex((p) => (p.id || p._id?.toString()) === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        } else {
          state.projects.unshift(action.payload);
        }
      })
      .addCase(createProject.rejected, (_state, action) => {
        toast.error(`Project creation failed: ${action.payload}`);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.projects[index] = action.payload;
      })
      .addCase(deleteProjectAsync.fulfilled, (state, action) => {
        state.projects = state.projects.filter((p) => p.id !== action.payload);
      })
      // Tasks
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.tasks = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => (t.id || t._id?.toString()) === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        } else {
          state.tasks.unshift(action.payload);
        }
      })
      .addCase(createTask.rejected, (_state, action) => {
        toast.error(`Task creation failed: ${action.payload}`);
      })
      .addCase(updateTaskAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
      })
      .addCase(moveTaskStatus.fulfilled, (state, action) => {
        const task = state.tasks.find((t) => t.id === action.payload.id);
        if (task) Object.assign(task, action.payload);
      })
      .addCase(deleteTaskAsync.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      })
      // Comments
      .addCase(addTaskCommentAsync.fulfilled, (state, action) => {
        const task = state.tasks.find((t) => t.id === action.payload.taskId);
        if (task) {
          if (!task.comments) task.comments = [];
          task.comments.unshift(action.payload.comment);
          task.commentsCount = (task.commentsCount || 0) + 1;
        }
      })
      // Users
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })
      .addCase(createUserAsync.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => (u.id || u._id?.toString()) === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        } else {
          state.users.unshift(action.payload);
        }
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u.id === action.payload.id || u._id === action.payload.id || u.id === action.payload._id || u._id === action.payload._id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      // Notifications
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
      })
      .addCase(markNotificationReadAsync.fulfilled, (state, action) => {
        const notification = state.notifications.find((n) => n.id === action.payload.id);
        if (notification) notification.read = true;
      })
      .addCase(clearNotificationsAsync.fulfilled, (state) => {
        state.notifications = [];
      })
      .addCase(markAllNotificationsReadAsync.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
      })
      // Activity
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.activity = action.payload;
      });
  },
});

export const {
  setTheme,
  setUiFilter,
  socketProjectUpserted,
  socketProjectDeleted,
  socketTaskUpserted,
  socketTaskDeleted,
  socketCommentAdded,
  socketNotificationCreated,
  socketActivityCreated,
  socketUserUpdated,
  clearNotificationsSync,
} = workSlice.actions;

export default workSlice.reducer;
