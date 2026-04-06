import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import {
  getHolidays, createHoliday, updateHoliday, deleteHoliday, bulkCreateHolidays,
} from "../controllers/holiday.controller.js";

const router = Router();
router.use(authenticate);

router.get("/", getHolidays);                                         // all roles
router.post("/", requireRole(["ADMIN", "HR"]), createHoliday);
router.post("/bulk", requireRole(["ADMIN", "HR"]), bulkCreateHolidays);
router.put("/:id", requireRole(["ADMIN", "HR"]), updateHoliday);
router.delete("/:id", requireRole(["ADMIN", "HR"]), deleteHoliday);

export default router;
