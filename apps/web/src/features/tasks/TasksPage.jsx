import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { applyTextFilter, sortByField } from "../common/utils/filtering";
import { ConfirmDialog, EmptyState, PageCard, PageHeader, Button, Badge } from "../common/components/UI";
import { MetricsStrip, StripMetric } from "../common/components/Analytics";
import { deleteTaskAsync, createTask, updateTaskAsync } from "../../store/workSlice";
import { selectDashboardMetrics } from "../../store/selectors";
import TaskForm from "./components/TaskForm";
import TaskDetailsDrawer from "./components/TaskDetailsDrawer";
import { CheckSquare, Plus, Search, Clock, User, Sparkles } from "lucide-react";
import { canDeleteTask, canCreateProject } from "../../lib/permissions";

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
  const [deleting, setDeleting] = useState(null);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [newTaskId, setNewTaskId] = useState(null);

  const debounced = useDebouncedValue(query);
  const taskRefs = useRef({});
  const newTaskHighlightTimer = useRef(null);

  const filtered = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "All") result = result.filter(t => t.status === statusFilter);
    return sortByField(applyTextFilter(result, debounced, ["title", "type", "priority", "status"]), sort, "desc");
  }, [tasks, debounced, sort, statusFilter]);

  // When a new task id is set, scroll it into view and clear highlight after 3s
  useEffect(() => {
    if (!newTaskId) return;
    // Clear any pending timer
    if (newTaskHighlightTimer.current) clearTimeout(newTaskHighlightTimer.current);

    // Small delay to allow React to render the new row
    const scrollTimer = setTimeout(() => {
      const el = taskRefs.current[newTaskId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    newTaskHighlightTimer.current = setTimeout(() => {
      setNewTaskId(null);
    }, 3000);

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [newTaskId]);

  const saveTask = async (values) => {
    if (editing?.id || editing?._id) {
      const id = editing.id || editing._id;
      await dispatch(updateTaskAsync({ ...editing, ...values, id }));
      toast.success("Task updated successfully");
    } else {
      const result = await dispatch(createTask({ ...values }));
      if (!result.error) {
        const created = result.payload;
        const id = created?.id || created?._id?.toString();
        toast.success("Task created successfully");
        setEditing(null);
        // Reset filter so new task is visible, then highlight it
        setStatusFilter("All");
        if (id) setNewTaskId(id);
        return;
      }
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
    users.find(u => (u.id || u._id?.toString()) === id?.toString())?.name || "Unassigned";

  const setRef = useCallback((id, el) => {
    if (el) taskRefs.current[id] = el;
    else delete taskRefs.current[id];
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Execution"
        subtitle="Manage constraints and deliverable tasks"
        icon={CheckSquare}
        actions={
          <Button onClick={() => setEditing({ status: "Todo", type: "Feature", priority: "Medium" })}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        }
      />

      <MetricsStrip>
        <div className="flex w-full overflow-x-auto pb-2 sm:pb-0 hide-scrollbar gap-2 sm:gap-6 cursor-pointer">
          <div onClick={() => setStatusFilter("All")} className={`transition-opacity hover:opacity-100 ${statusFilter === "All" ? "opacity-100" : "opacity-50 grayscale"}`}>
            <StripMetric label="Total Tasks" value={metrics.totalTasks} />
          </div>
          {metrics.statusData.map(stat => (
            <div key={stat.name} onClick={() => setStatusFilter(stat.name)} className={`transition-opacity hover:opacity-100 ${statusFilter === stat.name ? "opacity-100 scale-105" : "opacity-50 grayscale"}`}>
              <StripMetric label={stat.name} value={stat.value} sub="Tasks" />
            </div>
          ))}
        </div>
      </MetricsStrip>

      {/* Task Create Form (shown inline above the list) */}
      <AnimatePresence>
        {editing && (
          <motion.div
            key="task-form"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <PageCard title={editing.id ? "Edit Task" : "Create Task"}>
              <TaskForm initialValues={editing} onSubmit={saveTask} onCancel={() => setEditing(null)} />
            </PageCard>
          </motion.div>
        )}
      </AnimatePresence>

      <PageCard>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
            <option value="priority">Priority String</option>
          </select>
        </div>

        {!filtered.length ? (
          <EmptyState title="No tasks found" description="Create a task to start tracking delivery or adjust your search filters." icon={CheckSquare} />
        ) : (
          <div className="grid gap-3">
            <AnimatePresence initial={false}>
              {filtered.map((task) => {
                const taskId = task.id || task._id?.toString();
                const isNew = taskId === newTaskId;
                return (
                  <motion.article
                    key={taskId}
                    ref={(el) => setRef(taskId, el)}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`group flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between cursor-pointer
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
                    <div className="relative flex-1" onClick={() => setSelected(taskId)}>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{task.title}</h3>
                        <Badge value={task.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center"><Badge value={task.priority} tone={getPriorityTone(task.priority)} /></span>
                        <span className="flex items-center gap-1.5 before:content-['·'] before:mr-1.5 uppercase text-[10px] tracking-wider font-bold">{task.type}</span>
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
                          <span className={`flex items-center gap-1.5 before:content-['·'] before:mr-1.5 ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done" ? "text-red-500 font-medium" : ""}`}>
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5 sm:border-0 sm:pt-0">
                      <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setEditing(task); }}>Edit</Button>
                      {canDeleteTask(currentUser, task, projects.find(p => (p.id || p._id?.toString()) === (task.projectId?._id?.toString() || task.projectId?.toString()))) && (
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleting(task); }} className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">Delete</Button>
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
        open={Boolean(deleting)}
        title="Delete task?"
        message="This will permanently remove the task."
        onCancel={() => setDeleting(null)}
        onConfirm={() => { dispatch(deleteTaskAsync(deleting.id || deleting._id)); setDeleting(null); }}
      />
      <TaskDetailsDrawer
        task={tasks.find((item) => item.id === selected || item._id?.toString() === selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
