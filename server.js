import app from "./src/app.js";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 5000;

/* =========================
   HTTP SERVER
========================= */
const server = http.createServer(app);

/* =========================
   ALLOWED ORIGINS
========================= */
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Vercel URL
];

/* =========================
   SOCKET.IO SETUP
========================= */
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"));
      }
    },
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

    // 👤 User room
    socket.join(`user_${userId}`);
    console.log(`👤 Joined user_${userId}`);

    // 👑 Admin room
    if (role === "ADMIN" || role === "HR") {
      socket.join("admins");
      console.log("👑 Joined admins room");
    }
  });

  /* =========================
     DEBUG
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