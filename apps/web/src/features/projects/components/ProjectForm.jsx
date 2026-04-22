import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PROJECT_STATUSES } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";

const schema = yup.object({
  name: yup.string().required("Project name is required"),
  owner: yup.string().required("Owner is required"),
  status: yup.string().required(),
});

export default function ProjectForm({ initialValues, onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    values: initialValues,
  });

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)}>
      <TextInput label="Name" placeholder="Project Phoenix" error={errors.name?.message} {...register("name")} />
      <TextInput label="Owner" placeholder="Manager User" error={errors.owner?.message} {...register("owner")} />
      <SelectInput label="Status" options={PROJECT_STATUSES} error={errors.status?.message} {...register("status")} />
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" disabled={isSubmitting} type="submit" className="disabled:opacity-50">
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
