import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardStats = async (req, res) => {
  try {
    /* ======================
       BASIC COUNTS
    ====================== */
    const totalUsers = await prisma.user.count();
    const totalEmployees = await prisma.user.count({
      where: { role: "EMPLOYEE" },
    });

    /* ======================
       DATE HELPERS
    ====================== */
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    /* ======================
       TODAY ATTENDANCE (EMPLOYEES)
    ====================== */
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: {
        dayType: true,
      },
    });

    const presentToday = todayAttendance.filter((a) =>
      ["FULL", "HALF", "WEEKOFF_PRESENT"].includes(a.dayType)
    ).length;

    const absentToday = todayAttendance.filter(
      (a) => a.dayType === "ABSENT"
    ).length;

    const onLeaveToday = todayAttendance.filter((a) =>
      ["PAID_LEAVE", "PAID_HOLIDAY"].includes(a.dayType)
    ).length;

    /* ======================
       MONTH RANGE
    ====================== */
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    /* ======================
       MONTHLY ATTENDANCE RATE
    ====================== */
    const monthAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        dayType: true,
      },
    });

    const presentDays = monthAttendance.filter((a) =>
      ["FULL", "HALF", "WEEKOFF_PRESENT"].includes(a.dayType)
    ).length;

    const workingDays = totalEmployees * 22; // assumption
    const attendanceRate =
      workingDays === 0
        ? 0
        : Math.round((presentDays / workingDays) * 100);

    /* ======================
       LEAVES
    ====================== */
    const pendingLeaves = await prisma.leave.count({
      where: { status: "PENDING" },
    });

    /* ======================
       LEAVE TREND (LAST 6 MONTHS)
    ====================== */
    const leaveTrend = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59
      );

      const count = await prisma.leave.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      });

      leaveTrend.push({
        month: start.toLocaleString("default", {
          month: "short",
        }),
        count,
      });
    }

    /* ======================
       ATTENDANCE TREND (LAST 7 DAYS)
    ====================== */
    const attendanceTrend = [];

    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now);
      dStart.setDate(now.getDate() - i);
      dStart.setHours(0, 0, 0, 0);

      const dEnd = new Date(dStart);
      dEnd.setHours(23, 59, 59, 999);

      const dayRecords = await prisma.attendance.findMany({
        where: {
          date: {
            gte: dStart,
            lte: dEnd,
          },
        },
        select: { dayType: true },
      });

      const present = dayRecords.filter((a) =>
        ["FULL", "HALF", "WEEKOFF_PRESENT"].includes(a.dayType)
      ).length;

      const rate =
        totalEmployees === 0
          ? 0
          : Math.round(
              (present / totalEmployees) * 100
            );

      attendanceTrend.push({
        day: dStart.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
        rate,
      });
    }

    /* ======================
       ALERTS
    ====================== */
    const alerts = [];
    if (attendanceRate < 70) {
      alerts.push(
        "Overall attendance rate is below 70%"
      );
    }
    if (pendingLeaves > 5) {
      alerts.push(
        "High number of pending leave requests"
      );
    }

    /* ======================
       RESPONSE
    ====================== */
    res.json({
      totalUsers,
      totalEmployees,
      pendingLeaves,

      attendanceRate,
      attendanceChange: 0,

      today: {
        present: presentToday,
        absent: absentToday,
        late: 0,
        onLeave: onLeaveToday,
      },

      attendanceTrend,
      leaveTrend,
      leaveTypes: [],
      alerts,
    });
  } catch (error) {
    console.error("❌ DASHBOARD ERROR:", error);
    res.status(500).json({
      msg: "Dashboard stats failed",
    });
  }
};
