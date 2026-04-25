import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { readStorage, writeStorage } from "../lib/storage";
import apiClient from "../services/apiClient";
import { getApiErrorMessage } from "../services/apiErrors";

// Thunks for API calls
const shouldFetchCollection = (state, key, statusKey, maxAgeMs = 60_000, options = {}) => {
  if (options.force) return true;
  const work = state.work;
  if (work[statusKey] === "loading") return false;
  const lastFetchedAt = work.lastFetchedAt?.[key] || 0;
  const hasData = Array.isArray(work[key]) && work[key].length > 0;
  return !hasData || Date.now() - lastFetchedAt > maxAgeMs;
};

export const fetchProjects = createAsyncThunk(
  "work/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/projects");
      return response.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to load projects"));
    }
  },
  {
    condition: (options, { getState }) =>
      shouldFetchCollection(getState(), "projects", "projectsStatus", 60_000, options),
  }
);

export const createProject = createAsyncThunk("work/createProject", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiClient.post("/projects", payload);
    return response.data;
  } catch (err) {
    const message = getApiErrorMessage(err, "Failed to create project");
    return rejectWithValue(message);
  }
});

export const updateProject = createAsyncThunk("work/updateProject", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const response = await apiClient.put(`/projects/${id}`, payload);
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to update project"));
  }
});

export const deleteProjectAsync = createAsyncThunk("work/deleteProject", async (id, { rejectWithValue }) => {
  try {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data || { id };
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to delete project"));
  }
});

export const fetchTasks = createAsyncThunk(
  "work/fetchTasks",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/tasks");
      return response.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to load tasks"));
    }
  },
  {
    condition: (options, { getState }) =>
      shouldFetchCollection(getState(), "tasks", "tasksStatus", 60_000, options),
  }
);

export const createTask = createAsyncThunk("work/createTask", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiClient.post("/tasks", payload);
    return response.data;
  } catch (err) {
    const message = getApiErrorMessage(err, "Failed to create task");
    return rejectWithValue(message);
  }
});

export const updateTaskAsync = createAsyncThunk("work/updateTask", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const response = await apiClient.put(`/tasks/${id}`, payload);
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to update task"));
  }
});

export const uploadTaskAttachmentAsync = createAsyncThunk(
  "work/uploadTaskAttachment",
  async ({ id, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post(`/tasks/${id}/attachments`, formData);
      return response.data.task;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to upload attachment"));
    }
  }
);

