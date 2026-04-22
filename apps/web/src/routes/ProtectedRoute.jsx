import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute() {
  const token = useSelector((state) => state.auth.token);
  const initialized = useSelector((state) => state.auth.initialized);

  // If we have a token but haven't hydrated yet, wait (avoids flash-redirect to /login)
  if (token && !initialized) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
