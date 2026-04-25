import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  clearNotificationsAsync,
  markNotificationReadAsync,
  markAllNotificationsReadAsync,
} from "../../store/workSlice";
import { EmptyState, PageCard, PageHeader, Button, Badge } from "../common/components/UI";
import {
  Bell, BellRing, Check, CheckCheck, Trash2,
  UserCheck, MoveRight, FolderKanban, MessageSquare,
  AlertTriangle, Info, CheckCircle2, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return "just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay < 7)   return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getGroupLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return "Earlier";
}

function getIconConfig(item) {
  const type = item.type;
  const entityType = item.relatedEntityType;

  if (type === "assignment")  return { Icon: UserCheck,     bg: "bg-indigo-100 dark:bg-indigo-500/20",  text: "text-indigo-600 dark:text-indigo-400" };
  if (type === "mention")     return { Icon: MessageSquare, bg: "bg-violet-100 dark:bg-violet-500/20",  text: "text-violet-600 dark:text-violet-400" };
  if (type === "success")     return { Icon: CheckCircle2,  bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" };
  if (type === "warning")     return { Icon: AlertTriangle, bg: "bg-amber-100 dark:bg-amber-500/20",    text: "text-amber-600 dark:text-amber-400" };
  if (type === "error")       return { Icon: AlertTriangle, bg: "bg-red-100 dark:bg-red-500/20",        text: "text-red-600 dark:text-red-400" };
  if (entityType === "task" && item.action?.startsWith("moved"))
                              return { Icon: MoveRight,     bg: "bg-sky-100 dark:bg-sky-500/20",        text: "text-sky-600 dark:text-sky-400" };
  if (entityType === "comment")
                              return { Icon: MessageSquare, bg: "bg-violet-100 dark:bg-violet-500/20",  text: "text-violet-600 dark:text-violet-400" };
  if (entityType === "project")
                              return { Icon: FolderKanban,  bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" };
  return { Icon: Info, bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" };
}

function buildRichText(item) {
  if (item.actorName && item.action && item.entityName) {
    return { actor: item.actorName, action: item.action, entity: item.entityName };
  }
  return { actor: null, action: item.message || item.title, entity: null };
}

function getNavigationTarget(item) {
  if (item.link) return item.link;
  if (item.relatedEntityType === "task") return "/tasks";
  if (item.relatedEntityType === "project") return "/projects";
  if (item.relatedEntityType === "user") return "/users";
  if (item.relatedEntityType === "comment") return "/tasks";
  return null;
}

const TYPE_BADGE = {
  assignment: { label: "Assignment", tone: "indigo" },
  mention:    { label: "Mention",    tone: "indigo" },
  info:       { label: "Info",       tone: "slate"  },
  success:    { label: "Done",       tone: "green"  },
  warning:    { label: "Warning",    tone: "amber"  },
  error:      { label: "Error",      tone: "red"    },
};

// ─── component ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const notifications = useSelector((state) => state.work.notifications);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Group by date
  const grouped = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    notifications.forEach((n) => {
      const label = n.createdAt ? getGroupLabel(n.createdAt) : "Earlier";
      groups[label].push(n);
    });
    return groups;
  }, [notifications]);

  const handleNotifClick = (item) => {
    if (!item.read) {
      dispatch(markNotificationReadAsync(item.id || item._id));
    }
    const target = getNavigationTarget(item);
    if (target) navigate(target);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "All caught up"
        }
        icon={Bell}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                onClick={() => dispatch(markAllNotificationsReadAsync())}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                onClick={() => dispatch(clearNotificationsAsync())}
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        }
      />

      <PageCard className="overflow-hidden !p-0 sm:!p-0">
        {!notifications.length ? (
          <div className="p-10">
            <EmptyState
              title="You're all caught up!"
              description="No notifications right now. You'll be notified when tasks are assigned, projects updated, or comments are added."
              icon={BellRing}
            />
          </div>
        ) : (
          <div>
            {["Today", "Yesterday", "Earlier"].map((groupLabel) => {
              const items = grouped[groupLabel];
              if (!items?.length) return null;
              return (
                <div key={groupLabel}>
                  <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2 dark:border-white/5 dark:bg-slate-900/40 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{groupLabel}</p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    <AnimatePresence initial={false}>
                      {items.map((item, idx) => {
                        const { Icon, bg, text } = getIconConfig(item);
                        const { actor, action, entity } = buildRichText(item);
                        const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE.info;
                        const hasTarget = !!getNavigationTarget(item);

                        return (
                          <motion.div
                            key={item.id || item._id}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                            onClick={() => handleNotifClick(item)}
                            className={`group relative flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5 transition-colors
                              ${hasTarget ? "cursor-pointer" : "cursor-default"}
                              ${!item.read
                                ? "bg-indigo-50/60 dark:bg-indigo-900/10 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20"
                                : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                              }`}
                          >
                            {/* Unread indicator */}
                            {!item.read && (
                              <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-full bg-indigo-500" />
                            )}

                            {/* Icon */}
                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                              <Icon className={`h-4 w-4 ${text}`} />
                            </div>

                            {/* Body */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <Badge value={badge.label} tone={badge.tone} />
                                {!item.read && (
                                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                )}
                              </div>

                              <p className={`text-sm leading-snug ${!item.read ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                                {actor ? (
                                  <>
                                    <span className="font-bold text-slate-900 dark:text-white">{actor}</span>
                                    <span className="font-normal text-slate-600 dark:text-slate-400"> {action} </span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{entity}</span>
                                  </>
                                ) : (
                                  action
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                {relativeTime(item.createdAt)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {hasTarget && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 transition">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </div>
                              )}
                              {!item.read && (
                                <button
                                  title="Mark as read"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(markNotificationReadAsync(item.id || item._id));
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageCard>
    </div>
  );
}
