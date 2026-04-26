const TASK_MUTATION_FIELDS = [
  "title",
  "description",
  "projectId",
  "projectName",
  "assigneeId",
  "assigneeName",
  "status",
  "priority",
  "type",
  "dueDate",
];

export function buildTaskMutationPayload(values = {}) {
  return TASK_MUTATION_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(values, field)) {
      payload[field] = values[field];
    }
    return payload;
  }, {});
}
