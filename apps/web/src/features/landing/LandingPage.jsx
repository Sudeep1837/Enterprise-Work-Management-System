import React from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FeatureGrid, HeroSection, RolesSection } from "./components/LandingBits";

export default function LandingPage() {
  const token = useSelector((state) => state.auth.token);

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-50 selection:bg-indigo-500/30 overflow-hidden">
      <HeroSection isLoggedIn={Boolean(token)} />
      <FeatureGrid />
      
      {/* Premium CTA Section */}
      <section id="cta" className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 bg-slate-950">
        <motion.div 
          whileHover={{ y: -4 }} 
          className="relative isolate overflow-hidden rounded-3xl bg-slate-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16 border border-white/10"
        >
          <div className="absolute -top-24 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl" aria-hidden="true">
            <div
              className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-25"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From idea to delivery in one system
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Track execution velocity with dashboard insights, prioritize intelligently, and keep teams aligned with live updates. Stop context switching.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href={token ? "/dashboard" : "/signup"}
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition"
            >
              {token ? "Open Dashboard" : "Create Workspace"}
            </a>
            <a href="/login" className="text-sm font-semibold leading-6 text-white hover:text-indigo-300 transition">
              Sign In <span aria-hidden="true">→</span>
            </a>
          </div>
        </motion.div>
      </section>
      
      <RolesSection />
      
      {/* Premium Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Enterprise Work Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}
