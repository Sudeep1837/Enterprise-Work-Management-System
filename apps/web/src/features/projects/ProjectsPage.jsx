import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { applyTextFilter, sortByField } from "../common/utils/filtering";
import { ConfirmDialog, EmptyState, PageCard, PageHeader, Button, TableShell, Badge } from "../common/components/UI";
import { MetricsStrip, StripMetric, ProgressRing } from "../common/components/Analytics";
import { deleteProjectAsync, createProject, updateProject } from "../../store/workSlice";
import { selectProjectHealth } from "../../store/selectors";
import ProjectForm from "./components/ProjectForm";
import { FolderKanban, Plus, Search, Lock } from "lucide-react";
import { canDeleteProject, canCreateProject, canManageProject, isAdmin, isManager, isEmployee } from "../../lib/permissions";

export default function ProjectsPage() {
  const dispatch = useDispatch();
  const projectHealth = useSelector(selectProjectHealth);
  const currentUser = useSelector((state) => state.auth.user);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const debounced = useDebouncedValue(query);
  const filtered = useMemo(
    () => sortByField(applyTextFilter(projectHealth, debounced, ["name", "status", "owner"]), sort, "desc"),
    [projectHealth, debounced, sort]
  );

  const saveProject = async (values) => {
    if (editing?.id || editing?._id) {
      const id = editing.id || editing._id;
      const result = await dispatch(updateProject({ ...editing, ...values, id }));
      if (result.error) {
        toast.error("You do not have permission to edit this project.");
        return;
      }
      toast.success("Project updated successfully");
    } else {
      const result = await dispatch(createProject({ ...values }));
      if (!result.error) toast.success("Project created successfully");
      else toast.error(result.payload || "Failed to create project");
    }
    setEditing(null);
  };

  const getStatusTone = (status) => {
    if (status === "Completed") return "green";
    if (status === "Active") return "blue";
    if (status === "On Hold") return "amber";
    return "slate";
  };

  const completedCount = projectHealth.filter((p) => p.status === "Completed").length;
  const activeCount = projectHealth.filter((p) => p.status === "Active").length;

  const projectSubtitle = isAdmin(currentUser)
    ? "Global project registry — all workspace projects"
    : isManager(currentUser)
    ? "Your managed projects — ownership scope"
    : "Projects you are a member of";

  const projectCountLabel = isAdmin(currentUser) ? "Total Projects" : "Your Projects";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle={projectSubtitle}
        icon={FolderKanban}
        actions={
          canCreateProject(currentUser) && (
            <Button onClick={() => setEditing({ status: "Planning" })}>
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )
        }
      />

      <MetricsStrip>
        <StripMetric label={projectCountLabel} value={projectHealth.length} />
        <StripMetric label="Active Delivery" value={activeCount} sub="In Progress" />
        <StripMetric label="Completed" value={completedCount} />
        <StripMetric
          label="Global Health"
          value={
            projectHealth.length
              ? Math.round(
                  projectHealth.reduce((acc, p) => acc + p.progress, 0) / projectHealth.length
                )
              : 0
          }
          sub="% Average"
        />
      </MetricsStrip>

      <PageCard>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200/60 bg-slate-50 py-2 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              placeholder="Search projects by name, owner, or status..."
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
            <option value="name">Alphabetical</option>
          </select>
        </div>

        {!filtered.length ? (
          <EmptyState
            title="No projects found"
            description="Create a project to start organizing your work tracking."
            icon={FolderKanban}
          />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/50">
                <th className="px-6 py-4">Project Details</th>
                <th className="px-6 py-4 text-center">Completion</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filtered.map((item) => {
                const userCanEdit = canManageProject(currentUser, item);
                const userCanDelete = canDeleteProject(currentUser, item);

                return (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.taskCount} assigned tasks</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 flex justify-center">
                      <ProgressRing
                        progress={item.progress}
                        size={44}
                        strokeWidth={4}
                        colorClass={
                          item.health === "excellent"
                            ? "text-emerald-500"
                            : item.health === "good"
                            ? "text-indigo-500"
                            : "text-amber-500"
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge value={item.status} tone={getStatusTone(item.status)} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {item.owner ? item.owner.charAt(0) : "?"}
                        </div>
                        {item.owner}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Edit: only visible when user can manage this project */}
                        {userCanEdit ? (
                          <Button variant="secondary" onClick={() => setEditing(item)}>
                            Edit
                          </Button>
                        ) : (
                          <span
                            title="Only the project owner or an admin can edit this project"
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-600 cursor-not-allowed select-none"
                          >
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}

                        {userCanDelete && (
                          <Button
                            variant="ghost"
                            onClick={() => setDeleting(item)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </PageCard>

      {editing && (
        <PageCard title={editing.id ? "Edit Project" : "Create Project"}>
          <ProjectForm initialValues={editing} onSubmit={saveProject} onCancel={() => setEditing(null)} />
        </PageCard>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete project?"
        message="This drops all tasks linked to this project."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          dispatch(deleteProjectAsync(deleting.id));
          setDeleting(null);
        }}
      />
    </div>
  );
}
