import prisma from "../../prisma/client.js";

// GET /api/analytics/overview
export const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Today UTC noon range (matches how attendance is stored)
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
    const todayEnd   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));

    const [
      totalEmployees, newThisMonth, newLastMonth,
      pendingLeaves, approvedLeavesThisMonth,
      presentToday, absentToday,
      totalPayroll,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: prevStart,  lte: prevEnd  } } }),
      prisma.leave.count({ where: { status: "PENDING" } }),
      prisma.leave.count({ where: { status: "APPROVED", fromDate: { gte: monthStart, lte: monthEnd } } }),
      prisma.attendance.count({ where: { date: { gte: todayStart, lte: todayEnd }, dayType: { in: ["FULL","HALF","WEEKOFF_PRESENT"] } } }),
      prisma.attendance.count({ where: { date: { gte: todayStart, lte: todayEnd }, dayType: "ABSENT" } }),
      prisma.payroll.aggregate({
        where: { month: now.getMonth() + 1, year: now.getFullYear(), status: { not: "CANCELLED" } },
        _sum: { netSalary: true },
      }),
    ]);

    res.json({
      totalEmployees, newThisMonth, newLastMonth,
      pendingLeaves, approvedLeavesThisMonth,
      presentToday, absentToday,
      totalPayrollThisMonth: totalPayroll._sum.netSalary || 0,
    });
  } catch (err) {
    console.error("getOverview error:", err);
    res.status(500).json({ message: "Failed to fetch overview" });
  }
};

// GET /api/analytics/department-stats
export const getDepartmentStats = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("getDepartmentStats error:", err);
    res.status(500).json({ message: "Failed to fetch department stats" });
  }
};

// GET /api/analytics/attendance-trend?months=6
// ✅ Fixed N+1: single query per status grouped by month
export const getAttendanceTrend = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const now = new Date();

    // Compute date range
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - months + 1, 1));
    const endDate   = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    // ✅ Single query — fetch all attendance records in range
    const records = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true, dayType: true },
    });

    // Build month buckets
    const buckets = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = {
        month: d.toLocaleString("default", { month: "short" }),
        year:  d.getFullYear(),
        present: 0, absent: 0, leave: 0,
      };
    }

    // Aggregate
    for (const r of records) {
      const d = new Date(r.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) continue;
      if (["FULL","HALF","WEEKOFF_PRESENT"].includes(r.dayType)) buckets[key].present++;
      else if (r.dayType === "ABSENT")     buckets[key].absent++;
      else if (r.dayType === "PAID_LEAVE") buckets[key].leave++;
    }

    res.json(Object.values(buckets));
  } catch (err) {
    console.error("getAttendanceTrend error:", err);
    res.status(500).json({ message: "Failed to fetch attendance trend" });
  }
};

// GET /api/analytics/leave-stats
export const getLeaveStats = async (req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // ✅ Single query for all leaves this year
    const allLeaves = await prisma.leave.findMany({
      where: { createdAt: { gte: yearStart, lte: yearEnd } },
      select: { status: true, createdAt: true },
    });

    // By status
    const statusMap = {};
    const monthMap  = {};

    for (const l of allLeaves) {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
      const m = new Date(l.createdAt).getMonth();
      monthMap[m] = (monthMap[m] || 0) + 1;
    }

    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const monthly = Array.from({ length: now.getMonth() + 1 }, (_, m) => ({
      month: new Date(now.getFullYear(), m, 1).toLocaleString("default", { month: "short" }),
      count: monthMap[m] || 0,
    }));

    res.json({ byStatus, monthly });
  } catch (err) {
    console.error("getLeaveStats error:", err);
    res.status(500).json({ message: "Failed to fetch leave stats" });
  }
};

// GET /api/analytics/payroll-trend?months=6
// ✅ Fixed N+1: single query, aggregate in JS
export const getPayrollTrend = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const now = new Date();

    const startMonth = now.getMonth() - months + 1;
    const startYear  = now.getFullYear() + Math.floor(startMonth / 12);
    const adjStart   = ((startMonth % 12) + 12) % 12 + 1;

    // ✅ Single query
    const records = await prisma.payroll.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: Array.from({ length: months }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          return { month: d.getMonth() + 1, year: d.getFullYear() };
        }),
      },
      select: { month: true, year: true, grossSalary: true, totalDeductions: true, netSalary: true },
    });

    // Build month buckets
    const result = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return { month: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth()+1}`, gross: 0, deductions: 0, net: 0, employees: 0 };
    });

    for (const r of records) {
      const bucket = result.find((b) => b.key === `${r.year}-${r.month}`);
      if (!bucket) continue;
      bucket.gross      += r.grossSalary      || 0;
      bucket.deductions += r.totalDeductions  || 0;
      bucket.net        += r.netSalary        || 0;
      bucket.employees  += 1;
    }

    result.forEach((r) => { delete r.key; });
    res.json(result);
  } catch (err) {
    console.error("getPayrollTrend error:", err);
    res.status(500).json({ message: "Failed to fetch payroll trend" });
  }
};

// GET /api/analytics/headcount-trend?months=6
export const getHeadcountTrend = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const now = new Date();

    const result = await Promise.all(
      Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i) + 1, 0, 23, 59, 59);
        return prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { lte: d } } })
          .then((count) => ({
            month: new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1).toLocaleString("default", { month: "short" }),
            year:  d.getFullYear(),
            count,
          }));
      })
    );

    res.json(result);
  } catch (err) {
    console.error("getHeadcountTrend error:", err);
    res.status(500).json({ message: "Failed to fetch headcount trend" });
  }
};

// GET /api/analytics/top-absentees?month=&year=&limit=10
export const getTopAbsentees = async (req, res) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const grouped = await prisma.attendance.groupBy({
      by: ["userId"],
      where: { date: { gte: start, lte: end }, dayType: "ABSENT" },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) return res.json([]);

    const userIds = grouped.map((g) => g.userId);
    const users   = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, department: true, designation: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json(grouped.map((g) => ({
      ...userMap[g.userId],
      absentDays: g._count.userId,
    })));
  } catch (err) {
    console.error("getTopAbsentees error:", err);
    res.status(500).json({ message: "Failed to fetch absentees" });
  }
};
