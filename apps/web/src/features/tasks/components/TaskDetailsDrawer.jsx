import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { addTaskCommentAsync, removeTaskAttachmentAsync, uploadTaskAttachmentAsync } from "../../../store/workSlice";
import { Badge, Button } from "../../common/components/UI";
import apiClient from "../../../services/apiClient";
import { canUpdateTask } from "../../../lib/permissions";
import {
  X, Paperclip, MessageSquare, Send, User, Calendar,
  FolderKanban, AlertTriangle, Tag, Clock, CheckCircle2,
  Download, ExternalLink, Trash2, FileText, Image, FileArchive, Loader2,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = new Date() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hrs   < 24) return `${hrs}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getPriorityConfig(priority) {
  if (priority === "Critical") return { tone: "red",    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> };
  if (priority === "High")     return { tone: "amber",  icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> };
  if (priority === "Medium")   return { tone: "indigo", icon: null };
  return                               { tone: "slate",  icon: null };
}

function getStatusConfig(status) {
  if (status === "Done")        return { tone: "green", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> };
  if (status === "In Progress") return { tone: "blue",  icon: null };
  if (status === "Review")      return { tone: "amber", icon: null };
  return                               { tone: "slate", icon: null };
}

function MetaRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-2 w-32 shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 text-sm text-slate-900 dark:text-white">{children}</div>
    </div>
  );
}

function Avatar({ name }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
      {initials}
    </div>
  );
}

function MentionText({ text }) {
  const parts = String(text || "").split(/(@[a-zA-Z][a-zA-Z0-9._-]{1,40})/g);
  return parts.map((part, index) => (
    part.startsWith("@")
      ? <span key={`${part}-${index}`} className="font-semibold text-indigo-600 dark:text-indigo-400">{part}</span>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
}

function formatFileSize(size) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentIcon(type = "") {
  if (type.startsWith("image/")) return Image;
  if (type.includes("zip") || type.includes("compressed")) return FileArchive;
  return FileText;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function TaskDetailsDrawer({ task: initialTask, onClose }) {
  const dispatch = useDispatch();
  const user     = useSelector((state) => state.auth.user);
  const activity = useSelector((state) => state.work.activity || []);
  const projects = useSelector((state) => state.work.projects || []);
  const [details, setDetails] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState("");
  const [activeTab, setActiveTab] = useState("details"); // "details" | "comments" | "attachments"

  useEffect(() => {
    let ignore = false;
    const id = initialTask?.id || initialTask?._id;
    setDetails(initialTask || null);
    setActiveTab("details");
    if (!id) return undefined;

    apiClient.get(`/tasks/${id}`)
      .then((response) => {
        if (!ignore) setDetails(response.data);
      })
      .catch(() => {
        if (!ignore) setDetails(initialTask);
      });

    return () => {
      ignore = true;
    };
  }, [initialTask]);

  const activeTask = details || initialTask;
  const task = activeTask;
  const taskId = activeTask?.id || activeTask?._id;
  const taskProject = useMemo(() => {
    const projectId = activeTask?.projectId?._id || activeTask?.projectId;
    return projects.find((project) => (project.id || project._id)?.toString() === projectId?.toString()) || null;
  }, [activeTask, projects]);
  const canManageAttachments = canUpdateTask(user, activeTask, taskProject);
  const taskHistory = useMemo(() => {
    if (!taskId) return [];
    return activity
      .filter((item) => (item.entityId || "").toString() === taskId.toString())
      .slice(0, 6);
  }, [activity, taskId]);

  const uploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !taskId) return;
    setUploadingAttachment(true);
    try {
      const updatedTask = await dispatch(uploadTaskAttachmentAsync({ id: taskId, file })).unwrap();
      setDetails((current) => ({ ...(current || activeTask), ...updatedTask }));
      toast.success("File attached successfully.");
    } catch (error) {
      toast.error(error || "Failed to attach file.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const openAttachment = (attachment) => {
    if (!attachment?.url) {
      toast.error("This attachment does not have a file URL.");
      return;
    }
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  const downloadAttachment = (attachment) => {
    const url = attachment?.downloadUrl || attachment?.url;
    if (!url) {
      toast.error("This attachment does not have a download URL.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.name || "attachment";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const removeAttachment = async (attachment) => {
    if (!attachment?.id || !taskId) return;
    setRemovingAttachmentId(attachment.id);
    try {
      const updatedTask = await dispatch(
        removeTaskAttachmentAsync({ id: taskId, attachmentId: attachment.id })
      ).unwrap();
      setDetails((current) => ({ ...(current || activeTask), ...updatedTask }));
      toast.success("Attachment removed.");
    } catch (error) {
      toast.error(error || "Failed to remove attachment.");
    } finally {
      setRemovingAttachmentId("");
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    const result = await dispatch(addTaskCommentAsync({ id: taskId, content: comment.trim() }));
    if (!result.error) {
      setDetails((current) => current
        ? {
            ...current,
            comments: [result.payload.comment, ...(current.comments || [])],
            commentsCount: (current.commentsCount || 0) + 1,
          }
        : current);
    }
    setComment("");
    setSending(false);
  };

  const priorityConfig = getPriorityConfig(activeTask?.priority);
  const statusConfig   = getStatusConfig(activeTask?.status);

  const isOverdue = activeTask?.dueDate && new Date(activeTask.dueDate) < new Date() && activeTask?.status !== "Done";

  return (
    <AnimatePresence>
      {activeTask && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-slate-900 ring-1 ring-slate-900/10 dark:ring-white/10"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex items-start gap-3 border-b border-slate-200 dark:border-white/10 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge value={task.status} tone={statusConfig.tone} />
                  <Badge value={task.priority} tone={priorityConfig.tone} />
                  {task.type && <Badge value={task.type} tone="slate" />}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{task.title}</h2>
                {task.projectName && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <FolderKanban className="h-3 w-3" />
                    {task.projectName}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-200 dark:border-white/10 px-5">
              {[
                { id: "details",     label: "Details" },
                { id: "comments",    label: `Comments ${task.commentsCount ? `(${task.commentsCount})` : ""}` },
                { id: "attachments", label: `Files ${task.attachments?.length ? `(${task.attachments.length})` : ""}` },
                { id: "history",     label: "History" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`mr-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Scrollable Body ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">

              {/* ─ Details Tab ─ */}
              {activeTab === "details" && (
                <div className="px-5 py-4 space-y-5">
                  {/* Description */}
                  {task.description ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-400">No description provided.</p>
                  )}

                  {/* Metadata grid */}
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-1">
                    <MetaRow icon={User} label="Assignee">
                      {task.assigneeName ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={task.assigneeName} />
                          {task.assigneeName}
                        </span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </MetaRow>
                    <MetaRow icon={FolderKanban} label="Project">
                      {task.projectName || <span className="text-slate-400">No project</span>}
                    </MetaRow>
                    <MetaRow icon={User} label="Reporter">
                      {task.reporterName || <span className="text-slate-400">Not recorded</span>}
                    </MetaRow>
                    <MetaRow icon={Tag} label="Type">
                      <Badge value={task.type} tone="slate" />
                    </MetaRow>
                    <MetaRow icon={AlertTriangle} label="Priority">
                      <Badge value={task.priority} tone={priorityConfig.tone} />
                    </MetaRow>
                    <MetaRow icon={Calendar} label="Due Date">
                      {task.dueDate ? (
                        <span className={`flex items-center gap-1.5 font-medium ${isOverdue ? "text-red-500" : ""}`}>
                          {isOverdue && <Clock className="h-3.5 w-3.5" />}
                          {new Date(task.dueDate).toLocaleDateString(undefined, {
                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                          })}
                          {isOverdue && <Badge value="Overdue" tone="red" />}
                        </span>
                      ) : (
                        <span className="text-slate-400">No due date</span>
                      )}
                    </MetaRow>
                    <MetaRow icon={Clock} label="Updated">
                      {relativeTime(task.updatedAt)}
                    </MetaRow>
                    <MetaRow icon={CheckCircle2} label="Created">
                      {task.createdAt
                        ? new Date(task.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </MetaRow>
                  </div>
                </div>
              )}

              {/* ─ Comments Tab ─ */}
              {activeTab === "comments" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
                    {!task.comments?.length ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-medium text-slate-500">No comments yet</p>
                        <p className="text-xs text-slate-400 mt-1">Start the conversation below</p>
                      </div>
                    ) : (
                      [...(task.comments || [])].reverse().map((c) => (
                        <div key={c.id || c._id} className="flex items-start gap-3">
                          <Avatar name={c.authorName || c.author || "?"} />
                          <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/10 px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-800 dark:text-white">
                                {c.authorName || c.author || "Unknown"}
                              </span>
                              <span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              <MentionText text={c.content || c.text} />
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment input */}
                  <div className="border-t border-slate-200 dark:border-white/10 px-5 py-4">
                    <div className="flex items-end gap-2">
                      <Avatar name={user?.name} />
                      <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition">
                        <textarea
                          rows={1}
                          placeholder="Add a comment…"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
                          }}
                          className="flex-1 resize-none bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          disabled={!comment.trim() || sending}
                          onClick={handleSendComment}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400 ml-9">Press Enter to send · Shift+Enter for new line</p>
                  </div>
                </div>
              )}

              {/* ─ Attachments Tab ─ */}
              {activeTab === "attachments" && (
                <div className="px-5 py-4 space-y-4">
                  {/* Upload */}
                  {canManageAttachments && (
                    <label className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition ${
                      uploadingAttachment
                        ? "cursor-wait border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "cursor-pointer border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 dark:border-white/20 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
                    }`}>
                      {uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      {uploadingAttachment ? "Uploading file..." : "Click to attach a file"}
                      <input type="file" className="sr-only" onChange={uploadAttachment} disabled={uploadingAttachment} />
                    </label>
                  )}

                  {/* File list */}
                  {!task.attachments?.length ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Paperclip className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-sm font-medium text-slate-500">No attachments yet</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {canManageAttachments ? "Upload reference files, specs, or evidence here." : "No files have been shared on this task."}
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {task.attachments.map((att) => {
                        const AttachmentIcon = getAttachmentIcon(att.type);
                        const removing = removingAttachmentId === att.id;
                        return (
                        <li
                          key={att.id}
                          className="group rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 transition hover:border-indigo-200 hover:bg-white dark:border-white/10 dark:bg-slate-800/30 dark:hover:border-indigo-500/30 dark:hover:bg-slate-800/60"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openAttachment(att)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-500 ring-1 ring-slate-200 transition hover:bg-indigo-50 dark:bg-slate-900 dark:ring-white/10 dark:hover:bg-indigo-500/10"
                              title="Open file"
                            >
                              <AttachmentIcon className="h-5 w-5" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => openAttachment(att)}
                                className="block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
                                title="Open file"
                              >
                                {att.name}
                              </button>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {[formatFileSize(att.size), att.type || "file", att.uploadedByName ? `by ${att.uploadedByName}` : "", att.uploadedAt ? relativeTime(att.uploadedAt) : ""]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openAttachment(att)}
                                disabled={!att.url}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-indigo-300"
                                title="Open"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadAttachment(att)}
                                disabled={!att.url && !att.downloadUrl}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-emerald-300"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {canManageAttachments && (
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(att)}
                                  disabled={removing}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                  title="Remove"
                                >
                                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="hidden">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{att.name}</p>
                            <p className="text-xs text-slate-400">
                              {att.size ? `${Math.ceil(att.size / 1024)} KB` : ""}{att.uploadedAt ? ` · ${relativeTime(att.uploadedAt)}` : ""}
                            </p>
                          </div>
                        </li>
                      )})}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="px-5 py-4 space-y-3">
                  {!taskHistory.length ? (
                    <div className="py-12 text-center text-sm text-slate-400">No task history recorded yet.</div>
                  ) : (
                    taskHistory.map((item) => (
                      <div key={item.id || item._id} className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-800/40">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {item.metadata?.richText || `${item.actorName || "System"} ${item.action?.toLowerCase()} ${item.entityName || "this task"}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{relativeTime(item.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
