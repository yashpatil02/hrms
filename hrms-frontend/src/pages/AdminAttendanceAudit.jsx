import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import {
  FaHistory, FaSearch, FaSyncAlt, FaTimes,
  FaCheckCircle, FaEdit, FaArrowLeft, FaArrowRight,
  FaUserTie, FaCalendarAlt, FaChartBar, FaDownload,
  FaExclamationTriangle, FaEye, FaFilter, FaListUl,
  FaStream, FaClock, FaUsers, FaBolt,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const SHIFTS = ["ALL","MORNING","AFTERNOON","GENERAL","EVENING","NIGHT"];

const SHIFT_STYLE = {
  MORNING:   { bg:"bg-amber-100",  text:"text-amber-700",  dot:"bg-amber-400"  },
  AFTERNOON: { bg:"bg-sky-100",    text:"text-sky-700",    dot:"bg-sky-400"    },
  GENERAL:   { bg:"bg-gray-100",   text:"text-gray-600",   dot:"bg-gray-400"   },
  EVENING:   { bg:"bg-purple-100", text:"text-purple-700", dot:"bg-purple-400" },
  NIGHT:     { bg:"bg-indigo-100", text:"text-indigo-700", dot:"bg-indigo-400" },
};

const STATUS_STYLE = {
  PRESENT:    { bg:"bg-green-100",  text:"text-green-700",  label:"Present"    },
  ABSENT:     { bg:"bg-red-100",    text:"text-red-700",    label:"Absent"     },
  HALF_DAY:   { bg:"bg-amber-100",  text:"text-amber-700",  label:"Half Day"   },
  PAID_LEAVE: { bg:"bg-blue-100",   text:"text-blue-700",   label:"Paid Leave" },
};

const ACTION_STYLE = {
  CREATE: { bg:"bg-emerald-100", text:"text-emerald-700", border:"border-emerald-300", dot:"bg-emerald-500", label:"Created" },
  UPDATE: { bg:"bg-blue-100",    text:"text-blue-700",    border:"border-blue-300",    dot:"bg-blue-500",    label:"Updated" },
};

/* ============================================================
   HELPERS
============================================================ */
const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const s = STATUS_STYLE[status] || { bg:"bg-gray-100", text:"text-gray-600", label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

const ShiftBadge = ({ shift }) => {
  const s = SHIFT_STYLE[shift] || { bg:"bg-gray-100", text:"text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {shift}
    </span>
  );
};

const Avatar = ({ name, size="sm" }) => {
  const sz  = size==="sm"?"w-7 h-7 text-xs":"w-9 h-9 text-sm";
  const grd = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const i   = (name?.charCodeAt(0)||0)%grd.length;
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()||"?"}
    </div>
  );
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now()-new Date(date))/1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return new Date(date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
};

const fullDateTime = (date) =>
  new Date(date).toLocaleString("en-IN",{
    weekday:"short", day:"numeric", month:"short",
    year:"numeric", hour:"2-digit", minute:"2-digit",
  });

