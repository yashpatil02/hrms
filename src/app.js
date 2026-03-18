import express from "express";
import cors from "cors";

// ROUTES
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import analystRoutes from "./routes/analyst.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import adminShiftAttendanceRoutes from "./routes/adminShiftAttendance.routes.js";
import adminAttendanceRoutes from "./routes/adminAttendance.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import documentRoutes from "./routes/document.routes.js";


const app = express();

/* ================================
   GLOBAL MIDDLEWARES
================================ */

// ✅ BODY PARSER (safe limits)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ CORS (GOOGLE OAUTH SAFE)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
    credentials: true,
  })
);

// ❌ IMPORTANT: DO NOT SET COOP / COEP HEADERS
// Google OAuth breaks if these are enabled
// ❌ app.use((req, res, next) => {
// ❌   res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
// ❌   res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
// ❌   next();
// ❌ });

/* ================================
   ROUTES
================================ */

// 🔓 AUTH
app.use("/api/auth", authRoutes);

// 👤 USERS
app.use("/api/users", userRoutes);

// 📅 ATTENDANCE
app.use("/api/attendance", attendanceRoutes);

// 🏖 LEAVES
app.use("/api/leaves", leaveRoutes);

// 📊 DASHBOARD
app.use("/api/dashboard", dashboardRoutes);

// 🧑‍💻 ANALYSTS
app.use("/api/analysts", analystRoutes);

// 👨‍💼 EMPLOYEE
app.use("/api/employee", employeeRoutes);

// 👑 ADMIN (SHIFT ATTENDANCE)
app.use("/api/admin", adminShiftAttendanceRoutes);

// Admin Attendance report for analyst
app.use("/api/admin", adminAttendanceRoutes);
app.use("/api/notifications", notificationRoutes);

// doccument upload
app.use("/api/documents", documentRoutes);

/* ================================
   FALLBACKS
================================ */

// ❌ 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    msg: "API route not found",
  });
});

// ❌ GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    msg: "Internal Server Error",
  });
});

export default app;
