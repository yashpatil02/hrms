import app from "./src/app.js";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 5000;

/* =========================
   HTTP SERVER
========================= */
const server = http.createServer(app);

/* =========================
   SOCKET.IO SETUP
========================= */
export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
});

/* =========================
   SOCKET EVENTS
========================= */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  /* =========================
     JOIN ROOMS
  ========================= */
  socket.on("join", ({ userId, role }) => {
    if (!userId) return;

    // 👤 User personal room
    socket.join(`user_${userId}`);
    console.log(`👤 User joined room user_${userId}`);

    // 👑 Admin / HR room
    if (role === "ADMIN" || role === "HR") {
      socket.join("admins");
      console.log("👑 Admin joined admins room");
    }
  });

  /* =========================
     DEBUG (OPTIONAL)
  ========================= */
  socket.on("ping", () => {
    socket.emit("pong");
  });

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, reason);
  });
});

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
