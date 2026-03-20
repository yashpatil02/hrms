import prisma from "../../prisma/client.js";

/* ============================================================
   HELPER
============================================================ */
const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  if (diff <= 0) return null;
  return parseFloat((diff / 60).toFixed(2));
};

/* ============================================================
   GET EMPLOYEE DASHBOARD  —  GET /api/employee/dashboard
============================================================ */
export const getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now    = new Date();

    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);

    const [
      user, todayAtt, monthAtt,
      pendingLeaves, approvedLeaves, totalLeaves,
      recentLeaves, upcomingLeaves, documentCount, lastAtt,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id:true, name:true, email:true, role:true, department:true, weeklyOff:true, weekoffBalance:true, createdAt:true },
      }),
      prisma.attendance.findFirst({ where:{ userId, date:{ gte:todayStart, lte:todayEnd } } }),
      prisma.attendance.findMany({ where:{ userId, date:{ gte:monthStart, lte:monthEnd } }, orderBy:{ date:"asc" } }),
      prisma.leave.count({ where:{ userId, status:"PENDING" } }),
      prisma.leave.count({ where:{ userId, status:"APPROVED" } }),
      prisma.leave.count({ where:{ userId } }),
      prisma.leave.findMany({
        where: { userId }, orderBy:{ createdAt:"desc" }, take:5,
        select:{ id:true, reason:true, fromDate:true, toDate:true, status:true, rejectReason:true, createdAt:true },
      }),
      prisma.leave.findMany({
        where:{ userId, status:"APPROVED", fromDate:{ gte:todayStart } },
        orderBy:{ fromDate:"asc" }, take:3,
        select:{ id:true, reason:true, fromDate:true, toDate:true },
      }),
      prisma.employeeDocument.count({ where:{ employeeId:userId } }),
      prisma.attendance.findMany({ where:{ userId }, orderBy:{ date:"desc" }, take:60, select:{ dayType:true } }),
    ]);

    /* month summary */
    const s = { full:0, half:0, absent:0, weekoff:0, weekoffPresent:0, paidLeave:0, paidHoliday:0, totalHours:0 };
    monthAtt.forEach(a => {
      if (a.dayType==="FULL")            s.full++;
      if (a.dayType==="HALF")            s.half++;
      if (a.dayType==="ABSENT")          s.absent++;
      if (a.dayType==="WEEKOFF")         s.weekoff++;
      if (a.dayType==="WEEKOFF_PRESENT") s.weekoffPresent++;
      if (a.dayType==="PAID_LEAVE")      s.paidLeave++;
      if (a.dayType==="PAID_HOLIDAY")    s.paidHoliday++;
      const h = calcHours(a.checkIn, a.checkOut);
      if (h) s.totalHours += h;
    });
    s.totalHours = parseFloat(s.totalHours.toFixed(1));

    const presentDays    = s.full + s.half + s.weekoffPresent;
    const attendanceRate = Math.min(100, Math.round((presentDays/22)*100));
    let hCount=0, hTotal=0;
    monthAtt.forEach(a => { const h=calcHours(a.checkIn,a.checkOut); if(h){hTotal+=h;hCount++;} });
    const avgHours = hCount>0 ? parseFloat((hTotal/hCount).toFixed(1)) : 0;

    /* streak */
    let streak=0;
    for (const a of lastAtt) {
      if (["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)) streak++;
      else if (a.dayType==="WEEKOFF") continue;
      else break;
    }

    /* 7-day trend */
    const trend = [];
    for (let i=6; i>=0; i--) {
      const d = new Date(now); d.setDate(now.getDate()-i); d.setHours(0,0,0,0);
      const rec = monthAtt.find(a => { const ad=new Date(a.date); ad.setHours(0,0,0,0); return ad.getTime()===d.getTime(); });
      trend.push({ day:d.toLocaleDateString("en-IN",{weekday:"short"}), date:d.toISOString().split("T")[0], status:rec?.dayType||null, hours:rec?calcHours(rec.checkIn,rec.checkOut):null });
    }

    const monthlySummary = { ...s, attendanceRate, avgHours, presentDays };
    const monthlyAttendance = monthAtt.map(a => ({
      date:a.date.toISOString().split("T")[0], dayType:a.dayType, checkIn:a.checkIn, checkOut:a.checkOut, hours:calcHours(a.checkIn,a.checkOut),
    }));

    res.json({
      user, weekoffBalance:user?.weekoffBalance||0, streak,
      todayStatus:    todayAtt?.dayType || null,
      todayAttendance: todayAtt ? { dayType:todayAtt.dayType, checkIn:todayAtt.checkIn, checkOut:todayAtt.checkOut, hours:calcHours(todayAtt.checkIn,todayAtt.checkOut) } : null,
      monthSummary:   monthlySummary,
      monthlySummary,
      monthlyAttendance, trend,
      pendingLeaves, approvedLeaves, totalLeaves,
      recentLeaves, upcomingLeaves, documentCount,
    });
  } catch (err) {
    console.error("getEmployeeDashboard:", err);
    res.status(500).json({ msg:"Failed to load dashboard" });
  }
};

/* ============================================================
   GET EMPLOYEE ATTENDANCE  —  GET /api/employee/attendance
============================================================ */
export const getEmployeeAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth()+1;
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const start = new Date(year, month-1, 1);
    const end   = new Date(year, month, 0, 23,59,59);
    const records = await prisma.attendance.findMany({ where:{ userId, date:{ gte:start, lte:end } }, orderBy:{ date:"asc" } });
    res.json(records.map(r => ({ id:r.id, date:r.date.toISOString().split("T")[0], dayType:r.dayType, checkIn:r.checkIn, checkOut:r.checkOut, hours:calcHours(r.checkIn,r.checkOut) })));
  } catch (err) {
    res.status(500).json({ msg:"Failed to fetch attendance" });
  }
};

/* ============================================================
   GET ATTENDANCE SUMMARY  —  GET /api/employee/attendance-summary
============================================================ */
export const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth()+1;
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const start = new Date(year, month-1, 1);
    const end   = new Date(year, month, 0, 23,59,59);
    const records = await prisma.attendance.findMany({ where:{ userId, date:{ gte:start, lte:end } }, select:{ dayType:true, checkIn:true, checkOut:true } });
    const total   = new Date(year, month, 0).getDate();
    const present = records.filter(r=>["FULL","HALF","WEEKOFF_PRESENT"].includes(r.dayType)).length;
    const absent  = records.filter(r=>r.dayType==="ABSENT").length;
    const half    = records.filter(r=>r.dayType==="HALF").length;
    let totalH=0;
    records.forEach(r=>{ const h=calcHours(r.checkIn,r.checkOut); if(h) totalH+=h; });
    res.json({ total, present, absent, half, totalHours:parseFloat(totalH.toFixed(1)) });
  } catch (err) {
    res.status(500).json({ msg:"Failed to fetch summary" });
  }
};