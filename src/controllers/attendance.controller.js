import prisma from "../../prisma/client.js";
import { createNotification } from "../utils/createNotification.js";

const WEEK_DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

/* ============================================================
   HELPERS
============================================================ */

/* Get current IST time as HH:MM string */
const getISTTime = () => {
  const now = new Date();
  // IST = UTC + 5:30
  const istMs  = now.getTime() + (5*60 + 30)*60*1000;
  const istDate = new Date(istMs);
  const hh = String(istDate.getUTCHours()).padStart(2,"0");
  const mm = String(istDate.getUTCMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
};

/* Get today's date string in IST (YYYY-MM-DD) */
const getTodayIST = () => {
  const now    = new Date();
  const istMs  = now.getTime() + (5*60+30)*60*1000;
  return new Date(istMs).toISOString().split("T")[0];
};

const safeDate = (dateStr) => {
  // ✅ FIX: Use UTC noon to avoid timezone day-shift when Prisma converts to UTC
  // Local midnight IST (UTC+5:30) = UTC 18:30 prev day → wrong date stored
  // UTC noon is safe — will never shift to prev/next day in any timezone
  const [y,m,d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m-1, d, 12, 0, 0));
};

const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [ih,im] = checkIn.split(":").map(Number);
  const [oh,om] = checkOut.split(":").map(Number);
  const diff = (oh*60+om) - (ih*60+im);
  if (diff <= 0) return null;
  return parseFloat((diff/60).toFixed(2));
};

/* ============================================================
   CLOCK IN  —  POST /api/attendance/clock-in
   Auto-captures current IST time as checkIn
============================================================ */
export const clockIn = async (req, res) => {
  try {
    const userId  = req.user.id;
    const todayStr = getTodayIST();
    const istTime  = getISTTime();

    const [y,m,d]    = todayStr.split("-").map(Number);
    // ✅ FIX: UTC noon prevents day-shift when Prisma stores as UTC
    const attendanceDate = new Date(Date.UTC(y, m-1, d, 12, 0, 0));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name:true, weeklyOff:true, weekoffBalance:true },
    });

    // getUTCDay() because date is stored as UTC noon
    const dayName     = WEEK_DAYS[attendanceDate.getUTCDay()];
    const isWeeklyOff = user.weeklyOff === dayName;

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: attendanceDate } },
    });

    if (existing?.checkIn) {
      return res.status(400).json({
        msg: `Already clocked in at ${existing.checkIn} IST`,
        checkIn: existing.checkIn,
      });
    }

    let finalDayType        = "FULL";
    let weekoffBalanceChange = 0;
    if (isWeeklyOff) { finalDayType = "WEEKOFF_PRESENT"; weekoffBalanceChange = 1; }

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn: istTime, dayType: finalDayType },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: { userId, date: attendanceDate, checkIn: istTime, dayType: finalDayType },
      });
    }

    if (weekoffBalanceChange > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { weekoffBalance: { increment: weekoffBalanceChange } },
      });
    }

    await createNotification({
      userId,
      title:   `Clocked In — ${istTime} IST`,
      message: `You clocked in at ${istTime} IST on ${todayStr}.`,
      type: "SUCCESS", entity: "ATTENDANCE", socketEvent: "attendance:marked",
    });

    res.json({
      msg:       `Clocked in at ${istTime} IST`,
      checkIn:   istTime,
      attendance: { ...attendance, date: todayStr, hours: null },
      weekoffBalanceChange,
    });
  } catch (err) {
    console.error("clockIn error:", err);
    res.status(500).json({ msg: "Clock-in failed" });
  }
};

