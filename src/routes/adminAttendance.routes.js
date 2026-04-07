import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getAttendanceReport,
  getUserAttendanceDetail,
  getAttendanceOverview,
} from "../controllers/adminAttendance.controller.js";

const router = express.Router();

// GET overview stats (cards)
router.get(
  "/attendance-overview",
  auth, role(["ADMIN","HR","MANAGER"]),
  getAttendanceOverview
);

// GET all users list + this-month summary
// ?search=&role=&department=&page=&limit=
router.get(
  "/attendance-report",
  auth, role(["ADMIN","HR","MANAGER"]),
  getAttendanceReport
);

// GET single user attendance detail
// ?fromDate=&toDate=&dayType=&page=&limit=
router.get(
  "/attendance-report/:userId",
  auth, role(["ADMIN","HR","MANAGER"]),
  getUserAttendanceDetail
);

export default router;