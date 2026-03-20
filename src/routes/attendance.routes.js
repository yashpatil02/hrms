import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  clockIn,
  clockOut,
  markAttendance,
  getTodayStatus,
  getMyAttendanceHistory,
  getMyAttendanceStats,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.post("/clock-in",  auth, clockIn);           // ✅ One-tap clock in (IST)
router.post("/clock-out", auth, clockOut);          // ✅ One-tap clock out (IST)
router.post("/manual",    auth, markAttendance);    // ✅ Manual entry
router.get("/today",      auth, getTodayStatus);    // ✅ Today's status + IST time
router.get("/history",    auth, getMyAttendanceHistory); // ✅ Filtered history
router.get("/stats",      auth, getMyAttendanceStats);   // ✅ Month stats + streak

export default router;