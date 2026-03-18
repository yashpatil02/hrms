import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getUsers,
  deleteUser,
  updateWeeklyOff,
} from "../controllers/user.controller.js";

const router = express.Router();

// =========================
// ADMIN + HR → view users
// =========================
router.get(
  "/",
  auth,
  role(["ADMIN", "HR"]),
  getUsers
);

// =========================
// ADMIN → delete user
// =========================
router.delete(
  "/:id",
  auth,
  role(["ADMIN"]),
  deleteUser
);

// =========================
// EMPLOYEE → update weekly off
// =========================
router.post(
  "/update-weekly-off",
  auth,
  updateWeeklyOff
);

export default router;