export const removeTaskAttachmentAsync = createAsyncThunk(
  "work/removeTaskAttachment",
  async ({ id, attachmentId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/tasks/${id}/attachments/${attachmentId}`);
      return response.data.task;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to remove attachment"));
    }
  }
);

export const moveTaskStatus = createAsyncThunk("work/moveTaskStatus", async ({ id, status }, { rejectWithValue }) => {
  try {
    const response = await apiClient.put(`/tasks/${id}/status`, { status });
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to update task status"));
  }
});

export const deleteTaskAsync = createAsyncThunk("work/deleteTask", async (id, { rejectWithValue }) => {
  try {
    const response = await apiClient.delete(`/tasks/${id}`);
    return response.data || { id };
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to delete task"));
  }
});

export const bulkUpdateTasksAsync = createAsyncThunk("work/bulkUpdateTasks", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiClient.patch("/tasks/bulk", payload);
    return response.data;
  } catch (err) {
    const message = getApiErrorMessage(err, "Failed to update selected tasks");
    return rejectWithValue(message);
  }
});

export const addTaskCommentAsync = createAsyncThunk("work/addTaskComment", async ({ id, content }, { rejectWithValue }) => {
  try {
    const response = await apiClient.post(`/tasks/${id}/comments`, { content });
    return { taskId: id, comment: response.data };
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to add comment"));
  }
});

export const fetchNotifications = createAsyncThunk(
  "work/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/notifications");
      return response.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to load notifications"));
    }
  },
  {
    condition: (options, { getState }) =>
      shouldFetchCollection(getState(), "notifications", "notificationsStatus", 30_000, options),
  }
);

export const markNotificationReadAsync = createAsyncThunk("work/markNotificationRead", async (id, { rejectWithValue }) => {
  try {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to update notification"));
  }
});

export const clearNotificationsAsync = createAsyncThunk("work/clearNotifications", async (_, { rejectWithValue }) => {
  try {
    await apiClient.delete("/notifications/clear");
    return [];
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to clear notifications"));
  }
});

export const markAllNotificationsReadAsync = createAsyncThunk("work/markAllNotificationsRead", async (_, { rejectWithValue }) => {
  try {
    await apiClient.put("/notifications/read-all");
    return true;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to update notifications"));
  }
});

export const fetchUsers = createAsyncThunk(
  "work/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users");
      return response.data.users;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to load users"));
    }
  },
  {
    condition: (options, { getState }) =>
      shouldFetchCollection(getState(), "users", "usersStatus", 60_000, options),
  }
);

export const createUserAsync = createAsyncThunk("work/createUser", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiClient.post("/users", payload);
    return response.data.user;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to create user"));
  }
});

export const updateUserAsync = createAsyncThunk("work/updateUser", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const response = await apiClient.patch(`/users/${id}`, payload);
    return response.data.user;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Failed to update user"));
  }
});

export const fetchActivity = createAsyncThunk(
  "work/fetchActivity",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/activity");
      return response.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, "Failed to load activity"));
    }
  },
  {
    condition: (options, { getState }) =>
      shouldFetchCollection(getState(), "activity", "activityStatus", 30_000, options),
  }
);

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
  projectsStatus: "idle",
  tasksStatus: "idle",
  usersStatus: "idle",
  notificationsStatus: "idle",
  activityStatus: "idle",
  lastFetchedAt: {},
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
      const payload = action.payload || {};
      const projectId = typeof payload === "string" ? payload : payload.id;
      const taskIds = typeof payload === "string" ? [] : payload.taskIds || [];
      const taskIdSet = new Set(taskIds.map((id) => id?.toString()));
      state.projects = state.projects.filter((p) => (p.id || p._id?.toString()) !== projectId);
      if (taskIdSet.size > 0) {
        state.tasks = state.tasks.filter((t) => !taskIdSet.has((t.id || t._id?.toString())?.toString()));
      } else {
        state.tasks = state.tasks.filter((t) => (t.projectId?._id || t.projectId)?.toString() !== projectId);
      }
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
      const payload = action.payload || {};
      const taskId = typeof payload === "string" ? payload : payload.id;
      state.tasks = state.tasks.filter((t) => (t.id || t._id?.toString()) !== taskId);
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
      .addCase(fetchProjects.pending, (state) => {
        state.projectsStatus = "loading";
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projects = action.payload;
        state.projectsStatus = "succeeded";
        if (!state.lastFetchedAt) state.lastFetchedAt = {};
        state.lastFetchedAt.projects = Date.now();
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.projectsStatus = "failed";
        state.error = action.payload || action.error.message || "Failed to load projects";
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
        const payload = action.payload || {};
        const projectId = typeof payload === "string" ? payload : payload.id;
        const taskIds = typeof payload === "string" ? [] : payload.taskIds || [];
        const taskIdSet = new Set(taskIds.map((id) => id?.toString()));
        state.projects = state.projects.filter((p) => (p.id || p._id?.toString()) !== projectId);
        if (taskIdSet.size > 0) {
          state.tasks = state.tasks.filter((t) => !taskIdSet.has((t.id || t._id?.toString())?.toString()));
        } else {
          state.tasks = state.tasks.filter((t) => (t.projectId?._id || t.projectId)?.toString() !== projectId);
        }
      })
      // Tasks
      .addCase(fetchTasks.pending, (state) => {
        state.tasksStatus = "loading";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.tasks = action.payload;
        state.tasksStatus = "succeeded";
        if (!state.lastFetchedAt) state.lastFetchedAt = {};
        state.lastFetchedAt.tasks = Date.now();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.tasksStatus = "failed";
        state.error = action.payload || action.error.message || "Failed to load tasks";
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
      .addCase(uploadTaskAttachmentAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => (t.id || t._id?.toString()) === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
      })
      .addCase(removeTaskAttachmentAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => (t.id || t._id?.toString()) === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
      })
      .addCase(moveTaskStatus.fulfilled, (state, action) => {
        const task = state.tasks.find((t) => t.id === action.payload.id);
        if (task) Object.assign(task, action.payload);
      })
      .addCase(deleteTaskAsync.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const taskId = typeof payload === "string" ? payload : payload.id;
        state.tasks = state.tasks.filter((t) => (t.id || t._id?.toString()) !== taskId);
      })
      .addCase(bulkUpdateTasksAsync.fulfilled, (state, action) => {
        action.payload.forEach((updatedTask) => {
          const index = state.tasks.findIndex((t) => (t.id || t._id?.toString()) === updatedTask.id);
          if (updatedTask.archived) {
            if (index !== -1) state.tasks.splice(index, 1);
            return;
          }
          if (index !== -1) state.tasks[index] = updatedTask;
        });
      })
      .addCase(bulkUpdateTasksAsync.rejected, (_state, action) => {
        toast.error(action.payload || "Bulk update failed");
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
      .addCase(fetchUsers.pending, (state) => {
        state.usersStatus = "loading";
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.usersStatus = "succeeded";
        if (!state.lastFetchedAt) state.lastFetchedAt = {};
        state.lastFetchedAt.users = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersStatus = "failed";
        state.error = action.payload || action.error.message || "Failed to load users";
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
      .addCase(fetchNotifications.pending, (state) => {
        state.notificationsStatus = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.notificationsStatus = "succeeded";
        if (!state.lastFetchedAt) state.lastFetchedAt = {};
        state.lastFetchedAt.notifications = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.notificationsStatus = "failed";
        state.error = action.payload || action.error.message || "Failed to load notifications";
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
      .addCase(fetchActivity.pending, (state) => {
        state.activityStatus = "loading";
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.activity = action.payload;
        state.activityStatus = "succeeded";
        if (!state.lastFetchedAt) state.lastFetchedAt = {};
        state.lastFetchedAt.activity = Date.now();
      })
      .addCase(fetchActivity.rejected, (state, action) => {
        state.activityStatus = "failed";
        state.error = action.payload || action.error.message || "Failed to load activity";
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
