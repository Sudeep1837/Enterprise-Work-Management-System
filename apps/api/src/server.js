import express from "express";
import cors from "cors";
import http from "http";
import env from "./config/env.js";
import connectDB from "./db/connect.js";
import authRoutes from "./routes/auth/authRoutes.js";
import userRoutes from "./routes/users/userRoutes.js";
import projectRoutes from "./routes/projects/projectRoutes.js";
import taskRoutes from "./routes/tasks/taskRoutes.js";
import notificationRoutes from "./routes/notifications/notificationRoutes.js";
import activityRoutes from "./routes/activity/activityRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { createSocketServer } from "./sockets/socketServer.js";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

app.use(errorMiddleware);
createSocketServer(server, env.clientUrl);

server.listen(env.port, async () => {
  await connectDB();
  console.log(`API server running on http://localhost:${env.port}`);
});
