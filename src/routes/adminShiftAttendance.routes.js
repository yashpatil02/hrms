import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  saveShiftAttendance,
  getShiftAttendanceByDateAndShift,
  getMonthlyShiftAttendance,
  getAttendanceAudit,
  getDailySummary,
} from "../controllers/adminShiftAttendance.controller.js";

const router = express.Router();

/* ================================
   ATTENDANCE ENTRY
================================ */

// POST — save/update attendance records
router.post(
  "/attendance-by-shift",
  auth, role(["ADMIN"]),
  saveShiftAttendance
);

// GET — daily attendance for a shift+date
// ?date=YYYY-MM-DD&shift=MORNING&department=SQ
router.get(
  "/shift-attendance-report",
  auth, role(["ADMIN", "HR"]),
  getShiftAttendanceByDateAndShift
);

// GET — daily summary across ALL shifts
// ?date=YYYY-MM-DD
router.get(
  "/daily-summary",
  auth, role(["ADMIN", "HR"]),
  getDailySummary
);

/* ================================
   REPORTS
================================ */

// GET — monthly attendance matrix
// ?month=&year=&department=&shift=
router.get(
  "/monthly-shift-attendance",
  auth, role(["ADMIN", "HR"]),
  getMonthlyShiftAttendance
);

/* ================================
   AUDIT LOGS
================================ */

// GET — paginated audit trail
// ?page=&limit=&action=&shift=&fromDate=&toDate=&search=
router.get(
  "/attendance-audit",
  auth, role(["ADMIN", "HR"]),
  getAttendanceAudit
);

export default router;