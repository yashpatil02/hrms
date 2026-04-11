import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import { getManagementAudit, getAuditActors } from "../controllers/audit.controller.js";

const router = express.Router();
const adminHR = role(["ADMIN", "HR"]);

router.get("/",       auth, adminHR, getManagementAudit);
router.get("/actors", auth, adminHR, getAuditActors);

export default router;
