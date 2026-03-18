import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  getMyNotifications,
  markAsRead,
  markAllRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", auth, getMyNotifications);
router.put("/:id/read", auth, markAsRead);
router.put("/read-all", auth, markAllRead);

export default router;
