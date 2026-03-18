import express from "express";

import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

import {
  saveShiftAttendance,
  getShiftAttendanceByDateAndShift,
  getMonthlyShiftAttendance,
  getAttendanceAudit,
} from "../controllers/adminShiftAttendance.controller.js";

const router = express.Router();

// SAVE attendance (SHIFT + DATE)
router.post(
  "/attendance-by-shift",
  auth,
  role(["ADMIN"]),
  saveShiftAttendance
);

// DAILY attendance
router.get(
  "/shift-attendance-report",
  auth,
  role(["ADMIN"]),
  getShiftAttendanceByDateAndShift
);

// MONTHLY attendance
router.get(
  "/monthly-shift-attendance",
  auth,
  role(["ADMIN"]),
  getMonthlyShiftAttendance
);

// AUDIT
router.get(
  "/attendance-audit",
  auth,
  role(["ADMIN"]),
  getAttendanceAudit
);

export default router;
