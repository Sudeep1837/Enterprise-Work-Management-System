import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { PageHeader, PageCard, EmptyState, Button, ConfirmDialog } from "../common/components/UI";
import { clearActivityFeedAsync } from "../../store/workSlice";
import { Activity, User, Briefcase, CheckSquare, Clock, Filter, X, Trash2 } from "lucide-react";

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ActivityPage() {
  const dispatch = useDispatch();
  const activities = useSelector((state) => state.work.activity || []);
  
  const [filterType, setFilterType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [confirmClearMine, setConfirmClearMine] = useState(false);
  const [clearingMine, setClearingMine] = useState(false);

  const filtered = useMemo(() => {
    return activities.filter((item) => {
      if (filterType && item.entityType !== filterType) return false;
      if (filterAction && !item.action?.toLowerCase().includes(filterAction)) return false;
      return true;
    });
  }, [activities, filterType, filterAction]);

  const getActivityIcon = (type, action = "") => {
    const normalized = action.toLowerCase();
    if (normalized.includes("deleted") || normalized.includes("removed")) return Trash2;
    switch (type) {
      case "user": return User;
      case "project": return Briefcase;
      case "task": return CheckSquare;
      default: return Activity;
    }
  };

  const getActionColor = (action) => {
    const normalized = action?.toLowerCase() || "";
    if (normalized.includes("created")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (normalized.includes("deleted") || normalized.includes("removed")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    if (normalized.includes("updated") || normalized.includes("moved")) return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  };

  const clearMyActivityLog = async () => {
    setClearingMine(true);
    const result = await dispatch(clearActivityFeedAsync());
    setClearingMine(false);
    setConfirmClearMine(false);
    if (result.error) {
      toast.error(result.payload || "Failed to clear your activity feed");
      return;
    }
    setFilterType("");
    setFilterAction("");
    toast.success("Your activity feed was cleared");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Activity Log"
        subtitle="Audit trail of workspace events and interactions"
        icon={Activity}
        actions={
          activities.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmClearMine(true)}
                disabled={clearingMine}
              >
                <Trash2 className="h-4 w-4" />
                {clearingMine ? "Clearing..." : "Clear my feed"}
              </Button>
            </div>
          ) : null
        }
      />

      <PageCard className="mb-6 overflow-visible z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Entity Types</option>
              <option value="task">Tasks</option>
              <option value="project">Projects</option>
              <option value="user">Users</option>
            </select>
            
            <select
              className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
            </select>

            {(filterType || filterAction) && (
              <button 
                onClick={() => { setFilterType(""); setFilterAction(""); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </PageCard>

      <PageCard className="!p-0 overflow-hidden relative z-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity found"
            description="There are no recent activities matching your filters."
          />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {filtered.map((log) => {
              const Icon = getActivityIcon(log.entityType, log.action);
              const timeAgo = relativeTime(log.createdAt);
              const displayText = log.metadata?.richText || (
                log.actorName && log.entityName
                  ? `${log.actorName} ${(log.action || "").toLowerCase()} "${log.entityName}"`
                  : log.action || "System event"
              );
              
              return (
                <li key={log.id || log._id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getActionColor(log.action)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
                        {displayText}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">{log.entityType}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="mr-1 h-3 w-3" />
                          {timeAgo}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PageCard>
      <ConfirmDialog
        open={confirmClearMine}
        title="Clear your activity feed?"
        message="This hides the current activity history from your Activity Log only. Other users' activity feeds are not affected."
        onCancel={() => setConfirmClearMine(false)}
        onConfirm={clearMyActivityLog}
      />
    </div>
  );
}
