import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/authSlice";
import { markAllNotificationsReadAsync, markNotificationReadAsync } from "../../store/workSlice";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Kanban,
  Users,
  BarChart3,
  Bell,
  Settings,
  UserCircle,
  LogOut,
  Hexagon,
  Menu,
  X,
  CheckCheck,
  UserCheck,
  MoveRight,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";

const links = [
  { name: "dashboard", icon: LayoutDashboard },
  { name: "projects", icon: FolderKanban },
  { name: "tasks", icon: CheckSquare },
  { name: "kanban", icon: Kanban },
  { name: "users", icon: Users },
  { name: "reports", icon: BarChart3 },
  { name: "notifications", icon: Bell },
  { name: "settings", icon: Settings },
  { name: "profile", icon: UserCircle },
];

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotifIcon(notif) {
  if (notif.type === "assignment") return { Icon: UserCheck, cls: "text-indigo-500" };
  if (notif.type === "success") return { Icon: CheckCircle2, cls: "text-emerald-500" };
  if (notif.type === "warning") return { Icon: AlertTriangle, cls: "text-amber-500" };
  if (notif.type === "error") return { Icon: AlertTriangle, cls: "text-red-500" };
  if (notif.relatedEntityType === "comment") return { Icon: MessageSquare, cls: "text-violet-500" };
  if (notif.action?.startsWith("moved")) return { Icon: MoveRight, cls: "text-sky-500" };
  return { Icon: Info, cls: "text-slate-400" };
}

// ─── Sidebar Content (shared by desktop + mobile drawer) ──────────────────────
function SidebarContent({ onNavClick }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 pb-2 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50">
          <Hexagon className="h-5 w-5 fill-indigo-400" />
        </div>
        <span className="text-xl font-bold tracking-tight">EWMS</span>
      </div>

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-8">
        <div className="space-y-1">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Workspace
          </p>
          {links.map((item) => (
            <NavLink
              key={item.name}
              to={`/${item.name}`}
              onClick={onNavClick}
              className={({ isActive }) => `
                group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-bg"
                      className="absolute inset-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon className={`relative z-10 h-5 w-5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"}`} />
                  <span className="relative z-10 capitalize">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-8 space-y-1">
          {/* User info */}
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200/60 px-3 py-2.5 dark:border-white/10">
              <img
                className="h-8 w-8 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=c7d2fe&color=3730a3&bold=true`}
                alt=""
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => dispatch(logout())}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-500" />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// ─── Bell Notification Dropdown ───────────────────────────────────────────────
function BellDropdown({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notifications = useSelector((state) => state.work.notifications);
  const dropdownRef = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  const recent = notifications.slice(0, 6);
  const unread = notifications.filter((n) => !n.read).length;

  const handleNotifClick = (notif) => {
    if (!notif.read) {
      dispatch(markNotificationReadAsync(notif.id));
    }
    onClose();
    navigate("/notifications");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
              {unread > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{unread} unread</p>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => dispatch(markAllNotificationsReadAsync())}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition dark:text-indigo-400 dark:hover:bg-indigo-500/10"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="mb-2 h-7 w-7 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-400">All caught up!</p>
              </div>
            ) : (
              recent.map((notif) => {
                const { Icon, cls } = getNotifIcon(notif);
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                      ${!notif.read
                        ? "bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      }`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${cls}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                        {notif.actorName && notif.action && notif.entityName
                          ? <><span className="font-bold">{notif.actorName}</span> <span className="font-normal text-slate-500 dark:text-slate-400">{notif.action}</span> <span className="font-semibold text-indigo-600 dark:text-indigo-400">{notif.entityName}</span></>
                          : notif.message
                        }
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{relativeTime(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-3 dark:border-white/10">
            <button
              onClick={() => { onClose(); navigate("/notifications"); }}
              className="w-full rounded-xl py-2 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              View all notifications →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function AppLayout() {
  const location = useLocation();
  const notifications = useSelector((state) => state.work.notifications);
  const user = useSelector((state) => state.auth.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setBellOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500/30 dark:bg-slate-950 dark:text-slate-100 flex">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <motion.aside
        initial={{ x: -28, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="sticky top-0 z-40 hidden h-screen w-72 flex-col border-r border-slate-200/60 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 lg:flex"
      >
        <SidebarContent onNavClick={() => {}} />
      </motion.aside>

      {/* ── Mobile Sidebar Overlay + Drawer ───────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/60 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 lg:hidden"
            >
              {/* Close button */}
              <button
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top Navbar */}
        <motion.header
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
          className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:px-6 lg:px-8"
        >
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              id="mobile-menu-toggle"
              aria-label="Open navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-white/10"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50">
              <Hexagon className="h-4 w-4 fill-indigo-400" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white">EWMS</span>
          </div>

          {/* Right actions */}
          <div className="flex flex-1 items-center justify-end gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">

              {/* Bell */}
              <div className="relative">
                <button
                  id="bell-button"
                  aria-label="Notifications"
                  aria-haspopup="true"
                  aria-expanded={bellOpen}
                  onClick={() => setBellOpen((v) => !v)}
                  className="-m-2.5 relative p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <BellDropdown open={bellOpen} onClose={() => setBellOpen(false)} />
              </div>

              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200 dark:lg:bg-slate-700" aria-hidden="true" />

              {/* Avatar */}
              <div className="flex items-center gap-3 p-1">
                <img
                  className="h-8 w-8 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                  src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=c7d2fe&color=3730a3&bold=true`}
                  alt=""
                />
                <div className="hidden lg:flex lg:flex-col lg:items-start text-sm">
                  <span className="font-semibold text-slate-900 dark:text-white leading-tight">
                    {user?.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 mx-auto w-full max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
              transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
