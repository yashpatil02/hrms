import prisma from "../../prisma/client.js";

/* ============================================================
   TARGET RATES — single source of truth
   key → hours per 1 unit of count
============================================================ */
export const TARGET_RATES = {
  soccerStdSingle:      2.75,
  soccerStdDouble:      3,
  soccerAdvSingle:      6,
  soccerAdvDouble:      7.25,
  iceHockey20S1:        1.25,
  iceHockey20S2:        0.75,
  iceHockey20Event:     1,
  iceHockey17S1:        1,
  iceHockey17S2:        0.66,
  iceHockey17Event:     0.91,
  iceHockey15S1:        0.75,
  iceHockey15S2:        0.57,
  iceHockey15Event:     0.84,
  liveSoccer:           2.5,
  liveFutsal:           2,
  liveVolleyball:       2.5,
  liveBasketball:       2,
  liveHandball:         3,
  basketballS1:         0.5,
  basketballS2:         0.5,
  basketballEvent:      0.84,
  fieldHockeyStdSingle: 2.25,
  fieldHockeyStdDouble: 2.5,
  event:                1,
};

const calcTotal = (counts = {}) =>
  parseFloat(
    Object.entries(counts)
      .reduce((sum, [key, val]) => sum + (TARGET_RATES[key] || 0) * (Number(val) || 0), 0)
      .toFixed(2)
  );

/* ============================================================
   SAVE / UPDATE TARGET  —  POST /api/targets
   Body: { date, counts, notes? }
============================================================ */
export const saveTarget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, counts, notes } = req.body;

    if (!date || !counts || typeof counts !== "object")
      return res.status(400).json({ msg: "date and counts are required" });

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const totalHours = calcTotal(counts);

    const record = await prisma.dailyTarget.upsert({
      where:  { userId_date: { userId, date: day } },
      update: { counts, totalHours, notes: notes || null },
      create: { userId, date: day, counts, totalHours, notes: notes || null },
    });

    res.json({ msg: "Target saved", record });
  } catch (err) {
    console.error("saveTarget:", err);
    res.status(500).json({ msg: "Failed to save target" });
  }
};

/* ============================================================
   GET MY TARGETS  —  GET /api/targets/my?month=&year=
============================================================ */
export const getMyTargets = async (req, res) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    const month  = parseInt(req.query.month) || now.getMonth() + 1;
    const year   = parseInt(req.query.year)  || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const records = await prisma.dailyTarget.findMany({
      where:   { userId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    res.json(records.map(r => ({
      id:         r.id,
      date:       r.date.toISOString().split("T")[0],
      counts:     r.counts,
      totalHours: r.totalHours,
      notes:      r.notes,
    })));
  } catch (err) {
    console.error("getMyTargets:", err);
    res.status(500).json({ msg: "Failed to fetch targets" });
  }
};

/* ============================================================
   GET ALL TARGETS  —  GET /api/targets/all?date=&department=
   Admin / HR / Manager
============================================================ */
export const getAllTargets = async (req, res) => {
  try {
    const { date, department } = req.query;
    const now = new Date();

    const day = date ? new Date(date) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

    /* MANAGER scoped to their dept */
    const deptFilter =
      req.user.role === "MANAGER" && req.user.department
        ? req.user.department
        : department || null;

    const userWhere = { role: "EMPLOYEE" };
    if (deptFilter) userWhere.department = deptFilter;

    const [users, targets] = await Promise.all([
      prisma.user.findMany({
        where:   userWhere,
        select:  { id: true, name: true, email: true, department: true, designation: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailyTarget.findMany({
        where:   { date: { gte: day, lte: dayEnd } },
        select:  { userId: true, counts: true, totalHours: true, notes: true },
      }),
    ]);

    const targetMap = {};
    targets.forEach(t => { targetMap[t.userId] = t; });

    res.json(users.map(u => ({
      userId:     u.id,
      name:       u.name,
      email:      u.email,
      department: u.department,
      designation:u.designation,
      counts:     targetMap[u.id]?.counts     || null,
      totalHours: targetMap[u.id]?.totalHours ?? null,
      notes:      targetMap[u.id]?.notes      || null,
      submitted:  !!targetMap[u.id],
    })));
  } catch (err) {
    console.error("getAllTargets:", err);
    res.status(500).json({ msg: "Failed to fetch all targets" });
  }
};

/* ============================================================
   GET MONTHLY SUMMARY  —  GET /api/targets/summary?month=&year=&userId=
   Admin / HR / Manager — shows each employee's total per day
============================================================ */
export const getMonthlySummary = async (req, res) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const deptFilter =
      req.user.role === "MANAGER" && req.user.department
        ? req.user.department
        : req.query.department || null;

    const userWhere = { role: "EMPLOYEE" };
    if (deptFilter) userWhere.department = deptFilter;

    const [users, targets] = await Promise.all([
      prisma.user.findMany({
        where:   userWhere,
        select:  { id: true, name: true, department: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailyTarget.findMany({
        where:   { date: { gte: start, lte: end } },
        select:  { userId: true, date: true, totalHours: true, counts: true },
        orderBy: { date: "asc" },
      }),
    ]);

    const byUser = {};
    targets.forEach(t => {
      if (!byUser[t.userId]) byUser[t.userId] = [];
      byUser[t.userId].push({
        date:       t.date.toISOString().split("T")[0],
        totalHours: t.totalHours,
        counts:     t.counts,
      });
    });

    res.json(users.map(u => ({
      userId:     u.id,
      name:       u.name,
      department: u.department,
      targets:    byUser[u.id] || [],
      totalHours: (byUser[u.id] || []).reduce((s, d) => s + d.totalHours, 0).toFixed(2),
    })));
  } catch (err) {
    console.error("getMonthlySummary:", err);
    res.status(500).json({ msg: "Failed to fetch summary" });
  }
};
