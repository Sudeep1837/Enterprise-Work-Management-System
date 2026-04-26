import { useEffect, useRef } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchUsers, fetchProjects, fetchTasks, fetchNotifications, fetchActivity, fetchTelemetry,
  socketProjectUpserted, socketProjectDeleted,
  socketTaskUpserted, socketTaskDeleted,
  socketCommentAdded, socketNotificationCreated, socketActivityCreated,
  socketUserUpdated,
  clearActivityFeedSync, clearNotificationsSync, clearTelemetryFeedSync, socketNotificationDeleted,
  socketNotificationsAllRead, socketNotificationsPurged,
  socketActivityPurged, socketTelemetryPurged,
} from "../store/workSlice";
import { fetchMeThunk } from "../store/authSlice";
import { connectSocket, disconnectSocket } from "../services/socketClient";
import { appRoutes } from "../routes/config/appRoutes";

// Router is stable outside component to avoid remounts
const router = createBrowserRouter(appRoutes);

function App() {
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const users = useSelector((state) => state.work.users);
  const theme = useSelector((state) => state.work.theme);
  const dispatch = useDispatch();
  const currentUserRef = useRef(currentUser);
  const usersRef = useRef(users);
  const apiToastShownRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    if (!token) return;

    dispatch(fetchMeThunk()).then((result) => {
      if (fetchMeThunk.fulfilled.match(result)) {
        dispatch(fetchUsers());
        dispatch(fetchProjects());
        dispatch(fetchTasks());
        dispatch(fetchNotifications());
        dispatch(fetchActivity());
        dispatch(fetchTelemetry());
        return;
      }

      if (!apiToastShownRef.current) {
        apiToastShownRef.current = true;
        toast.warning(result.payload?.message || "Backend API is unavailable. Public pages still work, but workspace data cannot refresh yet.");
      }
    });
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectSocket(token);
    socket.on("project:created", ({ project }) => dispatch(socketProjectUpserted(project)));
    socket.on("project:updated", ({ project }) => dispatch(socketProjectUpserted(project)));
    socket.on("project:deleted", (payload) => dispatch(socketProjectDeleted(payload)));
    socket.on("task:created", (task) => dispatch(socketTaskUpserted(task)));
    socket.on("task:updated", (task) => dispatch(socketTaskUpserted(task)));
    socket.on("task:moved", (task) => dispatch(socketTaskUpserted(task)));
    socket.on("comment:added", (comment) => dispatch(socketCommentAdded(comment)));
    // EC12: task:deleted was emitted by backend but never listened to — now handled
    socket.on("task:deleted", (payload) => dispatch(socketTaskDeleted(payload)));

    socket.on("notification:created", (payload) => {
      dispatch(socketNotificationCreated(payload));
      // Show a rich toast using structured fields when available
      const toastMsg = payload.actorName && payload.action && payload.entityName
        ? `${payload.actorName} ${payload.action} "${payload.entityName}"`
        : payload.message || payload.title || "New notification";
      toast.info(toastMsg, { icon: "🔔" });
    });

    socket.on("notification:all-read", () => dispatch(socketNotificationsAllRead()));
    socket.on("notification:deleted", (payload) => dispatch(socketNotificationDeleted(payload)));
    socket.on("notifications:cleared", () => dispatch(clearNotificationsSync()));
    socket.on("notification:purged", () => dispatch(socketNotificationsPurged()));

    socket.on("activity:created", (payload) => {
      const currentUser = currentUserRef.current;
      const users = usersRef.current;
      const currentUserId = currentUser?.id || currentUser?._id?.toString();
      const visibleTo = payload.visibleTo || [];
      const explicitlyScoped = visibleTo.length > 0;
      const visibleToCurrentUser = visibleTo.some((id) => (id._id || id)?.toString() === currentUserId);
      const actorId = (payload.actorId?._id || payload.actorId)?.toString();
      const managerTeamUserIds = users
        .filter((user) => (user.managerId?._id || user.managerId)?.toString() === currentUserId)
        .map((user) => (user.id || user._id)?.toString());

      const canSeeActivity =
        currentUser?.role === "admin" ||
        !explicitlyScoped ||
        visibleToCurrentUser ||
        actorId === currentUserId ||
        (currentUser?.role === "manager" && managerTeamUserIds.includes(actorId));

      if (canSeeActivity) {
        dispatch(socketActivityCreated(payload));
      }
    });

    // EC12: user:updated — sync role/team/active state across all sessions
    socket.on("activity:cleared", () => dispatch(clearActivityFeedSync()));
    socket.on("activity:purged", () => dispatch(socketActivityPurged()));
    socket.on("telemetry:cleared", () => dispatch(clearTelemetryFeedSync()));
    socket.on("telemetry:purged", () => dispatch(socketTelemetryPurged()));
    socket.on("user:updated", (user) => dispatch(socketUserUpdated(user)));
    
    return () => disconnectSocket();
  }, [dispatch, token]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="top-right" autoClose={4000} />
    </>
  );
}

export default App;
