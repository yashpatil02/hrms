import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import socket from "../../socket";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  FaUsers, FaUserTie, FaCalendarCheck, FaHourglassHalf,
  FaArrowUp, FaArrowDown, FaExclamationTriangle, FaCheckCircle,
  FaUserClock, FaChartLine, FaSync, FaUserShield, FaBolt,
  FaClipboardList, FaFolderOpen, FaHistory, FaCalendarAlt,
  FaUserSlash, FaUserCheck, FaFire, FaBell, FaEye,
} from "react-icons/fa";

/* ============================================================
   COLORS & CONSTANTS
============================================================ */
const C = {
  blue:   "#2563eb", indigo: "#4f46e5", green:  "#16a34a",
  amber:  "#d97706", red:    "#dc2626", purple: "#7c3aed",
  teal:   "#0d9488", sky:    "#0284c7", pink:   "#db2777",
};

const CHART_H = 220;
const SHIFT_COLORS = { MORNING: C.amber, AFTERNOON: C.blue, GENERAL: C.teal, EVENING: C.purple, NIGHT: "#1e293b" };
const PIE_LEAVE    = [C.amber, C.green, C.red];
const PIE_TODAY    = [C.green, C.amber, C.red, C.purple];

/* ============================================================
   useChartSize — ResizeObserver for exact DOM width
============================================================ */
const useChartSize = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w > 0) setWidth(Math.floor(w));
    });
    ro.observe(ref.current);
    setWidth(Math.floor(ref.current.getBoundingClientRect().width) || 300);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
};

/* ============================================================
   CHART WRAPPER
============================================================ */
const ChartBox = ({ title, subtitle, children, hasData, emptyMsg, action }) => {
  const [ref, w] = useChartSize();
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-4" ref={ref} style={{ width:"100%", height: CHART_H }}>
        {!hasData
          ? <EmptyChart message={emptyMsg} />
          : children(w)
        }
      </div>
    </div>
  );
};

/* ============================================================
   EMPTY STATE
============================================================ */
const EmptyChart = ({ message="No data available" }) => (
  <div style={{ height: CHART_H }} className="flex flex-col items-center justify-center gap-2 text-gray-300">
    <FaChartLine size={28} />
    <span className="text-sm text-gray-400">{message}</span>
  </div>
);

