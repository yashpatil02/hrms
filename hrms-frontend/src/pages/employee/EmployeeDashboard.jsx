import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import socket from "../../socket";
import AttendanceCalendar from "./AttendanceCalendar";
import MonthlySummary from "./MonthlySummary";
import {
  FaCalendarCheck, FaHourglassHalf, FaClipboardList, FaUserClock,
  FaFireAlt, FaCheckCircle, FaTimesCircle, FaClock, FaLeaf,
  FaArrowRight, FaSyncAlt, FaFolderOpen, FaChartBar,
  FaSun, FaMoon, FaCloudSun, FaTrophy, FaExclamationTriangle,
  FaBell, FaCalendarAlt, FaUsers,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const DAY_CFG = {
  FULL:            { label:"Full Day",     short:"F",  bg:"bg-green-100",   text:"text-green-700",   dot:"#22c55e" },
  HALF:            { label:"Half Day",     short:"H",  bg:"bg-amber-100",   text:"text-amber-700",   dot:"#f59e0b" },
  ABSENT:          { label:"Absent",       short:"A",  bg:"bg-red-100",     text:"text-red-700",     dot:"#ef4444" },
  WEEKOFF:         { label:"Week Off",     short:"WO", bg:"bg-gray-100",    text:"text-gray-500",    dot:"#94a3b8" },
  WEEKOFF_PRESENT: { label:"WO Present",   short:"WP", bg:"bg-teal-100",    text:"text-teal-700",    dot:"#0d9488" },
  PAID_LEAVE:      { label:"Paid Leave",   short:"PL", bg:"bg-blue-100",    text:"text-blue-700",    dot:"#3b82f6" },
  PAID_HOLIDAY:    { label:"Paid Holiday", short:"PH", bg:"bg-purple-100",  text:"text-purple-700",  dot:"#7c3aed" },
};

const LEAVE_STATUS_CFG = {
  PENDING:  { bg:"bg-amber-100", text:"text-amber-700",  label:"Pending"  },
  APPROVED: { bg:"bg-green-100", text:"text-green-700",  label:"Approved" },
  REJECTED: { bg:"bg-red-100",   text:"text-red-700",    label:"Rejected" },
};

/* ============================================================
   HELPERS
============================================================ */
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text:"Good Morning",   icon:<FaSun   className="text-amber-400"  size={15}/> };
  if (h < 17) return { text:"Good Afternoon", icon:<FaCloudSun className="text-orange-400" size={15}/> };
  return           { text:"Good Evening",   icon:<FaMoon  className="text-indigo-400" size={15}/> };
};

const fmtDate = (d, opts={}) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", ...opts });

const diffDays = (d) =>
  Math.ceil((new Date(d) - new Date()) / (1000*60*60*24));

/* ============================================================
   WEEK BAR CHART
============================================================ */
const WeekTrend = ({ trend=[] }) => (
  <div className="flex items-end gap-2 h-16">
    {trend.map((d,i) => {
      const cfg   = d.status ? DAY_CFG[d.status] : null;
      const h     = d.hours ? Math.min(100,(d.hours/10)*100) : (d.status ? 25 : 5);
      const today = i === trend.length - 1;
      return (
        <div key={i} className="flex-1 flex flex-col items-center gap-1"
          title={`${d.date}: ${cfg?.label||"Not marked"}`}>
          <div className="w-full rounded-t-lg transition-all duration-500 relative"
            style={{ height:`${Math.max(h,7)}%`, background: cfg ? cfg.dot : "#e2e8f0", minHeight:5 }}>
            {today && (
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow"/>
            )}
          </div>
          <span className={`text-[9px] font-bold ${today?"text-blue-600":"text-gray-400"}`}>{d.day}</span>
        </div>
      );
    })}
  </div>
);

