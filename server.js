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
  process.env.FRONTEND_URL,
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
    methods: ["GET", "POST", "PUT"],
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
   TEMP ADMIN CREATE ROUTE
========================= */
app.get("/create-admin", async (req, res) => {
  try {
    const bcrypt = (await import("bcrypt")).default;
    const prisma = (await import("./src/prisma/client.js")).default;

    const hash = await bcrypt.hash("Admin@1912", 10);

    const user = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "admin@hrms.com",
        password: hash,
        role: "ADMIN",
      },
    });

    res.json({ msg: "Admin created", user });
  } catch (err) {
    console.error("CREATE ADMIN ERROR:", err);
    res.status(500).json({ msg: "Error creating admin" });
  }
});

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});