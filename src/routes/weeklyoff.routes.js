import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getMyWeekoffInfo,
  updateWeeklyOffDay,
  useCompOff,
  getAllUsersWeekoff,
  adminUpdateUserWeekoff,
} from "../controllers/weeklyoff.controller.js";

const router = express.Router();

/* ── EMPLOYEE / ALL ── */
router.get("/me",           auth, getMyWeekoffInfo);
router.put("/day",          auth, updateWeeklyOffDay);
router.post("/use-compoff", auth, useCompOff);

/* ── ADMIN ONLY ── */
router.get("/admin/all",          auth, role(["ADMIN","HR"]), getAllUsersWeekoff);
router.put("/admin/:userId",      auth, role(["ADMIN","HR"]), adminUpdateUserWeekoff);

export default router;