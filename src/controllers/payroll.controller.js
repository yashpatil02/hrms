import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// SALARY STRUCTURE
// ─────────────────────────────────────────────

// GET /api/payroll/salary-structure/:userId
export const getSalaryStructure = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const structure = await prisma.salaryStructure.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, designation: true, department: true } } },
    });
    if (!structure) return res.status(404).json({ message: "Salary structure not found" });
    res.json(structure);
  } catch (err) {
    console.error("getSalaryStructure error:", err);
    res.status(500).json({ message: "Failed to fetch salary structure" });
  }
};

// GET /api/payroll/salary-structures
export const getAllSalaryStructures = async (req, res) => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      include: { user: { select: { id: true, name: true, designation: true, department: true } } },
      orderBy: { user: { name: "asc" } },
    });
    res.json(structures);
  } catch (err) {
    console.error("getAllSalaryStructures error:", err);
    res.status(500).json({ message: "Failed to fetch salary structures" });
  }
};

// PUT /api/payroll/salary-structure/:userId  (upsert)
export const upsertSalaryStructure = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const {
      basicSalary, hra, da, otherAllowances,
      pfEmployee, pfEmployer, esiEmployee, esiEmployer,
      professionalTax, tds, otherDeductions,
    } = req.body;

    // ✅ Input validation
    const basic = parseFloat(basicSalary) || 0;
    if (basic <= 0) return res.status(400).json({ message: "Basic salary must be greater than 0" });

    const pfEmp = Math.min(Math.max(parseFloat(pfEmployee) ?? 12, 0), 100);
    const pfEr  = Math.min(Math.max(parseFloat(pfEmployer) ?? 12, 0), 100);
    const esiEmp = Math.min(Math.max(parseFloat(esiEmployee) ?? 0.75, 0), 100);
    const esiEr  = Math.min(Math.max(parseFloat(esiEmployer) ?? 3.25, 0), 100);

    const data = {
      basicSalary:     basic,
      hra:             Math.max(parseFloat(hra) || 0, 0),
      da:              Math.max(parseFloat(da) || 0, 0),
      otherAllowances: Math.max(parseFloat(otherAllowances) || 0, 0),
      pfEmployee:      pfEmp,
      pfEmployer:      pfEr,
      esiEmployee:     esiEmp,
      esiEmployer:     esiEr,
      professionalTax: Math.max(parseFloat(professionalTax) || 0, 0),
      tds:             Math.max(parseFloat(tds) || 0, 0),
      otherDeductions: Math.max(parseFloat(otherDeductions) || 0, 0),
    };

    const structure = await prisma.salaryStructure.upsert({
      where:  { userId },
      update: data,
      create: { userId, ...data },
      include: { user: { select: { id: true, name: true, designation: true, department: true } } },
    });

    res.json({ message: "Salary structure saved", structure });
  } catch (err) {
    console.error("upsertSalaryStructure error:", err);
    res.status(500).json({ message: "Failed to save salary structure" });
  }
};

// DELETE /api/payroll/salary-structure/:userId
export const deleteSalaryStructure = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const existing = await prisma.salaryStructure.findUnique({ where: { userId } });
    if (!existing) return res.status(404).json({ message: "Salary structure not found" });
    await prisma.salaryStructure.delete({ where: { userId } });
    res.json({ message: "Salary structure deleted" });
  } catch (err) {
    console.error("deleteSalaryStructure error:", err);
    res.status(500).json({ message: "Failed to delete salary structure" });
  }
};

// GET /api/payroll/employees-without-structure
export const getEmployeesWithoutStructure = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: { not: "ADMIN" }, salaryStructure: { is: null } },
      select: { id: true, name: true, designation: true, department: true },
      orderBy: { name: "asc" },
    });
    res.json(employees);
  } catch (err) {
    console.error("getEmployeesWithoutStructure error:", err);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

// ─────────────────────────────────────────────
// PAYROLL GENERATION
// ─────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function calculatePayrollForEmployee(userId, month, year, structureMap) {
  const structure = structureMap[userId];
  if (!structure) return null;

  const firstDay = new Date(Date.UTC(year, month - 1, 1, 6, 30, 0));
  const lastDay  = new Date(Date.UTC(year, month, 0, 6, 30, 0));

  const attendances = await prisma.attendance.findMany({
    where: { userId, date: { gte: firstDay, lte: lastDay } },
  });

  let presentDays = 0, absentDays = 0, leaveDays = 0, weekoffDays = 0, paidHolidays = 0;

  for (const a of attendances) {
    switch (a.dayType) {
      case "FULL":
      case "WEEKOFF_PRESENT": presentDays += 1; break;
      case "HALF":            presentDays += 0.5; absentDays += 0.5; break;
      case "ABSENT":          absentDays  += 1; break;
      case "PAID_LEAVE":      leaveDays   += 1; break;
      case "WEEKOFF":         weekoffDays += 1; break;
      case "PAID_HOLIDAY":    paidHolidays += 1; break;
      case "PENDING_WEEKOFF": absentDays  += 1; break;
    }
  }

  const totalWorkingDays = attendances.length;
  const paidDays    = presentDays + leaveDays + paidHolidays;
  const workableDays = totalWorkingDays - weekoffDays;
  const ratio = workableDays > 0 ? paidDays / workableDays : 0;

  const basicSalary     = round2(structure.basicSalary * ratio);
  const hra             = round2(structure.hra * ratio);
  const da              = round2(structure.da * ratio);
  const otherAllowances = round2(structure.otherAllowances * ratio);
  const grossSalary     = round2(basicSalary + hra + da + otherAllowances);

  const pfDeduction     = round2((basicSalary * structure.pfEmployee) / 100);
  const esiDeduction    = round2((grossSalary * structure.esiEmployee) / 100);
  const professionalTax = round2(structure.professionalTax * ratio);
  const tds             = round2(structure.tds * ratio);
  const otherDeductions = round2(structure.otherDeductions * ratio);
  const totalDeductions = round2(pfDeduction + esiDeduction + professionalTax + tds + otherDeductions);
  const netSalary       = round2(grossSalary - totalDeductions);

  return {
    salaryStructureId: structure.id,
    totalWorkingDays, presentDays, absentDays, leaveDays, weekoffDays, paidHolidays,
    basicSalary, hra, da, otherAllowances, grossSalary,
    pfDeduction, esiDeduction, professionalTax, tds, otherDeductions, totalDeductions, netSalary,
  };
}

