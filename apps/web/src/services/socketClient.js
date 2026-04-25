import { io } from "socket.io-client";
import { env } from "./env";

let socket;
let activeToken;

function createNoopSocket(reason) {
  return {
    connected: false,
    disabled: true,
    reason,
    on() {
      return this;
    },
    off() {
      return this;
    },
    disconnect() {
      return this;
    },
  };
}

export function connectSocket(token) {
  if (socket && activeToken === token) return socket;
  if (socket) socket.disconnect();
  activeToken = token;

  if (!env.socketUsable) {
    socket = createNoopSocket(env.socketUnavailableMessage);
    console.warn(env.socketUnavailableMessage);
    return socket;
  }

  socket = io(env.socketBaseUrl, {
    auth: { token },
    reconnectionAttempts: 3,
    timeout: 5000,
  });

  socket.on("connect_error", (error) => {
    console.warn("Realtime socket connection failed:", error.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
  activeToken = null;
}
