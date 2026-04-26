import { buildTaskMutationPayload } from "../features/tasks/utils/taskPayload";

describe("task payload helpers", () => {
  test("keeps attachment data out of normal task mutations", () => {
    const payload = buildTaskMutationPayload({
      id: "task-1",
      title: "Updated task",
      status: "Review",
      priority: "High",
      type: "Feature",
      projectId: "project-1",
      projectName: "Phoenix",
      assigneeId: "user-1",
      assigneeName: "Sudeep Dehury",
      dueDate: "2099-01-01",
      attachments: [{ id: "file-1", name: "brief.pdf" }],
      comments: [{ id: "comment-1" }],
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(payload).toEqual({
      title: "Updated task",
      status: "Review",
      priority: "High",
      type: "Feature",
      projectId: "project-1",
      projectName: "Phoenix",
      assigneeId: "user-1",
      assigneeName: "Sudeep Dehury",
      dueDate: "2099-01-01",
    });
    expect(payload).not.toHaveProperty("attachments");
    expect(payload).not.toHaveProperty("comments");
  });
});
