import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

import {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getAdvancedLeaves,
} from "../controllers/leave.controller.js";

const router = express.Router();

/* =========================
   EMPLOYEE
========================= */
router.post("/", auth, applyLeave);
router.get("/my", auth, getMyLeaves);

/* =========================
   ADMIN / HR
========================= */
router.get(
  "/pending",
  auth,
  role(["ADMIN", "HR"]),
  getPendingLeaves
);

router.get(
  "/admin",
  auth,
  role(["ADMIN", "HR"]),
  getAdvancedLeaves
);

router.put(
  "/:id/approve",
  auth,
  role(["ADMIN", "HR"]),
  approveLeave
);

router.put(
  "/:id/reject",
  auth,
  role(["ADMIN", "HR"]),
  rejectLeave
);

export default router;
