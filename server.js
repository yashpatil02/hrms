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
  "http://127.0.0.1:3000",
  "https://hrmsco.com",
  "https://www.hrmsco.com",
];
/* =========================
   SOCKET.IO SETUP
========================= */
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"));
      }
    },
    // methods: ["GET", "POST", "PUT"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

/* =========================
   SOCKET EVENTS
========================= */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join", ({ userId, role }) => {
    if (!userId) return;

    socket.join(`user_${userId}`);
    console.log(`👤 Joined user_${userId}`);

    if (role === "ADMIN" || role === "HR") {
      socket.join("admins");
      console.log("👑 Joined admins room");
    }
  });

  socket.on("ping", () => {
    socket.emit("pong");
  });

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