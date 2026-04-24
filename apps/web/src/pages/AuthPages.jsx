import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loginThunk, signupThunk } from "../store/authSlice";
import { toast } from "react-toastify";
import { Eye, EyeOff, Loader2, CheckCircle2, Activity, BarChart3, Zap, Shield } from "lucide-react";

// ─── Validation schemas ───────────────────────────────────────────────────────
const loginSchema = yup.object({
  email:    yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().min(8, "Minimum 8 characters").required("Password is required"),
});

const signupSchema = yup.object({
  name:            yup.string().min(2, "Name must be at least 2 characters").required("Full name is required"),
  email:           yup.string().email("Enter a valid email").required("Email is required"),
  password:        yup.string().min(8, "Minimum 8 characters").required("Password is required"),
  confirmPassword: yup.string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

// ─── Shared style tokens ──────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-slate-100 caret-indigo-400 placeholder:text-slate-500 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50";
const inputErrorClass =
  "w-full rounded-xl border border-red-500/50 bg-slate-800/70 px-4 py-3 text-slate-100 caret-indigo-400 placeholder:text-slate-500 shadow-sm transition-all focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";
const errorClass = "mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400";

// ─── Left branding panel ──────────────────────────────────────────────────────
function BrandPanel() {
  const feats = [
    { icon: CheckCircle2, text: "Projects, tasks, and Kanban in one platform" },
    { icon: Activity,     text: "Realtime collaboration with Socket.IO sync" },
    { icon: BarChart3,    text: "Auto-generated velocity and analytics reports" },
    { icon: Shield,       text: "Role-based access: Admin, Manager, Employee" },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col justify-between rounded-2xl border border-white/8 bg-slate-900/60 p-8 text-white backdrop-blur-xl"
    >
      {/* Brand */}
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 tracking-wide uppercase">
          <Zap className="h-3 w-3" /> Enterprise Grade
        </span>
        <h2 className="mt-4 text-2xl font-bold leading-snug text-white">
          Plan smarter.<br />Execute faster.<br />Report confidently.
        </h2>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          The collaborative workspace built for high-performing teams — role-aware, realtime, and analytics-first.
        </p>

        {/* Feature list */}
        <ul className="mt-6 space-y-3">
          {feats.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-slate-300">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
              {text}
            </li>
          ))}
        </ul>

        {/* Mini dashboard preview widget */}
        <div className="mt-8 rounded-xl border border-white/8 bg-slate-800/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Workspace</p>
          {[
            { label: "Platform Rebuild", pct: 82, color: "bg-indigo-500" },
            { label: "Mobile App v2",   pct: 54, color: "bg-emerald-500" },
            { label: "API Gateway",     pct: 91, color: "bg-cyan-500" },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>{label}</span><span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700">
                <motion.div
                  className={`h-full rounded-full ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo credentials */}
      <div className="mt-8 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">Demo Credentials</p>
        {[
          ["admin@demo.com", "Admin@123"],
          ["manager@demo.com", "Manager@123"],
          ["employee@demo.com", "Employee@123"],
        ].map(([email, pw]) => (
          <p key={email} className="text-xs text-slate-400 leading-6">
            <span className="text-slate-200">{email}</span>
            <span className="mx-1.5 text-slate-600">/</span>
            {pw}
          </p>
        ))}
      </div>
    </motion.aside>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}
      {children}
      {error && (
        <p className={errorClass}>
          <span className="inline-block h-3 w-3 rounded-full bg-red-500/20 text-red-400">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Password input ───────────────────────────────────────────────────────────
function PasswordInput({ label, error, show, onToggle, disabled, registration }) {
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`${error ? inputErrorClass : inputClass} pr-11`}
          placeholder="••••••••"
          disabled={disabled}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

// ─── Main auth form ───────────────────────────────────────────────────────────
function AuthForm({ mode }) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const token     = useSelector((s) => s.auth.token);
  const status    = useSelector((s) => s.auth.status);

  const [showPw,        setShowPw]        = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [submitError,   setSubmitError]   = useState(null);

  const schema = mode === "login" ? loginSchema : signupSchema;
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  if (token) return <Navigate to="/dashboard" replace />;

  const isLoading = status === "loading";
  const isLogin   = mode === "login";

  const submit = async (values) => {
    setSubmitError(null);
    try {
      // Strip confirmPassword before sending to API
      const { confirmPassword, ...payload } = values;
      const normalized = { ...payload, email: payload.email.trim().toLowerCase() };

      if (isLogin) {
        await dispatch(loginThunk(normalized)).unwrap();
      } else {
        await dispatch(signupThunk(normalized)).unwrap();
        toast.success("Account created! Welcome aboard.");
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setSubmitError(typeof err === "string" ? err : err?.message || "Authentication failed");
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden px-6 py-12">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-cyan-600/15 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid gap-6 lg:grid-cols-2">
        <BrandPanel />

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {isLogin
                ? "Sign in to continue to your workspace."
                : "Start collaborating with your team in minutes."}
            </p>
          </div>

          <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
            {/* Name — signup only */}
            {!isLogin && (
              <Field label="Full Name" error={errors.name?.message}>
                <input
                  className={errors.name ? inputErrorClass : inputClass}
                  placeholder="Alex Johnson"
                  disabled={isLoading}
                  {...register("name")}
                />
              </Field>
            )}

            {/* Email */}
            <Field label="Email Address" error={errors.email?.message}>
              <input
                type="email"
                autoComplete="email"
                className={errors.email ? inputErrorClass : inputClass}
                placeholder="you@company.com"
                disabled={isLoading}
                {...register("email")}
              />
            </Field>

            {/* Password */}
            <PasswordInput
              label="Password"
              error={errors.password?.message}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
              disabled={isLoading}
              registration={register("password")}
            />

            {/* Confirm Password — signup only */}
            {!isLogin && (
              <PasswordInput
                label="Confirm Password"
                error={errors.confirmPassword?.message}
                show={showConfirmPw}
                onToggle={() => setShowConfirmPw((v) => !v)}
                disabled={isLoading}
                registration={register("confirmPassword")}
              />
            )}

            {/* Server error */}
            {submitError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {submitError}
              </div>
            )}

            {/* Submit */}
            <motion.button
              whileHover={!isLoading ? { y: -1, scale: 1.01 } : {}}
              whileTap={!isLoading  ? { scale: 0.99 } : {}}
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating…</>
              ) : isLogin ? "Sign in to workspace" : "Create account"}
            </motion.button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isLogin ? "No account yet?" : "Already have an account?"}{" "}
            <Link
              to={isLogin ? "/signup" : "/login"}
              className="font-medium text-indigo-400 hover:text-indigo-300 transition"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginPage()  { return <AuthForm mode="login"  />; }
export function SignupPage() { return <AuthForm mode="signup" />; }
