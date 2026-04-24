import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Layout, Users, Activity, BarChart3, GripHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const DONUT_DATA = [
  { name: "Done", value: 54, color: "#10b981" },
  { name: "In Progress", value: 32, color: "#6366f1" },
  { name: "Review", value: 14, color: "#f59e0b" },
  { name: "To Do", value: 18, color: "#94a3b8" },
];
const BAR_DATA = [
  { d: "Mon", v: 6 }, { d: "Tue", v: 11 }, { d: "Wed", v: 9 },
  { d: "Thu", v: 14 }, { d: "Fri", v: 12 }, { d: "Sat", v: 8 }, { d: "Sun", v: 16 },
];

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-950">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#9089fc] to-[#0ea5e9] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
    </div>
  );
}

function MockTaskCard({ title, tag, delay, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="mb-3 cursor-grab rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur-xl transition hover:bg-white/10"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-white/10">
          <GripHorizontal className="h-3 w-3 text-slate-400" />
        </div>
        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300 ring-1 ring-indigo-500/30">
          {tag}
        </span>
      </div>
      <p className="mb-3 text-sm font-medium text-slate-200">{title}</p>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>Oct 1{index}</span>
        </div>
        <div className="flex -space-x-1">
          <div className="h-5 w-5 rounded-full border border-slate-800 bg-indigo-500" />
          <div className="h-5 w-5 rounded-full border border-slate-800 bg-emerald-500" />
        </div>
      </div>
    </motion.div>
  );
}

