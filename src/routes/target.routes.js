import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  saveTarget,
  getMyTargets,
  getAllTargets,
  getMonthlySummary,
} from "../controllers/target.controller.js";

const router = express.Router();

/* Employee — save/update own daily target */
router.post("/",         auth, saveTarget);

/* Employee — get own targets for a month */
router.get("/my",        auth, getMyTargets);

/* Admin / HR / Manager — all employees' targets for a date */
router.get("/all",       auth, role(["ADMIN","HR","MANAGER"]), getAllTargets);

/* Admin / HR / Manager — monthly summary per employee */
router.get("/summary",   auth, role(["ADMIN","HR","MANAGER"]), getMonthlySummary);

export default router;
