import express from "express";

import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

import {
  getAttendanceReport,
} from "../controllers/adminAttendance.controller.js";

const router = express.Router();

// ADMIN – attendance report
router.get(
  "/attendance-report",
  auth,
  role(["ADMIN"]),
  getAttendanceReport
);

export default router;
