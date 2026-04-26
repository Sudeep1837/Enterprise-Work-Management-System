import { selectKanbanColumns } from "../store/selectors";

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
});
