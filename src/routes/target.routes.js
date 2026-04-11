import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  saveTarget,
  getMyTargets,
  getAllTargets,
  getMonthlySummary,
  getOvertimeRate,
  updateOvertimeRate,
} from "../controllers/target.controller.js";

const router = express.Router();

/* Employee — save/update own daily target (includes overtime) */
router.post("/",         auth, saveTarget);

/* Employee — get own targets for a month + overtime rate */
router.get("/my",        auth, getMyTargets);

/* Employee — get/set their overtime hourly rate */
router.get("/rate",      auth, getOvertimeRate);
router.patch("/rate",    auth, updateOvertimeRate);

/* Admin / HR / Manager — all employees' targets for a date */
router.get("/all",       auth, role(["ADMIN","HR","MANAGER"]), getAllTargets);

/* Admin / HR / Manager — monthly summary per employee */
router.get("/summary",   auth, role(["ADMIN","HR","MANAGER"]), getMonthlySummary);

export default router;
