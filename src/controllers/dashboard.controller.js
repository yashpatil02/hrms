import prisma from "../../prisma/client.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    /* ================================
       DATE HELPERS
    ================================ */
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);

    const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd      = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59);

    /* ================================
       BASIC COUNTS (parallel)
    ================================ */
    const [
      totalUsers, totalEmployees, totalAdmins, totalHR,
      totalAnalysts, terminatedAnalysts,
      pendingLeaves, approvedLeavesThisMonth, rejectedLeavesThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "HR" } }),
      prisma.analyst.count({ where: { isActive: true } }),
      prisma.analyst.count({ where: { isActive: false } }),
      prisma.leave.count({ where: { status: "PENDING" } }),
      prisma.leave.count({ where: { status: "APPROVED", createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.leave.count({ where: { status: "REJECTED", createdAt: { gte: monthStart, lte: monthEnd } } }),
    ]);

    /* ================================
       TODAY EMPLOYEE ATTENDANCE
    ================================ */
    const todayAttendance = await prisma.attendance.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      select: { dayType: true, userId: true },
    });

    const presentToday = todayAttendance.filter(a => ["FULL","WEEKOFF_PRESENT"].includes(a.dayType)).length;
    const halfDayToday = todayAttendance.filter(a => a.dayType === "HALF").length;
    const absentToday  = todayAttendance.filter(a => a.dayType === "ABSENT").length;
    const onLeaveToday = todayAttendance.filter(a => ["PAID_LEAVE","PAID_HOLIDAY"].includes(a.dayType)).length;

    /* ================================
       TODAY ANALYST SHIFT
    ================================ */
    const todayShift = await prisma.shiftAttendance.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      select: { status: true, shift: true },
    });

    const analystPresentToday = todayShift.filter(a => a.status === "PRESENT").length;
    const analystAbsentToday  = todayShift.filter(a => a.status === "ABSENT").length;
    const analystHalfToday    = todayShift.filter(a => a.status === "HALF_DAY").length;

    /* ================================
       ANALYST SHIFT DISTRIBUTION
    ================================ */
    const shiftCounts = await prisma.analyst.groupBy({
      by: ["shift"],
      where: { isActive: true },
      _count: { shift: true },
    });

    const shiftDistribution = shiftCounts.map(s => ({
      shift: s.shift,
      count: s._count.shift,
    }));

    /* ================================
       MONTHLY ATTENDANCE RATE
    ================================ */
    const monthAttendance = await prisma.attendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { dayType: true },
    });

    const presentDays    = monthAttendance.filter(a => ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)).length;
    const workingDays    = totalEmployees * 22;
    const attendanceRate = workingDays === 0 ? 0 : Math.round((presentDays / workingDays) * 100);

    /* Prev month rate for change % */
    const prevMonthAtt  = await prisma.attendance.findMany({
      where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { dayType: true },
    });
    const prevPresent    = prevMonthAtt.filter(a => ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)).length;
    const prevRate       = workingDays === 0 ? 0 : Math.round((prevPresent / workingDays) * 100);
    const attendanceChange = attendanceRate - prevRate;

    /* ================================
       LEAVE TYPES PIE
    ================================ */
    const leaveTypes = [
      { type: "Pending",  value: pendingLeaves },
      { type: "Approved", value: approvedLeavesThisMonth },
      { type: "Rejected", value: rejectedLeavesThisMonth },
    ].filter(l => l.value > 0);

    /* ================================
       LEAVE TREND — LAST 6 MONTHS
       Single bulk query instead of 6 separate queries
    ================================ */
    const trendStart = new Date(now.getFullYear(), now.getMonth()-5, 1);
    const trendEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
    const allTrendLeaves = await prisma.leave.findMany({
      where: { createdAt: { gte: trendStart, lte: trendEnd } },
      select: { createdAt: true },
    });

    const leaveTrendData = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth()-i+1, 0, 23,59,59,999);
      const count = allTrendLeaves.filter(l => l.createdAt >= start && l.createdAt <= end).length;
      leaveTrendData.push({ month: start.toLocaleString("en-IN",{ month:"short" }), count });
    }

    /* ================================
       COMBINED ATTENDANCE TREND — 7 DAYS
       2 bulk queries instead of 14 separate queries
    ================================ */
    const sevenDaysStart = new Date(now); sevenDaysStart.setDate(now.getDate()-6); sevenDaysStart.setHours(0,0,0,0);
    const sevenDaysEnd   = new Date(now); sevenDaysEnd.setHours(23,59,59,999);

    const [allEmpTrend, allAnaTrend] = await Promise.all([
      prisma.attendance.findMany({
        where: { date: { gte: sevenDaysStart, lte: sevenDaysEnd } },
        select: { dayType: true, date: true },
      }),
      prisma.shiftAttendance.findMany({
        where: { date: { gte: sevenDaysStart, lte: sevenDaysEnd } },
        select: { status: true, date: true },
      }),
    ]);

    const combinedTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now); dStart.setDate(now.getDate()-i); dStart.setHours(0,0,0,0);
      const dEnd   = new Date(dStart); dEnd.setHours(23,59,59,999);

      const empRecs = allEmpTrend.filter(a => a.date >= dStart && a.date <= dEnd);
      const anaRecs = allAnaTrend.filter(a => a.date >= dStart && a.date <= dEnd);

      const empPresent = empRecs.filter(a => ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)).length;
      const anaPresent = anaRecs.filter(a => a.status === "PRESENT").length;

      combinedTrend.push({
        day:      dStart.toLocaleDateString("en-IN", { weekday: "short" }),
        employee: totalEmployees === 0 ? 0 : Math.round((empPresent / totalEmployees) * 100),
        analyst:  totalAnalysts  === 0 ? 0 : Math.round((anaPresent  / totalAnalysts)  * 100),
      });
    }

    /* ================================
       ATTENDANCE HEATMAP — THIS MONTH
       1 bulk query instead of 30 separate queries
    ================================ */
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const todayDate   = now.getDate();

    /* reuse monthAttendance (already fetched above) but we need date field — fetch with date */
    const heatmapRecs = await prisma.attendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { dayType: true, date: true },
    });

    const heatmapData = [];
    for (let d = 1; d <= Math.min(todayDate, daysInMonth); d++) {
      const recs    = heatmapRecs.filter(a => new Date(a.date).getDate() === d);
      const present = recs.filter(a => ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)).length;
      const rate    = totalEmployees === 0 ? 0 : Math.round((present / totalEmployees) * 100);
      heatmapData.push({ day: d, rate, present, total: totalEmployees });
    }

    /* ================================
       TOP 5 ABSENT EMPLOYEES THIS MONTH
    ================================ */
    const monthAbsences = await prisma.attendance.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        dayType: "ABSENT",
      },
      select: { userId: true },
    });

    const absentCount = {};
    monthAbsences.forEach(a => {
      absentCount[a.userId] = (absentCount[a.userId] || 0) + 1;
    });

    const topAbsentIds = Object.entries(absentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => Number(id));

    const topAbsentUsers = topAbsentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topAbsentIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const topAbsentEmployees = topAbsentUsers.map(u => ({
      id:        u.id,
      name:      u.name,
      email:     u.email,
      absences:  absentCount[u.id] || 0,
    })).sort((a, b) => b.absences - a.absences);

    /* ================================
       RECENT 5 PENDING LEAVES
    ================================ */
    const recentLeavesList = await prisma.leave.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    });

    /* ================================
       RECENT ACTIVITY FEED (last 10)
    ================================ */
    const [recentAttendance, recentLeaveActivity] = await Promise.all([
      prisma.attendance.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
      prisma.leave.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
    ]);

    const activityFeed = [
      ...recentAttendance.map(a => ({
        type:    "attendance",
        message: `${a.user.name} marked ${a.dayType.toLowerCase().replace("_"," ")}`,
        time:    a.createdAt,
        color:   ["FULL","WEEKOFF_PRESENT"].includes(a.dayType) ? "green" : a.dayType === "ABSENT" ? "red" : "amber",
      })),
      ...recentLeaveActivity.map(l => ({
        type:    "leave",
        message: `${l.user.name} — leave ${l.status.toLowerCase()}`,
        time:    l.createdAt,
        color:   l.status === "APPROVED" ? "green" : l.status === "REJECTED" ? "red" : "amber",
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    /* ================================
       SMART ALERTS
    ================================ */
    const alerts = [];
    if (attendanceRate < 70)   alerts.push("Overall employee attendance rate is below 70%");
    if (pendingLeaves > 5)     alerts.push(`${pendingLeaves} leave requests are pending approval`);
    if (totalEmployees > 0 && absentToday > Math.floor(totalEmployees * 0.3))
      alerts.push("More than 30% employees are absent today");
    if (totalAnalysts > 0 && analystAbsentToday > Math.floor(totalAnalysts * 0.3))
      alerts.push("More than 30% analysts are absent today");

    /* ================================
       RESPONSE
    ================================ */
    res.json({
      totalUsers, totalEmployees, totalAdmins, totalHR,
      totalAnalysts, terminatedAnalysts,
      attendanceRate, attendanceChange,
      pendingLeaves, approvedLeavesThisMonth, rejectedLeavesThisMonth,

      today: { present: presentToday, halfDay: halfDayToday, absent: absentToday, onLeave: onLeaveToday },
      todayAnalysts: { present: analystPresentToday, absent: analystAbsentToday, halfDay: analystHalfToday },

      shiftDistribution,
      combinedTrend,
      leaveTrend:    leaveTrendData,
      leaveTypes,
      heatmapData,
      topAbsentEmployees,
      activityFeed,

      recentLeaves: recentLeavesList.map(l => ({
        id: l.id, name: l.user.name, email: l.user.email,
        reason: l.reason, fromDate: l.fromDate, toDate: l.toDate, appliedOn: l.createdAt,
      })),

      alerts,
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({ msg: "Dashboard stats failed" });
  }
};