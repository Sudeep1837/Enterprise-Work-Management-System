import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useRevealFocus } from "../../hooks/useRevealFocus";
import { applyTextFilter, sortByField } from "../common/utils/filtering";
import { ConfirmDialog, EmptyState, PageCard, PageHeader, Button, Badge } from "../common/components/UI";
import { MetricsStrip, StripMetric } from "../common/components/Analytics";
import { archiveTaskAsync, createTask, updateTaskAsync, bulkUpdateTasksAsync } from "../../store/workSlice";
import { selectDashboardMetrics } from "../../store/selectors";
import TaskForm from "./components/TaskForm";
import TaskDetailsDrawer from "./components/TaskDetailsDrawer";
import EmployeeTaskUpdate from "./components/EmployeeTaskUpdate";
import { buildTaskMutationPayload } from "./utils/taskPayload";
import { Archive, CheckSquare, Plus, Search, Clock, User, Sparkles, Lock } from "lucide-react";
import { canArchiveTask, canUpdateTask, isEmployee, isAdmin, isManager } from "../../lib/permissions";

export default function TasksPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.work.tasks);
  const users = useSelector((state) => state.work.users);
  const projects = useSelector((state) => state.work.projects);
  const metrics = useSelector(selectDashboardMetrics);
  const currentUser = useSelector((state) => state.auth.user);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkArchive, setBulkArchive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [newTaskId, setNewTaskId] = useState(null);

  const debounced = useDebouncedValue(query);
  const taskRefs = useRef({});
  const newTaskHighlightTimer = useRef(null);
  const editingKey = editing?.id || editing?._id || (editing ? "new-task" : "");
  const { targetRef: editPanelRef, isHighlighted: isEditPanelHighlighted } = useRevealFocus(
    Boolean(editing),
    editingKey
  );

  const filtered = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "All") result = result.filter((t) => t.status === statusFilter);
    return sortByField(applyTextFilter(result, debounced, ["title", "type", "priority", "status"]), sort, "desc");
  }, [tasks, debounced, sort, statusFilter]);

  useEffect(() => {
    if (!newTaskId) return;
    if (newTaskHighlightTimer.current) clearTimeout(newTaskHighlightTimer.current);

    const scrollTimer = setTimeout(() => {
      const el = taskRefs.current[newTaskId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    newTaskHighlightTimer.current = setTimeout(() => {
      setNewTaskId(null);
    }, 3000);

    return () => clearTimeout(scrollTimer);
  }, [newTaskId]);

  const saveTask = async (values) => {
    const payload = buildTaskMutationPayload(values);
    if (editing?.id || editing?._id) {
      const id = editing.id || editing._id;
      const result = await dispatch(updateTaskAsync({ id, ...payload }));
      if (result.error) {
        toast.error(result.payload || "Failed to update task");
        return;
      }
      toast.success("Task updated successfully");
    } else {
      const result = await dispatch(createTask(payload));
      if (!result.error) {
        const created = result.payload;
        const id = created?.id || created?._id?.toString();
        toast.success("Task created successfully");
        setEditing(null);
        setStatusFilter("All");
        if (id) setNewTaskId(id);
        return;
      }
      toast.error(result.payload || "Failed to create task");
    }
    setEditing(null);
  };

  const getPriorityTone = (priority) => {
    if (priority === "Critical") return "red";
    if (priority === "High") return "amber";
    if (priority === "Medium") return "indigo";
    return "slate";
  };

  const getUserName = (id) =>
    users.find((u) => (u.id || u._id?.toString()) === id?.toString())?.name || "Unassigned";

  const getProject = (task) =>
    projects.find(
      (p) =>
        (p.id || p._id?.toString()) ===
        (task.projectId?._id?.toString() || task.projectId?.toString())
    );

  const setRef = useCallback((id, el) => {
    if (el) taskRefs.current[id] = el;
    else delete taskRefs.current[id];
  }, []);

  const clearSelection = () => setSelectedIds([]);

  const toggleSelected = (taskId) => {
    setSelectedIds((ids) => ids.includes(taskId) ? ids.filter((id) => id !== taskId) : [...ids, taskId]);
  };

  const runBulkUpdate = async (payload) => {
    const result = await dispatch(bulkUpdateTasksAsync({ ids: selectedIds, ...payload }));
    if (result.error) {
      toast.error(result.payload || "Bulk update failed");
      return;
    }
    const actionLabel = payload.archived ? "archived" : "updated";
    toast.success(`${result.payload.length} task${result.payload.length === 1 ? "" : "s"} ${actionLabel}`);
    clearSelection();
  };

  const archiveTask = async () => {
    if (!archiving) return;
    const result = await dispatch(archiveTaskAsync(archiving.id || archiving._id));
    setArchiving(null);
    if (result.error) {
      toast.error(result.payload || "Failed to archive task");
      return;
    }
    toast.success("Task archived");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Execution"
        subtitle={
          isAdmin(currentUser)
            ? "Global task management — all workspace tasks"
            : isManager(currentUser)
            ? "Your project tasks — managed scope"
            : "My assigned tasks — execution workspace"
        }
        icon={CheckSquare}
        actions={
          // Employees are execution-only — they cannot create new tasks
          !isEmployee(currentUser) && (
            <Button onClick={() => setEditing({ status: "Todo", type: "Feature", priority: "Medium" })}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          )
        }
      />

      <MetricsStrip>
        <div className="flex w-full overflow-x-auto pb-2 sm:pb-0 hide-scrollbar gap-2 sm:gap-6 cursor-pointer">
          <div
            onClick={() => setStatusFilter("All")}
            className={`transition-opacity hover:opacity-100 ${statusFilter === "All" ? "opacity-100" : "opacity-50 grayscale"}`}
          >
            <StripMetric label="Total Tasks" value={metrics.totalTasks} />
          </div>
          {metrics.statusData.map((stat) => (
            <div
              key={stat.name}
              onClick={() => setStatusFilter(stat.name)}
              className={`transition-opacity hover:opacity-100 ${statusFilter === stat.name ? "opacity-100 scale-105" : "opacity-50 grayscale"}`}
            >
              <StripMetric label={stat.name} value={stat.value} sub="Tasks" />
            </div>
          ))}
        </div>
      </MetricsStrip>

      {/* Task Create / Edit Form — full form for admin/manager, limited for employee */}
      <AnimatePresence>
        {editing && (
          <motion.div
            key="task-form"
            ref={editPanelRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className={`rounded-2xl outline-none transition-shadow duration-300 ${
              isEditPanelHighlighted
                ? "ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-slate-50 dark:ring-indigo-500/60 dark:ring-offset-slate-950"
                : ""
            }`}
          >
            {isEmployee(currentUser) ? (
              // Employees get the execution-only panel
              <PageCard title="Update Task">
                <EmployeeTaskUpdate
                  task={editing}
                  onCancel={() => setEditing(null)}
                  onSuccess={() => setEditing(null)}
                />
              </PageCard>
            ) : (
              // Admin / Manager get the full editor
              <PageCard title={editing.id ? "Edit Task" : "Create Task"}>
                <TaskForm initialValues={editing} onSubmit={saveTask} onCancel={() => setEditing(null)} />
              </PageCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PageCard>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-2 dark:border-indigo-500/20 dark:bg-indigo-500/10 sm:w-full">
              <span className="px-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {selectedIds.length} selected
              </span>
              <select
                className="rounded-lg border border-white/60 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) runBulkUpdate({ status: e.target.value });
                  e.target.value = "";
                }}
              >
                <option value="">Set status...</option>
                {["Todo", "In Progress", "Review", "Done"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              {!isEmployee(currentUser) && (
                <select
                  className="rounded-lg border border-white/60 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                  defaultValue=""
                  onChange={(e) => {
                    const user = users.find((item) => (item.id || item._id?.toString()) === e.target.value);
                    if (user) runBulkUpdate({ assigneeId: user.id || user._id, assigneeName: user.name });
                    e.target.value = "";
                  }}
                >
                  <option value="">Assign to...</option>
                  {users.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name}</option>)}
                </select>
              )}
              {!isEmployee(currentUser) && (
                <Button variant="ghost" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => setBulkArchive(true)}>
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              )}
              <Button variant="ghost" onClick={clearSelection}>Clear</Button>
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200/60 bg-slate-50 py-2 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              placeholder="Search tasks by title, type, priority..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="updatedAt">Recently updated</option>
            <option value="title">Alphabetical</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {!filtered.length ? (
          <EmptyState
            title="No tasks found"
            description="Create a task to start tracking delivery or adjust your search filters."
            icon={CheckSquare}
          />
        ) : (
          <div className="grid gap-3">
            <AnimatePresence initial={false}>
              {filtered.map((task) => {
                const taskId = task.id || task._id?.toString();
                const isNew = taskId === newTaskId;
                const project = getProject(task);
                const userCanEdit = canUpdateTask(currentUser, task, project);
                const userCanArchive = canArchiveTask(currentUser, task, project);

                return (
                  <motion.article
                    key={taskId}
                    ref={(el) => setRef(taskId, el)}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`group relative flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between cursor-pointer
                      ${isNew
                        ? "border-indigo-400 bg-indigo-50/80 ring-2 ring-indigo-400/60 dark:bg-indigo-900/20 dark:border-indigo-500 dark:ring-indigo-500/40"
                        : "border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-900/50"
                      }`}
                  >
                    {isNew && (
                      <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        <Sparkles className="h-2.5 w-2.5" /> Just created
                      </span>
                    )}

                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(taskId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelected(taskId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        aria-label={`Select ${task.title}`}
                      />
                    </div>

                    <div className="relative flex-1" onClick={() => setSelected(taskId)}>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                          {task.title}
                        </h3>
                        <Badge value={task.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center">
                          <Badge value={task.priority} tone={getPriorityTone(task.priority)} />
                        </span>
                        <span className="flex items-center gap-1.5 before:content-['·'] before:mr-1.5 uppercase text-[10px] tracking-wider font-bold">
                          {task.type}
                        </span>
                        <span className="flex items-center gap-1.5 before:content-['·'] before:mr-1.5 font-medium text-slate-600 dark:text-slate-300">
                          <User className="h-3.5 w-3.5" />
                          {getUserName(task.assigneeId)}
                        </span>
                        {task.projectName && (
                          <span className="flex items-center gap-1.5 before:content-['·'] before:mr-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                            {task.projectName}
                          </span>
                        )}
                        {task.dueDate && (
                          <span
                            className={`flex items-center gap-1.5 before:content-['·'] before:mr-1.5 ${
                              new Date(task.dueDate) < new Date() && task.status !== "Done"
                                ? "text-red-500 font-medium"
                                : ""
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons — only show what this user is allowed to do */}
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5 sm:border-0 sm:pt-0">
                      {userCanEdit ? (
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(task);
                          }}
                        >
                          Edit
                        </Button>
                      ) : (
                        <span
                          title="You don't have permission to edit this task"
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-600 cursor-not-allowed select-none"
                        >
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}

                      {userCanArchive && (
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiving(task);
                          }}
                          className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/10"
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </PageCard>

      <ConfirmDialog
        open={Boolean(archiving)}
        title="Archive task?"
        message="This will archive the task and keep historical reporting intact."
        onCancel={() => setArchiving(null)}
        onConfirm={archiveTask}
      />
      <ConfirmDialog
        open={bulkArchive}
        title="Archive selected tasks?"
        message="Selected tasks will be removed from active task views but retained for audit history."
        onCancel={() => setBulkArchive(false)}
        onConfirm={() => {
          setBulkArchive(false);
          runBulkUpdate({ archived: true });
        }}
      />
      <TaskDetailsDrawer
        task={tasks.find((item) => item.id === selected || item._id?.toString() === selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
