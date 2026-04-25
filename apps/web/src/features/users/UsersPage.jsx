import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { PageCard, PageHeader, Button, Badge, TableShell, EmptyState, SkeletonList } from "../common/components/UI";
import { InsightCard } from "../common/components/Analytics";
import Avatar from "../common/components/Avatar";
import { applyTextFilter } from "../common/utils/filtering";
import { createUserAsync, updateUserAsync, fetchUsers } from "../../store/workSlice";
import { selectWorkloadMetrics } from "../../store/selectors";
import UserForm from "./components/UserForm";
import { formatRoleLabel, getRoleColors, formatTeamLabel, formatManagerName } from "../../lib/formatters";
import { Users, Search, UserPlus, ShieldAlert, Activity } from "lucide-react";
import { isAdmin } from "../../lib/permissions";

export default function UsersPage() {
  const dispatch = useDispatch();
  const workload = useSelector(selectWorkloadMetrics);
  const users = useSelector((state) => state.work.users);
  const usersStatus = useSelector((state) => state.work.usersStatus);
  const currentUser = useSelector((state) => state.auth.user);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [updatedUserId, setUpdatedUserId] = useState(null);

  const userRefs = useRef({});
  const highlightTimer = useRef(null);

  const setRef = useCallback((id, el) => {
    if (el) userRefs.current[id] = el;
    else delete userRefs.current[id];
  }, []);

  useEffect(() => {
    if (!users.length && usersStatus !== "loading") {
      dispatch(fetchUsers());
    }
  }, [dispatch, users.length, usersStatus]);

  // Scroll to and briefly highlight the recently updated/created row.
  // 250ms delay gives React time to re-render the list after the edit panel closes.
  useEffect(() => {
    if (!updatedUserId) return;
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    const scrollTimer = setTimeout(() => {
      const el = userRefs.current[updatedUserId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);

    highlightTimer.current = setTimeout(() => {
      setUpdatedUserId(null);
    }, 2500);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(highlightTimer.current);
    };
  }, [updatedUserId]);

  // Join workload metrics onto base users
  const activeMap = useMemo(() => {
    return workload.reduce((acc, w) => {
      acc[w.id || w._id] = w;
      return acc;
    }, {});
  }, [workload]);

  const usersById = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id || user._id] = user;
      return acc;
    }, {});
  }, [users]);

  const jointUsers = useMemo(() => {
    return users.map((u) => ({
      ...u,
      ...(activeMap[u.id || u._id] || { activeTaskCount: 0, completedTaskCount: 0, overdueTaskCount: 0 }),
    }));
  }, [users, activeMap]);

  // Search across name, email, role, and team
  const filtered = useMemo(
    () => applyTextFilter(jointUsers, query, ["name", "email", "role", "team"]),
    [jointUsers, query]
  );

  const topContributor =
    workload.length > 0 && workload[0].activeTaskCount > 0 ? workload[0] : null;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Safely resolve the manager display name from a user's managerId.
   * Handles populated { id, name } objects, raw strings, and null.
   */
  function resolveManagerName(managerId) {
    if (!managerId) return "—";
    if (typeof managerId === "object" && managerId.name) return managerId.name;
    // Raw ObjectId string — find in loaded users list if possible
    if (typeof managerId === "string") {
      const found = usersById[managerId];
      return found ? found.name : "—";
    }
    return "—";
  }

  function resolveManager(managerId) {
    if (!managerId) return null;
    if (typeof managerId === "object") return managerId;
    return usersById[managerId] || null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin(currentUser) ? "Team Directory" : "Your Team"}
        subtitle={
          isAdmin(currentUser)
            ? "Manage workspace capacity, roles, reporting hierarchy, and safe account activation"
            : "Team members in your scope — read-only view"
        }
        icon={Users}
        actions={
          isAdmin(currentUser) && (
            <Button onClick={() => setEditing({ isActive: true })}>
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          )
        }
      />

      {/* ── Insight Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard
          title="Total Headcount"
          value={users.length}
          insight={`${users.filter((u) => u.isActive).length} active licenses`}
          icon={Users}
        />
        {topContributor ? (
          <InsightCard
            title="Max Workload"
            value={topContributor.activeTaskCount}
            insight={`Belongs to ${topContributor.name.split(" ")[0]}`}
            icon={Activity}
            trend={topContributor.overdueTaskCount > 0 ? topContributor.overdueTaskCount : undefined}
          />
        ) : (
          <InsightCard title="Max Workload" value={0} insight="Everyone has bandwidth" icon={Activity} />
        )}
        <InsightCard
          title="At Risk"
          value={workload.reduce((sum, w) => sum + w.overdueTaskCount, 0)}
          insight="Tasks currently overdue"
          icon={ShieldAlert}
        />
      </div>

      {/* ── User Table ── */}
      <PageCard>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Manager scope notice */}
          {!isAdmin(currentUser) && (
            <div className="w-full flex items-center gap-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2.5 text-sm text-indigo-700 dark:text-indigo-300 mb-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-500" />
              Showing team members in your scope. Contact an admin to make changes.
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full max-w-md rounded-xl border border-slate-200/60 bg-slate-50 py-2 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, role, or team..."
            />
          </div>
        </div>

        {usersStatus === "loading" && !users.length ? (
          <SkeletonList rows={5} />
        ) : !filtered.length ? (
          <EmptyState
            title={
              isAdmin(currentUser)
                ? query ? "No users match your search" : "No users yet"
                : "No team members in your scope yet"
            }
            description={
              isAdmin(currentUser)
                ? query
                  ? "Try a different search term, or add a new user to the workspace."
                  : "Add users to start managing workspace capacity and hierarchy."
                : "Team members will appear here as they are assigned to your team or report to you."
            }
            icon={Users}
          />
        ) : (
          <div className="overflow-x-auto">
            <TableShell>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/50">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Reports To</th>
                  <th className="px-6 py-4">Workload</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdmin(currentUser) && (
                    <th className="px-6 py-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filtered.map((user) => {
                  const uid = user.id || user._id;
                  const isHighlighted = uid === updatedUserId;
                  const roleColors = getRoleColors(user.role);
                  const managerName = resolveManagerName(user.managerId);
                  const manager = resolveManager(user.managerId);

                  return (
                    <tr
                      key={uid}
                      ref={(el) => setRef(uid, el)}
                      className={`transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                        isHighlighted
                          ? "bg-indigo-50/80 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-400/60 dark:ring-indigo-500/40 shadow-sm"
                          : ""
                      }`}
                    >
                      {/* User cell */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} src={user.profileImageUrl} alt={`${user.name} avatar`} />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColors.bg} ${roleColors.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${roleColors.dot}`} />
                          {formatRoleLabel(user.role)}
                        </span>
                      </td>

                      {/* Team */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {user.team ? (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {user.team}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      {/* Reports To */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {user.role === "employee" && managerName !== "—" ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={managerName}
                              src={manager?.profileImageUrl}
                              size="xs"
                              alt={`${managerName} avatar`}
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {managerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Workload */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {user.activeTaskCount} active
                          </span>
                          {user.overdueTaskCount > 0 ? (
                            <span className="font-semibold text-red-500">
                              {user.overdueTaskCount} overdue!
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {user.completedTaskCount} completed
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge
                          value={user.isActive ? "Active" : "Inactive"}
                          tone={user.isActive ? "green" : "slate"}
                        />
                      </td>

                      {/* Actions — admin only */}
                      {isAdmin(currentUser) && (
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 text-sm">
                            <Button variant="secondary" onClick={() => setEditing(user)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              title={
                                user.isActive
                                  ? "Deactivate account access while preserving historical work"
                                  : "Restore account access"
                              }
                              className={
                                user.isActive
                                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                              }
                              onClick={() => {
                                const idToUpdate = user.id || user._id;
                                dispatch(updateUserAsync({ id: idToUpdate, active: !user.isActive }))
                                  .unwrap()
                                  .then(() => {
                                    setUpdatedUserId(idToUpdate);
                                    toast.success(
                                      `User ${!user.isActive ? "activated" : "deactivated"} successfully`
                                    );
                                  })
                                  .catch((err) =>
                                    toast.error(`Failed: ${err.message || err}`)
                                  );
                              }}
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </div>
        )}
      </PageCard>

      {/* ── Edit / Create Panel — admin only ── */}
      {editing && isAdmin(currentUser) && (
        <PageCard title={editing.id ? "Edit User" : "Add New User"}>
          <UserForm
            initialValues={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => {
              const payload = { ...values };
              if (!payload.password) delete payload.password;
              // Clear managerId if not an employee
              if (payload.role !== "employee") payload.managerId = null;

              if (editing.id || editing._id) {
                dispatch(updateUserAsync({ id: editing.id || editing._id, ...payload }))
                  .unwrap()
                  .then(() => {
                    setEditing(null);
                    setUpdatedUserId(editing.id || editing._id);
                    toast.success("User updated successfully");
                  })
                  .catch((err) => toast.error(`Failed to update user: ${err.message || err}`));
              } else {
                dispatch(createUserAsync(payload))
                  .unwrap()
                  .then((res) => {
                    setEditing(null);
                    setUpdatedUserId(res.id || res._id);
                    toast.success("User created successfully");
                  })
                  .catch((err) => toast.error(`Failed to create user: ${err.message || err}`));
              }
            }}
          />
        </PageCard>
      )}
    </div>
  );
}
