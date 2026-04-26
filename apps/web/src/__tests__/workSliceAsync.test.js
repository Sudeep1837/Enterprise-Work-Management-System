import { createTestStore } from "../test-utils/renderWithProviders";
import {
  clearActivityFeedAsync,
  createProject,
  createTask,
  fetchProjects,
  socketActivityCreated,
  socketNotificationCreated,
  socketProjectUpserted,
  socketTaskUpserted,
} from "../store/workSlice";
import apiClient from "../services/apiClient";

jest.mock("../services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

function makeStore(work = {}) {
  return createTestStore({
    auth: { user: { id: "admin-1", role: "admin" }, token: "token", initialized: true, status: "succeeded", error: null },
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
      projectsStatus: "idle",
      tasksStatus: "idle",
      usersStatus: "idle",
      notificationsStatus: "idle",
      activityStatus: "idle",
      telemetryStatus: "idle",
      lastFetchedAt: {},
      error: null,
      ...work,
    },
  });
}

describe("work slice async behavior and realtime upserts", () => {
  test("tracks project loading and stores API load failures", async () => {
    const store = makeStore();
    apiClient.get.mockRejectedValue({ response: { data: { message: "Projects unavailable" } } });

    await store.dispatch(fetchProjects({ force: true }));

    expect(store.getState().work.projectsStatus).toBe("failed");
    expect(store.getState().work.error).toBe("Projects unavailable");
  });

  test("adds created projects and tasks through fulfilled thunks", async () => {
    const store = makeStore();
    apiClient.post.mockImplementation((url, payload) => {
      if (url === "/projects") return Promise.resolve({ data: { id: "proj-1", ...payload } });
      if (url === "/tasks") return Promise.resolve({ data: { id: "task-1", ...payload } });
      return Promise.resolve({ data: {} });
    });

    await store.dispatch(createProject({ name: "Project Atlas", ownerId: "admin-1", status: "Active" }));
    await store.dispatch(createTask({ title: "Launch checklist", projectId: "proj-1", status: "Todo" }));

    expect(store.getState().work.projects[0]).toEqual(
      expect.objectContaining({ id: "proj-1", name: "Project Atlas" }),
    );
    expect(store.getState().work.tasks[0]).toEqual(
      expect.objectContaining({ id: "task-1", title: "Launch checklist" }),
    );
  });

  test("deduplicates realtime notification and activity events", () => {
    const notification = { id: "notif-1", action: "assigned", read: false };
    const activity = { id: "activity-1", action: "Task Created" };
    const store = makeStore();

    store.dispatch(socketNotificationCreated(notification));
    store.dispatch(socketNotificationCreated(notification));
    store.dispatch(socketActivityCreated(activity));
    store.dispatch(socketActivityCreated(activity));

    expect(store.getState().work.notifications).toHaveLength(1);
    expect(store.getState().work.activity).toHaveLength(1);
    expect(store.getState().work.telemetry).toHaveLength(1);
  });

  test("upserts projects and tasks from realtime socket events", () => {
    const store = makeStore({
      projects: [{ id: "proj-1", name: "Old Project" }],
      tasks: [{ id: "task-1", title: "Old Task" }],
    });

    store.dispatch(socketProjectUpserted({ id: "proj-1", name: "Updated Project" }));
    store.dispatch(socketProjectUpserted({ id: "proj-2", name: "New Project" }));
    store.dispatch(socketTaskUpserted({ id: "task-1", title: "Updated Task" }));
    store.dispatch(socketTaskUpserted({ id: "task-2", title: "New Task" }));

    expect(store.getState().work.projects.map((project) => project.name)).toEqual([
      "New Project",
      "Updated Project",
    ]);
    expect(store.getState().work.tasks.map((task) => task.title)).toEqual([
      "New Task",
      "Updated Task",
    ]);
  });

  test("clears personal activity feed after successful API clear", async () => {
    const store = makeStore({ activity: [{ id: "activity-1" }] });
    apiClient.delete.mockResolvedValue({ data: [] });

    await store.dispatch(clearActivityFeedAsync());

    expect(apiClient.delete).toHaveBeenCalledWith("/activity/clear");
    expect(store.getState().work.activity).toEqual([]);
  });
});
