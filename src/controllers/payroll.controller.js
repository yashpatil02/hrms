import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// SALARY STRUCTURE
// ─────────────────────────────────────────────

// GET /api/payroll/salary-structure/:userId
export const getSalaryStructure = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const structure = await prisma.salaryStructure.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, designation: true, department: true } } },
  });
  if (!structure) return res.status(404).json({ message: "Salary structure not found" });
  res.json(structure);
};

// GET /api/payroll/salary-structures  (all employees list for admin)
export const getAllSalaryStructures = async (req, res) => {
  const structures = await prisma.salaryStructure.findMany({
    include: { user: { select: { id: true, name: true, designation: true, department: true } } },
    orderBy: { user: { name: "asc" } },
  });
  res.json(structures);
};

// PUT /api/payroll/salary-structure/:userId  (upsert)
export const upsertSalaryStructure = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const {
    basicSalary, hra, da, otherAllowances,
    pfEmployee, pfEmployer, esiEmployee, esiEmployer,
    professionalTax, tds, otherDeductions,
  } = req.body;

  const structure = await prisma.salaryStructure.upsert({
    where: { userId },
    update: {
      basicSalary: parseFloat(basicSalary) || 0,
      hra: parseFloat(hra) || 0,
      da: parseFloat(da) || 0,
      otherAllowances: parseFloat(otherAllowances) || 0,
      pfEmployee: parseFloat(pfEmployee) ?? 12,
      pfEmployer: parseFloat(pfEmployer) ?? 12,
      esiEmployee: parseFloat(esiEmployee) ?? 0.75,
      esiEmployer: parseFloat(esiEmployer) ?? 3.25,
      professionalTax: parseFloat(professionalTax) || 0,
      tds: parseFloat(tds) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
    },
    create: {
      userId,
      basicSalary: parseFloat(basicSalary) || 0,
      hra: parseFloat(hra) || 0,
      da: parseFloat(da) || 0,
      otherAllowances: parseFloat(otherAllowances) || 0,
      pfEmployee: parseFloat(pfEmployee) ?? 12,
      pfEmployer: parseFloat(pfEmployer) ?? 12,
      esiEmployee: parseFloat(esiEmployee) ?? 0.75,
      esiEmployer: parseFloat(esiEmployer) ?? 3.25,
      professionalTax: parseFloat(professionalTax) || 0,
      tds: parseFloat(tds) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
    },
    include: { user: { select: { id: true, name: true, designation: true, department: true } } },
  });

  res.json({ message: "Salary structure saved", structure });
};

// ─────────────────────────────────────────────
// PAYROLL GENERATION
// ─────────────────────────────────────────────

/**
 * Helper: calculate payroll figures for one employee in a given month/year.
 */
