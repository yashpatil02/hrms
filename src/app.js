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
import settingsRoutes from "./routes/settings.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import documentRoutes from "./routes/document.routes.js";
import weeklyoffRoutes from "./routes/weeklyoff.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import holidayRoutes from "./routes/holiday.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import targetRoutes from "./routes/target.routes.js";
import qcRoutes from "./routes/qc.routes.js";

const app = express();

/* ================================
   GLOBAL MIDDLEWARES
================================ */

// ✅ BODY PARSER (safe limits)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ CORS — localhost + production domain dono allow
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL, // ✅ FIX #4 — production URL env se aayega
].filter(Boolean); // undefined/null entries hata do

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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

// document upload
app.use("/api/documents", documentRoutes);

// setting routes 
app.use("/api/settings", settingsRoutes);

// weeklyoff
app.use("/api/weekoff", weeklyoffRoutes);

// 💰 PAYROLL
app.use("/api/payroll", payrollRoutes);

// 🗓 HOLIDAYS
app.use("/api/holidays", holidayRoutes);

// 👤 PROFILE
app.use("/api/profile", profileRoutes);

// 📊 ANALYTICS
app.use("/api/analytics", analyticsRoutes);

// 🎯 DAILY TARGETS
app.use("/api/targets", targetRoutes);

// 🔍 QC ERROR TRACKING
app.use("/api/qc", qcRoutes);

/* ================================
   HEALTH CHECK (for keep-alive ping)
================================ */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

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