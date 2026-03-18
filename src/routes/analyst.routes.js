import express from "express";
import auth from "../middlewares/auth.middleware.js";

import {
  addAnalyst,
  getAnalysts,
  bulkUpdateShift,
  getShiftHistory,
  terminateAnalyst,
  restoreAnalyst,
  getTerminatedAnalysts,
} from "../controllers/analyst.controller.js";

const router = express.Router();

// CREATE
router.post("/", addAnalyst);

// LIST
router.get("/", getAnalysts);
router.get("/terminated", getTerminatedAnalysts);

// BULK SHIFT
router.put("/bulk-shift", bulkUpdateShift);

// SHIFT HISTORY
router.get("/:id/shift-history", getShiftHistory);

// TERMINATION / RESTORE
router.put("/:id/terminate", auth, terminateAnalyst);
router.put("/:id/restore", restoreAnalyst);

export default router;