async function calculatePayrollForEmployee(userId, month, year) {
  const structure = await prisma.salaryStructure.findUnique({ where: { userId } });
  if (!structure) return null;

  // Date range for the month (UTC-aware, matching how attendance dates are stored)
  const firstDay = new Date(Date.UTC(year, month - 1, 1, 6, 30, 0)); // UTC noon IST = 06:30 UTC
  const lastDay  = new Date(Date.UTC(year, month, 0, 6, 30, 0));

  const attendances = await prisma.attendance.findMany({
    where: { userId, date: { gte: firstDay, lte: lastDay } },
  });

  // Count day types
  let presentDays  = 0;
  let absentDays   = 0;
  let leaveDays    = 0;
  let weekoffDays  = 0;
  let paidHolidays = 0;

  for (const a of attendances) {
    switch (a.dayType) {
      case "FULL":
      case "WEEKOFF_PRESENT":
        presentDays += 1;
        break;
      case "HALF":
        presentDays += 0.5;
        absentDays  += 0.5;
        break;
      case "ABSENT":
        absentDays += 1;
        break;
      case "PAID_LEAVE":
        leaveDays += 1;
        break;
      case "WEEKOFF":
        weekoffDays += 1;
        break;
      case "PAID_HOLIDAY":
        paidHolidays += 1;
        break;
      case "PENDING_WEEKOFF":
        absentDays += 1;
        break;
      default:
        break;
    }
  }

  const totalWorkingDays = attendances.length;
  // Paid days = present + paid leaves + paid holidays
  const paidDays = presentDays + leaveDays + paidHolidays;
  const workableDays = totalWorkingDays - weekoffDays; // exclude weekoffs from denominator

  // Pro-rate salary based on actual paid days vs workable days
  const ratio = workableDays > 0 ? paidDays / workableDays : 0;

  const basicSalary     = round2(structure.basicSalary * ratio);
  const hra             = round2(structure.hra * ratio);
  const da              = round2(structure.da * ratio);
  const otherAllowances = round2(structure.otherAllowances * ratio);
  const grossSalary     = round2(basicSalary + hra + da + otherAllowances);

  // Deductions (also pro-rated for PF/ESI, fixed for PT/TDS/other)
  const pfDeduction     = round2((basicSalary * structure.pfEmployee) / 100);
  const esiDeduction    = round2((grossSalary * structure.esiEmployee) / 100);
  const professionalTax = round2(structure.professionalTax * ratio);
  const tds             = round2(structure.tds * ratio);
  const otherDeductions = round2(structure.otherDeductions * ratio);
  const totalDeductions = round2(pfDeduction + esiDeduction + professionalTax + tds + otherDeductions);
  const netSalary       = round2(grossSalary - totalDeductions);

  return {
    salaryStructureId: structure.id,
    totalWorkingDays,
    presentDays,
    absentDays,
    leaveDays,
    weekoffDays,
    paidHolidays,
    basicSalary,
    hra,
    da,
    otherAllowances,
    grossSalary,
    pfDeduction,
    esiDeduction,
    professionalTax,
    tds,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// POST /api/payroll/generate  { month, year, userIds? }
export const generatePayroll = async (req, res) => {
  const { month, year, userIds } = req.body;
  if (!month || !year) return res.status(400).json({ message: "month and year are required" });

  // Get employees to process
  let employees;
  if (userIds && userIds.length > 0) {
    employees = await prisma.user.findMany({
      where: { id: { in: userIds.map(Number) }, role: { not: "ADMIN" } },
      select: { id: true, name: true },
    });
  } else {
    employees = await prisma.user.findMany({
      where: { role: { not: "ADMIN" }, salaryStructure: { isNot: null } },
      select: { id: true, name: true },
    });
  }

  const results = [];

  for (const emp of employees) {
    const data = await calculatePayrollForEmployee(emp.id, parseInt(month), parseInt(year));
    if (!data) {
      results.push({ userId: emp.id, name: emp.name, skipped: true, reason: "No salary structure" });
      continue;
    }

    const payroll = await prisma.payroll.upsert({
      where: { userId_month_year: { userId: emp.id, month: parseInt(month), year: parseInt(year) } },
      update: { ...data, generatedById: req.user.id, status: "DRAFT" },
      create: { userId: emp.id, month: parseInt(month), year: parseInt(year), ...data, generatedById: req.user.id },
    });

    results.push({ userId: emp.id, name: emp.name, payrollId: payroll.id, netSalary: payroll.netSalary });
  }

  res.json({ message: "Payroll generated", month, year, results });
};

// GET /api/payroll/list?month=&year=  (admin - all employees)
export const getPayrollList = async (req, res) => {
  const { month, year } = req.query;
  const where = {};
  if (month) where.month = parseInt(month);
  if (year) where.year = parseInt(year);

  const payrolls = await prisma.payroll.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, designation: true, department: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { user: { name: "asc" } }],
  });

  res.json(payrolls);
};

// GET /api/payroll/:id  (single payslip detail)
export const getPayrollById = async (req, res) => {
  const payroll = await prisma.payroll.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      user: { select: { id: true, name: true, designation: true, department: true, email: true, joinDate: true } },
      salaryStructure: true,
    },
  });
  if (!payroll) return res.status(404).json({ message: "Payroll record not found" });

  // Employees can only view their own payslip
  if (req.user.role === "EMPLOYEE" && payroll.userId !== req.user.id) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(payroll);
};

// PUT /api/payroll/:id/status  { status, remarks? }
export const updatePayrollStatus = async (req, res) => {
  const { status, remarks } = req.body;
  const allowed = ["APPROVED", "PAID", "CANCELLED", "DRAFT"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

  const payroll = await prisma.payroll.update({
    where: { id: parseInt(req.params.id) },
    data: {
      status,
      remarks: remarks || null,
      approvedById: status === "APPROVED" ? req.user.id : undefined,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
    },
  });

  res.json({ message: `Payroll marked as ${status}`, payroll });
};

// GET /api/payroll/my-payslips  (employee - own payslips)
export const getMyPayslips = async (req, res) => {
  const payrolls = await prisma.payroll.findMany({
    where: { userId: req.user.id, status: { not: "CANCELLED" } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  res.json(payrolls);
};

// GET /api/payroll/employees-without-structure  (for admin UI hint)
export const getEmployeesWithoutStructure = async (req, res) => {
  const employees = await prisma.user.findMany({
    where: { role: { not: "ADMIN" }, salaryStructure: { is: null } },
    select: { id: true, name: true, designation: true, department: true },
    orderBy: { name: "asc" },
  });
  res.json(employees);
};
