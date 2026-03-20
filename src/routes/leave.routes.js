import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  applyLeave,
  cancelLeave,
  getMyLeaves,
  getMyLeaveStats,
  getPendingLeaves,
  getAdvancedLeaves,
  approveLeave,
  rejectLeave,
} from "../controllers/leave.controller.js";

const router = express.Router();

/* ── EMPLOYEE ── */
router.post("/",         auth, applyLeave);
router.delete("/:id",    auth, cancelLeave);        // NEW — cancel pending leave
router.get("/my",        auth, getMyLeaves);        // ?status=&year=
router.get("/my-stats",  auth, getMyLeaveStats);    // NEW — leave stats

/* ── ADMIN / HR ── */
router.get("/pending",   auth, role(["ADMIN","HR"]), getPendingLeaves);
router.get("/admin",     auth, role(["ADMIN","HR"]), getAdvancedLeaves);
router.put("/:id/approve", auth, role(["ADMIN","HR"]), approveLeave);
router.put("/:id/reject",  auth, role(["ADMIN","HR"]), rejectLeave);

export default router;