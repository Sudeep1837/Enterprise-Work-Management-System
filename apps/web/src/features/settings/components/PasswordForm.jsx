import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextInput } from "../../common/forms/FormFields";
import { Button } from "../../common/components/UI";
import { Eye, EyeOff } from "lucide-react";

const schema = yup.object({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup.string().min(8, "Password must be at least 8 characters").required("New password is required"),
});

export default function PasswordForm({ onSubmit }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ 
    resolver: yupResolver(schema) 
  });

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(async (values) => { 
      await onSubmit(values); 
      reset(); 
    })}>
      <div className="relative">
        <TextInput type={showCurrent ? "text" : "password"} label="Current Password" error={errors.currentPassword?.message} {...register("currentPassword")} placeholder="••••••••" />
        <button type="button" className={`absolute right-3 top-[34px] text-slate-400 hover:text-slate-600`} onClick={() => setShowCurrent(!showCurrent)}>
          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="relative">
        <TextInput type={showNew ? "text" : "password"} label="New Password" error={errors.newPassword?.message} {...register("newPassword")} placeholder="••••••••" />
        <button type="button" className={`absolute right-3 top-[34px] text-slate-400 hover:text-slate-600`} onClick={() => setShowNew(!showNew)}>
          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex text-sm text-slate-500 my-1">
        Password must be at least 8 characters long.
      </div>
      <div className="flex justify-end mt-2">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </form>
  );
}
