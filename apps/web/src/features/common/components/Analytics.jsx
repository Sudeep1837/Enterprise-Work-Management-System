import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";
import { PageCard } from "./UI";

const defaultColors = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#c084fc", "#60a5fa"];

export function InsightCard({ title, value, insight, icon: Icon, trend }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-sm backdrop-blur-xl transition-all hover:shadow-md dark:border-white/10 dark:from-slate-900/50 dark:to-slate-900/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-slate-500"}`}>
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "−"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-6">
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        {insight && <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{insight}</p>}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}

export const CustomChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
          {payload[0].payload.name || payload[0].name}
        </p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {payload[0].value} <span className="font-normal text-slate-500">Total</span>
        </p>
      </div>
    );
  }
  return null;
};

const donutTooltip = <CustomChartTooltip />;

export function DonutChartCard({ title, subtitle, data, emptyMessage = "No data available" }) {
  const visibleData = useMemo(() => (data || []).filter((d) => d.value > 0), [data]);
  const hasData = visibleData.length > 0;

  return (
    <PageCard title={title} subtitle={subtitle} className="flex h-full flex-col">
      {hasData ? (
        <>
          <div className="flex-1 min-h-[220px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={visibleData}
                  dataKey="value" 
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {visibleData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || defaultColors[i % defaultColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={donutTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {visibleData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || defaultColors[i % defaultColors.length] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
          <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 mb-4" />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      )}
    </PageCard>
  );
}

export function ProgressRing({ progress, size = 48, strokeWidth = 5, colorClass = "text-indigo-500", trackClass = "text-indigo-500/10" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          className={trackClass}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={colorClass}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex items-center justify-center text-xs font-bold leading-none tracking-tighter">
        {Math.round(progress)}<span className="text-[10px] opacity-70">%</span>
      </div>
    </div>
  );
}

export function MiniTrendChart({ data, color = "#6366f1" }) {
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={0.2} fill={color} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricsStrip({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200/60 bg-white px-6 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
      {children}
    </div>
  );
}

export function StripMetric({ label, value, sub }) {
  return (
    <div className="flex min-w-[120px] flex-col border-l-2 border-slate-100 pl-4 first:border-l-0 first:pl-0 dark:border-white/5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
        {sub && <span className="text-xs font-medium text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}
