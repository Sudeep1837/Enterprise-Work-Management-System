import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { updateTaskAsync, addTaskCommentAsync } from "../../../store/workSlice";
import { Button, Badge } from "../../common/components/UI";
import { TASK_STATUSES } from "../../../constants/roles";
import { CheckCircle2, MessageSquare, Paperclip, Send, Info, Lock } from "lucide-react";

/**
 * EmployeeTaskUpdate
 *
 * Execution-only task panel for employees.
 * Employees may ONLY: update status, mark complete, add comments, attach files.
 * All other fields (project, assignee, priority, description, reporter) are hidden.
 * The backend enforces the same whitelist; this is defence-in-depth on the UI layer.
 */
export default function EmployeeTaskUpdate({ task, onCancel, onSuccess }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [status, setStatus] = useState(task?.status || "Todo");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const isDone = task?.status === "Done";

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async () => {
    if (status === task?.status) return;
    setSaving(true);
    try {
      await dispatch(
        updateTaskAsync({ id: task.id || task._id, status })
      ).unwrap();
      toast.success("Task status updated.");
      onSuccess?.();
    } catch (err) {
      const msg = err?.message || String(err);
      // Surface the backend's whitelist rejection cleanly
      if (msg.includes("Employees can only")) {
        toast.error("You can only update status on your own assigned tasks.");
      } else {
        toast.error(msg || "Failed to update status.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Mark complete shortcut ─────────────────────────────────────────────────
  const handleMarkComplete = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateTaskAsync({ id: task.id || task._id, status: "Done" })
      ).unwrap();
      toast.success("Task marked as complete! 🎉");
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to mark complete.");
    } finally {
      setSaving(false);
    }
  };

  // ── Add comment ───────────────────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      await dispatch(
        addTaskCommentAsync({ id: task.id || task._id, content: comment.trim() })
      ).unwrap();
      setComment("");
      toast.success("Comment added.");
    } catch (err) {
      toast.error("Failed to add comment.");
    } finally {
      setSendingComment(false);
    }
  };

  // ── Attach file ───────────────────────────────────────────────────────────
  const uploadAttachment = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };
    dispatch(
      updateTaskAsync({
        id: task.id || task._id,
        attachments: [...(task.attachments || []), newAttachment],
      })
    );
    // Reset the file input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="space-y-6">

      {/* ── Scope notice ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
        <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-snug">
          You can update the <strong>status</strong>, add <strong>comments</strong>, and
          attach <strong>files</strong> to your assigned task.
        </p>
      </div>

      {/* ── Task summary (read-only) ──────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Task
        </p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {task?.title}
        </p>
        {task?.projectName && (
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {task.projectName}
          </p>
        )}
        {/* Locked fields notice */}
        <div className="flex items-center gap-1.5 pt-1">
          <Lock className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-400">
            Project, assignee, priority, and description are managed by your team lead.
          </span>
        </div>
      </div>

      {/* ── Status selector ──────────────────────────────────────────── */}
      {!isDone ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Update Status
          </p>
          <div className="flex flex-wrap gap-2">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition-all ${
                  status === s
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleStatusUpdate}
              disabled={saving || status === task?.status}
            >
              {saving ? "Saving…" : "Save Status"}
            </Button>
            <Button
              variant="ghost"
              className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              onClick={handleMarkComplete}
              disabled={saving}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Complete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            This task is marked as <strong>Done</strong>.
          </p>
        </div>
      )}

      {/* ── Add comment ──────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-5 space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <MessageSquare className="h-3.5 w-3.5" /> Add a Comment
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition"
            placeholder="Write a comment and press Enter…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
          />
          <Button
            variant="primary"
            onClick={handleSendComment}
            disabled={!comment.trim() || sendingComment}
            title="Send comment"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-400">Press Enter to send · Shift+Enter for new line</p>
      </div>

      {/* ── Attach file ──────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-4">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 px-4 py-4 text-sm text-slate-500 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition">
          <Paperclip className="h-4 w-4 shrink-0" />
          Click to attach a file
          <input type="file" className="sr-only" onChange={uploadAttachment} />
        </label>
        {task?.attachments?.length > 0 && (
          <p className="mt-1.5 text-xs text-slate-400 text-center">
            {task.attachments.length} file{task.attachments.length > 1 ? "s" : ""} attached
          </p>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex justify-end border-t border-slate-100 dark:border-white/5 pt-4">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Close
        </Button>
      </div>
    </div>
  );
}
