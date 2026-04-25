import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";
import { Eye, EyeOff } from "lucide-react";

const schema = yup.object({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .notOneOf([yup.ref("currentPassword")], "New password must be different from current password")
    .required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Passwords do not match")
    .required("Confirm your new password"),
});

export default function PasswordForm({ onSubmit }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  });

  return (
    <form
      className="grid gap-5"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset();
      })}
    >
      <PasswordField
        label="Current Password"
        show={showCurrent}
        onToggle={() => setShowCurrent((value) => !value)}
        error={errors.currentPassword?.message}
        register={register("currentPassword")}
      />

      <PasswordField
        label="New Password"
        show={showNew}
        onToggle={() => setShowNew((value) => !value)}
        error={errors.newPassword?.message}
        register={register("newPassword")}
      />

      <PasswordField
        label="Confirm New Password"
        show={showConfirm}
        onToggle={() => setShowConfirm((value) => !value)}
        error={errors.confirmPassword?.message}
        register={register("confirmPassword")}
      />

      <div className="flex text-sm text-slate-500 my-1">
        Password must be at least 8 characters long and different from your current password.
      </div>

      <div className="flex justify-end mt-2">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </form>
  );
}

function PasswordField({ label, show, onToggle, error, register }) {
  return (
    <div className="relative">
      <TextInput
        type={show ? "text" : "password"}
        label={label}
        error={error}
        placeholder="********"
        {...register}
      />
      <button
        type="button"
        className="absolute right-3 top-[34px] rounded text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        onClick={onToggle}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
