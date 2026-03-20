import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getUsers,
  getUserDetail,
  deleteUser,
  updateWeeklyOff,
  updateUserRole,
  resetUserPassword,
} from "../controllers/user.controller.js";

const router = express.Router();

// ADMIN + HR → list all users
router.get("/",           auth, role(["ADMIN", "HR"]), getUsers);

// ADMIN + HR → single user detail with stats
router.get("/:id",        auth, role(["ADMIN", "HR"]), getUserDetail);

// ADMIN → delete user
router.delete("/:id",     auth, role(["ADMIN"]),       deleteUser);

// ADMIN → update role
router.put("/:id/role",   auth, role(["ADMIN"]),       updateUserRole);

// ADMIN → reset password
router.put("/:id/reset-password", auth, role(["ADMIN"]), resetUserPassword);

// EMPLOYEE → update weekly off
router.post("/update-weekly-off", auth, updateWeeklyOff);

export default router;