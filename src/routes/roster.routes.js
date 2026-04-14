import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getMonthlyRoster,
  assignShift,
  bulkAssignShift,
  removeShift,
  getMySchedule,
  requestSwap,
  getSwapRequests,
  respondToSwap,
  resolveSwap,
} from "../controllers/roster.controller.js";

const router = Router();

// Manager/HR/Admin — monthly roster management
router.get("/",          auth, role(["ADMIN", "HR", "MANAGER"]), getMonthlyRoster);
router.post("/",         auth, role(["ADMIN", "HR", "MANAGER"]), assignShift);
router.post("/bulk",     auth, role(["ADMIN", "HR", "MANAGER"]), bulkAssignShift);
router.delete("/:id",    auth, role(["ADMIN", "HR", "MANAGER"]), removeShift);

// Employee — own schedule
router.get("/my",        auth, getMySchedule);

// Swap requests
router.get("/swap",      auth, getSwapRequests);
router.post("/swap",     auth, requestSwap);
router.patch("/swap/:id/respond", auth, respondToSwap);
router.patch("/swap/:id/resolve", auth, role(["ADMIN", "HR", "MANAGER"]), resolveSwap);

export default router;
