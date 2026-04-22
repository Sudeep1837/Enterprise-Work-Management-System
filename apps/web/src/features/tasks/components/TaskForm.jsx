import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button, EmptyState } from "../../common/components/UI";
import { FolderKanban } from "lucide-react";

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    values: initialValues,
  });

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...users.map(u => ({ value: u.id, label: u.name }))
  ];

  const projectOptions = [
    { value: "", label: "Select a project..." },
    ...projects.map(p => ({ value: p.id || p._id, label: p.name }))
  ];

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
    // Enrich payload with denormalized names for display (stored alongside IDs in DB)
    const project = projects.find(p => (p.id || p._id) === values.projectId);
    const assignee = users.find(u => (u.id || u._id) === values.assigneeId);
    const enriched = {
      ...values,
      projectName: project ? project.name : "",
      assigneeName: assignee ? assignee.name : "",
    };
    console.log("[TaskForm] submitting:", enriched);
    onSubmit(enriched);
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(handleCustomSubmit)}>
      <TextInput label="Title" error={errors.title?.message} {...register("title")} />
      
      <div className="grid gap-3 md:grid-cols-2">
        <SelectInput label="Assigned Project" error={errors.projectId?.message} options={projectOptions} {...register("projectId")} />
        <SelectInput label="Assignee" options={assigneeOptions} {...register("assigneeId")} />
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
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Task"}
          </Button>
        </div>
      </div>
    </form>
  );
}
