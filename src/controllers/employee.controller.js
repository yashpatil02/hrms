import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 📅 Attendance Calendar (month view)
 */
export const getEmployeeAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year) {
      return res.status(400).json({
        msg: "month and year are required",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendance = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        dayType: true,
        checkIn: true,
        checkOut: true,
      },
      orderBy: { date: "asc" },
    });

    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: "Failed to fetch attendance",
    });
  }
};

/**
 * 📊 Monthly Attendance Summary
 * ✅ ABSENT only if explicitly marked
 */
export const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year) {
      return res.status(400).json({
        msg: "month and year are required",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: { dayType: true },
    });

    let present = 0;
    let half = 0;
    let absent = 0;

    records.forEach((r) => {
      if (r.dayType === "FULL") present++;
      else if (r.dayType === "HALF") half++;
      else if (r.dayType === "ABSENT") absent++;
    });

    res.json({
      present,
      half,
      absent,
      totalMarkedDays: records.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: "Failed to fetch attendance summary",
    });
  }
};

/**
 * 👤 Employee Dashboard API
 * ✅ NO AUTO ABSENT
 */
export const getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    let { month, year } = req.query;
    const now = new Date();

    month = Number(month) || now.getMonth() + 1;
    year = Number(year) || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // ---------------- TODAY STATUS ----------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await prisma.attendance.findFirst({
      where: { userId, date: today },
    });

    // ---------------- MONTHLY ATTENDANCE ----------------
    const attendanceList = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    // ---------------- MONTHLY SUMMARY ----------------
    let present = 0;
    let half = 0;
    let absent = 0;

    attendanceList.forEach((a) => {
      if (a.dayType === "FULL") present++;
      else if (a.dayType === "HALF") half++;
      else if (a.dayType === "ABSENT") absent++;
    });

    // ---------------- LEAVES ----------------
    const pendingLeaves = await prisma.leave.count({
      where: { userId, status: "PENDING" },
    });

    const totalLeaves = await prisma.leave.count({
      where: { userId, status: "APPROVED" },
    });

    res.json({
      todayStatus: todayAttendance?.dayType || "NOT_MARKED",
      pendingLeaves,
      totalLeaves,
      monthlyAttendance: attendanceList,
      monthlySummary: {
        present,
        half,
        absent,
      },
    });
  } catch (err) {
    console.error("Employee dashboard error:", err);
    res.status(500).json({
      msg: "Employee dashboard failed",
    });
  }
};
