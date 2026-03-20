import prisma from "../../prisma/client.js";
import { createNotification } from "../utils/createNotification.js";

/* ============================================================
   HELPER — safe date (no timezone shift)
============================================================ */
const safeDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

/* ============================================================
   GET DAILY SHIFT ATTENDANCE
   GET /admin/shift-attendance-report?date=&shift=&department=
============================================================ */
export const getShiftAttendanceByDateAndShift = async (req, res) => {
  try {
    const { date, shift, department } = req.query;

    if (!date || !shift) {
      return res.status(400).json({ msg: "Date and shift are required" });
    }

    const selectedDate = safeDate(date);

    /* ── analysts in this shift (active only) ── */
    const analystWhere = { shift, isActive: true };
    if (department) analystWhere.department = department;

    const analysts = await prisma.analyst.findMany({
      where: analystWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true, department: true, shift: true },
    });

    /* ── existing attendance records for this date+shift ── */
    const existing = await prisma.shiftAttendance.findMany({
      where: {
        date: selectedDate,
        shift,
        analystId: { in: analysts.map(a => a.id) },
      },
      select: { analystId: true, status: true, id: true, createdAt: true },
    });

    const existingMap = {};
    existing.forEach(r => { existingMap[r.analystId] = r; });

    /* ── merge analysts + their attendance ── */
    const result = analysts.map(a => ({
      analystId:   a.id,
      name:        a.name,
      department:  a.department,
      shift:       a.shift,
      status:      existingMap[a.id]?.status  || null,
      attendanceId: existingMap[a.id]?.id     || null,
      savedAt:     existingMap[a.id]?.createdAt || null,
      isMarked:    !!existingMap[a.id],
    }));

    /* ── summary counts ── */
    const summary = {
      total:      result.length,
      marked:     result.filter(r => r.isMarked).length,
      unmarked:   result.filter(r => !r.isMarked).length,
      present:    result.filter(r => r.status === "PRESENT").length,
      absent:     result.filter(r => r.status === "ABSENT").length,
      halfDay:    result.filter(r => r.status === "HALF_DAY").length,
      paidLeave:  result.filter(r => r.status === "PAID_LEAVE").length,
    };

    res.json({ analysts: result, summary });

  } catch (err) {
    console.error("getShiftAttendanceByDateAndShift error:", err);
    res.status(500).json({ msg: "Failed to load shift attendance" });
  }
};

/* ============================================================
   SAVE / UPDATE SHIFT ATTENDANCE
   POST /admin/attendance-by-shift
   Body: { date, shift, records: [{ analystId, status }] }
============================================================ */
export const saveShiftAttendance = async (req, res) => {
  try {
    const { date, shift, records } = req.body;
    const adminId = req.user.id;

    if (!date || !shift || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ msg: "date, shift and records are required" });
    }

    /* validate statuses */
    const VALID = ["PRESENT", "ABSENT", "HALF_DAY", "PAID_LEAVE"];
    for (const r of records) {
      if (!VALID.includes(r.status)) {
        return res.status(400).json({ msg: `Invalid status: ${r.status}` });
      }
    }

    const attendanceDate = safeDate(date);
    const analystIds     = records.map(r => Number(r.analystId));

    /* ── fetch ALL existing records in one query (fix N+1) ── */
    const existingRecords = await prisma.shiftAttendance.findMany({
      where: {
        analystId: { in: analystIds },
        date:      attendanceDate,
      },
      select: { id: true, analystId: true, status: true },
    });

    const existingMap = {};
    existingRecords.forEach(r => { existingMap[r.analystId] = r; });

    /* ── build create + update lists ── */
    const toCreate  = [];
    const toUpdate  = [];
    const auditLogs = [];

    for (const r of records) {
      const id       = Number(r.analystId);
      const existing = existingMap[id];

      if (!existing) {
        /* NEW record */
        toCreate.push({ analystId: id, date: attendanceDate, shift, status: r.status });
        auditLogs.push({
          adminId, analystId: id, date: attendanceDate,
          shift, newStatus: r.status, action: "CREATE",
        });
      } else if (existing.status !== r.status) {
        /* CHANGED record */
        toUpdate.push({ id: existing.id, status: r.status });
        auditLogs.push({
          adminId, analystId: id, date: attendanceDate,
          shift, oldStatus: existing.status, newStatus: r.status, action: "UPDATE",
        });
      }
      /* unchanged — skip */
    }

    if (toCreate.length === 0 && toUpdate.length === 0) {
      return res.json({ msg: "No changes detected", created: 0, updated: 0 });
    }

    /* ── run everything in one transaction ── */
    await prisma.$transaction([
      /* bulk create new records */
      ...(toCreate.length > 0
        ? [prisma.shiftAttendance.createMany({ data: toCreate, skipDuplicates: true })]
        : []),

      /* individual updates (Prisma doesn't support bulk updateMany with different data) */
      ...toUpdate.map(u =>
        prisma.shiftAttendance.update({
          where: { id: u.id },
          data:  { status: u.status },
        })
      ),

      /* audit logs */
      prisma.attendanceAudit.createMany({ data: auditLogs }),
    ]);

    /* ── notification to admins ── */
    const dateLabel = attendanceDate.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

    await createNotification({
      userId:      null,
      title:       `Attendance Saved — ${shift} shift`,
      message:     `${req.user.name} saved attendance for ${records.length} analysts (${shift} shift, ${dateLabel}). ${toCreate.length} new, ${toUpdate.length} updated.`,
      type:        "SUCCESS",
      entity:      "ATTENDANCE",
      socketEvent: "attendance:marked",
    });

    res.json({
      msg:     "Attendance saved successfully",
      created: toCreate.length,
      updated: toUpdate.length,
      total:   toCreate.length + toUpdate.length,
    });

  } catch (err) {
    console.error("saveShiftAttendance error:", err);
    res.status(500).json({ msg: "Failed to save attendance" });
  }
};

