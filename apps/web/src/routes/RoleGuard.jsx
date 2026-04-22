import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function RoleGuard({ roles = [] }) {
  const user = useSelector((state) => state.auth.user);
  const status = useSelector((state) => state.auth.status);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center p-4">Loading access...</div>;
  }

  const userRole = user?.role?.toLowerCase();
  const allowedRoles = roles.map(r => r.toLowerCase());

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
