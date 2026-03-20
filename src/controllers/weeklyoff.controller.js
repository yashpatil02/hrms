import prisma from "../../prisma/client.js";

const VALID_DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

/* ============================================================
   GET MY WEEKOFF INFO   GET /api/weekoff/me
============================================================ */
export const getMyWeekoffInfo = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        weeklyOff: true,
        weekoffBalance: true,
        name: true,
      },
    });

    if (!user) return res.status(404).json({ msg: "User not found" });

    /* weekoff attendance history — last 3 months */
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const weekoffHistory = await prisma.attendance.findMany({
      where: {
        userId: req.user.id,
        dayType: { in: ["WEEKOFF", "WEEKOFF_PRESENT", "PENDING_WEEKOFF"] },
        date: { gte: threeMonthsAgo },
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    /* comp-off used count (PENDING_WEEKOFF) */
    const compOffUsed = await prisma.attendance.count({
      where: { userId: req.user.id, dayType: "PENDING_WEEKOFF" },
    });

    /* total WO + Present earned */
    const totalEarned = await prisma.attendance.count({
      where: { userId: req.user.id, dayType: "WEEKOFF_PRESENT" },
    });

    res.json({
      weeklyOff:     user.weeklyOff,
      weekoffBalance: user.weekoffBalance,
      name:          user.name,
      compOffUsed,
      totalEarned,
      weekoffHistory: weekoffHistory.map(h => ({
        id:      h.id,
        date:    h.date.toISOString().split("T")[0],
        dayType: h.dayType,
        checkIn: h.checkIn,
        checkOut: h.checkOut,
      })),
    });
  } catch (err) {
    console.error("getMyWeekoffInfo:", err);
    res.status(500).json({ msg: "Failed to fetch weekoff info" });
  }
};

/* ============================================================
   UPDATE WEEKLY OFF DAY   PUT /api/weekoff/day
============================================================ */
export const updateWeeklyOffDay = async (req, res) => {
  try {
    const { weeklyOff } = req.body;

    if (!weeklyOff || !VALID_DAYS.includes(weeklyOff))
      return res.status(400).json({ msg: "Invalid day. Choose from MONDAY to SUNDAY" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { weeklyOff: true },
    });

    const isChange = user.weeklyOff && user.weeklyOff !== weeklyOff;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { weeklyOff },
    });

    res.json({
      msg: isChange
        ? `Weekly off changed from ${user.weeklyOff} to ${weeklyOff}`
        : `Weekly off set to ${weeklyOff}`,
      weeklyOff,
      previousDay: user.weeklyOff || null,
    });
  } catch (err) {
    console.error("updateWeeklyOffDay:", err);
    res.status(500).json({ msg: "Failed to update weekly off" });
  }
};

/* ============================================================
   USE COMP-OFF   POST /api/weekoff/use-compoff
   Marks a future/past date as PENDING_WEEKOFF (comp-off used)
   Deducts 1 from weekoffBalance
============================================================ */
export const useCompOff = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ msg: "Date is required" });

    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { weekoffBalance: true, name: true },
    });

    if (!user.weekoffBalance || user.weekoffBalance <= 0)
      return res.status(400).json({ msg: "No comp-off balance available" });

    const [y, m, d] = date.split("-").map(Number);
    const useDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

    /* check if already marked */
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: useDate } },
    });

    if (existing)
      return res.status(400).json({
        msg: `Attendance already marked as ${existing.dayType} on this date`,
      });

    /* create PENDING_WEEKOFF record */
    await prisma.attendance.create({
      data: { userId, date: useDate, dayType: "PENDING_WEEKOFF" },
    });

    /* deduct balance */
    await prisma.user.update({
      where: { id: userId },
      data: { weekoffBalance: { decrement: 1 } },
    });

    res.json({
      msg: `Comp-off applied for ${date}. Balance: ${user.weekoffBalance - 1} remaining`,
      newBalance: user.weekoffBalance - 1,
    });
  } catch (err) {
    console.error("useCompOff:", err);
    res.status(500).json({ msg: "Failed to apply comp-off" });
  }
};

/* ============================================================
   ADMIN — GET ALL USERS WEEKOFF   GET /api/weekoff/admin/all
============================================================ */
export const getAllUsersWeekoff = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true, name: true, email: true, role: true,
        weeklyOff: true, weekoffBalance: true,
      },
      orderBy: { name: "asc" },
    });

    /* group by weekoff day */
    const grouped = {};
    VALID_DAYS.forEach(d => { grouped[d] = []; });
    grouped["UNSET"] = [];

    users.forEach(u => {
      const key = u.weeklyOff || "UNSET";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(u);
    });

    res.json({ users, grouped });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch users weekoff" });
  }
};

/* ============================================================
   ADMIN — UPDATE USER'S WEEKOFF   PUT /api/weekoff/admin/:userId
============================================================ */
export const adminUpdateUserWeekoff = async (req, res) => {
  try {
    const { weeklyOff, weekoffBalance } = req.body;
    const userId = Number(req.params.userId);

    const data = {};
    if (weeklyOff !== undefined) {
      if (weeklyOff && !VALID_DAYS.includes(weeklyOff))
        return res.status(400).json({ msg: "Invalid day" });
      data.weeklyOff = weeklyOff || null;
    }
    if (weekoffBalance !== undefined) {
      const bal = Number(weekoffBalance);
      if (isNaN(bal) || bal < 0)
        return res.status(400).json({ msg: "Invalid balance" });
      data.weekoffBalance = bal;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, weeklyOff: true, weekoffBalance: true },
    });

    res.json({ msg: "Updated successfully", user: updated });
  } catch (err) {
    res.status(500).json({ msg: "Failed to update user weekoff" });
  }
};