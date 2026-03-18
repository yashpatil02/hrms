import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  markAttendance,
  getMyAttendanceHistory,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.post("/manual", auth, markAttendance);
router.get("/history", auth, getMyAttendanceHistory);

export default router;
