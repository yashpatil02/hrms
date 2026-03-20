import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getProfile,
  updateProfile,
  changePassword,
  updateWeeklyOff,
  getSystemSettings,
  updateSystemSettings,
  getAccountStats,
  clearMyNotifications,
  clearAllNotifications,
  getAdminStats,
} from "../controllers/settings.controller.js";

const router = express.Router();

/* ── PROFILE (all roles) ── */
router.get("/profile",       auth, getProfile);
router.put("/profile",       auth, updateProfile);
router.put("/password",      auth, changePassword);
router.put("/weekly-off",    auth, updateWeeklyOff);
router.get("/account-stats", auth, getAccountStats);

/* ── NOTIFICATIONS ── */
router.delete("/notifications/clear",     auth, clearMyNotifications);
router.delete("/notifications/clear-all", auth, role(["ADMIN"]), clearAllNotifications);

/* ── ADMIN ONLY ── */
router.get("/system",  auth, role(["ADMIN"]), getSystemSettings);
router.put("/system",  auth, role(["ADMIN"]), updateSystemSettings);
router.get("/stats",   auth, role(["ADMIN"]), getAdminStats);

export default router;