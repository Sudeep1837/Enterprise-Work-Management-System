import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold tracking-tight text-white">
          EWMS
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              className="relative py-1 font-medium text-slate-300 transition-colors hover:text-white
                after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-indigo-400
                after:transition-all hover:after:w-full focus-visible:outline-none focus-visible:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Auth buttons + mobile toggle */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/login"
            className="hidden rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition sm:inline-flex"
          >
            Login
          </NavLink>
          <NavLink
            to={token ? "/dashboard" : "/signup"}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {token ? "Dashboard" : "Sign Up"}
          </NavLink>

          {/* Mobile hamburger */}
          <button
            className="ml-1 flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/10 transition md:hidden"
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
            className="overflow-hidden border-t border-white/10 bg-slate-950 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => handleNavClick(e, href)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition"
                >
                  {label}
                </a>
              ))}
              <hr className="my-2 border-white/10" />
              <NavLink
                to="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-6 py-6 text-center text-sm text-slate-400">
      Enterprise Work Management System · Real-time collaboration powered by MongoDB + Socket.IO + JWT
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicNavbar />
      <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Outlet />
      </motion.main>
      <PublicFooter />
    </div>
  );
}