// POST /api/payroll/generate  { month, year, userIds? }
export const generatePayroll = async (req, res) => {
  try {
    const { month, year, userIds } = req.body;
    if (!month || !year) return res.status(400).json({ message: "month and year are required" });
    if (month < 1 || month > 12) return res.status(400).json({ message: "Invalid month" });

    // ✅ Load all salary structures in ONE query (fix N+1)
    const whereUsers = userIds?.length > 0
      ? { id: { in: userIds.map(Number) }, role: { not: "ADMIN" } }
      : { role: { not: "ADMIN" }, salaryStructure: { isNot: null } };

    const employees = await prisma.user.findMany({
      where: whereUsers,
      select: { id: true, name: true },
    });

    const structures = await prisma.salaryStructure.findMany({
      where: { userId: { in: employees.map((e) => e.id) } },
    });
    const structureMap = Object.fromEntries(structures.map((s) => [s.userId, s]));

    const results = [];
    const payrollData = [];

    for (const emp of employees) {
      const data = await calculatePayrollForEmployee(emp.id, parseInt(month), parseInt(year), structureMap);
      if (!data) {
        results.push({ userId: emp.id, name: emp.name, skipped: true, reason: "No salary structure" });
        continue;
      }
      payrollData.push({ emp, data });
    }

    // ✅ Use transaction for all-or-nothing
    const created = await prisma.$transaction(
      payrollData.map(({ emp, data }) =>
        prisma.payroll.upsert({
          where:  { userId_month_year: { userId: emp.id, month: parseInt(month), year: parseInt(year) } },
          update: { ...data, generatedById: req.user.id, status: "DRAFT" },
          create: { userId: emp.id, month: parseInt(month), year: parseInt(year), ...data, generatedById: req.user.id },
        })
      )
    );

    created.forEach((p, i) => {
      results.push({ userId: payrollData[i].emp.id, name: payrollData[i].emp.name, payrollId: p.id, netSalary: p.netSalary });
    });

    res.json({ message: "Payroll generated", month, year, results });
  } catch (err) {
    console.error("generatePayroll error:", err);
    res.status(500).json({ message: "Payroll generation failed" });
  }
};

// GET /api/payroll/list?month=&year=  (admin/HR only)
export const getPayrollList = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = {};
    if (month) where.month = parseInt(month);
    if (year)  where.year  = parseInt(year);

    // ✅ Employees can only see their own payroll
    if (req.user.role === "EMPLOYEE") {
      where.userId = req.user.id;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: { user: { select: { id: true, name: true, designation: true, department: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { user: { name: "asc" } }],
    });

    res.json(payrolls);
  } catch (err) {
    console.error("getPayrollList error:", err);
    res.status(500).json({ message: "Failed to fetch payroll list" });
  }
};

// GET /api/payroll/:id
export const getPayrollById = async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, name: true, designation: true, department: true, email: true, joinDate: true } },
        salaryStructure: true,
      },
    });
    if (!payroll) return res.status(404).json({ message: "Payroll record not found" });

    if (req.user.role === "EMPLOYEE" && payroll.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(payroll);
  } catch (err) {
    console.error("getPayrollById error:", err);
    res.status(500).json({ message: "Failed to fetch payroll" });
  }
};

// PUT /api/payroll/:id/status  { status, remarks? }
export const updatePayrollStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const allowed = ["APPROVED", "PAID", "CANCELLED", "DRAFT"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const existing = await prisma.payroll.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ message: "Payroll not found" });
    if (existing.status === "PAID" && status !== "CANCELLED")
      return res.status(400).json({ message: "Paid payroll cannot be changed" });

    const payroll = await prisma.payroll.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status,
        remarks:     remarks || null,
        approvedById: status === "APPROVED" ? req.user.id : undefined,
        approvedAt:   status === "APPROVED" ? new Date()  : undefined,
      },
    });

    res.json({ message: `Payroll marked as ${status}`, payroll });
  } catch (err) {
    console.error("updatePayrollStatus error:", err);
    res.status(500).json({ message: "Status update failed" });
  }
};

// GET /api/payroll/my-payslips
export const getMyPayslips = async (req, res) => {
  try {
    const payrolls = await prisma.payroll.findMany({
      where: { userId: req.user.id, status: { not: "CANCELLED" } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json(payrolls);
  } catch (err) {
    console.error("getMyPayslips error:", err);
    res.status(500).json({ message: "Failed to fetch payslips" });
  }
};
