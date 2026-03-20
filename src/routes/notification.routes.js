import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  getMyNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller.js";

const router = express.Router();

// GET  /api/notifications          — paginated list
router.get("/",              auth, getMyNotifications);

// PUT  /api/notifications/read-all — mark all read
router.put("/read-all",      auth, markAllRead);

// PUT  /api/notifications/:id/read — mark one read
router.put("/:id/read",      auth, markAsRead);

// ✅ DELETE /api/notifications/:id      — delete single
router.delete("/:id",        auth, deleteNotification);

// ✅ DELETE /api/notifications          — delete all
router.delete("/",           auth, deleteAllNotifications);

export default router;