/* ============================================================
   CLOCK OUT  —  POST /api/attendance/clock-out
   Auto-captures current IST time as checkOut
============================================================ */
export const clockOut = async (req, res) => {
  try {
    const userId   = req.user.id;
    const todayStr = getTodayIST();
    const istTime  = getISTTime();

    const [y,m,d]        = todayStr.split("-").map(Number);
    // ✅ FIX: UTC noon prevents day-shift
    const attendanceDate  = new Date(Date.UTC(y, m-1, d, 12, 0, 0));

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: attendanceDate } },
    });

    if (!existing) {
      return res.status(400).json({ msg: "Please clock in first" });
    }
    if (existing.checkOut) {
      return res.status(400).json({
        msg: `Already clocked out at ${existing.checkOut} IST`,
        checkOut: existing.checkOut,
      });
    }
    if (!existing.checkIn) {
      return res.status(400).json({ msg: "Please clock in first" });
    }

    /* auto determine dayType by hours worked */
    const hours = calcHours(existing.checkIn, istTime);
    let finalDayType = existing.dayType;
    if (finalDayType === "FULL" && hours !== null) {
      if (hours < 4)       finalDayType = "ABSENT";
      else if (hours < 7)  finalDayType = "HALF";
      else                 finalDayType = "FULL";
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data:  { checkOut: istTime, dayType: finalDayType },
    });

    await createNotification({
      userId,
      title:   `Clocked Out — ${istTime} IST`,
      message: `Clocked out at ${istTime}. Total: ${hours ? hours+"h" : "N/A"}. Status: ${finalDayType}.`,
      type: "SUCCESS", entity: "ATTENDANCE", socketEvent: "attendance:marked",
    });

    res.json({
      msg:      `Clocked out at ${istTime} IST`,
      checkOut:  istTime,
      hours:     hours,
      dayType:   finalDayType,
      attendance: { ...attendance, date: todayStr, hours },
    });
  } catch (err) {
    console.error("clockOut error:", err);
    res.status(500).json({ msg: "Clock-out failed" });
  }
};

/* ============================================================
   MARK ATTENDANCE (manual)
   POST /api/attendance/manual
============================================================ */
export const markAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, checkIn, checkOut, dayType } = req.body;

    if (!date) return res.status(400).json({ msg: "Date is required" });

    const attendanceDate = safeDate(date);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name:true, weeklyOff:true, weekoffBalance:true },
    });

    const dayName     = WEEK_DAYS[attendanceDate.getDay()];
    const isWeeklyOff = user.weeklyOff === dayName;

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: attendanceDate } },
    });

    let finalDayType        = dayType || "FULL";
    let weekoffBalanceChange = 0;

    if (isWeeklyOff && !dayType)           finalDayType = "WEEKOFF";
    if (isWeeklyOff && dayType === "FULL"){ finalDayType = "WEEKOFF_PRESENT"; weekoffBalanceChange = 1; }

    const payload = {
      checkIn:  checkIn  || null,
      checkOut: checkOut || null,
      dayType:  finalDayType,
    };

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({ where:{ id:existing.id }, data:payload });
    } else {
      attendance = await prisma.attendance.create({ data:{ userId, date:attendanceDate, ...payload } });
    }

    if (weekoffBalanceChange > 0) {
      await prisma.user.update({ where:{ id:userId }, data:{ weekoffBalance:{ increment:weekoffBalanceChange } } });
    }

    const dateLabel = attendanceDate.toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric" });
    await createNotification({
      userId,
      title:   `Attendance ${existing?"Updated":"Marked"} — ${dateLabel}`,
      message: `${finalDayType.replace(/_/g," ")} for ${dateLabel}.${checkIn?` In: ${checkIn} IST`:""}${checkOut?` Out: ${checkOut} IST`:""}`,
      type: "SUCCESS", entity: "ATTENDANCE", socketEvent: "attendance:marked",
    });

    res.json({
      msg:  "Attendance saved successfully",
      attendance: {
        ...attendance,
        date: attendance.date.toISOString().split("T")[0],
        hours: calcHours(payload.checkIn, payload.checkOut),
      },
      weekoffBalanceChange,
      isUpdate: !!existing,
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ msg: "Attendance failed" });
  }
};

/* ============================================================
   GET TODAY STATUS  —  GET /api/attendance/today
============================================================ */
export const getTodayStatus = async (req, res) => {
  try {
    const userId   = req.user.id;
    const todayStr = getTodayIST();

    const [y,m,d]      = todayStr.split("-").map(Number);
    // ✅ FIX: UTC noon prevents day-shift
    const attendanceDate = new Date(Date.UTC(y, m-1, d, 12, 0, 0));

    const [att, user] = await Promise.all([
      prisma.attendance.findUnique({ where:{ userId_date:{ userId, date:attendanceDate } } }),
      prisma.user.findUnique({ where:{ id:userId }, select:{ weeklyOff:true, weekoffBalance:true, name:true, department:true } }),
    ]);

    const dayName     = WEEK_DAYS[attendanceDate.getUTCDay()];
    const isWeeklyOff = user.weeklyOff === dayName;
    const istNow      = getISTTime();

    res.json({
      date:         todayStr,
      istTime:      istNow,
      dayName,
      isWeeklyOff,
      weeklyOff:    user.weeklyOff,
      weekoffBalance: user.weekoffBalance,
      attendance:   att ? {
        id:       att.id,
        dayType:  att.dayType,
        checkIn:  att.checkIn,
        checkOut: att.checkOut,
        hours:    calcHours(att.checkIn, att.checkOut),
        isClockedIn:  !!att.checkIn  && !att.checkOut,
        isClockedOut: !!att.checkIn  &&  !!att.checkOut,
      } : null,
    });
  } catch (err) {
    console.error("getTodayStatus error:", err);
    res.status(500).json({ msg: "Failed to get today status" });
  }
};

