import { io } from "socket.io-client";

let socket;
let activeToken;

export function connectSocket(token) {
  if (socket && activeToken === token) return socket;
  if (socket) socket.disconnect();
  activeToken = token;
  socket = io("http://localhost:5000", { auth: { token } });
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
