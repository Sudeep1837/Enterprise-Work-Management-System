import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function RoleGuard({ roles = [] }) {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const initialized = useSelector((state) => state.auth.initialized);
  const status = useSelector((state) => state.auth.status);

  if (token && (!initialized || status === "loading")) {
    return <div className="flex h-screen items-center justify-center p-4">Loading access...</div>;
  }

  const userRole = user?.role?.toLowerCase();
  const allowedRoles = roles.map(r => r.toLowerCase());

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
