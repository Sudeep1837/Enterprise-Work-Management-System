import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, FolderKanban, CheckSquare, Users, Bell, FileText, ChevronRight, X } from "lucide-react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

export default function CommandPalette({ open, onOpen, onClose, restoreFocusRef }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 180);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const projects = useSelector((state) => state.work.projects);
  const tasks = useSelector((state) => state.work.tasks);
  const users = useSelector((state) => state.work.users);
  const notifications = useSelector((state) => state.work.notifications);

  const closePalette = useCallback(() => {
    onClose?.();
    window.requestAnimationFrame(() => restoreFocusRef?.current?.focus?.());
  }, [onClose, restoreFocusRef]);

  const openPalette = useCallback(() => {
    onOpen?.();
  }, [onOpen]);

  // Toggle on Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [open]);

  useEffect(() => {
    if (open) closePalette();
  }, [closePalette, location.pathname, open]);

  // Compute results
  const results = React.useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const lowerQuery = debouncedQuery.toLowerCase();

    const pResults = projects
      .filter((p) => p.name?.toLowerCase().includes(lowerQuery))
      .map((p) => ({ id: p.id, title: p.name, type: "Project", icon: FolderKanban, url: `/projects` }));

    const tResults = tasks
      .filter((t) => t.title?.toLowerCase().includes(lowerQuery))
      .map((t) => ({ id: t.id, title: t.title, type: "Task", icon: CheckSquare, url: `/tasks` }));

    const uResults = users
      .filter((u) => u.name?.toLowerCase().includes(lowerQuery) || u.email?.toLowerCase().includes(lowerQuery))
      .map((u) => ({ id: u.id || u._id, title: u.name, type: "User", icon: Users, url: `/users` }));

    const nResults = notifications
      .filter((n) => n.title?.toLowerCase().includes(lowerQuery) || n.message?.toLowerCase().includes(lowerQuery))
      .map((n) => ({ id: n.id, title: n.title, type: "Notification", icon: Bell, url: `/notifications` }));

    return [...pResults, ...tResults, ...uResults, ...nResults].slice(0, 8);
  }, [debouncedQuery, projects, tasks, users, notifications]);

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!results.length) return;
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      closePalette();
      navigate(results[selectedIndex].url);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  };

  const handleBackdropPointerDown = (event) => {
    if (dialogRef.current && !dialogRef.current.contains(event.target)) {
      closePalette();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="relative z-50" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20" onMouseDown={handleBackdropPointerDown}>
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Search workspace"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              className="mx-auto max-w-xl transform divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all dark:divide-slate-800 dark:bg-slate-900 dark:ring-white/10"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:text-white sm:text-sm outline-none"
                  placeholder="Search projects, tasks, users, notifications..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  onClick={closePalette}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {results.length > 0 && (
                <ul className="max-h-80 scroll-py-2 overflow-y-auto p-2 text-sm text-slate-700 dark:text-slate-300">
                  {results.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <li
                        key={`${item.type}-${item.id}`}
                        className={`flex cursor-default select-none items-center rounded-xl px-3 py-2 ${
                          isSelected ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" : ""
                        }`}
                        onClick={() => {
                          closePalette();
                          navigate(item.url);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <item.icon className={`mr-3 h-5 w-5 flex-none ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                        <span className="flex-auto truncate">{item.title}</span>
                        <span className="ml-3 flex-none text-xs font-semibold text-slate-500 dark:text-slate-400">{item.type}</span>
                        {isSelected && <ChevronRight className="ml-2 h-4 w-4 text-indigo-400" />}
                      </li>
                    );
                  })}
                </ul>
              )}

              {!query.trim() && (
                <div className="px-6 py-10 text-center sm:px-14">
                  <Search className="mx-auto h-6 w-6 text-slate-400 dark:text-slate-500" />
                  <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Search your workspace</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Find tasks, projects, users, and notifications from your scoped data.</p>
                </div>
              )}

              {query.trim() && results.length === 0 && (
                <div className="px-6 py-14 text-center sm:px-14">
                  <FileText className="mx-auto h-6 w-6 text-slate-400 dark:text-slate-500" />
                  <p className="mt-4 text-sm text-slate-900 dark:text-white">No results found for "{query}".</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a different search term.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
