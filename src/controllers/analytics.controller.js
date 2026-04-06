import prisma from "../../prisma/client.js";

// GET /api/analytics/overview
export const getOverview = async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalEmployees, newThisMonth, newLastMonth,
    pendingLeaves, approvedLeavesThisMonth,
    presentToday, absentToday,
    totalPayroll,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: prevStart, lte: prevEnd } } }),
    prisma.leave.count({ where: { status: "PENDING" } }),
    prisma.leave.count({ where: { status: "APPROVED", fromDate: { gte: monthStart, lte: monthEnd } } }),
    prisma.attendance.count({
      where: {
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) },
        dayType: { in: ["FULL", "HALF", "WEEKOFF_PRESENT"] },
      },
    }),
    prisma.attendance.count({
      where: {
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) },
        dayType: "ABSENT",
      },
    }),
    prisma.payroll.aggregate({
      where: { month: now.getMonth() + 1, year: now.getFullYear(), status: { not: "CANCELLED" } },
      _sum: { netSalary: true },
    }),
  ]);

  res.json({
    totalEmployees,
    newThisMonth,
    newLastMonth,
    pendingLeaves,
    approvedLeavesThisMonth,
    presentToday,
    absentToday,
    totalPayrollThisMonth: totalPayroll._sum.netSalary || 0,
  });
};

// GET /api/analytics/department-stats
export const getDepartmentStats = async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { department: true },
  });

  const map = {};
  for (const u of users) {
    const dept = u.department || "Unassigned";
    map[dept] = (map[dept] || 0) + 1;
  }

  const data = Object.entries(map)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  res.json(data);
};

// GET /api/analytics/attendance-trend?months=6
export const getAttendanceTrend = async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 6, 12);
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [present, absent, leave] = await Promise.all([
      prisma.attendance.count({ where: { date: { gte: start, lte: end }, dayType: { in: ["FULL", "HALF", "WEEKOFF_PRESENT"] } } }),
      prisma.attendance.count({ where: { date: { gte: start, lte: end }, dayType: "ABSENT" } }),
      prisma.attendance.count({ where: { date: { gte: start, lte: end }, dayType: "PAID_LEAVE" } }),
    ]);

    result.push({
      month: d.toLocaleString("default", { month: "short" }),
      year: d.getFullYear(),
      present, absent, leave,
    });
  }

  res.json(result);
};

// GET /api/analytics/leave-stats
export const getLeaveStats = async (req, res) => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  const leaves = await prisma.leave.groupBy({
    by: ["status"],
    where: { createdAt: { gte: yearStart, lte: yearEnd } },
    _count: { status: true },
  });

  const monthly = [];
  for (let m = 0; m < now.getMonth() + 1; m++) {
    const start = new Date(now.getFullYear(), m, 1);
    const end   = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
    const count = await prisma.leave.count({ where: { createdAt: { gte: start, lte: end } } });
    monthly.push({
      month: new Date(now.getFullYear(), m, 1).toLocaleString("default", { month: "short" }),
      count,
    });
  }

  res.json({
    byStatus: leaves.map((l) => ({ status: l.status, count: l._count.status })),
    monthly,
  });
};

// GET /api/analytics/payroll-trend?months=6
export const getPayrollTrend = async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 6, 12);
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const agg = await prisma.payroll.aggregate({
      where: { month: d.getMonth() + 1, year: d.getFullYear(), status: { not: "CANCELLED" } },
      _sum: { grossSalary: true, totalDeductions: true, netSalary: true },
      _count: { id: true },
    });

    result.push({
      month: d.toLocaleString("default", { month: "short" }),
      year: d.getFullYear(),
      gross: agg._sum.grossSalary || 0,
      deductions: agg._sum.totalDeductions || 0,
      net: agg._sum.netSalary || 0,
      employees: agg._count.id,
    });
  }

  res.json(result);
};

// GET /api/analytics/headcount-trend?months=6
export const getHeadcountTrend = async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 6, 12);
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59); // end of that month
    const count = await prisma.user.count({
      where: { role: { not: "ADMIN" }, createdAt: { lte: d } },
    });
    result.push({
      month: new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString("default", { month: "short" }),
      year: d.getFullYear(),
      count,
    });
  }

  res.json(result);
};

// GET /api/analytics/top-absentees?month=&year=&limit=10
export const getTopAbsentees = async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year  = parseInt(req.query.year)  || now.getFullYear();
  const limit = parseInt(req.query.limit) || 10;

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);

  const grouped = await prisma.attendance.groupBy({
    by: ["userId"],
    where: { date: { gte: start, lte: end }, dayType: "ABSENT" },
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
    take: limit,
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, department: true, designation: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const result = grouped.map((g) => ({
    ...userMap[g.userId],
    absentDays: g._count.userId,
  }));

  res.json(result);
};
