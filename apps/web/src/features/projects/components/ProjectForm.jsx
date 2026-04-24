import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PROJECT_STATUSES } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";
import { isAdmin, isManager } from "../../../lib/permissions";
import { Lock } from "lucide-react";

const schema = yup.object({
  name:   yup.string().required("Project name is required"),
  owner:  yup.string().required("Owner is required"),
  status: yup.string().required(),
});

export default function ProjectForm({ initialValues, onSubmit, onCancel }) {
  const currentUser = useSelector((state) => state.auth.user);
  const managerMode = isManager(currentUser) && !isAdmin(currentUser);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    values: {
      ...initialValues,
      // For managers: lock owner to their own name
      owner: managerMode ? currentUser?.name : (initialValues?.owner ?? ""),
    },
  });

  const handleCustomSubmit = (values) => {
    const enriched = { ...values };
    // Bug 3 fix: inject ownerId for managers so backend can use it explicitly
    if (managerMode) {
      enriched.ownerId = currentUser?.id || currentUser?._id?.toString();
      enriched.owner   = currentUser?.name;
    }
    onSubmit(enriched);
  };

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(handleCustomSubmit)}>
      <TextInput
        label="Name"
        placeholder="Project Phoenix"
        error={errors.name?.message}
        {...register("name")}
      />

      {/* Owner field — locked for managers, free for admins */}
      {managerMode ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Owner
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-100/60 px-4 py-2.5 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300">
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="font-medium">{currentUser?.name}</span>
            <span className="ml-auto text-xs text-slate-400">Auto-set to you</span>
          </div>
          {/* Hidden input to keep RHF schema happy */}
          <input type="hidden" {...register("owner")} value={currentUser?.name} />
        </div>
      ) : (
        <TextInput
          label="Owner"
          placeholder="Manager User"
          error={errors.owner?.message}
          {...register("owner")}
        />
      )}

      <SelectInput
        label="Status"
        options={PROJECT_STATUSES}
        error={errors.status?.message}
        {...register("status")}
      />

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" disabled={isSubmitting} type="submit" className="disabled:opacity-50">
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