/* ============================================================
   GET HISTORY  —  GET /api/attendance/history
   ?fromDate=&toDate=&month=&dayType=
============================================================ */
export const getMyAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate, month, dayType } = req.query;
    const where = { userId };

    if (fromDate || toDate) {
      where.date = {};
      // ✅ FIX: UTC noon for start, UTC end-of-day for end
      if (fromDate) {
        const [fy,fm,fd] = fromDate.split("-").map(Number);
        where.date.gte = new Date(Date.UTC(fy, fm-1, fd, 0, 0, 0));
      }
      if (toDate) {
        const [ty,tm,td] = toDate.split("-").map(Number);
        where.date.lte = new Date(Date.UTC(ty, tm-1, td, 23, 59, 59));
      }
    } else if (month) {
      const [y,m2] = month.split("-").map(Number);
      where.date = {
        gte: new Date(Date.UTC(y, m2-1, 1, 0, 0, 0)),
        lte: new Date(Date.UTC(y, m2, 0, 23, 59, 59)),
      };
    }
    if (dayType && dayType !== "ALL") where.dayType = dayType;

    const history = await prisma.attendance.findMany({ where, orderBy:{ date:"desc" } });

    res.json(history.map(h => ({
      id:       h.id,
      date:     h.date.toISOString().split("T")[0],
      dayType:  h.dayType,
      checkIn:  h.checkIn,
      checkOut: h.checkOut,
      hours:    calcHours(h.checkIn, h.checkOut),
    })));
  } catch (err) {
    console.error("getMyAttendanceHistory error:", err);
    res.status(500).json({ msg: "Failed to fetch history" });
  }
};

/* ============================================================
   GET STATS  —  GET /api/attendance/stats
============================================================ */
export const getMyAttendanceStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);

    const [monthAtt, lastAtt] = await Promise.all([
      prisma.attendance.findMany({ where:{ userId, date:{ gte:monthStart, lte:monthEnd } }, select:{ dayType:true, checkIn:true, checkOut:true } }),
      prisma.attendance.findMany({ where:{ userId }, orderBy:{ date:"desc" }, take:90, select:{ dayType:true } }),
    ]);

    const s = { full:0,half:0,absent:0,weekoff:0,weekoffPresent:0,paidLeave:0,paidHoliday:0,totalHours:0 };
    monthAtt.forEach(a=>{
      if(a.dayType==="FULL")            s.full++;
      if(a.dayType==="HALF")            s.half++;
      if(a.dayType==="ABSENT")          s.absent++;
      if(a.dayType==="WEEKOFF")         s.weekoff++;
      if(a.dayType==="WEEKOFF_PRESENT") s.weekoffPresent++;
      if(a.dayType==="PAID_LEAVE")      s.paidLeave++;
      if(a.dayType==="PAID_HOLIDAY")    s.paidHoliday++;
      const h=calcHours(a.checkIn,a.checkOut); if(h) s.totalHours+=h;
    });
    s.totalHours = parseFloat(s.totalHours.toFixed(1));

    const presentDays    = s.full + s.half + s.weekoffPresent;
    const attendanceRate = Math.min(100, Math.round((presentDays/22)*100));

    let hCount=0, hTotal=0;
    monthAtt.forEach(a=>{ const h=calcHours(a.checkIn,a.checkOut); if(h){hTotal+=h;hCount++;} });
    const avgHours = hCount>0 ? parseFloat((hTotal/hCount).toFixed(1)) : 0;

    let streak=0;
    for(const a of lastAtt){
      if(["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)) streak++;
      else if(a.dayType==="WEEKOFF") continue;
      else break;
    }

    res.json({ monthSummary:{ ...s, attendanceRate, avgHours, presentDays }, streak });
  } catch(err){
    console.error("getMyAttendanceStats error:", err);
    res.status(500).json({ msg:"Failed to fetch stats" });
  }
};