import { useEffect, useState, useMemo, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaSearch, FaSyncAlt, FaEye, FaTimes, FaFilter,
  FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock,
  FaLeaf, FaUsers, FaChartBar, FaUserTie, FaArrowLeft,
  FaArrowRight, FaCalendarCheck, FaHourglassHalf,
  FaExclamationTriangle, FaMoon, FaSun,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const DAY_TYPE_CONFIG = {
  FULL:            { label:"Full Day",       short:"F",  bg:"bg-green-100",   text:"text-green-700"  },
  HALF:            { label:"Half Day",       short:"H",  bg:"bg-amber-100",   text:"text-amber-700"  },
  ABSENT:          { label:"Absent",         short:"A",  bg:"bg-red-100",     text:"text-red-700"    },
  WEEKOFF:         { label:"Week Off",       short:"WO", bg:"bg-gray-100",    text:"text-gray-600"   },
  WEEKOFF_PRESENT: { label:"WO Present",     short:"WP", bg:"bg-teal-100",    text:"text-teal-700"   },
  PAID_LEAVE:      { label:"Paid Leave",     short:"PL", bg:"bg-blue-100",    text:"text-blue-700"   },
  PAID_HOLIDAY:    { label:"Paid Holiday",   short:"PH", bg:"bg-purple-100",  text:"text-purple-700" },
  PENDING_WEEKOFF: { label:"Pending WO",     short:"PW", bg:"bg-orange-100",  text:"text-orange-700" },
};

const ROLES       = ["ALL","ADMIN","HR","EMPLOYEE"];
const DEPARTMENTS = ["ALL","SQ","Spiideo","Annotation","Vidswap"];
const DAY_TYPES   = ["ALL", ...Object.keys(DAY_TYPE_CONFIG)];

/* ============================================================
   HELPERS
============================================================ */
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", weekday:"short" });

const DayBadge = ({ type }) => {
  const c = DAY_TYPE_CONFIG[type] || { label: type, bg:"bg-gray-100", text:"text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

const Avatar = ({ name, size="md" }) => {
  const sz  = size==="lg"?"w-12 h-12 text-base":size==="sm"?"w-7 h-7 text-xs":"w-9 h-9 text-sm";
  const grd = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const i   = (name?.charCodeAt(0)||0)%grd.length;
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()||"U"}
    </div>
  );
};

const StatCard = ({ label, value, color, bg, icon }) => (
  <div className={`${bg} rounded-2xl p-4`}>
    <div className={`${color} mb-2 text-lg`}>{icon}</div>
    <div className={`text-2xl font-bold ${color}`}>{value ?? "—"}</div>
    <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
  </div>
);

/* ============================================================
   MINI CALENDAR HEATMAP
============================================================ */
const AttendanceHeatmap = ({ records, month, year }) => {
  const getColor = (type) => {
    if (!type) return "bg-gray-100";
    const map = {
      FULL:"bg-green-400", HALF:"bg-amber-300", ABSENT:"bg-red-400",
      WEEKOFF:"bg-gray-300", WEEKOFF_PRESENT:"bg-teal-400",
      PAID_LEAVE:"bg-blue-400", PAID_HOLIDAY:"bg-purple-400",
    };
    return map[type] || "bg-gray-100";
  };

  // build day→type map
  const dayMap = {};
  records.forEach(r => {
    const d = new Date(r.date).getDate();
    dayMap[d] = r.dayType;
  });

  const firstDay   = new Date(year, month-1, 1).getDay();
  const totalDays  = new Date(year, month, 0).getDate();
  const days       = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const cells      = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=totalDays; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d=><div key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div key={i}
            title={cell ? `${cell}: ${dayMap[cell] ? DAY_TYPE_CONFIG[dayMap[cell]]?.label || dayMap[cell] : "Not marked"}` : ""}
            className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium
              ${cell ? getColor(dayMap[cell]) : "bg-transparent"}
              ${cell && dayMap[cell] ? "text-white" : cell ? "text-gray-400" : ""}
            `}>
            {cell}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {Object.entries(DAY_TYPE_CONFIG).map(([k,v])=>(
          <div key={k} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${v.bg.replace("100","400")}`}/>
            <span className="text-[10px] text-gray-400">{v.short}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   USER DETAIL DRAWER
============================================================ */
const UserDrawer = ({ userId, userName, onClose }) => {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  });
  const [toDate, setToDate]     = useState(() => new Date().toISOString().split("T")[0]);
  const [dayTypeFilter, setDayTypeFilter] = useState("ALL");
  const [page, setPage]         = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ fromDate, toDate, page, limit: 31 });
      if (dayTypeFilter !== "ALL") params.append("dayType", dayTypeFilter);
      const res = await api.get(`/admin/attendance-report/${userId}?${params}`);
      setData(res.data);
    } catch { }
    finally { setLoading(false); }
  }, [userId, fromDate, toDate, dayTypeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={userName} size="lg"/>
              <div>
                <h2 className="text-lg font-bold">{data?.user?.name || userName}</h2>
                <p className="text-blue-200 text-sm">{data?.user?.email || ""}</p>
                {data?.user?.department && (
                  <span className="inline-block mt-1.5 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                    {data.user.department}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <FaTimes size={13}/>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 p-5 space-y-5">

          {/* FILTERS */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter Records</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                <input type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setPage(1);}}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                <input type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setPage(1);}}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>
            </div>
            <select value={dayTypeFilter} onChange={e=>{setDayTypeFilter(e.target.value);setPage(1);}}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="ALL">All Day Types</option>
              {Object.entries(DAY_TYPE_CONFIG).map(([k,v])=>(
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            </div>
          ) : data ? (
            <>
              {/* SUMMARY CARDS */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h3>
                <div className="grid grid-cols-4 gap-2">
                  <StatCard label="Full"     value={data.summary.full}     color="text-green-600"  bg="bg-green-50"  icon={<FaCheckCircle size={14}/>}/>
                  <StatCard label="Half"     value={data.summary.half}     color="text-amber-600"  bg="bg-amber-50"  icon={<FaClock size={14}/>}/>
                  <StatCard label="Absent"   value={data.summary.absent}   color="text-red-600"    bg="bg-red-50"    icon={<FaTimesCircle size={14}/>}/>
                  <StatCard label="Leaves"   value={data.summary.paidLeave} color="text-blue-600"  bg="bg-blue-50"   icon={<FaLeaf size={14}/>}/>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-700">{data.summary.totalHours}h</div>
                    <div className="text-xs text-gray-400">Total Hours</div>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-teal-600">{data.summary.weekoffPresent}</div>
                    <div className="text-xs text-gray-400">WO Present</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-700">{data.summary.totalRecords}</div>
                    <div className="text-xs text-gray-400">Total Days</div>
                  </div>
                </div>
              </div>

              {/* HEATMAP */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Monthly Heatmap — {new Date(0, now.getMonth()).toLocaleString("en",{month:"long"})} {now.getFullYear()}
                </h3>
                <AttendanceHeatmap
                  records={data.records}
                  month={now.getMonth()+1}
                  year={now.getFullYear()}
                />
              </div>

              {/* RECORDS TABLE */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Records ({data.total})
                  </h3>
                  {data.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                        className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-40">
                        <FaArrowLeft size={10}/>
                      </button>
                      <span className="text-xs text-gray-500">{page}/{data.totalPages}</span>
                      <button onClick={()=>setPage(p=>Math.min(data.totalPages,p+1))} disabled={page===data.totalPages}
                        className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-40">
                        <FaArrowRight size={10}/>
                      </button>
                    </div>
                  )}
                </div>

                {data.records.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No records found for this range</div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      <div className="col-span-4">Date</div>
                      <div className="col-span-2">In</div>
                      <div className="col-span-2">Out</div>
                      <div className="col-span-2">Hrs</div>
                      <div className="col-span-2">Type</div>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                      {data.records.map(r => {
                        const cfg = DAY_TYPE_CONFIG[r.dayType];
                        return (
                          <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-gray-50/80 text-sm">
                            <div className="col-span-4">
                              <p className="text-xs font-medium text-gray-700">
                                {new Date(r.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(r.date).toLocaleDateString("en-IN",{weekday:"short"})}
                              </p>
                            </div>
                            <div className="col-span-2 text-xs text-gray-600">{r.checkIn||"—"}</div>
                            <div className="col-span-2 text-xs text-gray-600">{r.checkOut||"—"}</div>
                            <div className="col-span-2 text-xs font-semibold text-indigo-600">
                              {r.totalHours ? `${r.totalHours}h` : "—"}
                            </div>
                            <div className="col-span-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cfg?.bg||"bg-gray-100"} ${cfg?.text||"text-gray-600"}`}>
                                {cfg?.short||r.dayType}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Failed to load data</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN PAGE
============================================================ */
const AdminAttendance = () => {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [overview, setOverview]   = useState(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const [drawerUser, setDrawerUser] = useState(null); // { id, name }

  const LIMIT = 20;

  /* load overview once */
  useEffect(() => {
    api.get("/admin/attendance-overview")
      .then(r => setOverview(r.data))
      .catch(() => {});
  }, []);

  /* load users list */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search.trim())        params.append("search",     search.trim());
      if (roleFilter !== "ALL") params.append("role",       roleFilter);
      if (deptFilter !== "ALL") params.append("department", deptFilter);

      const res = await api.get(`/admin/attendance-report?${params}`);
      const d = res.data;

      setUsers(d.data || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, deptFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  /* reset to page 1 when filters change */
  useEffect(() => { setPage(1); }, [search, roleFilter, deptFilter]);

  const hasFilters = search || roleFilter !== "ALL" || deptFilter !== "ALL";

  return (
    <Layout>

      {/* ============================
          HEADER
      ============================ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarCheck className="text-blue-600"/> Analyst Attendance Report
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">View and analyse employee attendance</p>
        </div>
        <button onClick={loadUsers}
          className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl">
          <FaSyncAlt size={11}/> Refresh
        </button>
      </div>

      {/* ============================
          OVERVIEW STAT CARDS
      ============================ */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <StatCard label="Total Users"    value={overview.totalUsers}      color="text-blue-600"   bg="bg-blue-50"   icon={<FaUsers size={15}/>}/>
          <StatCard label="Present Today"  value={overview.presentToday}    color="text-green-600"  bg="bg-green-50"  icon={<FaCheckCircle size={15}/>}/>
          <StatCard label="Absent Today"   value={overview.absentToday}     color="text-red-600"    bg="bg-red-50"    icon={<FaTimesCircle size={15}/>}/>
          <StatCard label="On Leave"       value={overview.onLeaveToday}    color="text-amber-600"  bg="bg-amber-50"  icon={<FaLeaf size={15}/>}/>
          <StatCard label="Month Rate"     value={`${overview.attendanceRate}%`} color="text-indigo-600" bg="bg-indigo-50" icon={<FaChartBar size={15}/>}/>
          <StatCard label="Avg Hours/Day"  value={`${overview.avgHours}h`}  color="text-teal-600"   bg="bg-teal-50"   icon={<FaClock size={15}/>}/>
          <StatCard label="Pending Leaves" value={overview.pendingLeaves}   color="text-purple-600" bg="bg-purple-50" icon={<FaHourglassHalf size={15}/>}/>
        </div>
      )}

      {/* ============================
          SEARCH + FILTERS
      ============================ */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
        </div>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          {ROLES.map(r=><option key={r} value={r}>{r==="ALL"?"All Roles":r}</option>)}
        </select>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          {DEPARTMENTS.map(d=><option key={d} value={d}>{d==="ALL"?"All Depts":d}</option>)}
        </select>
        {hasFilters && (
          <button onClick={()=>{setSearch("");setRoleFilter("ALL");setDeptFilter("ALL");}}
            className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl">
            <FaTimes size={10}/> Clear
          </button>
        )}
      </div>

      {/* ============================
          USER TABLE
      ============================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* TABLE HEADER */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">Employee</div>
          <div className="col-span-2 hidden sm:block">Role / Dept</div>
          <div className="col-span-2 hidden md:block text-center">Full</div>
          <div className="col-span-1 hidden md:block text-center">Half</div>
          <div className="col-span-1 hidden md:block text-center">Absent</div>
          <div className="col-span-1 hidden lg:block text-center">Leave</div>
          <div className="col-span-2 lg:col-span-1 text-right">Action</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaUsers className="text-gray-300" size={24}/>
            </div>
            <p className="text-gray-500 font-medium">No users found</p>
            {hasFilters && (
              <button onClick={()=>{setSearch("");setRoleFilter("ALL");setDeptFilter("ALL");}}
                className="text-sm text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(u => {
              const s = u.thisMonth;
              const presentPct = s.full + s.half + s.weekoffPresent;
              return (
                <div key={u.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors group">

                  {/* USER */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <Avatar name={u.name}/>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* ROLE / DEPT */}
                  <div className="col-span-2 hidden sm:block">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      u.role==="ADMIN"?"bg-purple-100 text-purple-700":u.role==="HR"?"bg-blue-100 text-blue-700":"bg-green-100 text-green-700"
                    }`}>{u.role}</span>
                    {u.department && (
                      <p className="text-[10px] text-gray-400 mt-1">{u.department}</p>
                    )}
                  </div>

                  {/* THIS MONTH COUNTS */}
                  <div className="col-span-2 hidden md:flex justify-center">
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2.5 py-1">
                      <FaCheckCircle size={10}/>
                      <span className="text-xs font-bold">{s.full}</span>
                    </div>
                  </div>
                  <div className="col-span-1 hidden md:flex justify-center">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{s.half}</span>
                  </div>
                  <div className="col-span-1 hidden md:flex justify-center">
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">{s.absent}</span>
                  </div>
                  <div className="col-span-1 hidden lg:flex justify-center">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{s.paidLeave}</span>
                  </div>

                  {/* ACTION */}
                  <div className="col-span-2 lg:col-span-1 flex justify-end">
                    <button onClick={()=>setDrawerUser({ id:u.id, name:u.name })}
                      className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl font-medium transition-colors">
                      <FaEye size={11}/> View
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* FOOTER + PAGINATION */}
        {!loading && users.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total} users
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg disabled:opacity-40">
                  <FaArrowLeft size={10}/> Prev
                </button>
                <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg disabled:opacity-40">
                  Next <FaArrowRight size={10}/>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================
          USER DETAIL DRAWER
      ============================ */}
      {drawerUser && (
        <UserDrawer
          userId={drawerUser.id}
          userName={drawerUser.name}
          onClose={()=>setDrawerUser(null)}
        />
      )}

    </Layout>
  );
};

export default AdminAttendance;