import { selectKanbanColumns, selectOverdueCriticalTasks } from "../store/selectors";

const makeState = ({ tasks = [], projects = [], users = [] }) => ({
  work: {
    tasks,
    projects,
    users,
  },
});

describe("kanban selectors", () => {
  test("resolves card names from latest project and user state", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Ship audit log",
          status: "Todo",
          projectId: "p1",
          projectName: "Old Project",
          assigneeId: "u1",
          assigneeName: "Old User",
        },
      ],
      projects: [{ id: "p1", name: "Renamed Project" }],
      users: [{ id: "u1", name: "Renamed User" }],
    });

    const todoColumn = selectKanbanColumns(state).find((column) => column.status === "Todo");

    expect(todoColumn.tasks).toHaveLength(1);
    expect(todoColumn.tasks[0]).toMatchObject({
      displayProjectName: "Renamed Project",
      displayAssigneeName: "Renamed User",
    });
  });

  test("falls back to task labels when related records are not loaded yet", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Review scope",
          status: "Review",
          projectId: "p1",
          projectName: "Cached Project",
          assigneeId: "u1",
          assigneeName: "Cached User",
        },
      ],
    });

    const reviewColumn = selectKanbanColumns(state).find((column) => column.status === "Review");

    expect(reviewColumn.tasks[0]).toMatchObject({
      displayProjectName: "Cached Project",
      displayAssigneeName: "Cached User",
    });
  });

  test("resolves overdue dashboard task names from latest user and project state", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Resolve production incident",
          status: "Todo",
          priority: "Critical",
          dueDate: yesterday.toISOString(),
          projectId: "p1",
          projectName: "Stale Project",
          assigneeId: "u1",
          assigneeName: "Old User",
        },
      ],
      projects: [{ id: "p1", name: "Live Project" }],
      users: [{ id: "u1", name: "Renamed User" }],
    });

    expect(selectOverdueCriticalTasks(state)[0]).toMatchObject({
      projectName: "Live Project",
      assigneeName: "Renamed User",
      displayProjectName: "Live Project",
      displayAssigneeName: "Renamed User",
    });
  });
});
