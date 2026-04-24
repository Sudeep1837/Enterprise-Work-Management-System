import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMemo } from "react";
import { PROJECT_STATUSES } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";
import { isAdmin, isManager } from "../../../lib/permissions";
import { Lock, Crown } from "lucide-react";

const schema = yup.object({
  name:    yup.string().required("Project name is required"),
  ownerId: yup.string().required("Owner is required"),
  status:  yup.string().required(),
});

export default function ProjectForm({ initialValues, onSubmit, onCancel }) {
  const currentUser = useSelector((state) => state.auth.user);
  const allUsers    = useSelector((state) => state.work.users);
  const managerMode = isManager(currentUser) && !isAdmin(currentUser);
  const adminMode   = isAdmin(currentUser);

  /**
   * Build owner options for admin:
   *  1. Admin (self) — always first
   *  2. All active managers in the workspace
   *
   * Employees are intentionally excluded — they must never be project owners.
   */
  const ownerOptions = useMemo(() => {
    if (!adminMode) return [];
    const adminOption = {
      value: currentUser?.id || currentUser?._id?.toString(),
      label: `${currentUser?.name} (Admin · You)`,
    };
    const managerOptions = allUsers
      .filter((u) => u.role === "manager" && u.isActive !== false)
      .map((u) => ({
        value: u.id || u._id?.toString(),
        label: `${u.name} (Manager · ${u.team || "No Team"})`,
      }));
    return [adminOption, ...managerOptions];
  }, [adminMode, currentUser, allUsers]);

  /**
   * Resolve initial ownerId for edit mode.
   * Handles: populated object { id }, raw string ID, fallback to current user.
   */
  const resolvedOwnerId = useMemo(() => {
    if (managerMode) return currentUser?.id || currentUser?._id?.toString() || "";
    const raw = initialValues?.ownerId;
    if (raw) {
      if (typeof raw === "object") return raw.id || raw._id?.toString() || "";
      return raw.toString();
    }
    // Fallback: try to match by owner display name
    const ownerName = initialValues?.owner;
    if (ownerName && allUsers.length) {
      const matched = allUsers.find((u) => u.name === ownerName);
      if (matched) return matched.id || matched._id?.toString() || "";
    }
    // Default to admin self
    return currentUser?.id || currentUser?._id?.toString() || "";
  }, [initialValues, managerMode, currentUser, allUsers]);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    values: {
      name:    initialValues?.name ?? "",
      ownerId: resolvedOwnerId,
      status:  initialValues?.status ?? "Active",
    },
  });

  const selectedOwnerId = watch("ownerId");

  const handleCustomSubmit = (values) => {
    let ownerDisplayName = "";
    if (managerMode) {
      ownerDisplayName = currentUser?.name ?? "";
    } else {
      // Look up the display name of the selected owner
      const selected = ownerOptions.find((o) => o.value === values.ownerId);
      ownerDisplayName = selected ? selected.label.split(" (")[0] : "";
    }

    onSubmit({
      name:    values.name,
      status:  values.status,
      ownerId: managerMode
        ? (currentUser?.id || currentUser?._id?.toString())
        : values.ownerId,
      owner: ownerDisplayName,
    });
  };

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(handleCustomSubmit)}>
      <TextInput
        label="Name"
        placeholder="Project Phoenix"
        error={errors.name?.message}
        {...register("name")}
      />

      {/* ── Owner Field ────────────────────────────────────────────────── */}
      {managerMode ? (
        /* Manager: locked to themselves — cannot delegate ownership */
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Project Owner
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-100/60 px-4 py-2.5 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300">
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="font-medium">{currentUser?.name}</span>
            <span className="ml-auto text-xs text-slate-400">Auto-set to you</span>
          </div>
        </div>
      ) : (
        /* Admin: select from active managers or self */
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Project Owner
          </label>
          <div className="relative">
            <Crown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-400" />
            <select
              {...register("ownerId")}
              className="w-full appearance-none rounded-xl border border-slate-200/60 bg-slate-50 py-2.5 pl-9 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
            >
              {ownerOptions.length === 0 && (
                <option value="">— No managers in workspace —</option>
              )}
              {ownerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {errors.ownerId && (
            <p className="mt-1 text-xs text-red-500">{errors.ownerId.message}</p>
          )}
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Only admins and managers may own a project. The selected person controls it.
          </p>
        </div>
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
