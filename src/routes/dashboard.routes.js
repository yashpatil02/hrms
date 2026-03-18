import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get(
  "/stats",
  auth,
  role(["ADMIN", "HR"]),
  getDashboardStats
);

export default router;
