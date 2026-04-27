import { toast } from "react-toastify";
import workReducer, {
  addTaskCommentAsync,
  bulkUpdateTasksAsync,
  clearActivityFeedSync,
  clearNotificationsAsync,
  clearNotificationsSync,
  clearTelemetryFeedAsync,
  clearTelemetryFeedSync,
  createProject,
  createTask,
  createUserAsync,
  deleteNotificationAsync,
  deleteProjectAsync,
  deleteTaskAsync,
  fetchActivity,
  fetchNotifications,
  fetchProjects,
  fetchTasks,
  fetchTelemetry,
  fetchUsers,
  markAllNotificationsReadAsync,
  markNotificationReadAsync,
  moveTaskStatus,
  removeTaskAttachmentAsync,
  setTheme,
  setUiFilter,
  socketActivityCreated,
  socketCommentAdded,
  socketNotificationCreated,
  socketNotificationDeleted,
  socketNotificationsAllRead,
  socketProjectDeleted,
  socketProjectUpserted,
  socketTaskDeleted,
  socketTaskUpserted,
  socketUserUpdated,
  updateProject,
  updateTaskAsync,
  updateUserAsync,
  uploadTaskAttachmentAsync,
} from "../store/workSlice";

describe("work slice", () => {
  test("updates theme", () => {
    const next = workReducer(undefined, setTheme("dark"));
    expect(next.theme).toBe("dark");
  });

  test("adds project via fulfilled action", () => {
    const action = { type: "work/createProject/fulfilled", payload: { id: "p1", name: "Alpha" } };
    const next = workReducer(undefined, action);
    expect(next.projects[0].name).toBe("Alpha");
  });

  test("persists UI filters without losing other UI buckets", () => {
    const state = workReducer(
      { ...workReducer(undefined, { type: "init" }), ui: { projectFilters: { status: "Active" } } },
      setUiFilter({ key: "taskFilters", value: { status: "Todo", priority: "High" } }),
    );

    expect(state.ui).toEqual({
      projectFilters: { status: "Active" },
      taskFilters: { status: "Todo", priority: "High" },
    });
  });

  test("handles project upserts, deletions, and related task cleanup from sockets and fulfilled actions", () => {
    const base = {
      ...workReducer(undefined, { type: "init" }),
      projects: [{ _id: "p1", name: "Old" }, { id: "p2", name: "Keep" }],
      tasks: [
        { id: "t1", projectId: "p1" },
        { id: "t2", projectId: { _id: "p1" } },
        { id: "t3", projectId: "p2" },
      ],
    };

    const upserted = workReducer(base, socketProjectUpserted({ id: "p1", name: "Updated" }));
    expect(upserted.projects.find((project) => project.id === "p1").name).toBe("Updated");

    const inserted = workReducer(upserted, socketProjectUpserted({ id: "p3", name: "Inserted" }));
    expect(inserted.projects[0].id).toBe("p3");

    const socketDeleted = workReducer(inserted, socketProjectDeleted({ id: "p1", taskIds: ["t1"] }));
    expect(socketDeleted.projects.some((project) => project.id === "p1" || project._id === "p1")).toBe(false);
    expect(socketDeleted.tasks.map((task) => task.id)).toEqual(["t2", "t3"]);

    const fulfilledDeleted = workReducer(socketDeleted, deleteProjectAsync.fulfilled({ id: "p2" }, "req", "p2"));
    expect(fulfilledDeleted.tasks).toEqual([{ id: "t2", projectId: { _id: "p1" } }]);
  });

  test("handles task upserts, comments, attachments, status moves, bulk updates, and deletes", () => {
    const base = {
      ...workReducer(undefined, { type: "init" }),
      tasks: [{ id: "t1", title: "Old", status: "Todo", commentsCount: 0 }],
    };

    let state = workReducer(base, socketTaskUpserted({ id: "t1", title: "Updated", status: "Todo" }));
    state = workReducer(state, socketTaskUpserted({ id: "t2", title: "New", status: "Todo" }));
    expect(state.tasks.map((task) => task.title)).toEqual(["New", "Updated"]);

    state = workReducer(state, socketCommentAdded({ taskId: "t1", id: "c1", content: "Looks good" }));
    state = workReducer(state, addTaskCommentAsync.fulfilled({ taskId: "t1", comment: { id: "c2" } }, "req", {}));
    expect(state.tasks.find((task) => task.id === "t1").comments).toHaveLength(2);

    state = workReducer(state, uploadTaskAttachmentAsync.fulfilled({ id: "t1", attachments: [{ id: "a1" }] }, "req", {}));
    expect(state.tasks.find((task) => task.id === "t1").attachments).toHaveLength(1);

    state = workReducer(state, removeTaskAttachmentAsync.fulfilled({ id: "t1", attachments: [] }, "req", {}));
    state = workReducer(state, moveTaskStatus.fulfilled({ id: "t1", status: "Done" }, "req", {}));
    state = workReducer(
      state,
      bulkUpdateTasksAsync.fulfilled([{ id: "t1", title: "Bulk Updated", status: "Done" }], "req", {}),
    );
    state = workReducer(state, socketTaskDeleted({ id: "t2" }));
    state = workReducer(state, deleteTaskAsync.fulfilled({ id: "missing" }, "req", "missing"));

    expect(state.tasks).toEqual([{ id: "t1", title: "Bulk Updated", status: "Done" }]);
  });

  test("handles notification read, delete, clear, and realtime dedupe branches", () => {
    const base = {
      ...workReducer(undefined, { type: "init" }),
      notifications: [
        { id: "n1", title: "Assigned", read: false },
        { _id: "n2", title: "Due soon", read: false },
      ],
    };

    let state = workReducer(base, socketNotificationCreated({ id: "n1", title: "Duplicate" }));
    state = workReducer(state, socketNotificationCreated({ id: "n3", title: "Fresh", read: false }));
    expect(state.notifications.map((notification) => notification.id || notification._id)).toEqual(["n3", "n1", "n2"]);

    state = workReducer(state, markNotificationReadAsync.fulfilled({ id: "n1" }, "req", "n1"));
    expect(state.notifications.find((notification) => notification.id === "n1").read).toBe(true);

    state = workReducer(state, socketNotificationsAllRead());
    expect(state.notifications.every((notification) => notification.read)).toBe(true);

    state = workReducer(state, socketNotificationDeleted("n2"));
    state = workReducer(state, deleteNotificationAsync.fulfilled({}, "req", "n1"));
    expect(state.notifications.map((notification) => notification.id)).toEqual(["n3"]);

    state = workReducer(state, markAllNotificationsReadAsync.fulfilled(true, "req"));
    state = workReducer(state, clearNotificationsAsync.fulfilled([], "req"));
    expect(state.notifications).toEqual([]);

    state = workReducer({ ...base }, clearNotificationsSync());
    expect(state.notifications).toEqual([]);
  });

  test("caps and clears activity and telemetry feeds", () => {
    const existing = Array.from({ length: 30 }, (_, index) => ({ id: `a${index}` }));
    let state = workReducer(
      { ...workReducer(undefined, { type: "init" }), activity: existing, telemetry: existing },
      socketActivityCreated({ _id: "new-activity", action: "Task updated" }),
    );

    expect(state.activity).toHaveLength(30);
    expect(state.activity[0]._id).toBe("new-activity");
    expect(state.telemetry[0]._id).toBe("new-activity");

    state = workReducer(state, clearActivityFeedSync());
    state = workReducer(state, clearTelemetryFeedSync());
    expect(state.activity).toEqual([]);
    expect(state.telemetry).toEqual([]);

    state = workReducer({ ...state, activity: [{ id: "a1" }], telemetry: [{ id: "t1" }] }, clearTelemetryFeedAsync.fulfilled([], "req"));
    state = workReducer(state, clearActivityFeedSync());
    expect(state.activity).toEqual([]);
    expect(state.telemetry).toEqual([]);
  });

  test("handles user create, update, and realtime upsert branches", () => {
    const base = {
      ...workReducer(undefined, { type: "init" }),
      users: [{ _id: "u1", name: "Old User" }],
    };

    let state = workReducer(base, createUserAsync.fulfilled({ id: "u2", name: "New User" }, "req", {}));
    state = workReducer(state, createUserAsync.fulfilled({ id: "u2", name: "Updated New User" }, "req", {}));
    state = workReducer(state, updateUserAsync.fulfilled({ id: "u1", name: "Updated User" }, "req", {}));
    state = workReducer(state, socketUserUpdated({ id: "u3", name: "Socket User" }));

    expect(state.users.map((user) => user.name)).toEqual(["Socket User", "Updated New User", "Updated User"]);
  });

  test("records loading, success, stale timestamps, and rejected errors for collection thunks", () => {
    let state = workReducer(undefined, fetchTasks.pending("req"));
    expect(state.tasksStatus).toBe("loading");

    state = workReducer(state, fetchTasks.fulfilled([{ id: "t1" }], "req"));
    expect(state.tasksStatus).toBe("succeeded");
    expect(state.lastFetchedAt.tasks).toEqual(expect.any(Number));

    state = workReducer(state, fetchUsers.pending("req"));
    state = workReducer(state, fetchUsers.fulfilled([{ id: "u1" }], "req"));
    expect(state.usersStatus).toBe("succeeded");

    state = workReducer(state, fetchNotifications.pending("req"));
    state = workReducer(state, fetchNotifications.fulfilled([{ id: "n1" }], "req"));
    expect(state.notificationsStatus).toBe("succeeded");

    state = workReducer(state, fetchActivity.pending("req"));
    state = workReducer(state, fetchActivity.fulfilled([{ id: "a1" }], "req"));
    expect(state.activityStatus).toBe("succeeded");

    state = workReducer(state, fetchTelemetry.pending("req"));
    state = workReducer(state, fetchTelemetry.fulfilled([{ id: "tm1" }], "req"));
    expect(state.telemetryStatus).toBe("succeeded");

    state = workReducer(state, fetchProjects.rejected(new Error("Boom"), "req", undefined, "Project failure"));
    state = workReducer(state, fetchTasks.rejected(new Error("Boom"), "req", undefined, "Task failure"));
    state = workReducer(state, fetchUsers.rejected(new Error("Boom"), "req", undefined, "User failure"));
    state = workReducer(state, fetchNotifications.rejected(new Error("Boom"), "req", undefined, "Notification failure"));
    state = workReducer(state, fetchActivity.rejected(new Error("Boom"), "req", undefined, "Activity failure"));
    state = workReducer(state, fetchTelemetry.rejected(new Error("Boom"), "req", undefined, "Telemetry failure"));

    expect(state.projectsStatus).toBe("failed");
    expect(state.tasksStatus).toBe("failed");
    expect(state.usersStatus).toBe("failed");
    expect(state.notificationsStatus).toBe("failed");
    expect(state.activityStatus).toBe("failed");
    expect(state.telemetryStatus).toBe("failed");
    expect(state.error).toBe("Telemetry failure");
  });

  test("upserts fulfilled create actions and updates existing projects/tasks", () => {
    const base = {
      ...workReducer(undefined, { type: "init" }),
      projects: [{ id: "p1", name: "Old Project" }],
      tasks: [{ id: "t1", title: "Old Task" }],
    };

    let state = workReducer(base, createProject.fulfilled({ id: "p1", name: "Replaced Project" }, "req", {}));
    state = workReducer(state, updateProject.fulfilled({ id: "p1", name: "Updated Project" }, "req", {}));
    state = workReducer(state, createTask.fulfilled({ id: "t1", title: "Replaced Task" }, "req", {}));
    state = workReducer(state, updateTaskAsync.fulfilled({ id: "t1", title: "Updated Task" }, "req", {}));

    expect(state.projects).toEqual([{ id: "p1", name: "Updated Project" }]);
    expect(state.tasks).toEqual([{ id: "t1", title: "Updated Task" }]);
  });

  test("shows toast feedback for rejected create and bulk task failures", () => {
    workReducer(undefined, createProject.rejected(new Error("Bad project"), "req", {}, "Bad project"));
    workReducer(undefined, createTask.rejected(new Error("Bad task"), "req", {}, "Bad task"));
    workReducer(undefined, bulkUpdateTasksAsync.rejected(new Error("Bad bulk"), "req", {}, "Bad bulk"));

    expect(toast.error).toHaveBeenCalledWith("Project creation failed: Bad project");
    expect(toast.error).toHaveBeenCalledWith("Task creation failed: Bad task");
    expect(toast.error).toHaveBeenCalledWith("Bad bulk");
  });
});
