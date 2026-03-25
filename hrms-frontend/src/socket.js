import { io } from "socket.io-client";

/* =========================
   SOCKET URL — CRA uses REACT_APP_, not VITE_
   Fallback to localhost:5000
========================= */
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||   // CRA env var
  process.env.REACT_APP_API_URL?.replace("/api", "") || // strip /api from API url
  "http://localhost:5000";

const socket = io(SOCKET_URL, {
  // ✅ polling first, then upgrade to websocket
  // pure websocket-only fails if server isn't ready yet
  transports: ["polling", "websocket"],
  withCredentials: true,
  autoConnect: false,   // ✅ manual connect — only when user is logged in
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 10000,
});

/* =========================
   DEBUG LOGS
========================= */
socket.on("connect", () => {
  console.log("🔌 Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("⚠️ Socket connection error:", err.message);
});

export default socket;