import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button, EmptyState } from "../../common/components/UI";
import { FolderKanban, Info } from "lucide-react";
import { canAssignTaskToUser, isAdmin, isManager, isEmployee, canUseProjectForTask } from "../../../lib/permissions";

const schema = yup.object({
  title: yup.string().required("Title is required"),
  projectId: yup.string().required("Project assignment is required"),
  status: yup.string().required(),
  priority: yup.string().required(),
  type: yup.string().required(),
  dueDate: yup.string().nullable(),
  assigneeId: yup.string().nullable(),
});

export default function TaskForm({ initialValues, onSubmit, onCancel }) {
  const users = useSelector((state) => state.work.users || []);
  const projects = useSelector((state) => state.work.projects || []);
  const currentUser = useSelector((state) => state.auth.user);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    values: initialValues,
  });

  const selectedProjectId = watch("projectId");
  const selectedProject = projects.find(
    (p) => (p.id || p._id?.toString()) === selectedProjectId
  );

  // Filter assignee options by current user's permission scope
  // EC4: also exclude inactive/deactivated users from assignment options
  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...users
      .filter((u) => u.isActive !== false && canAssignTaskToUser(currentUser, u, selectedProject))
      .map((u) => ({ value: u.id || u._id?.toString(), label: u.name })),
  ];


  // Filter projects by the current user's management scope:
  // Admin: all projects. Manager: only projects they own. Employee: all (backend guards).
  const projectOptions = [
    { value: "", label: "Select a project..." },
    ...projects
      .filter((p) => canUseProjectForTask(currentUser, p))
      .map((p) => ({ value: p.id || p._id, label: p.name })),
  ];

  // Helper text explaining assignee scope to the user
  const getAssigneeHelpText = () => {
    if (isAdmin(currentUser)) {
      return "All users available — you have global assignment access.";
    }
    if (isManager(currentUser)) {
      if (!selectedProject) {
        return "Select a project to see available assignees from your team and project members.";
      }
      return "Showing your team members and members of the selected project.";
    }
    if (isEmployee(currentUser)) {
      return "Employees can only self-assign tasks.";
    }
    return null;
  };

  const assigneeHelpText = getAssigneeHelpText();

  if (projects.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Projects Available"
          description="Create a project first before assigning tasks"
          icon={FolderKanban}
          action={<Button variant="secondary" onClick={onCancel}>Go Back</Button>}
        />
      </div>
    );
  }

  const handleCustomSubmit = (values) => {
    const project = projects.find((p) => (p.id || p._id) === values.projectId);
    const assignee = users.find((u) => (u.id || u._id) === values.assigneeId);
    const enriched = {
      ...values,
      projectName: project ? project.name : "",
      assigneeName: assignee ? assignee.name : "",
    };
    onSubmit(enriched);
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(handleCustomSubmit)}>
      <TextInput label="Title" error={errors.title?.message} {...register("title")} />

      <div className="grid gap-3 md:grid-cols-2">
        <SelectInput
          label="Assigned Project"
          error={errors.projectId?.message}
          options={projectOptions}
          {...register("projectId")}
        />

        <div>
          <SelectInput
            label="Assignee"
            options={assigneeOptions}
            {...register("assigneeId")}
          />
          {assigneeHelpText && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
              {assigneeHelpText}
            </p>
          )}
        </div>
      </div>

      <TextInput label="Description" {...register("description")} />

      <div className="grid gap-3 md:grid-cols-3">
        <SelectInput label="Status" options={TASK_STATUSES} {...register("status")} />
        <SelectInput label="Priority" options={TASK_PRIORITIES} {...register("priority")} />
        <SelectInput label="Type" options={TASK_TYPES} {...register("type")} />
      </div>

      <div className="flex justify-between items-center gap-2 mt-4 border-t border-slate-100 dark:border-white/5 pt-4">
        <TextInput type="date" label="Due date" {...register("dueDate")} />
        <div className="flex gap-2 items-end">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Task"}
          </Button>
        </div>
      </div>
    </form>
  );
}
