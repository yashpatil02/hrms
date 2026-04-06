import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import {
  getOverview, getDepartmentStats, getAttendanceTrend,
  getLeaveStats, getPayrollTrend, getHeadcountTrend, getTopAbsentees,
} from "../controllers/analytics.controller.js";

const router = Router();
router.use(authenticate);
router.use(requireRole(["ADMIN", "HR"]));

router.get("/overview",          getOverview);
router.get("/department-stats",  getDepartmentStats);
router.get("/attendance-trend",  getAttendanceTrend);
router.get("/leave-stats",       getLeaveStats);
router.get("/payroll-trend",     getPayrollTrend);
router.get("/headcount-trend",   getHeadcountTrend);
router.get("/top-absentees",     getTopAbsentees);

export default router;
