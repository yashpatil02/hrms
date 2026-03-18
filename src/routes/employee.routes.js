import express from "express";
import auth from "../middlewares/auth.middleware.js";

import {
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
  getEmployeeDashboard,
} from "../controllers/employee.controller.js";

const router = express.Router();

// 🔐 All routes are employee protected
router.get("/attendance", auth, getEmployeeAttendance);
router.get(
  "/attendance-summary",
  auth,
  getEmployeeAttendanceSummary
);
router.get("/dashboard", auth, getEmployeeDashboard);

export default router;