/* ============================================================
   CUSTOM TOOLTIP
============================================================ */
const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}{["employee","analyst"].includes(p.name) ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

/* ============================================================
   CUSTOM SVG BAR — avoids Recharts 2.12 minPointSize bug
============================================================ */
const SVGBar = ({ data=[], dataKey, color=C.indigo, width=300, height=CHART_H }) => {
  if (!data.length) return null;
  const PL=36, PR=12, PT=16, PB=32;
  const cW=width-PL-PR, cH=height-PT-PB;
  const maxV = Math.max(...data.map(d=>d[dataKey]||0), 1);
  const bCnt = data.length;
  const gap  = Math.max(4, Math.floor(cW / bCnt * 0.25));
  const bW   = Math.max(6, Math.floor((cW - gap*(bCnt-1)) / bCnt));
  const r    = Math.min(5, bW/2);
  const yTks = [0, Math.round(maxV/2), maxV];

  return (
    <svg width={width} height={height}>
      {yTks.map((t,i) => {
        const y = PT + cH - (t/maxV)*cH;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke="#f1f5f9" strokeWidth={1}/>
            <text x={PL-6} y={y+4} textAnchor="end" fill="#94a3b8" fontSize={10}>{t}</text>
          </g>
        );
      })}
      {data.map((d,i) => {
        const val  = d[dataKey]||0;
        const bH   = val===0 ? 0 : Math.max(4,(val/maxV)*cH);
        const x    = PL + i*(bW+gap);
        const y    = PT + cH - bH;
        const lbl  = d.month || d.day || d.name || "";
        return (
          <g key={i}>
            {bH>0 && (
              <path
                d={`M${x+r},${y} h${bW-2*r} a${r},${r} 0 0 1 ${r},${r} v${bH-r} h${-bW} v${-(bH-r)} a${r},${r} 0 0 1 ${r},${-r} z`}
                fill={color} opacity={0.85}
              />
            )}
            {bH===0 && <rect x={x} y={PT+cH-2} width={bW} height={2} fill="#e2e8f0" rx={1}/>}
            {val>0 && <text x={x+bW/2} y={y-5} textAnchor="middle" fill={color} fontSize={10} fontWeight={600}>{val}</text>}
            <text x={x+bW/2} y={PT+cH+16} textAnchor="middle" fill="#94a3b8" fontSize={10}>{lbl}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* ============================================================
   HEATMAP CALENDAR
============================================================ */
const HeatmapCalendar = ({ data=[], month, year }) => {
  if (!data.length) return <EmptyChart message="No heatmap data" />;
  const getColor = (rate) => {
    if (rate === 0)  return "#f1f5f9";
    if (rate < 40)   return "#fca5a5";
    if (rate < 60)   return "#fcd34d";
    if (rate < 80)   return "#86efac";
    return "#22c55e";
  };
  const firstDay = new Date(year, month-1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=totalDays; d++) {
    const found = data.find(x=>x.day===d);
    cells.push({ day: d, rate: found?.rate||0, present: found?.present||0, total: found?.total||0 });
  }
  const days = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell ? `Day ${cell.day}: ${cell.rate}% (${cell.present}/${cell.total})` : ""}
            style={{ background: cell ? getColor(cell.rate) : "transparent" }}
            className="aspect-square rounded-md flex items-center justify-center text-xs font-medium"
          >
            {cell ? (
              <span style={{ color: cell.rate >= 60 ? "#166534" : cell.rate >= 40 ? "#78350f" : cell.rate > 0 ? "#991b1b" : "#94a3b8", fontSize: 10 }}>
                {cell.day}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {[["#f1f5f9","No data"],["#fca5a5","< 40%"],["#fcd34d","40-60%"],["#86efac","60-80%"],["#22c55e","80%+"]].map(([bg,lbl])=>(
          <div key={lbl} className="flex items-center gap-1">
            <div style={{ background: bg }} className="w-3 h-3 rounded-sm"/>
            <span className="text-xs text-gray-400">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */
const AdminDashboard = () => {
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState("overview");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")||"{}");

  const loadStats = async (showRefresh=false) => {
    try {
      if (showRefresh) setRefreshing(true);
      setError(null);
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
      setLastUpdated(new Date());
    } catch(err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(()=>{ loadStats(); },[]);

  useEffect(()=>{
    const events = ["leave:new","leave:approved","leave:rejected","attendance:marked"];
    events.forEach(e => socket.on(e, ()=>loadStats()));
    return ()=> events.forEach(e => socket.off(e));
  },[]);

  const greeting = () => {
    const h = new Date().getHours();
    return h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening";
  };

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-9 h-9 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FaExclamationTriangle className="text-red-400" size={32}/>
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={()=>loadStats()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
      </div>
    </Layout>
  );

  if (!stats) return null;

  /* safe fallbacks */
  const combinedTrend      = Array.isArray(stats.combinedTrend)      ? stats.combinedTrend      : [];
  const leaveTrend         = Array.isArray(stats.leaveTrend)         ? stats.leaveTrend         : [];
  const leaveTypes         = Array.isArray(stats.leaveTypes)         ? stats.leaveTypes         : [];
  const shiftDistribution  = Array.isArray(stats.shiftDistribution)  ? stats.shiftDistribution  : [];
  const heatmapData        = Array.isArray(stats.heatmapData)        ? stats.heatmapData        : [];
  const topAbsent          = Array.isArray(stats.topAbsentEmployees)  ? stats.topAbsentEmployees : [];
  const activityFeed       = Array.isArray(stats.activityFeed)       ? stats.activityFeed       : [];
  const recentLeaves       = Array.isArray(stats.recentLeaves)       ? stats.recentLeaves       : [];
  const alerts             = Array.isArray(stats.alerts)             ? stats.alerts             : [];
  const today              = stats.today        || { present:0, absent:0, onLeave:0, halfDay:0 };
  const todayAnalysts      = stats.todayAnalysts || { present:0, absent:0, halfDay:0 };

  const attendanceColor =
    (stats.attendanceRate||0)>=80 ? C.green :
    (stats.attendanceRate||0)>=60 ? C.amber : C.red;

  const todayPieData = [
    { name:"Present",  value: today.present  },
    { name:"On Leave", value: today.onLeave  },
    { name:"Absent",   value: today.absent   },
    { name:"Half Day", value: today.halfDay  },
  ].filter(d=>d.value>0);

  const hasCombined = combinedTrend.some(d=>d.employee>0||d.analyst>0);
  const hasLeave    = leaveTrend.some(d=>d.count>0);
  const now         = new Date();
  const tickStyle   = { fill:"#94a3b8", fontSize:11 };

  const tabs = [
    { key:"overview", label:"Overview" },
    { key:"attendance", label:"Attendance" },
    { key:"leaves", label:"Leaves" },
    { key:"analysts", label:"Analysts" },
  ];

  return (
    <Layout>

      {/* ================================================
          HEADER
      ================================================ */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 shadow-md text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <FaUserShield size={13}/> {greeting()}, {user.name||"Admin"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-blue-200 text-sm mt-1">
              HRMS Control Center &nbsp;·&nbsp;
              {now.toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {lastUpdated && (
              <p className="text-blue-200 text-xs">
                Updated {lastUpdated.toLocaleTimeString("en-IN",{ hour:"2-digit", minute:"2-digit" })}
              </p>
            )}
            <button
              onClick={()=>loadStats(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg px-4 py-2 text-sm transition-all"
            >
              <FaSync size={11} style={{ animation: refreshing?"spin 0.8s linear infinite":"none" }}/>
              {refreshing?"Refreshing...":"Refresh"}
            </button>
          </div>
        </div>

        {/* TABS inside header */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={()=>setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab===t.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ALERTS */}
      {alerts.length>0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0"/>
          <div className="space-y-0.5">
            {alerts.map((a,i)=><p key={i} className="text-amber-800 text-sm">{a}</p>)}
          </div>
        </div>
      )}

      {/* ================================================
          TAB: OVERVIEW
      ================================================ */}
      {activeTab==="overview" && (
        <>
          {/* KPI ROW 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KPICard title="Total Users"     value={stats.totalUsers||0}     icon={<FaUsers/>}        color={C.blue}   iconBg="bg-blue-100"   iconColor="text-blue-600"   sub={`${stats.totalAdmins||0} admin · ${stats.totalHR||0} HR`}         onClick={()=>navigate("/users")}/>
            <KPICard title="Employees"       value={stats.totalEmployees||0} icon={<FaUserTie/>}      color={C.indigo} iconBg="bg-indigo-100" iconColor="text-indigo-600" sub="Active employees"                                                   onClick={()=>navigate("/users")}/>
            <KPICard title="Active Analysts" value={stats.totalAnalysts||0}  icon={<FaUserCheck/>}    color={C.teal}   iconBg="bg-teal-100"   iconColor="text-teal-600"   sub={`${stats.terminatedAnalysts||0} terminated`}                        onClick={()=>navigate("/analysts")}/>
            <KPICard title="Pending Leaves"  value={stats.pendingLeaves||0}  icon={<FaHourglassHalf/>} color={(stats.pendingLeaves||0)>5?C.red:C.amber} iconBg={(stats.pendingLeaves||0)>5?"bg-red-100":"bg-amber-100"} iconColor={(stats.pendingLeaves||0)>5?"text-red-600":"text-amber-600"} sub="Awaiting approval" onClick={()=>navigate("/admin/leaves")} pulse={(stats.pendingLeaves||0)>0}/>
          </div>

          {/* KPI ROW 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard title="Attendance Rate"    value={`${stats.attendanceRate||0}%`}         icon={<FaChartLine/>}    color={attendanceColor} iconBg="bg-green-100" iconColor="text-green-600" sub="This month" trend={stats.attendanceChange}/>
            <KPICard title="Approved Leaves"    value={stats.approvedLeavesThisMonth||0}       icon={<FaCalendarCheck/>} color={C.green}  iconBg="bg-green-100"  iconColor="text-green-600"  sub="This month"/>
            <KPICard title="Today Present"      value={today.present}                          icon={<FaCheckCircle/>}   color={C.teal}   iconBg="bg-teal-100"   iconColor="text-teal-600"   sub="Employees"/>
            <KPICard title="Today Analyst ✓"    value={todayAnalysts.present}                  icon={<FaUserCheck/>}    color={C.purple} iconBg="bg-purple-100" iconColor="text-purple-600" sub="Shift present"/>
          </div>

          {/* COMBINED TREND + ACTIVITY FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <ChartBox title="Attendance Trend" subtitle="Employees vs Analysts — last 7 days (%)" hasData={hasCombined} emptyMsg="No attendance data yet">
                {w => (
                  <LineChart width={w} height={CHART_H} data={combinedTrend} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" tick={tickStyle} axisLine={false} tickLine={false}/>
                    <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[0,100]}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{color:"#6b7280",fontSize:11}}>{v}</span>}/>
                    <Line type="monotone" dataKey="employee" name="employee" stroke={C.blue}  strokeWidth={2.5} dot={{ fill:C.blue,  r:3, strokeWidth:0 }} activeDot={{ r:5, fill:"#fff", stroke:C.blue,  strokeWidth:2 }}/>
                    <Line type="monotone" dataKey="analyst"  name="analyst"  stroke={C.teal}  strokeWidth={2.5} dot={{ fill:C.teal,  r:3, strokeWidth:0 }} activeDot={{ r:5, fill:"#fff", stroke:C.teal,  strokeWidth:2 }} strokeDasharray="4 2"/>
                  </LineChart>
                )}
              </ChartBox>
            </div>

            {/* ACTIVITY FEED */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FaBell className="text-indigo-500" size={14}/>
                <h3 className="font-semibold text-gray-700 text-sm">Live Activity</h3>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Live</span>
              </div>
              <div className="space-y-2.5 overflow-y-auto" style={{ maxHeight: CHART_H+20 }}>
                {activityFeed.length===0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">No recent activity</div>
                ) : activityFeed.map((act,i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      act.color==="green"?"bg-green-500":act.color==="red"?"bg-red-500":"bg-amber-500"
                    }`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-snug">{act.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(act.time).toLocaleTimeString("en-IN",{ hour:"2-digit", minute:"2-digit" })}
                        &nbsp;·&nbsp;
                        {new Date(act.time).toLocaleDateString("en-IN",{ day:"numeric", month:"short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <FaBolt className="text-amber-500"/>
              <h2 className="font-semibold text-gray-700">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label:"Leave Approval",   sub:`${stats.pendingLeaves||0} pending`,  path:"/admin/leaves",              icon:<FaCalendarAlt/>,  color:"text-amber-600",  bg:"bg-amber-50",  border:"border-amber-200"  },
                { label:"Attendance Entry", sub:"Mark shift",                          path:"/admin/attendance-by-shift", icon:<FaCalendarCheck/>,color:"text-blue-600",   bg:"bg-blue-50",   border:"border-blue-200"   },
                { label:"Manage Users",     sub:`${stats.totalUsers||0} total`,        path:"/users",                     icon:<FaUsers/>,        color:"text-indigo-600", bg:"bg-indigo-50", border:"border-indigo-200" },
                { label:"Monthly Report",   sub:"Summary",                             path:"/admin/monthly-attendance",  icon:<FaClipboardList/>,color:"text-teal-600",   bg:"bg-teal-50",   border:"border-teal-200"   },
                { label:"Audit Trail",      sub:"Changes",                             path:"/admin/audit",               icon:<FaHistory/>,      color:"text-purple-600", bg:"bg-purple-50", border:"border-purple-200" },
                { label:"Documents",        sub:"Employee files",                      path:"/admin/documents",           icon:<FaFolderOpen/>,   color:"text-green-600",  bg:"bg-green-50",  border:"border-green-200"  },
              ].map(a=>(
                <button key={a.label} onClick={()=>navigate(a.path)}
                  className={`flex flex-col items-center text-center gap-2 p-4 rounded-xl border ${a.bg} ${a.border} hover:shadow-md transition-all hover:-translate-y-0.5 w-full`}>
                  <div className={`text-xl ${a.color}`}>{a.icon}</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 leading-tight">{a.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{a.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ================================================
          TAB: ATTENDANCE
      ================================================ */}
      {activeTab==="attendance" && (
        <>
          {/* Today snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <SnapshotCard label="Present"  value={today.present}  color="text-green-600"  bg="bg-green-50"  icon={<FaCheckCircle/>}/>
            <SnapshotCard label="Absent"   value={today.absent}   color="text-red-600"    bg="bg-red-50"    icon={<FaExclamationTriangle/>}/>
            <SnapshotCard label="On Leave" value={today.onLeave}  color="text-amber-600"  bg="bg-amber-50"  icon={<FaCalendarAlt/>}/>
            <SnapshotCard label="Half Day" value={today.halfDay}  color="text-purple-600" bg="bg-purple-50" icon={<FaUserClock/>}/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Heatmap calendar */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FaCalendarCheck className="text-teal-600"/>
                <h3 className="font-semibold text-gray-700 text-sm">Attendance Heatmap</h3>
                <span className="ml-auto text-xs text-gray-400">
                  {now.toLocaleString("en-IN",{ month:"long", year:"numeric" })}
                </span>
              </div>
              <HeatmapCalendar data={heatmapData} month={now.getMonth()+1} year={now.getFullYear()}/>
            </div>

            {/* Today's Breakdown Pie */}
            <ChartBox title="Today's Breakdown" subtitle="Employee status" hasData={todayPieData.length>0} emptyMsg="No attendance today">
              {w=>(
                <PieChart width={w} height={CHART_H}>
                  <Pie data={todayPieData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {todayPieData.map((_,i)=><Cell key={i} fill={PIE_TODAY[i%PIE_TODAY.length]} stroke="transparent"/>)}
                  </Pie>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconType="circle" iconSize={8} formatter={v=><span style={{color:"#6b7280",fontSize:11}}>{v}</span>}/>
                </PieChart>
              )}
            </ChartBox>
          </div>

          {/* Top absent employees */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFire className="text-red-500"/>
              <h2 className="font-semibold text-gray-700">Top Absent Employees</h2>
              <span className="ml-auto text-xs text-gray-400">This month</span>
            </div>
            {topAbsent.length===0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <FaCheckCircle className="mx-auto mb-2 text-green-400" size={24}/>
                No absence records this month
              </div>
            ) : (
              <div className="space-y-3">
                {topAbsent.map((emp,i)=>{
                  const pct = Math.min(100, Math.round((emp.absences/22)*100));
                  return (
                    <div key={emp.id} className="flex items-center gap-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i===0?"bg-red-100 text-red-600":i===1?"bg-amber-100 text-amber-600":"bg-gray-100 text-gray-500"}`}>
                        {i+1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 truncate">{emp.name}</span>
                          <span className="text-xs text-red-600 font-semibold ml-2 flex-shrink-0">{emp.absences} days</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-400" style={{ width:`${pct}%` }}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================
          TAB: LEAVES
      ================================================ */}
      {activeTab==="leaves" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <KPICard title="Pending"  value={stats.pendingLeaves||0}            icon={<FaHourglassHalf/>} color={C.amber} iconBg="bg-amber-100"  iconColor="text-amber-600"  sub="Awaiting review"  onClick={()=>navigate("/admin/leaves")} pulse={(stats.pendingLeaves||0)>0}/>
            <KPICard title="Approved" value={stats.approvedLeavesThisMonth||0}  icon={<FaCheckCircle/>}   color={C.green} iconBg="bg-green-100"  iconColor="text-green-600"  sub="This month"/>
            <KPICard title="Rejected" value={stats.rejectedLeavesThisMonth||0}  icon={<FaUserSlash/>}     color={C.red}   iconBg="bg-red-100"    iconColor="text-red-600"    sub="This month"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartBox title="Leave Applications" subtitle="Last 6 months" hasData={hasLeave} emptyMsg="No leave data yet">
              {w=><SVGBar data={leaveTrend} dataKey="count" color={C.indigo} width={w} height={CHART_H}/>}
            </ChartBox>

            <ChartBox title="Leave Status Breakdown" subtitle="This month" hasData={leaveTypes.length>0} emptyMsg="No leave data this month">
              {w=>(
                <PieChart width={w} height={CHART_H}>
                  <Pie data={leaveTypes} dataKey="value" nameKey="type" cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {leaveTypes.map((_,i)=><Cell key={i} fill={PIE_LEAVE[i%PIE_LEAVE.length]} stroke="transparent"/>)}
                  </Pie>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconType="circle" iconSize={8} formatter={v=><span style={{color:"#6b7280",fontSize:11}}>{v}</span>}/>
                </PieChart>
              )}
            </ChartBox>
          </div>

          {/* Pending leaves table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaHourglassHalf className="text-amber-500"/>
                <h2 className="font-semibold text-gray-700">Pending Leave Requests</h2>
              </div>
              <button onClick={()=>navigate("/admin/leaves")} className="text-xs text-blue-600 hover:underline">View all →</button>
            </div>
            {recentLeaves.length===0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <FaCheckCircle className="mx-auto mb-2 text-green-400" size={24}/>
                No pending requests
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-medium">Employee</th>
                      <th className="pb-3 font-medium">Reason</th>
                      <th className="pb-3 font-medium">From</th>
                      <th className="pb-3 font-medium">To</th>
                      <th className="pb-3 font-medium">Applied</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentLeaves.map(l=>(
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3">
                          <div className="font-medium text-gray-700">{l.name}</div>
                          <div className="text-xs text-gray-400">{l.email}</div>
                        </td>
                        <td className="py-3 text-gray-500 max-w-[120px] truncate">{l.reason}</td>
                        <td className="py-3 text-gray-600 whitespace-nowrap text-xs">
                          {new Date(l.fromDate).toLocaleDateString("en-IN",{ day:"numeric", month:"short" })}
                        </td>
                        <td className="py-3 text-gray-600 whitespace-nowrap text-xs">
                          {new Date(l.toDate).toLocaleDateString("en-IN",{ day:"numeric", month:"short" })}
                        </td>
                        <td className="py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(l.appliedOn).toLocaleDateString("en-IN",{ day:"numeric", month:"short" })}
                        </td>
                        <td className="py-3">
                          <button onClick={()=>navigate("/admin/leaves")}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition-colors">
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================
          TAB: ANALYSTS
      ================================================ */}
      {activeTab==="analysts" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <KPICard title="Active"     value={stats.totalAnalysts||0}      icon={<FaUserCheck/>}  color={C.teal}   iconBg="bg-teal-100"   iconColor="text-teal-600"   sub="Analysts" onClick={()=>navigate("/analysts")}/>
            <KPICard title="Terminated" value={stats.terminatedAnalysts||0} icon={<FaUserSlash/>}  color={C.red}    iconBg="bg-red-100"    iconColor="text-red-600"    sub="All time"  onClick={()=>navigate("/admin/terminated-analysts")}/>
            <KPICard title="Present"    value={todayAnalysts.present}       icon={<FaCheckCircle/>} color={C.green} iconBg="bg-green-100"  iconColor="text-green-600"  sub="Today"/>
            <KPICard title="Absent"     value={todayAnalysts.absent}        icon={<FaExclamationTriangle/>} color={C.red} iconBg="bg-red-100" iconColor="text-red-600" sub="Today"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Shift Distribution Pie */}
            <ChartBox title="Shift Distribution" subtitle="Active analysts by shift" hasData={shiftDistribution.length>0} emptyMsg="No analyst data">
              {w=>(
                <PieChart width={w} height={CHART_H}>
                  <Pie data={shiftDistribution} dataKey="count" nameKey="shift" cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {shiftDistribution.map((s,i)=>(
                      <Cell key={i} fill={SHIFT_COLORS[s.shift]||C.blue} stroke="transparent"/>
                    ))}
                  </Pie>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconType="circle" iconSize={8} formatter={v=><span style={{color:"#6b7280",fontSize:11}}>{v}</span>}/>
                </PieChart>
              )}
            </ChartBox>

            {/* Analyst trend */}
            <ChartBox title="Analyst Attendance Trend" subtitle="Last 7 days (%)" hasData={hasCombined} emptyMsg="No analyst data yet">
              {w=>(
                <LineChart width={w} height={CHART_H} data={combinedTrend} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={tickStyle} axisLine={false} tickLine={false}/>
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[0,100]}/>
                  <Tooltip content={<CTip/>}/>
                  <Line type="monotone" dataKey="analyst" name="analyst" stroke={C.teal} strokeWidth={2.5}
                    dot={{ fill:C.teal, r:3, strokeWidth:0 }}
                    activeDot={{ r:5, fill:"#fff", stroke:C.teal, strokeWidth:2 }}
                  />
                </LineChart>
              )}
            </ChartBox>
          </div>

          {/* Shift breakdown cards */}
          {shiftDistribution.length>0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FaUserClock className="text-indigo-500"/>
                <h2 className="font-semibold text-gray-700">Analysts by Shift</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {shiftDistribution.map(s=>(
                  <div key={s.shift} className="rounded-xl p-4 text-center"
                    style={{ background: (SHIFT_COLORS[s.shift]||C.blue)+"18" }}>
                    <div className="text-2xl font-bold" style={{ color: SHIFT_COLORS[s.shift]||C.blue }}>{s.count}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium capitalize">{s.shift.toLowerCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </Layout>
  );
};

/* ============================================================
   KPI CARD
============================================================ */
const KPICard = ({ title, value, icon, color, iconBg, iconColor, sub, trend, onClick, pulse }) => (
  <div onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden transition-all ${onClick?"cursor-pointer hover:shadow-md hover:-translate-y-0.5":""}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center text-base`}>{icon}</div>
      {pulse && (
        <span className="relative flex h-2.5 w-2.5 mt-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
        </span>
      )}
    </div>
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{title}</p>
    <h2 className="text-3xl font-bold mt-1 tracking-tight" style={{ color }}>{value}</h2>
    <div className="flex items-center justify-between mt-2">
      <p className="text-xs text-gray-400">{sub}</p>
      {trend!==undefined && trend!==0 && (
        <span className={`flex items-center gap-1 text-xs font-semibold ${trend>=0?"text-green-600":"text-red-500"}`}>
          {trend>=0?<FaArrowUp size={9}/>:<FaArrowDown size={9}/>}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

/* ============================================================
   SNAPSHOT CARD
============================================================ */
const SnapshotCard = ({ label, value, color, bg, icon }) => (
  <div className={`${bg} rounded-xl p-4 text-center`}>
    <div className={`${color} flex justify-center mb-2 text-lg`}>{icon}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
  </div>
);

export default AdminDashboard;