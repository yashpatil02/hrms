import prisma from "../../prisma/client.js";

/* ============================================================
   HELPER — safe date
============================================================ */
const safeDate = (dateStr) => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  if (diff <= 0) return null;
  return parseFloat((diff / 60).toFixed(2));
};

/* ============================================================
   GET ALL USERS WITH ATTENDANCE SUMMARY
   GET /admin/attendance-report
   Returns paginated user list + this-month summary per user
============================================================ */
export const getAttendanceReport = async (req, res) => {
  try {
    const {
      search, role, department,
      page = 1, limit = 50,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    /* user filter */
    const userWhere = {};
    if (role && role !== "ALL")           userWhere.role       = role;
    if (department && department !== "ALL") userWhere.department = department;
    if (search?.trim()) {
      userWhere.OR = [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        orderBy: { name: "asc" },
        skip,
        take: Number(limit),
        select: {
          id: true, name: true, email: true,
          role: true, department: true, weeklyOff: true,
        },
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    if (!users.length) {
      return res.json({ data: [], total: 0, page: Number(page), totalPages: 0 });
    }

    /* fetch this-month attendance for all users in one query */
    const userIds = users.map(u => u.id);
    const monthAttendance = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { userId: true, dayType: true, checkIn: true, checkOut: true },
    });

    /* build summary per user */
    const summaryMap = {};
    monthAttendance.forEach(a => {
      if (!summaryMap[a.userId]) {
        summaryMap[a.userId] = {
          full: 0, half: 0, absent: 0, weekoff: 0,
          weekoffPresent: 0, paidLeave: 0, paidHoliday: 0,
          totalHours: 0, recordCount: 0,
        };
      }
      const s = summaryMap[a.userId];
      s.recordCount++;
      if (a.dayType === "FULL")           s.full++;
      if (a.dayType === "HALF")           s.half++;
      if (a.dayType === "ABSENT")         s.absent++;
      if (a.dayType === "WEEKOFF")        s.weekoff++;
      if (a.dayType === "WEEKOFF_PRESENT") s.weekoffPresent++;
      if (a.dayType === "PAID_LEAVE")     s.paidLeave++;
      if (a.dayType === "PAID_HOLIDAY")   s.paidHoliday++;
      const h = calcHours(a.checkIn, a.checkOut);
      if (h) s.totalHours += h;
    });

    const data = users.map(u => ({
      ...u,
      thisMonth: summaryMap[u.id] || {
        full: 0, half: 0, absent: 0, weekoff: 0,
        weekoffPresent: 0, paidLeave: 0, paidHoliday: 0,
        totalHours: 0, recordCount: 0,
      },
    }));

    res.json({
      data,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });

  } catch (err) {
    console.error("getAttendanceReport error:", err);
    res.status(500).json({ msg: "Failed to fetch attendance report" });
  }
};

/* ============================================================
   GET SINGLE USER ATTENDANCE DETAIL
   GET /admin/attendance-report/:userId
   ?fromDate=&toDate=&dayType=&page=&limit=
============================================================ */
export const getUserAttendanceDetail = async (req, res) => {
  try {
    const userId   = parseInt(req.params.userId);
    const { fromDate, toDate, dayType, page = 1, limit = 31 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    /* user info */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true,
        role: true, department: true, weeklyOff: true, weekoffBalance: true,
      },
    });
    if (!user) return res.status(404).json({ msg: "User not found" });

    /* attendance filter */
    const where = { userId };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = safeDate(fromDate);
      if (toDate)   where.date.lte = new Date(new Date(toDate).setHours(23,59,59,999));
    }
    if (dayType && dayType !== "ALL") where.dayType = dayType;

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.attendance.count({ where }),
    ]);

    /* summary across all records in range (no pagination for summary) */
    const allInRange = await prisma.attendance.findMany({
      where: { ...where, dayType: undefined }, // remove dayType filter for summary
      select: { dayType: true, checkIn: true, checkOut: true },
    });

    const summary = {
      full: 0, half: 0, absent: 0, weekoff: 0,
      weekoffPresent: 0, paidLeave: 0, paidHoliday: 0,
      totalHours: 0, totalRecords: allInRange.length,
    };
    allInRange.forEach(a => {
      if (a.dayType === "FULL")            summary.full++;
      if (a.dayType === "HALF")            summary.half++;
      if (a.dayType === "ABSENT")          summary.absent++;
      if (a.dayType === "WEEKOFF")         summary.weekoff++;
      if (a.dayType === "WEEKOFF_PRESENT") summary.weekoffPresent++;
      if (a.dayType === "PAID_LEAVE")      summary.paidLeave++;
      if (a.dayType === "PAID_HOLIDAY")    summary.paidHoliday++;
      const h = calcHours(a.checkIn, a.checkOut);
      if (h) summary.totalHours += h;
    });
    summary.totalHours = parseFloat(summary.totalHours.toFixed(2));

    /* format records */
    const formatted = records.map(r => ({
      id:        r.id,
      date:      r.date.toISOString().split("T")[0],
      checkIn:   r.checkIn  || null,
      checkOut:  r.checkOut || null,
      dayType:   r.dayType,
      totalHours: calcHours(r.checkIn, r.checkOut),
    }));

    res.json({
      user,
      records: formatted,
      summary,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });

  } catch (err) {
    console.error("getUserAttendanceDetail error:", err);
    res.status(500).json({ msg: "Failed to fetch user attendance" });
  }
};

/* ============================================================
   GET OVERALL STATS (for dashboard cards on the report page)
   GET /admin/attendance-overview
============================================================ */
export const getAttendanceOverview = async (req, res) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);

    const [
      totalUsers,
      todayRecords,
      monthRecords,
      pendingLeaves,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.attendance.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { dayType: true },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { dayType: true, checkIn: true, checkOut: true },
      }),
      prisma.leave.count({ where: { status: "PENDING" } }),
    ]);

    /* today */
    const presentToday = todayRecords.filter(a =>
      ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)
    ).length;
    const absentToday  = todayRecords.filter(a => a.dayType === "ABSENT").length;
    const onLeaveToday = todayRecords.filter(a =>
      ["PAID_LEAVE","PAID_HOLIDAY"].includes(a.dayType)
    ).length;

    /* month rate */
    const presentMonth = monthRecords.filter(a =>
      ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)
    ).length;
    const workingDays  = totalUsers * 22;
    const attendanceRate = workingDays > 0
      ? Math.round((presentMonth / workingDays) * 100) : 0;

    /* avg hours (employees who have both checkIn+checkOut) */
    let totalH = 0, count = 0;
    monthRecords.forEach(a => {
      const h = calcHours(a.checkIn, a.checkOut);
      if (h) { totalH += h; count++; }
    });
    const avgHours = count > 0 ? parseFloat((totalH / count).toFixed(1)) : 0;

    res.json({
      totalUsers,
      presentToday, absentToday, onLeaveToday,
      attendanceRate, avgHours, pendingLeaves,
    });

  } catch (err) {
    console.error("getAttendanceOverview error:", err);
    res.status(500).json({ msg: "Failed to fetch overview" });
  }
};