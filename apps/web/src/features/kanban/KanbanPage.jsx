import { useDispatch, useSelector } from "react-redux";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { TASK_STATUSES } from "../../constants/roles";
import { moveTaskStatus } from "../../store/workSlice";
import { PageHeader, Badge } from "../common/components/UI";
import { MetricsStrip, StripMetric } from "../common/components/Analytics";
import { selectKanbanColumns, selectKanbanMetrics } from "../../store/selectors";
import { Kanban, GripHorizontal, LayoutTemplate, Lock, Clock, User } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { canMoveTask, isAdmin, isManager, isEmployee } from "../../lib/permissions";

export default function KanbanPage() {
  const tasks = useSelector((state) => state.work.tasks);
  const projects = useSelector((state) => state.work.projects);
  const currentUser = useSelector((state) => state.auth.user);
  const kMetrics = useSelector(selectKanbanMetrics);
  const grouped = useSelector(selectKanbanColumns);
  const dispatch = useDispatch();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  );

  const moveTask = (taskId, status) => {
    const task = tasks.find((t) => (t.id || t._id?.toString()) === taskId?.toString());
    if (!task || task.status === status) return;

    const project = projects.find(
      (p) =>
        (p.id || p._id?.toString()) ===
        (task.projectId?._id?.toString() || task.projectId?.toString())
    );

    if (!canMoveTask(currentUser, task, project)) {
      toast.error("You don't have permission to move this task.", {
        toastId: `move-denied-${task.id || task._id}`,
      });
      return;
    }

    dispatch(moveTaskStatus({ id: taskId, status }));
  };

  const kanbanSubtitle = isAdmin(currentUser)
    ? "Global task board — all workspace tasks"
    : isManager(currentUser)
    ? "Your project tasks — managed scope"
    : "My assigned tasks — execution workspace";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-6">
      <PageHeader
        title="Kanban Board"
        subtitle={kanbanSubtitle}
        icon={Kanban}
      />

      {/* Employee scope notice */}
      {isEmployee(currentUser) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/80 dark:bg-indigo-900/20 px-4 py-2.5 text-sm text-indigo-700 dark:text-indigo-300">
          <Lock className="h-4 w-4 shrink-0 text-indigo-500" />
          Showing only tasks assigned to you. Status updates can be done by dragging or via the Tasks page.
        </div>
      )}

      <MetricsStrip>
        <StripMetric label="Total Tasks" value={kMetrics.totalActive + kMetrics.done} />
        <StripMetric label="In Progress" value={kMetrics.inProgress} />
        <StripMetric label="Review Bottleneck" value={kMetrics.bottlenecks} sub="Requires attention" />
        <StripMetric label="Done" value={kMetrics.done} />
        <StripMetric label="Velocity" value={kMetrics.velocity} sub="% Completed" />
      </MetricsStrip>

      <DndContext sensors={sensors} onDragEnd={({ active, over }) => over && moveTask(active.id, over.id)}>
        <div className="flex flex-1 snap-x gap-4 overflow-x-auto overscroll-x-contain pb-4 pt-2 [-webkit-overflow-scrolling:touch] sm:gap-6">
          {grouped.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              tasks={col.tasks}
              currentUser={currentUser}
              projects={projects}
              onStatusChange={moveTask}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ status, tasks, currentUser, projects, onStatusChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-[82vw] max-w-80 shrink-0 snap-start flex-col rounded-2xl border border-slate-200/50 bg-slate-100/50 p-3 backdrop-blur-xl dark:border-white/5 dark:bg-slate-900/40 sm:w-80">
      <div className="mb-4 flex items-center justify-between px-2">
        <h3 className="font-semibold text-slate-900 dark:text-white tracking-tight">{status}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/50 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 rounded-xl p-1 transition-colors ${
          isOver ? "bg-indigo-50 dark:bg-indigo-500/10" : ""
        }`}
      >
        {tasks.map((task) => {
          const project = projects.find(
            (p) =>
              (p.id || p._id?.toString()) ===
              (task.projectId?._id?.toString() || task.projectId?.toString())
          );
          const isDraggable = canMoveTask(currentUser, task, project);
          return (
            <TaskCard
              key={task.id || task._id}
              task={task}
              isDraggable={isDraggable}
              onStatusChange={onStatusChange}
            />
          );
        })}
        {tasks.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-sm text-slate-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isDraggable, onStatusChange }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id || task._id,
    // Disable drag interaction for unauthorized tasks
    disabled: !isDraggable,
  });

  const getPriorityTone = (priority) => {
    if (priority === "Critical") return "red";
    if (priority === "High") return "amber";
    if (priority === "Medium") return "indigo";
    return "blue";
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done";

  return (
    <motion.div
      ref={setNodeRef}
      layoutId={task.id || task._id}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 50 : 1,
      }}
      className={`group relative rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all dark:border-white/10 dark:bg-slate-800
        ${isDraggable
          ? "hover:shadow-md"
          : "cursor-not-allowed opacity-70"
        }
        ${isDragging ? "shadow-2xl ring-2 ring-indigo-500/50 rotate-2 scale-105" : ""}
      `}
    >
      {/* Lock indicator for unauthorized cards */}
      {!isDraggable && (
        <span
          title="You don't have permission to move this task"
          className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700"
        >
          <Lock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
        </span>
      )}

      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug pr-6">
          {task.title}
        </p>
        {isDraggable && (
          <button
            type="button"
            aria-label={`Drag ${task.title}`}
            {...listeners}
            {...attributes}
            className="flex h-9 w-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 active:cursor-grabbing active:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-700 sm:h-7 sm:w-7 sm:opacity-0"
          >
            <GripHorizontal className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {(task.displayProjectName || task.projectName) && (
        <p className="mb-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate">
          {task.displayProjectName || task.projectName}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <Badge value={task.priority} tone={getPriorityTone(task.priority)} />
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase font-semibold tracking-wider">{task.type}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          <span className="truncate max-w-[90px]">
            {task.displayAssigneeName || task.assigneeName || "Unassigned"}
          </span>
        </div>
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
            <Clock className="h-3 w-3" />
            <span>
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
      {isDraggable && (
        <label className="mt-3 block border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 dark:border-white/5 dark:text-slate-400 sm:hidden">
          Move to
          <select
            value={task.status}
            onChange={(event) => onStatusChange(task.id || task._id, event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      )}
    </motion.div>
  );
}
