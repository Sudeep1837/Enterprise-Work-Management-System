import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";

const DOMAIN_EVENTS = [
  "project:created",
  "project:updated",
  "task:created",
  "task:updated",
  "task:moved",
  "comment:added",
  "notification:created",
  "activity:created",
];

let ioInstance;

export function createSocketServer(httpServer, corsOptions) {
  const io = new Server(httpServer, { cors: corsOptions });
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("Missing token");
      socket.user = verifyToken(token);
      next();
    } catch (error) {
      next(new Error("Unauthorized socket"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.sub}`);
    DOMAIN_EVENTS.forEach((eventName) => {
      socket.on(eventName, (payload) => {
        socket.broadcast.emit(eventName, { ...payload, emittedBy: socket.user.sub });
      });
    });
  });

  return io;
}

export function emitToAll(event, payload) {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
}

export function emitToUser(userId, event, payload) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
}