/* ============================================================
   GET MONTHLY SHIFT ATTENDANCE MATRIX
   GET /admin/monthly-shift-attendance?month=&year=&department=&shift=
============================================================ */
export const getMonthlyShiftAttendance = async (req, res) => {
  try {
    const { month, year, department, shift } = req.query;

    if (!month || !year) {
      return res.status(400).json({ msg: "Month and year are required" });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate   = new Date(Number(year), Number(month), 0, 23, 59, 59);

    const analystWhere = { isActive: true };
    if (department) analystWhere.department = department;
    if (shift)      analystWhere.shift      = shift;

    const analysts = await prisma.analyst.findMany({
      where: analystWhere,
      include: {
        shiftAttendances: {
          where: { date: { gte: startDate, lte: endDate } },
          select: { date: true, status: true },
        },
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    const SHORT = { PRESENT:"P", ABSENT:"A", HALF_DAY:"H", PAID_LEAVE:"PL" };

    const response = analysts.map(a => {
      const attendanceMap = {};
      let presentCount = 0, absentCount = 0, halfCount = 0, leaveCount = 0;

      a.shiftAttendances.forEach(att => {
        const day = new Date(att.date).getDate();
        attendanceMap[day] = SHORT[att.status] || att.status;
        if (att.status === "PRESENT")    presentCount++;
        if (att.status === "ABSENT")     absentCount++;
        if (att.status === "HALF_DAY")   halfCount++;
        if (att.status === "PAID_LEAVE") leaveCount++;
      });

      return {
        analystId:    a.id,
        name:         a.name,
        department:   a.department,
        shift:        a.shift,
        attendance:   attendanceMap,
        summary: {
          present:    presentCount,
          absent:     absentCount,
          halfDay:    halfCount,
          paidLeave:  leaveCount,
          total:      a.shiftAttendances.length,
        },
      };
    });

    res.json(response);

  } catch (err) {
    console.error("getMonthlyShiftAttendance error:", err);
    res.status(500).json({ msg: "Failed to load monthly attendance" });
  }
};

/* ============================================================
   GET ATTENDANCE AUDIT LOGS (paginated)
   GET /admin/attendance-audit?page=&limit=&action=&fromDate=&toDate=&search=&shift=
============================================================ */
export const getAttendanceAudit = async (req, res) => {
  try {
    const {
      action, fromDate, toDate, search, shift,
      page = 1, limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    if (action && action !== "ALL")   where.action = action;
    if (shift  && shift  !== "ALL")   where.shift  = shift;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate)   where.createdAt.lte = new Date(new Date(toDate).setHours(23,59,59,999));
    }

    if (search) {
      where.OR = [
        { analyst: { name: { contains: search, mode: "insensitive" } } },
        { admin:   { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.attendanceAudit.findMany({
        where,
        include: {
          analyst: { select: { name: true, department: true } },
          admin:   { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.attendanceAudit.count({ where }),
    ]);

    res.json({
      data:       logs,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });

  } catch (err) {
    console.error("getAttendanceAudit error:", err);
    res.status(500).json({ msg: "Failed to fetch audit logs" });
  }
};

/* ============================================================
   GET DAILY SUMMARY ACROSS ALL SHIFTS
   GET /admin/daily-summary?date=
============================================================ */
export const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date is required" });

    const selectedDate = safeDate(date);

    const [totalAnalysts, records] = await Promise.all([
      prisma.analyst.count({ where: { isActive: true } }),
      prisma.shiftAttendance.findMany({
        where: { date: selectedDate },
        select: { status: true, shift: true, analystId: true },
      }),
    ]);

    /* overall counts */
    const overall = { present:0, absent:0, halfDay:0, paidLeave:0, unmarked:0 };
    records.forEach(r => {
      if (r.status === "PRESENT")    overall.present++;
      if (r.status === "ABSENT")     overall.absent++;
      if (r.status === "HALF_DAY")   overall.halfDay++;
      if (r.status === "PAID_LEAVE") overall.paidLeave++;
    });
    overall.unmarked = totalAnalysts - records.length;

    /* per-shift breakdown */
    const shifts = ["MORNING","AFTERNOON","GENERAL","EVENING","NIGHT"];
    const byShift = {};

    for (const s of shifts) {
      const shiftAnalysts = await prisma.analyst.count({
        where: { shift: s, isActive: true },
      });
      const shiftRecords = records.filter(r => r.shift === s);
      byShift[s] = {
        total:     shiftAnalysts,
        marked:    shiftRecords.length,
        unmarked:  shiftAnalysts - shiftRecords.length,
        present:   shiftRecords.filter(r => r.status === "PRESENT").length,
        absent:    shiftRecords.filter(r => r.status === "ABSENT").length,
        halfDay:   shiftRecords.filter(r => r.status === "HALF_DAY").length,
        paidLeave: shiftRecords.filter(r => r.status === "PAID_LEAVE").length,
      };
    }

    res.json({
      date:     date,
      total:    totalAnalysts,
      marked:   records.length,
      overall,
      byShift,
    });

  } catch (err) {
    console.error("getDailySummary error:", err);
    res.status(500).json({ msg: "Failed to get daily summary" });
  }
};