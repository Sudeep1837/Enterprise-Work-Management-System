import React from "react";
import { useSelector } from "react-redux";
import {
  HeroSection, FeatureGrid, RolesSection,
  MetricsSection, AnalyticsPreview, WorkflowSection, TrustSection,
} from "./components/LandingBits";
import { motion } from "framer-motion";

export default function LandingPage() {
  const token = useSelector((state) => state.auth.token);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500/30 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <HeroSection isLoggedIn={Boolean(token)} />
      <MetricsSection />
      <FeatureGrid />
      <AnalyticsPreview />
      <WorkflowSection />
      <RolesSection />
      <TrustSection />

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          viewport={{ once: true }}
          className="relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-24 text-center shadow-2xl shadow-slate-200/70 transition-colors duration-300 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30"
        >
          <div className="absolute -top-24 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl" aria-hidden="true">
            <div className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-indigo-500 to-cyan-500 opacity-20"
              style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
            />
          </div>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            From idea to delivery in one system
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Track execution velocity with dashboard insights, prioritize intelligently, and keep teams aligned with live updates.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6">
            <a href={token ? "/dashboard" : "/signup"}
              className="rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition">
              {token ? "Open Dashboard" : "Create Workspace"}
            </a>
            <a href="/login" className="text-sm font-semibold text-slate-700 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300">
              Sign In <span aria-hidden="true">→</span>
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-10 text-center text-sm text-slate-500 transition-colors duration-300 dark:border-white/8 dark:bg-slate-950 dark:text-slate-600">
        <p>© {new Date().getFullYear()} Enterprise Work Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}
