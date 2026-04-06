import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  getSalaryStructure,
  getAllSalaryStructures,
  upsertSalaryStructure,
  generatePayroll,
  getPayrollList,
  getPayrollById,
  updatePayrollStatus,
  getMyPayslips,
  getEmployeesWithoutStructure,
} from "../controllers/payroll.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Salary Structure (Admin/HR only) ──
router.get("/salary-structures", requireRole(["ADMIN", "HR"]), getAllSalaryStructures);
router.get("/salary-structure/:userId", requireRole(["ADMIN", "HR"]), getSalaryStructure);
router.put("/salary-structure/:userId", requireRole(["ADMIN", "HR"]), upsertSalaryStructure);
router.get("/employees-without-structure", requireRole(["ADMIN", "HR"]), getEmployeesWithoutStructure);

// ── Payroll Generation & Management (Admin/HR only) ──
router.post("/generate", requireRole(["ADMIN", "HR"]), generatePayroll);
router.get("/list", requireRole(["ADMIN", "HR"]), getPayrollList);
router.put("/:id/status", requireRole(["ADMIN", "HR"]), updatePayrollStatus);

// ── Employee: own payslips ──
router.get("/my-payslips", getMyPayslips);

// ── Single payslip (admin can view all, employee only own) ──
router.get("/:id", getPayrollById);

export default router;
