import React, { lazy, Suspense } from "react";
import AppLayout from "../../components/layout/AppLayout";
import PublicLayout from "../../components/public/PublicLayout";
import ProtectedRoute from "../../routes/ProtectedRoute";
import RoleGuard from "../../routes/RoleGuard";
import { LoginPage, SignupPage } from "../../pages/AuthPages";
import UnauthorizedPage from "../../features/common/UnauthorizedPage";
import NotFoundPage from "../../features/common/NotFoundPage";
import LandingPage from "../../features/landing/LandingPage";

const DashboardPage = lazy(() => import("../../features/dashboard/DashboardPage"));
const ProjectsPage = lazy(() => import("../../features/projects/ProjectsPage"));
const TasksPage = lazy(() => import("../../features/tasks/TasksPage"));
const KanbanPage = lazy(() => import("../../features/kanban/KanbanPage"));
const UsersPage = lazy(() => import("../../features/users/UsersPage"));
const ReportsPage = lazy(() => import("../../features/reports/ReportsPage"));
const NotificationsPage = lazy(() => import("../../features/notifications/NotificationsPage"));
const SettingsPage = lazy(() => import("../../features/settings/SettingsPage"));
const ProfilePage = lazy(() => import("../../features/profile/ProfilePage"));
const ActivityPage = lazy(() => import("../../features/activity/ActivityPage"));

const withSuspense = (node) => <Suspense fallback={<div className="p-4">Loading...</div>}>{node}</Suspense>;

export const appRoutes = [
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: withSuspense(<DashboardPage />) },
          { path: "/projects", element: withSuspense(<ProjectsPage />) },
          { path: "/tasks", element: withSuspense(<TasksPage />) },
          { path: "/kanban", element: withSuspense(<KanbanPage />) },
          { path: "/reports", element: withSuspense(<ReportsPage />) },
          { path: "/notifications", element: withSuspense(<NotificationsPage />) },
          { path: "/settings", element: withSuspense(<SettingsPage />) },
          { path: "/profile", element: withSuspense(<ProfilePage />) },
          { path: "/activity", element: withSuspense(<ActivityPage />) },
          { element: <RoleGuard roles={["admin", "manager"]} />, children: [{ path: "/users", element: withSuspense(<UsersPage />) }] },
        ],
      },
    ],
  },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  { path: "*", element: <NotFoundPage /> },
];
