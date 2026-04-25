import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { setTheme } from "../../store/workSlice";
import { changePasswordThunk, updateProfileThunk } from "../../store/authSlice";
import { toast } from "react-toastify";
import { PageCard, PageHeader, Button } from "../common/components/UI";
import ProfileForm from "./components/ProfileForm";
import PasswordForm from "./components/PasswordForm";
import { Settings, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const profileSectionRef = useRef(null);
  const [highlightProfile, setHighlightProfile] = useState(false);
  const theme = useSelector((state) => state.work.theme);
  const authUser = useSelector((state) => state.auth.user);
  const profile = useSelector((state) => state.work.profile || {});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldFocusProfile =
      params.get("section") === "profile" || location.hash === "#profile";

    if (!shouldFocusProfile) return undefined;

    const timer = setTimeout(() => {
      profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = profileSectionRef.current?.querySelector("input");
      firstInput?.focus({ preventScroll: true });
      setHighlightProfile(true);
    }, 80);

    const clearTimer = setTimeout(() => setHighlightProfile(false), 1800);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, [location.hash, location.search]);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader 
        title="Workspace Settings" 
        subtitle="Manage your preferences, appearance, and security"
        icon={Settings}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customize how the application looks on your device.</p>
        </div>
        <div className="md:col-span-2">
          <PageCard>
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Theme Preference</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => dispatch(setTheme("light"))}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all ${theme === "light" ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300 ring-1 ring-indigo-500" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800/80"}`}
                >
                  <Sun className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button 
                  onClick={() => dispatch(setTheme("dark"))}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all ${theme === "dark" ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300 ring-1 ring-indigo-500" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800/80"}`}
                >
                  <Moon className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
              </div>
            </div>
          </PageCard>
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="py-2">
          <div className="border-t border-slate-200 dark:border-white/10" />
        </div>
      </div>

      <div
        id="profile"
        ref={profileSectionRef}
        className={`grid scroll-mt-24 gap-6 rounded-2xl transition-all duration-500 md:grid-cols-3 ${
          highlightProfile
            ? "bg-indigo-50/70 p-3 ring-2 ring-indigo-400/60 dark:bg-indigo-500/10 dark:ring-indigo-400/40"
            : ""
        }`}
      >
        <div className="md:col-span-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Profile Information</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your account detail and email address.</p>
        </div>
        <div className="md:col-span-2">
          <PageCard>
            <ProfileForm 
              initialValues={{ name: profile.name || authUser?.name || "", email: profile.email || authUser?.email || "" }} 
              onSubmit={(values) => {
                dispatch(updateProfileThunk(values))
                  .unwrap()
                  .then(() => toast.success("Profile updated successfully"))
                  .catch((err) => toast.error(err.message || "Failed to update profile"));
              }} 
            />
          </PageCard>
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="py-2">
          <div className="border-t border-slate-200 dark:border-white/10" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Security</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your password to secure your account.</p>
        </div>
        <div className="md:col-span-2">
          <PageCard>
            <PasswordForm
              onSubmit={(values) =>
                dispatch(changePasswordThunk(values))
                  .unwrap()
                  .then((result) => toast.success(result.message || "Password updated successfully"))
                  .catch((err) => toast.error(err || "Failed to update password"))
              }
            />
          </PageCard>
        </div>
      </div>
    </div>
  );
}
