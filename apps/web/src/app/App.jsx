import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchUsers, fetchProjects, fetchTasks, fetchNotifications, fetchActivity,
  socketProjectUpserted, socketProjectDeleted,
  socketTaskUpserted, socketTaskDeleted,
  socketCommentAdded, socketNotificationCreated
} from "../store/workSlice";
import { fetchMeThunk } from "../store/authSlice";
import { connectSocket, disconnectSocket } from "../services/socketClient";
import { appRoutes } from "../routes/config/appRoutes";

// Router is stable outside component to avoid remounts
const router = createBrowserRouter(appRoutes);

function App() {
  const token = useSelector((state) => state.auth.token);
  const theme = useSelector((state) => state.work.theme);
  const dispatch = useDispatch();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!token) return undefined;
    
    // Hydrate current user session, then load workspace data
    dispatch(fetchMeThunk()).finally(() => {
      // Always load workspace data regardless of /me outcome
      dispatch(fetchUsers());
      dispatch(fetchProjects());
      dispatch(fetchTasks());
      dispatch(fetchNotifications());
      dispatch(fetchActivity());
    });

    const socket = connectSocket(token);
    socket.on("project:created", ({ project }) => dispatch(socketProjectUpserted(project)));
    socket.on("project:updated", ({ project }) => dispatch(socketProjectUpserted(project)));
    socket.on("project:deleted", ({ id }) => dispatch(socketProjectDeleted(id)));
    socket.on("task:created", (task) => dispatch(socketTaskUpserted(task)));
    socket.on("task:updated", (task) => dispatch(socketTaskUpserted(task)));
    socket.on("task:moved", (task) => dispatch(socketTaskUpserted(task)));
    socket.on("comment:added", (comment) => dispatch(socketCommentAdded(comment)));
    
    socket.on("notification:created", (payload) => {
      dispatch(socketNotificationCreated(payload));
      // Show a rich toast using structured fields when available
      const toastMsg = payload.actorName && payload.action && payload.entityName
        ? `${payload.actorName} ${payload.action} "${payload.entityName}"`
        : payload.message || payload.title || "New notification";
      toast.info(toastMsg, { icon: "🔔" });
    });
    
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
