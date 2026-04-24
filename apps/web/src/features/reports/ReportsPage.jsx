import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { PageCard, PageHeader } from "../common/components/UI";
import { DonutChartCard, StripMetric, CustomChartTooltip } from "../common/components/Analytics";
import { selectDashboardMetrics, selectWorkloadMetrics, selectWeeklyTrend } from "../../store/selectors";
import { BarChart3, TrendingUp, Filter, ShieldAlert } from "lucide-react";
import { useSelector } from "react-redux";
import { isAdmin, isManager } from "../../lib/permissions";

export default function ReportsPage() {
  const metrics = useSelector(selectDashboardMetrics);
  const workload = useSelector(selectWorkloadMetrics);
  const trendData = useSelector(selectWeeklyTrend);
  const tasks = useSelector(state => state.work.tasks);
  const currentUser = useSelector((state) => state.auth.user);

  const [filterMode, setFilterMode] = useState("all");

  // Role-aware page labels — data is already scoped by backend
  const pageTitle = isAdmin(currentUser)
    ? "Cross-Functional Analytics"
    : isManager(currentUser)
    ? "Team Analytics"
    : "My Performance";
  const pageSubtitle = isAdmin(currentUser)
    ? "Organisation-wide velocity, workload, and delivery metrics"
    : isManager(currentUser)
    ? "Delivery metrics for your team and managed projects"
    : "Your task completion, deadlines, and personal velocity";

  const trendMaxValue = Math.max(...trendData.map(d => d.value)) + 2;

  // Derive simple bar chart data for workload
  const workloadData = useMemo(() => {
    return workload.slice(0, 8).map(u => ({
      name: u.name.split(' ')[0], // First name only for clean axis
      value: u.activeTaskCount
    }));
  }, [workload]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900/50 shadow-sm backdrop-blur">
            <Filter className="h-4 w-4" />
            <select 
              className="bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="all">Last 30 Days</option>
              <option value="quarter">This Quarter</option>
              <option value="year">Year to Date</option>
            </select>
          </div>
        }
      />

      {/* Primary Trend Area */}
      <PageCard title="Throughput Trajectory" subtitle="Volume of task completion over mapped period">
        <div className="mt-8 flex flex-col md:flex-row gap-8">
          <div className="flex w-full md:w-48 shrink-0 flex-col gap-6">
            <StripMetric label="Peak Volume" value={trendMaxValue - 2} sub="Tasks/Day" />
            <StripMetric label="Average Velocity" value={Math.round(trendData.reduce((a,b)=>a+b.value, 0) / trendData.length)} sub="Tasks/Day" />
            <StripMetric label="Risk Surface" value={metrics.overdueTasks} sub="Overdue" />
          </div>
          
          <div className="h-[280px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'transparent', stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </PageCard>

      {/* Dual Row Donuts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DonutChartCard title="Task Types" subtitle="Categorical breakdown of execution" data={metrics.typeData} />
        <DonutChartCard title="Priority Mapping" subtitle="Severity analysis across all tasks" data={metrics.priorityData} />
        <div className="md:col-span-2 lg:col-span-1">
          <PageCard title="Key Performance" subtitle="Macro workspace health tracking" className="h-[340px]">
            <div className="flex h-full flex-col justify-center gap-8 px-4 pb-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <span className="text-sm font-medium text-slate-500">Overall Completion</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.completionRate}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <span className="text-sm font-medium text-slate-500">Delayed Delivery</span>
                <span className="text-lg font-bold text-red-500">{metrics.overdueTasks} Critical</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Unread System Alerts</span>
                <span className="text-lg font-bold text-amber-500">{metrics.unreadNotifications}</span>
              </div>
            </div>
          </PageCard>
        </div>
      </div>

      {/* Bar Chart Workload */}
      <PageCard title="Resource Allocation" subtitle="Active task workload per team member">
        {workloadData.length > 0 ? (
          <div className="mt-6 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={48} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-slate-500">No active assignment data available yet</div>
        )}
      </PageCard>

    </div>
  );
}