/* ============================================================
   TODAY STATUS CARD
============================================================ */
const TodayCard = ({ today, weeklyOff, navigate }) => {
  const now     = new Date();
  const dayName = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][now.getDay()];
  const isWO    = weeklyOff === dayName;
  const cfg     = today ? DAY_CFG[today.dayType] : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FaCalendarCheck className="text-blue-500"/>
          <span className="font-semibold text-gray-700 text-sm">Today</span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-2.5 py-1">
          {now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
        </span>
      </div>

      {!today ? (
        <>
          <div className={`rounded-xl p-4 text-center flex-1 flex flex-col items-center justify-center ${isWO?"bg-gray-50":"bg-amber-50"}`}>
            <div className="text-3xl mb-2">{isWO?"😴":"⏳"}</div>
            <p className={`text-sm font-bold ${isWO?"text-gray-600":"text-amber-700"}`}>
              {isWO?"Weekly Off":"Not Marked Yet"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isWO?"Enjoy your rest day!":"Record today's attendance"}
            </p>
          </div>
          {!isWO && (
            <button onClick={()=>navigate("/attendance")}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
              <FaCalendarCheck size={12}/> Mark Now <FaArrowRight size={10}/>
            </button>
          )}
        </>
      ) : (
        <>
          <div className={`${cfg?.bg||"bg-gray-100"} rounded-xl p-3 text-center mb-3`}>
            <span className={`text-sm font-bold ${cfg?.text}`}>{cfg?.label||today.dayType}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Check In</p>
              <p className="text-sm font-bold text-green-700">{today.checkIn||"—"}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Check Out</p>
              <p className="text-sm font-bold text-blue-700">{today.checkOut||"—"}</p>
            </div>
          </div>
          {today.hours && (
            <div className="bg-indigo-50 rounded-xl p-2.5 flex items-center justify-center gap-2 mt-auto">
              <FaClock className="text-indigo-500" size={11}/>
              <span className="text-sm font-bold text-indigo-700">{today.hours}h worked today</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ============================================================
   STAT CARD
============================================================ */
const StatCard = ({ label, value, icon, color, bg, sub, onClick }) => (
  <div onClick={onClick}
    className={`${bg} rounded-2xl p-4 transition-all ${onClick?"cursor-pointer hover:shadow-md hover:-translate-y-0.5":""}`}>
    <div className={`${color} mb-2 text-lg`}>{icon}</div>
    <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
    <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
    {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
  </div>
);

/* ============================================================
   QUICK ACTION BUTTON
============================================================ */
const QuickAction = ({ title, sub, path, icon, color, bg, border, navigate }) => (
  <button onClick={()=>navigate(path)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} ${border} hover:shadow-sm transition-all text-left`}>
    <span className={`${color} text-base flex-shrink-0`}>{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
    <FaArrowRight size={10} className="text-gray-300 flex-shrink-0"/>
  </button>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */
const EmployeeDashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();
  const user                  = JSON.parse(localStorage.getItem("user")||"{}");

  /* ── load dashboard ── */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/employee/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Employee dashboard error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ loadDashboard(); },[loadDashboard]);

  /* socket refresh */
  useEffect(()=>{
    const evs = ["attendance:marked","leave:approved","leave:rejected","notification:new"];
    evs.forEach(e=>socket.on(e, loadDashboard));
    return ()=>evs.forEach(e=>socket.off(e, loadDashboard));
  },[loadDashboard]);

  /* ── loading ── */
  if (loading || !data) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"/>
        <p className="text-gray-400 text-sm">Loading your dashboard...</p>
      </div>
    </Layout>
  );

  const { monthSummary: s, leaves, streak, weekoffBalance } = data;
  const now   = new Date();
  const greet = greeting();

  return (
    <Layout>

      {/* ============================
          WELCOME HEADER
      ============================ */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-green-100 text-sm mb-1">
              {greet.icon} <span>{greet.text}!</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {data.user?.name || user?.name}
            </h1>
            <p className="text-green-200 text-sm mt-1">
              {now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              {data.user?.department && <> &nbsp;·&nbsp; {data.user.department}</>}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* STREAK */}
            {streak > 2 && (
              <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2.5 text-center">
                <div className="flex items-center gap-1.5 text-amber-300 justify-center">
                  <FaFireAlt size={14}/>
                  <span className="text-lg font-bold">{streak}</span>
                </div>
                <p className="text-green-200 text-[10px] mt-0.5">day streak 🔥</p>
              </div>
            )}
            {/* RATE */}
            <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2.5 text-center">
              <div className="text-2xl font-bold">{s?.attendanceRate||0}%</div>
              <p className="text-green-200 text-[10px] mt-0.5">this month</p>
            </div>
            {/* REFRESH */}
            <button onClick={loadDashboard}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-3 py-2 text-sm transition-all">
              <FaSyncAlt size={11}/> Refresh
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-green-200 mb-1.5">
            <span>Monthly Attendance</span>
            <span>{s?.attendanceRate||0}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              (s?.attendanceRate||0)>=80?"bg-green-300":(s?.attendanceRate||0)>=60?"bg-amber-300":"bg-red-400"
            }`} style={{ width:`${s?.attendanceRate||0}%` }}/>
          </div>
        </div>
      </div>

      {/* ============================
          KPI CARDS — ROW 1
      ============================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Full Days"    value={s?.full||0}      icon={<FaCheckCircle/>}  color="text-green-600"  bg="bg-green-50"  sub="This month"/>
        <StatCard label="Half Days"    value={s?.half||0}      icon={<FaClock/>}        color="text-amber-600"  bg="bg-amber-50"  sub="This month"/>
        <StatCard label="Absent"       value={s?.absent||0}    icon={<FaTimesCircle/>}  color="text-red-600"    bg="bg-red-50"    sub="This month"/>
        <StatCard label="Hours"        value={`${s?.totalHours||0}h`} icon={<FaChartBar/>} color="text-indigo-600" bg="bg-indigo-50" sub={`~${s?.avgHours||0}h avg`}/>
        <StatCard label="Pending"      value={data.pendingLeaves||0}  icon={<FaHourglassHalf/>} color="text-amber-600"  bg="bg-amber-50"  sub="Leaves"
          onClick={()=>navigate("/leaves")}/>
        <StatCard label="Total Leaves" value={data.totalLeaves||0}    icon={<FaClipboardList/>} color="text-purple-600" bg="bg-purple-50" sub="All time"
          onClick={()=>navigate("/leaves")}/>
      </div>

      {/* KPI CARDS — ROW 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="WO Balance"  value={weekoffBalance||0}       icon={<FaCalendarAlt/>}   color="text-teal-600"   bg="bg-teal-50"   sub="Available days"/>
        <StatCard label="WO Present"  value={s?.weekoffPresent||0}    icon={<FaUserClock/>}     color="text-cyan-600"   bg="bg-cyan-50"   sub="This month"/>
        <StatCard label="Paid Leave"  value={s?.paidLeave||0}         icon={<FaLeaf/>}          color="text-blue-600"   bg="bg-blue-50"   sub="This month"/>
        <StatCard label="Documents"   value={data.documentCount||0}   icon={<FaFolderOpen/>}    color="text-pink-600"   bg="bg-pink-50"   sub="Uploaded"/>
      </div>

      {/* ============================
          TODAY + WEEK + QUICK ACTIONS
      ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* TODAY */}
        <TodayCard today={data.todayAttendance} weeklyOff={data.user?.weeklyOff} navigate={navigate}/>

        {/* WEEK TREND */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaChartBar className="text-indigo-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Last 7 Days</h3>
          </div>
          <WeekTrend trend={data.trend||[]}/>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(data.trend||[]).map((d,i)=>{
              const cfg = d.status ? DAY_CFG[d.status] : null;
              return (
                <span key={i}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg?.bg||"bg-gray-100"} ${cfg?.text||"text-gray-400"}`}
                  title={`${d.date}: ${cfg?.label||"Not marked"}`}>
                  {d.day} {cfg?.short||""}
                </span>
              );
            })}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaBell className="text-amber-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <QuickAction title="Mark Attendance" sub="Record today's attendance" path="/attendance"
              icon={<FaCalendarCheck/>} color="text-green-600" bg="bg-green-50" border="border-green-200" navigate={navigate}/>
            <QuickAction title="My Attendance"   sub="View attendance history"   path="/attendance"
              icon={<FaUserClock/>}    color="text-blue-600"  bg="bg-blue-50"  border="border-blue-200"  navigate={navigate}/>
            <QuickAction title="Apply Leave"     sub="Request time off"          path="/leaves"
              icon={<FaLeaf/>}         color="text-amber-600" bg="bg-amber-50" border="border-amber-200" navigate={navigate}/>
            <QuickAction title="Notifications"   sub="View your alerts"          path="/notifications"
              icon={<FaBell/>}         color="text-purple-600" bg="bg-purple-50" border="border-purple-200" navigate={navigate}/>
          </div>
        </div>
      </div>

      {/* ============================
          ATTENDANCE CALENDAR (existing component)
      ============================ */}
      <div className="mb-6">
        <AttendanceCalendar attendance={data.monthlyAttendance||[]}/>
      </div>

      {/* ============================
          MONTHLY SUMMARY (existing component)
      ============================ */}
      <div className="mb-6">
        <MonthlySummary summary={data.monthlySummary}/>
      </div>

      {/* ============================
          RECENT LEAVES + UPCOMING
      ============================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* UPCOMING LEAVES */}
        {(data.upcomingLeaves||[]).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-blue-500"/>
                <h3 className="font-semibold text-gray-700 text-sm">Upcoming Leaves</h3>
              </div>
            </div>
            <div className="space-y-2">
              {data.upcomingLeaves.map(l=>(
                <div key={l.id} className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <FaCalendarAlt className="text-blue-500 flex-shrink-0" size={13}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800 truncate">{l.reason}</p>
                    <p className="text-xs text-blue-400">
                      {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                      {diffDays(l.fromDate) > 0 && <span className="ml-1.5 font-semibold">· in {diffDays(l.fromDate)} days</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT LEAVES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaClipboardList className="text-purple-500"/>
              <h3 className="font-semibold text-gray-700 text-sm">Recent Leaves</h3>
            </div>
            <button onClick={()=>navigate("/leaves")}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <FaArrowRight size={9}/>
            </button>
          </div>

          {!(data.recentLeaves||[]).length ? (
            <div className="text-center py-8">
              <FaLeaf className="text-gray-200 mx-auto mb-2" size={24}/>
              <p className="text-sm text-gray-400">No leaves applied yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentLeaves.map(l=>{
                const ls = LEAVE_STATUS_CFG[l.status];
                return (
                  <div key={l.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-gray-700 truncate max-w-[150px]">{l.reason}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ls?.bg} ${ls?.text}`}>
                          {ls?.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                      </p>
                      {l.status==="REJECTED" && l.rejectReason && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <FaExclamationTriangle size={8}/> {l.rejectReason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================
          ACHIEVEMENT / ALERT BANNER
      ============================ */}
      {(s?.attendanceRate||0) >= 90 ? (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <FaTrophy className="text-amber-500 flex-shrink-0" size={20}/>
          <div>
            <p className="font-semibold text-amber-800">Excellent Attendance! 🏆</p>
            <p className="text-xs text-amber-600 mt-0.5">
              You have {s.attendanceRate}% attendance this month. Keep it up!
            </p>
          </div>
        </div>
      ) : (s?.attendanceRate||0) > 0 && (s?.attendanceRate||0) < 70 ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <FaExclamationTriangle className="text-red-400 flex-shrink-0" size={18}/>
          <div>
            <p className="font-semibold text-red-700">Low Attendance Alert</p>
            <p className="text-xs text-red-600 mt-0.5">
              Your attendance is {s.attendanceRate}% this month. Please ensure regular presence.
            </p>
          </div>
        </div>
      ) : null}

      {/* ============================
          MARK ATTENDANCE CTA
      ============================ */}
      {!data.todayAttendance && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <FaCalendarCheck className="text-green-600" size={16}/>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Haven't marked today's attendance!</p>
              <p className="text-xs text-green-500">Mark it now to maintain your attendance record</p>
            </div>
          </div>
          <button onClick={()=>navigate("/attendance")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
            Mark Now <FaArrowRight size={12}/>
          </button>
        </div>
      )}

    </Layout>
  );
};

export default EmployeeDashboard;