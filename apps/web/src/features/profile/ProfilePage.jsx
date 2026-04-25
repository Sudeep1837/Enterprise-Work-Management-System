import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { PageHeader, Button } from "../common/components/UI";
import Avatar from "../common/components/Avatar";
import { fetchUsers } from "../../store/workSlice";
import { removeProfileImageThunk, updateProfileImageThunk } from "../../store/authSlice";
import { UserCircle, Mail, Briefcase, Calendar, Camera, Loader2, Trash2, Upload, UserCheck } from "lucide-react";

function getManagerInfo(user) {
  const manager = user?.managerId;
  return manager && typeof manager === "object" && manager.name ? manager : null;
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const user = useSelector((state) => state.auth.user);
  const profile = useSelector((state) => state.work.profile || {});
  const profileImageStatus = useSelector((state) => state.auth.profileImageStatus);
  
  const displayName = profile.name || user?.name || "Anonymous User";
  const displayEmail = profile.email || user?.email || "No email provided";
  const displayRole = user?.role || "Employee";
  const profileImageUrl = user?.profileImageUrl || "";
  const manager = getManagerInfo(user);
  const isUploading = profileImageStatus === "loading";

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }

    dispatch(updateProfileImageThunk(file))
      .unwrap()
      .then(() => {
        toast.success("Profile picture updated");
        dispatch(fetchUsers({ force: true }));
      })
      .catch((error) => toast.error(error || "Failed to upload profile picture"))
      .finally(() => {
        event.target.value = "";
      });
  };

  const handleRemoveImage = () => {
    dispatch(removeProfileImageThunk())
      .unwrap()
      .then(() => {
        toast.success("Profile picture removed");
        dispatch(fetchUsers({ force: true }));
      })
      .catch((error) => toast.error(error || "Failed to remove profile picture"));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="My Profile" 
        subtitle="View your account details and role context"
        icon={UserCircle}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="h-32 bg-gradient-to-r from-slate-950 via-indigo-700 to-cyan-500"></div>
        
        <div className="px-6 sm:px-10 pb-10">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8 -mt-12">
            <div className="relative w-fit rounded-full bg-white p-1 dark:bg-slate-900 shadow-md">
              <Avatar
                name={displayName}
                src={profileImageUrl}
                size="lg"
                className="border-4 border-white dark:border-slate-900"
                alt={`${displayName} profile picture`}
              />
              <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white ring-2 ring-white dark:bg-white dark:text-slate-950 dark:ring-slate-900">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={handleImageChange}
              />
              <Button
                variant="secondary"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {profileImageUrl ? "Replace Photo" : "Upload Photo"}
              </Button>
              {profileImageUrl && (
                <Button
                  variant="ghost"
                  disabled={isUploading}
                  onClick={handleRemoveImage}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1">{displayRole}</p>
          
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10 grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Mail className="h-5 w-5 text-slate-500 tracking-tight dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{displayEmail}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Briefcase className="h-5 w-5 text-slate-500 tracking-tight dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Workspace Role</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{displayRole}</p>
              </div>
            </div>

            {user?.role === "employee" && (
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  manager ? "bg-indigo-50 dark:bg-indigo-500/10" : "bg-slate-100 dark:bg-slate-800"
                }`}>
                  <UserCheck className={`h-5 w-5 tracking-tight ${
                    manager ? "text-indigo-500 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Working Under</p>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {manager?.name || "Unassigned"}
                  </p>
                  {manager && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {[manager.email, manager.team].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Calendar className="h-5 w-5 text-slate-500 tracking-tight dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Joined Date</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">Recently</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