/* ============================================================
   EXPORT TO CSV
============================================================ */
const exportCSV = (logs) => {
  const header = ["Date","Analyst","Department","Shift","Old Status","New Status","Action","Changed By","Changed At"];
  const rows   = logs.map(l => [
    new Date(l.date).toLocaleDateString("en-IN"),
    l.analyst?.name || "",
    l.analyst?.department || "",
    l.shift,
    l.oldStatus || "",
    l.newStatus,
    l.action,
    l.admin?.name || "",
    new Date(l.createdAt).toLocaleString("en-IN"),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ============================================================
   ANALYST DETAIL MODAL
============================================================ */
const AnalystModal = ({ analyst, logs, onClose }) => {
  const analystLogs = logs.filter(l => l.analyst?.name === analyst);
  const creates     = analystLogs.filter(l => l.action === "CREATE").length;
  const updates     = analystLogs.filter(l => l.action === "UPDATE").length;

  const statusBreakdown = analystLogs.reduce((acc, l) => {
    acc[l.newStatus] = (acc[l.newStatus]||0)+1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={analyst} size="md"/>
              <div>
                <h2 className="font-bold text-lg">{analyst}</h2>
                <p className="text-purple-200 text-sm">{analystLogs[0]?.analyst?.department || ""}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <FaTimes size={13}/>
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{analystLogs.length}</div>
              <div className="text-xs text-gray-400">Total Changes</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{creates}</div>
              <div className="text-xs text-gray-400">New Entries</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{updates}</div>
              <div className="text-xs text-gray-400">Updates</div>
            </div>
          </div>

          {/* STATUS BREAKDOWN */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status Breakdown</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(statusBreakdown).map(([status, count]) => {
                const s = STATUS_STYLE[status] || { bg:"bg-gray-100", text:"text-gray-600", label:status };
                return (
                  <div key={status} className={`${s.bg} rounded-xl p-3 flex items-center justify-between`}>
                    <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                    <span className={`text-lg font-bold ${s.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RECENT CHANGES TIMELINE */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Changes</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analystLogs.slice(0,10).map((l,i) => {
                const ac = ACTION_STYLE[l.action];
                return (
                  <div key={l.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${ac.dot} mt-1.5 flex-shrink-0`}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ShiftBadge shift={l.shift}/>
                        {l.oldStatus && <><StatusBadge status={l.oldStatus}/><span className="text-gray-300 text-xs">→</span></>}
                        <StatusBadge status={l.newStatus}/>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(l.date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                        &nbsp;·&nbsp;by {l.admin?.name}
                        &nbsp;·&nbsp;{timeAgo(l.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TIMELINE VIEW
============================================================ */
const TimelineView = ({ logs }) => {
  if (logs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <FaStream className="text-gray-200" size={32}/>
      <p className="text-gray-400 text-sm">No logs to display</p>
    </div>
  );

  /* group by date */
  const groups = {};
  logs.forEach(l => {
    const d = new Date(l.createdAt);
    const today = new Date(); today.setHours(0,0,0,0);
    const yest  = new Date(today); yest.setDate(today.getDate()-1);
    const nd    = new Date(d); nd.setHours(0,0,0,0);
    const key   = nd.getTime()===today.getTime()?"Today"
                : nd.getTime()===yest.getTime() ?"Yesterday"
                : d.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  return (
    <div className="space-y-6 p-5">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          {/* DATE DIVIDER */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{date}</span>
            <div className="flex-1 h-px bg-gray-100"/>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
          </div>

          {/* TIMELINE ITEMS */}
          <div className="relative ml-3">
            {/* vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100"/>

            <div className="space-y-1">
              {items.map((l, i) => {
                const ac = ACTION_STYLE[l.action] || ACTION_STYLE.CREATE;
                const isUpdate = l.action === "UPDATE";
                return (
                  <div key={l.id} className="relative flex items-start gap-4 pl-8 pb-4">
                    {/* dot */}
                    <div className={`absolute left-0 w-6 h-6 rounded-xl ${ac.bg} border-2 ${ac.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {isUpdate ? <FaEdit size={9} className={ac.text}/> : <FaCheckCircle size={9} className={ac.text}/>}
                    </div>

                    {/* card */}
                    <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar name={l.analyst?.name} size="sm"/>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">{l.analyst?.name}</span>
                            {l.analyst?.department && (
                              <span className="text-xs text-gray-400 ml-1.5">· {l.analyst.department}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400" title={fullDateTime(l.createdAt)}>
                          {timeAgo(l.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <ShiftBadge shift={l.shift}/>
                        <span className="text-gray-300 text-xs">
                          {new Date(l.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                        </span>
                        {isUpdate && l.oldStatus ? (
                          <>
                            <StatusBadge status={l.oldStatus}/>
                            <span className="text-gray-300">→</span>
                            <StatusBadge status={l.newStatus}/>
                          </>
                        ) : (
                          <StatusBadge status={l.newStatus}/>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ac.bg} ${ac.text}`}>
                          {ac.label}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 mt-1.5">
                        By <span className="font-medium text-gray-600">{l.admin?.name}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function AdminAttendanceAudit() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats]         = useState(null);

  /* view */
  const [view, setView]           = useState("table"); // table | timeline
  const [analystModal, setAnalystModal] = useState(null);

  /* filters */
  const [actionFilter, setActionFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter]   = useState("ALL");
  const [search, setSearch]             = useState("");
  const [fromDate, setFromDate]         = useState("");
  const [toDate, setToDate]             = useState("");
  const [page, setPage]                 = useState(1);
  const LIMIT = 25;

  /* ============================================================
     LOAD QUICK STATS (top cards) — all logs, no pagination
  ============================================================ */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res  = await api.get("/admin/attendance-audit?page=1&limit=500");
      const data = res.data;
      const all  = Array.isArray(data) ? data : (data.data || []);

      const creates = all.filter(l => l.action === "CREATE").length;
      const updates = all.filter(l => l.action === "UPDATE").length;

      /* top analysts (most changes) */
      const analystCount = {};
      all.forEach(l => {
        const name = l.analyst?.name;
        if (name) analystCount[name] = (analystCount[name]||0)+1;
      });
      const topAnalysts = Object.entries(analystCount)
        .sort((a,b) => b[1]-a[1])
        .slice(0,5)
        .map(([name, count]) => ({ name, count }));

      /* top admins */
      const adminCount = {};
      all.forEach(l => {
        const name = l.admin?.name;
        if (name) adminCount[name] = (adminCount[name]||0)+1;
      });
      const topAdmins = Object.entries(adminCount)
        .sort((a,b) => b[1]-a[1])
        .slice(0,3)
        .map(([name, count]) => ({ name, count }));

      /* status distribution */
      const statusDist = {};
      all.forEach(l => {
        statusDist[l.newStatus] = (statusDist[l.newStatus]||0)+1;
      });

      /* shift distribution */
      const shiftDist = {};
      all.forEach(l => {
        shiftDist[l.shift] = (shiftDist[l.shift]||0)+1;
      });

      /* today's count */
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayCount = all.filter(l => new Date(l.createdAt) >= todayStart).length;

      setStats({ total: all.length, creates, updates, topAnalysts, topAdmins, statusDist, shiftDist, todayCount });
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  /* ============================================================
     LOAD PAGINATED LOGS
  ============================================================ */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (actionFilter !== "ALL") params.append("action",   actionFilter);
      if (shiftFilter  !== "ALL") params.append("shift",    shiftFilter);
      if (fromDate)               params.append("fromDate", fromDate);
      if (toDate)                 params.append("toDate",   toDate);
      if (search.trim())          params.append("search",   search.trim());

      const res  = await api.get(`/admin/attendance-audit?${params}`);
      const data = res.data;

      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setLogs(Array.isArray(data.data) ? data.data : []);
        setTotal(data.total     || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, shiftFilter, fromDate, toDate, search]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadLogs();  }, [loadLogs]);
  useEffect(() => { setPage(1);  }, [actionFilter, shiftFilter, fromDate, toDate, search]);

  const clearFilters = () => {
    setActionFilter("ALL"); setShiftFilter("ALL");
    setFromDate(""); setToDate(""); setSearch(""); setPage(1);
  };

  const handleRefresh = () => { loadStats(); loadLogs(); };

  const hasFilters = actionFilter!=="ALL"||shiftFilter!=="ALL"||fromDate||toDate||search;

  /* unique analysts in current logs (for filter by analyst modal) */
  const uniqueAnalysts = useMemo(() =>
    [...new Set(logs.map(l=>l.analyst?.name).filter(Boolean))],
  [logs]);

  return (
    <Layout>

      {/* ============================
          HEADER
      ============================ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaHistory className="text-purple-600"/> Attendance Audit Trail
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Complete history of all attendance changes · {total} filtered records
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl transition-colors">
            <FaSyncAlt size={11}/> Refresh
          </button>
          {logs.length > 0 && (
            <button onClick={() => exportCSV(logs)}
              className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium">
              <FaDownload size={11}/> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ============================
          STAT CARDS
      ============================ */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2 text-purple-600"><FaHistory size={14}/></div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-400 mt-0.5">Total Changes</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2 text-emerald-600"><FaCheckCircle size={14}/></div>
            <div className="text-2xl font-bold text-emerald-600">{stats.creates}</div>
            <div className="text-xs text-gray-400 mt-0.5">New Entries</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-600"><FaEdit size={14}/></div>
            <div className="text-2xl font-bold text-blue-600">{stats.updates}</div>
            <div className="text-xs text-gray-400 mt-0.5">Updates</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-600"><FaBolt size={14}/></div>
            <div className="text-2xl font-bold text-amber-600">{stats.todayCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">Today</div>
          </div>
        </div>
      )}

      {/* ============================
          STATS PANELS (top analysts + status dist)
      ============================ */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* TOP ANALYSTS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
              <FaUserTie className="text-purple-500"/> Most Changed Analysts
            </h3>
            <div className="space-y-2.5">
              {stats.topAnalysts.length === 0 ? (
                <p className="text-xs text-gray-400">No data</p>
              ) : stats.topAnalysts.map((a, i) => {
                const pct = Math.round((a.count/stats.total)*100);
                return (
                  <div key={a.name} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      i===0?"bg-amber-100 text-amber-700":i===1?"bg-gray-100 text-gray-600":"bg-gray-50 text-gray-400"
                    }`}>{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <button
                          onClick={() => setAnalystModal(a.name)}
                          className="text-xs font-semibold text-gray-700 hover:text-purple-600 transition-colors truncate text-left"
                        >{a.name}</button>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{a.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width:`${pct}%` }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STATUS DISTRIBUTION */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
              <FaChartBar className="text-blue-500"/> Status Distribution
            </h3>
            <div className="space-y-2.5">
              {Object.entries(stats.statusDist).length === 0 ? (
                <p className="text-xs text-gray-400">No data</p>
              ) : Object.entries(stats.statusDist)
                  .sort((a,b)=>b[1]-a[1])
                  .map(([status, count]) => {
                    const s   = STATUS_STYLE[status] || { bg:"bg-gray-100", text:"text-gray-600", label:status };
                    const pct = Math.round((count/stats.total)*100);
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold w-20 text-center flex-shrink-0 ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.bg.replace("100","400")}`} style={{ width:`${pct}%` }}/>
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right flex-shrink-0">{count}</span>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* TOP ADMINS + SHIFT DIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
              <FaUsers className="text-teal-500"/> Top Admins by Activity
            </h3>
            <div className="space-y-2.5 mb-4">
              {stats.topAdmins.map((a, i) => {
                const pct = Math.round((a.count/stats.total)*100);
                return (
                  <div key={a.name} className="flex items-center gap-3">
                    <Avatar name={a.name} size="sm"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate">{a.name}</span>
                        <span className="text-xs text-gray-400">{a.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-400 rounded-full" style={{ width:`${pct}%` }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">By Shift</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.shiftDist).map(([sh, cnt]) => {
                  const s = SHIFT_STYLE[sh] || { bg:"bg-gray-100", text:"text-gray-600" };
                  return (
                    <span key={sh} className={`text-[10px] px-2 py-1 rounded-full font-semibold ${s.bg} ${s.text}`}>
                      {sh} · {cnt}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================
          FILTERS
      ============================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">

          <div className="relative flex-1 min-w-[180px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search analyst or admin..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"/>
          </div>

          <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option value="ALL">All Actions</option>
            <option value="CREATE">Created</option>
            <option value="UPDATE">Updated</option>
          </select>

          <select value={shiftFilter} onChange={e=>setShiftFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            {SHIFTS.map(s=><option key={s} value={s}>{s==="ALL"?"All Shifts":s}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"/>
            <span className="text-gray-400 text-xs">–</span>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"/>
          </div>

          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl transition-colors">
              <FaTimes size={10}/> Clear
            </button>
          )}

          {/* VIEW TOGGLE */}
          <div className="ml-auto flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={()=>setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view==="table"?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              <FaListUl size={10}/> Table
            </button>
            <button onClick={()=>setView("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view==="timeline"?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              <FaStream size={10}/> Timeline
            </button>
          </div>
        </div>
      </div>

      {/* ============================
          TABLE / TIMELINE
      ============================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaHistory className="text-gray-300" size={24}/>
            </div>
            <p className="text-gray-500 font-medium">No audit records found</p>
            <p className="text-gray-400 text-sm">{hasFilters?"Try clearing filters":"Changes will appear here"}</p>
            {hasFilters && <button onClick={clearFilters} className="text-sm text-purple-600 hover:underline">Clear filters</button>}
          </div>
        ) : view === "timeline" ? (
          <TimelineView logs={logs}/>
        ) : (
          <>
            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Analyst</div>
              <div className="col-span-1 hidden sm:block">Shift</div>
              <div className="col-span-2 hidden md:block">Old</div>
              <div className="col-span-2">New Status</div>
              <div className="col-span-1">Action</div>
              <div className="col-span-1 text-right">Time</div>
            </div>

            <div className="divide-y divide-gray-50">
              {logs.map(l => {
                const ac      = ACTION_STYLE[l.action] || ACTION_STYLE.CREATE;
                const isUpdate = l.action === "UPDATE";
                return (
                  <div key={l.id}
                    className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-gray-50/80 transition-colors ${
                      isUpdate ? "border-l-2 border-blue-300" : "border-l-2 border-emerald-300"
                    }`}>

                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-gray-700">
                        {new Date(l.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(l.date).toLocaleDateString("en-IN",{weekday:"short",year:"numeric"})}
                      </p>
                    </div>

                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <Avatar name={l.analyst?.name} size="sm"/>
                      <div className="min-w-0">
                        <button
                          onClick={() => setAnalystModal(l.analyst?.name)}
                          className="text-sm font-semibold text-gray-800 hover:text-purple-600 transition-colors truncate text-left block"
                        >{l.analyst?.name||"—"}</button>
                        <p className="text-[10px] text-gray-400 truncate">
                          {l.analyst?.department||""} · by {l.admin?.name||"—"}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-1 hidden sm:block">
                      <ShiftBadge shift={l.shift}/>
                    </div>

                    <div className="col-span-2 hidden md:block">
                      {isUpdate ? <StatusBadge status={l.oldStatus}/> : <span className="text-xs text-gray-300 italic">—</span>}
                    </div>

                    <div className="col-span-2">
                      <StatusBadge status={l.newStatus}/>
                    </div>

                    <div className="col-span-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ac.bg} ${ac.text}`}>
                        {isUpdate ? <FaEdit size={8}/> : <FaCheckCircle size={8}/>}
                        {ac.label}
                      </span>
                    </div>

                    <div className="col-span-1 text-right">
                      <p className="text-[10px] text-gray-400" title={fullDateTime(l.createdAt)}>
                        {timeAgo(l.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* FOOTER + PAGINATION */}
        {!loading && logs.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total} records
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg disabled:opacity-40">
                  <FaArrowLeft size={10}/> Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({length:Math.min(5,totalPages)}, (_,i) => {
                    let p;
                    if (totalPages<=5) p=i+1;
                    else if (page<=3) p=i+1;
                    else if (page>=totalPages-2) p=totalPages-4+i;
                    else p=page-2+i;
                    return (
                      <button key={p} onClick={()=>setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          p===page ? "bg-purple-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>{p}</button>
                    );
                  })}
                </div>
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
          ANALYST DETAIL MODAL
      ============================ */}
      {analystModal && (
        <AnalystModal
          analyst={analystModal}
          logs={logs}
          onClose={() => setAnalystModal(null)}
        />
      )}

    </Layout>
  );
}