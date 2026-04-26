import express from "express";
import cors from "cors";
import http from "http";
import env from "./config/env.js";
import { allowedClientOrigins, corsOptions, socketCorsOptions } from "./config/cors.js";
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

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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
createSocketServer(server, socketCorsOptions);

const startServer = async () => {
  await connectDB();
  server.listen(env.port, () => {
    console.log(`API server listening on port ${env.port}`);
    console.log(`Allowed client origins: ${allowedClientOrigins.join(", ")}`);
  });
};

startServer();
