import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSelector } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ROLES, TEAMS } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";
import { Eye, EyeOff, Info } from "lucide-react";
import { useState } from "react";
import { formatRoleLabel } from "../../../lib/formatters";

const isNewUser = (vals) => !vals?.id && !vals?._id;

/**
 * Resolve the managerId initial value from different possible shapes:
 *  - populated object: { id, name, email }  → use id
 *  - raw string ObjectId                     → use as-is
 *  - null/undefined                          → ""
 */
function resolveManagerId(managerId) {
  if (!managerId) return "";
  if (typeof managerId === "object" && managerId.id) return managerId.id;
  if (typeof managerId === "object" && managerId._id) return managerId._id.toString();
  if (typeof managerId === "string") return managerId;
  return "";
}

const schema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  role: yup.string().required("Role is required"),
  team: yup.string().when("role", {
    is: (r) => r === "manager" || r === "employee",
    then: (s) => s.required("Team is required for managers and employees"),
    otherwise: (s) => s.optional(),
  }),
  managerId: yup.string().when("role", {
    is: "employee",
    then: (s) => s.required("Reporting manager is required for employees"),
    otherwise: (s) => s.optional(),
  }),
  password: yup.string().when("$isNew", {
    is: true,
    then: (s) => s.min(8, "Password must be at least 8 characters").required("Password is required for new users"),
    otherwise: (s) => s.optional(),
  }),
});

export default function UserForm({ initialValues, onSubmit, onCancel }) {
  const [showPassword, setShowPassword] = useState(false);
  const isNew = isNewUser(initialValues);
  const allUsers = useSelector((state) => state.work.users || []);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    context: { isNew },
    defaultValues: {
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      role: initialValues?.role || "employee",
      team: initialValues?.team || "",
      managerId: resolveManagerId(initialValues?.managerId),
      password: "",
    },
  });

  const watchedRole = useWatch({ control, name: "role" });
  const watchedTeam = useWatch({ control, name: "team" });

  // Active managers filtered by the currently selected team
  const eligibleManagers = allUsers.filter(
    (u) =>
      u.role === "manager" &&
      u.isActive !== false &&
      (watchedTeam ? u.team === watchedTeam : true)
  );

  const managerOptions = [
    { value: "", label: "Select reporting manager..." },
    ...eligibleManagers.map((m) => ({ value: m.id || m._id, label: `${m.name} (${m.team})` })),
  ];

  const roleOptions = Object.values(ROLES).map((r) => ({
    value: r,
    label: formatRoleLabel(r),
  }));

  const teamOptions = [
    { value: "", label: "Select team..." },
    ...TEAMS.map((t) => ({ value: t, label: t })),
  ];

  const showTeamField = watchedRole !== "admin";
  const showManagerField = watchedRole === "employee";

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      {/* ── Name & Email ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="Name" error={errors.name?.message} {...register("name")} />
        <TextInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
      </div>

      {/* ── Role & Team ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <SelectInput
          label="Role"
          options={roleOptions}
          error={errors.role?.message}
          {...register("role")}
        />
        {showTeamField && (
          <SelectInput
            label="Team"
            options={teamOptions}
            error={errors.team?.message}
            {...register("team")}
          />
        )}
      </div>

      {/* ── Reporting Manager (employees only) ── */}
      {showManagerField && (
        <div>
          <SelectInput
            label="Reporting Manager"
            options={managerOptions}
            error={errors.managerId?.message}
            {...register("managerId")}
          />
          {watchedTeam && eligibleManagers.length === 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Info className="h-3.5 w-3.5 shrink-0" />
              No active managers found for the <strong>{watchedTeam}</strong> team.
            </p>
          )}
          {!watchedTeam && (
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Select a team first to see available managers.
            </p>
          )}
        </div>
      )}

      {/* ── Password ── */}
      <div className="relative">
        <TextInput
          label={isNew ? "Password" : "New Password (leave blank to keep current)"}
          type={showPassword ? "text" : "password"}
          error={errors.password?.message}
          placeholder={isNew ? "Min. 8 characters" : "Leave blank to keep unchanged"}
          {...register("password")}
        />
        <button
          type="button"
          className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save User"}
        </Button>
      </div>
    </form>
  );
}
