import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ThemeToggle from "../common/ThemeToggle";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Roles", href: "#roles" },
  { label: "Get Started", href: "#cta" },
];

function smoothScrollTo(hash) {
  const el = document.querySelector(hash);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function PublicNavbar() {
  const token = useSelector((state) => state.auth.token);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      setMobileOpen(false);
      smoothScrollTo(href);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          EWMS
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              className="relative py-1 font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white
                after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-indigo-500 dark:after:bg-indigo-400
                after:transition-all hover:after:w-full focus-visible:outline-none focus-visible:text-slate-900 dark:focus-visible:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Auth buttons + mobile toggle */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/login"
            className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition dark:text-slate-200 dark:hover:bg-white/10 sm:inline-flex"
          >
            Login
          </NavLink>
          <NavLink
            to={token ? "/dashboard" : "/signup"}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {token ? "Dashboard" : "Sign Up"}
          </NavLink>
          <div className="ml-2 hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Mobile hamburger */}
          <button
            className="ml-1 flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-white/10 md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => handleNavClick(e, href)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {label}
                </a>
              ))}
              <hr className="my-2 border-slate-200 dark:border-white/10" />
              <NavLink
                to="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition dark:text-slate-200 dark:hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </NavLink>
              <NavLink
                to={token ? "/dashboard" : "/signup"}
                className="mt-1 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2.5 text-center text-sm font-medium text-white"
                onClick={() => setMobileOpen(false)}
              >
                {token ? "Dashboard" : "Sign Up"}
              </NavLink>
              <div className="mt-4 flex justify-center">
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400 transition-colors duration-200">
      Enterprise Work Management System · Real-time collaboration powered by MongoDB + Socket.IO + JWT
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white transition-colors duration-200">
      <PublicNavbar />
      <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Outlet />
      </motion.main>
      <PublicFooter />
    </div>
  );
}