export function AnimatedWorkflowBoard() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl rounded-t-2xl border-x border-t border-white/10 bg-slate-900/40 p-4 shadow-2xl backdrop-blur-2xl sm:mt-24 sm:p-6 lg:p-8">
      {/* Mac window controls */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-amber-500/80" />
        <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Column 1 */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">To Do</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-300">3</span>
          </div>
          <MockTaskCard title="Design System Audit" tag="Design" delay={0.2} index={2} />
          <MockTaskCard title="API Schema Review" tag="Backend" delay={0.3} index={4} />
          <MockTaskCard title="User Interviews" tag="Research" delay={0.4} index={5} />
        </div>

        {/* Column 2 */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">In Progress</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs text-indigo-300">2</span>
          </div>
          <motion.div
            animate={{ 
              boxShadow: ["0px 0px 0px rgba(99,102,241,0)", "0px 0px 20px rgba(99,102,241,0.2)", "0px 0px 0px rgba(99,102,241,0)"] 
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="rounded-xl border border-indigo-500/30"
          >
            <MockTaskCard title="Authentication Flow" tag="Security" delay={0.5} index={1} />
          </motion.div>
          <MockTaskCard title="Dashboard Analytics" tag="Frontend" delay={0.6} index={3} />
        </div>

        {/* Column 3 */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Done</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-300">2</span>
          </div>
          <div className="opacity-60">
            <MockTaskCard title="Project Kickoff" tag="Planning" delay={0.7} index={0} />
            <MockTaskCard title="Initial Repo Setup" tag="DevOps" delay={0.8} index={1} />
          </div>
        </div>
      </div>
      
      {/* Fade out bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </div>
  );
}

export function HeroSection({ isLoggedIn }) {
  return (
    <section className="relative px-6 pt-24 text-center lg:pt-32">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            Enterprise Grade Management V2
          </span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl"
        >
          Align your teams.<br />Deliver with clarity.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300"
        >
          The premium collaborative workspace built for high-performing teams to track projects, manage tasks, and visualize execution effortlessly.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-x-6"
        >
          <a
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="rounded-full bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 transition"
          >
            {isLoggedIn ? "Go to Dashboard" : "Start your workspace"}
          </a>
          <a href="#features" className="text-sm font-semibold leading-6 text-white hover:text-indigo-300 transition group flex items-center gap-1">
            See features <span className="group-hover:translate-x-1 xl:transition-transform" aria-hidden="true">→</span>
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
      >
        <AnimatedWorkflowBoard />
      </motion.div>
    </section>
  );
}

export function FeatureGrid() {
  const features = [
    { icon: Layout, title: "Portfolio Tracking", desc: "Monitor cross-project execution from a single pane." },
    { icon: CheckCircle2, title: "Granular Tasks", desc: "Assign ownership, due dates, and strict priorities." },
    { icon: Activity, title: "Realtime Movement", desc: "Websockets sync task movement instantly for all teams." },
    { icon: BarChart3, title: "Dashboards", desc: "View auto-generated progress and velocity reports." },
    { icon: Users, title: "Contextual Chat", desc: "Comment directly inside tasks to resolve blockers." },
    { icon: Clock, title: "Velocity Analytics", desc: "Predict delivery based on historical team throughput." },
  ];

  return (
    <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 bg-slate-950">
      <div className="mx-auto max-w-2xl lg:text-center">
        <h2 className="text-base font-semibold leading-7 text-indigo-400">Deploy Faster</h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything your delivery teams need</p>
      </div>
      <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:max-w-none">
        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
          {features.map((feature, idx) => (
            <motion.div 
              key={feature.title} 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col rounded-2xl bg-white/5 p-8 border border-white/10 hover:bg-white/10 transition backdrop-blur-sm"
            >
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                <feature.icon className="h-5 w-5 flex-none text-indigo-400" aria-hidden="true" />
                {feature.title}
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
                <p className="flex-auto">{feature.desc}</p>
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function RolesSection() {
  return (
    <section id="roles" className="relative z-10 bg-slate-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Built for every role</h2>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:max-w-none lg:grid-cols-3">
          {[
            ["Admin", "Govern users, projects, and visibility across teams.", "text-emerald-400", "bg-emerald-400/10", "border-emerald-500/20"],
            ["Manager", "Plan delivery, assign work, and monitor execution.", "text-indigo-400", "bg-indigo-400/10", "border-indigo-500/20"],
            ["Employee", "Execute tasks, update progress, and collaborate in context.", "text-cyan-400", "bg-cyan-400/10", "border-cyan-500/20"],
          ].map(([title, desc, color, bg, border], idx) => (
            <motion.div 
              key={title} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className={`rounded-3xl border ${border} bg-slate-800/50 p-8 xl:p-10`}
            >
              <h3 className={`text-lg font-semibold leading-8 ${color}`}>{title}</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── KPI Metrics ─────────────────────────────────────────────────────────────
export function MetricsSection() {
  const stats = [
    { val: "12,400+", label: "Tasks Completed", sub: "Across all workspaces", color: "text-indigo-400" },
    { val: "98.3%",   label: "On-Time Delivery", sub: "Project success rate",  color: "text-emerald-400" },
    { val: "340+",   label: "Teams Onboarded",  sub: "Globally distributed",  color: "text-cyan-400" },
    { val: "99.9%",  label: "Platform Uptime",  sub: "SLA guarantee",         color: "text-amber-400" },
  ];
  return (
    <section className="relative z-10 border-y border-white/5 bg-slate-900/50 py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/8 bg-white/5 p-6 text-center backdrop-blur-sm hover:bg-white/10 transition">
              <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
              <p className="mt-1 text-sm font-semibold text-white">{s.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Analytics Preview ────────────────────────────────────────────────────────
function PreviewCard({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-400 mb-3">{sub}</p>
      {children}
    </div>
  );
}
export function AnalyticsPreview() {
  const total = DONUT_DATA.reduce((a, d) => a + d.value, 0);
  const projects = [
    { n: "Platform Rebuild", p: 82, c: "bg-indigo-500" },
    { n: "Mobile App v2",   p: 54, c: "bg-emerald-500" },
    { n: "Analytics Engine", p: 31, c: "bg-amber-500" },
    { n: "API Gateway",      p: 91, c: "bg-cyan-500" },
  ];
  const team = [
    { n: "Sarah K.", t: 7, c: "bg-indigo-500" },
    { n: "Alex M.",  t: 12, c: "bg-emerald-500" },
    { n: "Jordan L.",t: 5,  c: "bg-amber-500" },
    { n: "Morgan P.",t: 9,  c: "bg-cyan-500" },
  ];
  return (
    <section className="relative z-10 bg-slate-950 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-base font-semibold text-indigo-400">Live Intelligence</p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Real-time visibility into every team</h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">Purpose-built analytics for delivery teams — not generic BI tools.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewCard title="Task Status" sub="Live snapshot">
            <div className="relative flex justify-center">
              <PieChart width={140} height={140}>
                <Pie data={DONUT_DATA} cx={70} cy={70} innerRadius={45} outerRadius={66} dataKey="value" paddingAngle={3}>
                  {DONUT_DATA.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">{total}</span>
                <span className="text-xs text-slate-400">Tasks</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {DONUT_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-300">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />{d.name}
                </div>
              ))}
            </div>
          </PreviewCard>
          <PreviewCard title="Weekly Velocity" sub="Tasks completed/day">
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={BAR_DATA} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={14}>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "12px", color: "#fff" }} />
                  <Bar dataKey="v" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PreviewCard>
          <PreviewCard title="Project Health" sub="Completion tracking">
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p.n}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate">{p.n}</span>
                    <span className="text-slate-400 ml-2 shrink-0">{p.p}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700">
                    <div className={`h-full rounded-full ${p.c}`} style={{ width: `${p.p}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PreviewCard>
          <PreviewCard title="Team Workload" sub="Active task load">
            <div className="space-y-3">
              {team.map(m => (
                <div key={m.n} className="flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.c} text-xs font-bold text-white`}>{m.n[0]}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-200">{m.n}</span>
                      <span className="text-slate-400">{m.t}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-700">
                      <div className={`h-full rounded-full ${m.c}`} style={{ width: `${(m.t / 14) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PreviewCard>
        </div>
      </div>
    </section>
  );
}

// ─── Workflow Steps ───────────────────────────────────────────────────────────
export function WorkflowSection() {
  const steps = [
    { n: "01", title: "Structure Workspace", desc: "Create projects, assign managers, and define delivery timelines in one setup.", color: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/5" },
    { n: "02", title: "Assign & Execute",    desc: "Break work into tasks with priorities, due dates, and role-based ownership.",      color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
    { n: "03", title: "Track & Deliver",     desc: "Monitor Kanban progress, get instant notifications, and review auto-generated reports.", color: "text-cyan-400",    border: "border-cyan-500/20",    bg: "bg-cyan-500/5" },
  ];
  return (
    <section className="relative z-10 bg-slate-900 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-base font-semibold text-indigo-400">The System</p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">From kickoff to delivery, end-to-end</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              className={`rounded-3xl border ${s.border} ${s.bg} p-8 backdrop-blur-sm`}>
              <div className={`text-5xl font-black opacity-30 mb-4 ${s.color}`}>{s.n}</div>
              <h3 className={`text-lg font-semibold mb-3 ${s.color}`}>{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trust / Testimonials ─────────────────────────────────────────────────────
export function TrustSection() {
  const quotes = [
    { q: "Finally a system that respects role boundaries. Admins see everything, managers see what they need, and employees stay focused.", name: "Priya S.", title: "Head of Engineering", init: "PS", c: "bg-indigo-500" },
    { q: "The Kanban board and realtime updates reduced our stand-up time by half. Everything is visible instantly.", name: "Marcus L.", title: "Product Manager", init: "ML", c: "bg-emerald-500" },
    { q: "Reports update automatically as tasks close. I stopped chasing status updates. The analytics section alone made this worth it.", name: "Aiko T.", title: "Delivery Lead", init: "AT", c: "bg-cyan-500" },
  ];
  return (
    <section className="relative z-10 bg-slate-950 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Loved by delivery teams</h2>
          <p className="mt-3 text-slate-400">Teams across the org finally aligned on one platform.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {quotes.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="flex flex-col rounded-3xl border border-white/8 bg-slate-900/60 p-8 backdrop-blur-sm hover:bg-slate-900/80 transition">
              <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.q}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.c} text-xs font-bold text-white shrink-0`}>{t.init}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
