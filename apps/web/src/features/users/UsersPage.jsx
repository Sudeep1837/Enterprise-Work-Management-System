import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { PageCard, PageHeader, Button, Badge, TableShell, EmptyState } from "../common/components/UI";
import { InsightCard } from "../common/components/Analytics";
import { applyTextFilter } from "../common/utils/filtering";
import { createUserAsync, updateUserAsync, fetchUsers } from "../../store/workSlice";
import { selectWorkloadMetrics } from "../../store/selectors";
import UserForm from "./components/UserForm";
import { Users, Search, UserPlus, ShieldAlert, Activity } from "lucide-react";

export default function UsersPage() {
  const dispatch = useDispatch();
  const workload = useSelector(selectWorkloadMetrics);
  const users = useSelector((state) => state.work.users);
  
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
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    if (!updatedUserId) return;
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    const scrollTimer = setTimeout(() => {
      const el = userRefs.current[updatedUserId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    highlightTimer.current = setTimeout(() => {
      setUpdatedUserId(null);
    }, 3000);

    return () => clearTimeout(scrollTimer);
  }, [updatedUserId]);
  
  // Create an active map for joining workload metrics onto base users
  const activeMap = useMemo(() => {
    return workload.reduce((acc, w) => ({ ...acc, [w.id]: w }), {});
  }, [workload]);

  const jointUsers = useMemo(() => {
    return users.map(u => ({ ...u, ...(activeMap[u.id] || { activeTaskCount: 0, completedTaskCount: 0, overdueTaskCount: 0 }) }));
  }, [users, activeMap]);

  const filtered = useMemo(() => applyTextFilter(jointUsers, query, ["name", "email", "role"]), [jointUsers, query]);

  const topContributor = workload.length > 0 && workload[0].activeTaskCount > 0 ? workload[0] : null;

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Team Directory" 
        subtitle="Manage workspace capacity and user access roles"
        icon={Users}
        actions={
          <Button onClick={() => setEditing({ isActive: true })}>
            <UserPlus className="h-4 w-4" /> Add User
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard 
          title="Total Headcount" 
          value={users.length} 
          insight={`${users.filter(u => u.isActive).length} active licenses`}
          icon={Users} 
        />
        {topContributor ? (
          <InsightCard 
            title="Max Workload" 
            value={topContributor.activeTaskCount} 
            insight={`Belongs to ${topContributor.name.split(' ')[0]}`}
            icon={Activity} 
            trend={topContributor.overdueTaskCount > 0 ? topContributor.overdueTaskCount : undefined}
          />
        ) : (
          <InsightCard 
            title="Max Workload" 
            value={0} 
            insight="Everyone has bandwidth"
            icon={Activity} 
          />
        )}
        <InsightCard 
          title="At Risk" 
          value={workload.reduce((sum, w) => sum + w.overdueTaskCount, 0)} 
          insight="Tasks currently overdue"
          icon={ShieldAlert}
        />
      </div>

      <PageCard>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full max-w-md rounded-xl border border-slate-200/60 bg-slate-50 py-2 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search by name, email, or role..." 
            />
          </div>
        </div>

        {!filtered.length ? (
          <EmptyState title="No users found" description="Adjust your search query or invite a new user." icon={Users} />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/50">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Workload</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filtered.map((user) => (
                <tr 
                  key={user.id} 
                  ref={(el) => setRef(user.id || user._id, el)}
                  className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                    (user.id || user._id) === updatedUserId
                      ? "bg-indigo-50/80 dark:bg-indigo-900/20 shadow-sm"
                      : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                        src={`https://ui-avatars.com/api/?name=${user.name}&background=c7d2fe&color=3730a3&bold=true`}
                        alt=""
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{user.activeTaskCount} active tasks</span>
                      {user.overdueTaskCount > 0 ? (
                        <span className="text-red-500 font-semibold">{user.overdueTaskCount} overdue!</span>
                      ) : (
                        <span className="text-slate-400">{user.completedTaskCount} completed historically</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{user.role}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge value={user.isActive ? "Active" : "Inactive"} tone={user.isActive ? "green" : "slate"} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-sm">
                      <Button variant="secondary" onClick={() => setEditing(user)}>Edit</Button>
                      <Button 
                        variant="ghost" 
                        className={user.isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"} 
                        onClick={() => {
                          const idToUpdate = user.id || user._id;
                          dispatch(updateUserAsync({ id: idToUpdate, active: !user.isActive }))
                            .unwrap()
                            .then(() => {
                              setUpdatedUserId(idToUpdate);
                              toast.success(`User ${!user.isActive ? "activated" : "deactivated"} successfully`);
                            });
                        }}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </PageCard>

      {editing && (
        <PageCard title={editing.id ? "Edit User" : "Add New User"}>
          <UserForm
            initialValues={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => {
              // Strip empty password so it doesn't overwrite the stored hash
              const payload = { ...values };
              if (!payload.password) delete payload.password;

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
