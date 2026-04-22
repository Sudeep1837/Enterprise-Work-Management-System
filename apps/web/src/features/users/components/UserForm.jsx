import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ROLES } from "../../../constants/roles";
import { SelectInput, TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";
import { Eye, EyeOff } from "lucide-react";

const isNewUser = (vals) => !vals?.id && !vals?._id;

const schema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  role: yup.string().required("Role is required"),
  password: yup.string().when("$isNew", {
    is: true,
    then: (s) => s.min(8, "Password must be at least 8 characters").required("Password is required for new users"),
    otherwise: (s) => s.optional(),
  }),
});

export default function UserForm({ initialValues, onSubmit, onCancel }) {
  const [showPassword, setShowPassword] = useState(false);
  const isNew = isNewUser(initialValues);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    context: { isNew },
    defaultValues: {
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      role: initialValues?.role || "employee",
      password: "",
    },
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <TextInput label="Name" error={errors.name?.message} {...register("name")} />
      <TextInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
      <SelectInput label="Role" options={Object.values(ROLES)} {...register("role")} />

      {/* Password field — required for new users, optional for edits */}
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
