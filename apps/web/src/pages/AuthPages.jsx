import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loginThunk, signupThunk, clearError } from "../store/authSlice";
import { toast } from "react-toastify";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = yup.object({
  email: yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
});

const signupSchema = yup.object({
  name: yup.string().required("Full name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
});

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function SignupPage() {
  return <AuthForm mode="signup" />;
}

function AuthForm({ mode }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const status = useSelector((state) => state.auth.status);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const schema = mode === "login" ? loginSchema : signupSchema;
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });
  
  if (token) return <Navigate to="/dashboard" replace />;

  const isLoading = status === "loading";

  const submit = async (values) => {
    setSubmitError(null);
    try {
      // Normalize email on the way out
      const payload = { ...values, email: values.email.trim().toLowerCase() };
      if (mode === "signup") {
        await dispatch(signupThunk(payload)).unwrap();
        toast.success("Account created! Welcome aboard.");
      } else {
        await dispatch(loginThunk(payload)).unwrap();
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // err is the rejectWithValue payload (a string message)
      const message = typeof err === "string" ? err : (err?.message || "Authentication failed");
      setSubmitError(message);
    }
  };

  const authInputClass =
    "w-full rounded-lg border border-slate-300 bg-white/95 px-3 py-2.5 text-slate-900 caret-indigo-600 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
  const errorTextClass = "mt-1 text-xs font-medium text-red-600";

  return (
    <div className="relative grid min-h-[calc(100vh-120px)] place-items-center overflow-hidden px-6 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_45%),radial-gradient(circle_at_80%_20%,_rgba(6,182,212,0.18),_transparent_40%)]" />
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-2">
        <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-white backdrop-blur-xl">
          <p className="text-cyan-300 text-sm font-medium tracking-wide uppercase">Enterprise Work Management</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight">Plan smarter. Execute faster. Report confidently.</h2>
          <p className="mt-3 text-slate-300">Designed for modern delivery teams with realtime updates, role-aware visibility, and high-performance workflows.</p>
          <div className="mt-6 space-y-2 text-sm text-slate-200">
            <p>• Projects, tasks, and Kanban orchestration</p>
            <p>• Realtime team collaboration signals</p>
            <p>• Analytics and execution clarity</p>
          </div>
          <div className="mt-8 rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm space-y-1">
            <p className="font-semibold text-cyan-200">Demo Credentials</p>
            <p className="text-slate-300">admin@demo.com / Admin@123</p>
            <p className="text-slate-300">manager@demo.com / Manager@123</p>
            <p className="text-slate-300">employee@demo.com / Employee@123</p>
          </div>
        </motion.aside>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/90 p-8 shadow-2xl backdrop-blur"
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          <h2 className="text-2xl font-semibold text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === "login" ? "Sign in to continue to your workspace." : "Start with a collaborative workspace in minutes."}
          </p>

          <div className="mt-5 space-y-4">
            {mode === "signup" && (
              <div>
                <input
                  className={authInputClass}
                  placeholder="Full name"
                  disabled={isLoading}
                  aria-label="Full name"
                  {...register("name")}
                />
                {errors.name && <p className={errorTextClass}>{errors.name.message}</p>}
              </div>
            )}

            <div>
              <input
                className={authInputClass}
                placeholder="Email address"
                type="email"
                autoComplete="email"
                disabled={isLoading}
                aria-label="Email address"
                {...register("email")}
              />
              {errors.email && <p className={errorTextClass}>{errors.email.message}</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={authInputClass}
                  placeholder="Password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={isLoading}
                  aria-label="Password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className={errorTextClass}>{errors.password.message}</p>}
            </div>
          </div>

          {/* Inline server error */}
          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <motion.button
            whileHover={!isLoading ? { y: -1 } : {}}
            whileTap={!isLoading ? { scale: 0.99 } : {}}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 font-medium text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : mode === "login" ? "Sign in" : "Create account"}
          </motion.button>

          <Link
            className="mt-4 block text-center text-sm text-indigo-700 hover:text-indigo-900"
            to={mode === "login" ? "/signup" : "/login"}
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Link>
        </motion.form>
      </div>
    </div>
  );
}
