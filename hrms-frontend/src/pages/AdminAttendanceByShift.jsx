import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import {
  FaCalendarCheck, FaSearch, FaSyncAlt, FaSave,
  FaCheckCircle, FaTimesCircle, FaClock, FaLeaf,
  FaExclamationTriangle, FaUsers, FaTimes,
  FaSun, FaMoon, FaBolt, FaLock, FaUnlock, FaEdit,
  FaChartBar,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const SHIFTS = ["MORNING","AFTERNOON","GENERAL","EVENING","NIGHT"];

const SHIFT_STYLE = {
  MORNING:   { bg:"bg-amber-100",  text:"text-amber-700",  icon:<FaSun size={12}/>   },
  AFTERNOON: { bg:"bg-sky-100",    text:"text-sky-700",    icon:<FaClock size={12}/> },
  GENERAL:   { bg:"bg-gray-100",   text:"text-gray-700",   icon:<FaUsers size={12}/> },
  EVENING:   { bg:"bg-purple-100", text:"text-purple-700", icon:<FaMoon size={12}/>  },
  NIGHT:     { bg:"bg-indigo-100", text:"text-indigo-700", icon:<FaMoon size={12}/>  },
};

const STATUS_CONFIG = {
  PRESENT:    { label:"Present",    short:"P",  bg:"bg-green-100",  text:"text-green-700",  icon:<FaCheckCircle size={11}/> },
  ABSENT:     { label:"Absent",     short:"A",  bg:"bg-red-100",    text:"text-red-700",    icon:<FaTimesCircle size={11}/> },
  HALF_DAY:   { label:"Half Day",   short:"H",  bg:"bg-amber-100",  text:"text-amber-700",  icon:<FaClock size={11}/>       },
  PAID_LEAVE: { label:"Paid Leave", short:"PL", bg:"bg-blue-100",   text:"text-blue-700",   icon:<FaLeaf size={11}/>        },
};

const STATUSES = Object.keys(STATUS_CONFIG);

const getShiftByTime = () => {
  const h = new Date().getHours();
  if (h < 9)  return "MORNING";
  if (h < 14) return "GENERAL";
  if (h < 16) return "AFTERNOON";
  if (h < 22) return "EVENING";
  return "NIGHT";
};

/* ============================================================
   SUB-COMPONENTS
============================================================ */
const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status];
  if (!c) return <span className="text-xs text-gray-300">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
};

const Avatar = ({ name }) => {
  const grd = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const i   = (name?.charCodeAt(0)||0) % grd.length;
  return (
    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()||"A"}
    </div>
  );
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium ${
      toast.type==="success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {toast.type==="success" ? <FaCheckCircle size={14}/> : <FaExclamationTriangle size={14}/>}
      {toast.msg}
    </div>
  );
};

/* ============================================================
   DAILY SUMMARY PANEL
============================================================ */
const DailySummaryPanel = ({ summary, date }) => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/daily-summary?date=${date}`);
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open, date]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FaChartBar className="text-indigo-500"/>
          <span className="font-semibold text-gray-700 text-sm">All Shifts — Daily Summary</span>
          <span className="text-xs text-gray-400">({date})</span>
        </div>
        <span className={`text-gray-400 text-xs transition-transform ${open?"rotate-180":""}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
            </div>
          ) : data ? (
            <>
              {/* OVERALL */}
              <div className="grid grid-cols-5 gap-3 mb-4">
                {[
                  { label:"Total",    value:data.total,           bg:"bg-gray-50",    text:"text-gray-700"   },
                  { label:"Present",  value:data.overall.present, bg:"bg-green-50",   text:"text-green-700"  },
                  { label:"Absent",   value:data.overall.absent,  bg:"bg-red-50",     text:"text-red-700"    },
                  { label:"Half Day", value:data.overall.halfDay, bg:"bg-amber-50",   text:"text-amber-700"  },
                  { label:"Unmarked", value:data.overall.unmarked,bg:"bg-gray-50",    text:"text-gray-500"   },
                ].map(s=>(
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                    <div className={`text-xl font-bold ${s.text}`}>{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* PER SHIFT */}
              <div className="space-y-2">
                {Object.entries(data.byShift).map(([sh, s]) => {
                  const st  = SHIFT_STYLE[sh];
                  const pct = s.total > 0 ? Math.round((s.present/s.total)*100) : 0;
                  return (
                    <div key={sh} className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold w-24 text-center ${st.bg} ${st.text}`}>
                        {sh}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all" style={{ width:`${pct}%` }}/>
                      </div>
                      <span className="text-xs text-gray-500 w-24 text-right">
                        {s.present}P · {s.absent}A · {s.halfDay}H · {s.unmarked} pending
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center">No data available</p>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SAVE CONFIRM MODAL
============================================================ */
const SaveConfirmModal = ({ created, updated, onConfirm, onCancel, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FaSave className="text-blue-600" size={20}/>
      </div>
      <h3 className="font-bold text-gray-800 text-center text-lg mb-2">Confirm Save</h3>
      <div className="flex justify-center gap-4 mb-5">
        {created > 0 && (
          <div className="text-center bg-green-50 rounded-xl px-4 py-2">
            <div className="text-xl font-bold text-green-600">{created}</div>
            <div className="text-xs text-gray-500">New records</div>
          </div>
        )}
        {updated > 0 && (
          <div className="text-center bg-amber-50 rounded-xl px-4 py-2">
            <div className="text-xl font-bold text-amber-600">{updated}</div>
            <div className="text-xs text-gray-500">Updated</div>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 text-center mb-5">
        An audit log entry will be created for each change.
      </p>
      <div className="flex gap-3">
        <button onClick={onConfirm} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</> : <><FaSave size={12}/>Confirm</>}
        </button>
        <button onClick={onCancel} disabled={saving}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
          Cancel
        </button>
      </div>
    </div>
  </div>
);

/* ============================================================
   MAIN PAGE
============================================================ */
export default function AdminAttendanceByShift() {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate]         = useState(today);
  const [shift, setShift]       = useState(getShiftByTime());
  const [analysts, setAnalysts] = useState([]);  // from backend (includes name/dept)
  const [summary, setSummary]   = useState(null);
  const [records, setRecords]   = useState({});  // { id: status } — local edits
  const [locked, setLocked]     = useState({});  // { id: true } — already in DB
  const [editMode, setEditMode] = useState({});  // { id: true } — unlocked for re-edit
  const [dirty, setDirty]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [toast, setToast]       = useState(null);
  const [search, setSearch]     = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");

  /* ============================================================
     LOAD DATA from new backend format
  ============================================================ */
  const loadAll = useCallback(async () => {
    if (!shift || !date) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, shift });
      if (filterDept) params.append("department", filterDept);

      const res = await api.get(`/admin/shift-attendance-report?${params}`);

      /* NEW response: { analysts: [...], summary: {...} } */
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.analysts || []);
      const sum  = data.summary || null;

      setAnalysts(list);
      setSummary(sum);

      /* build records + locked maps */
      const rec = {}, loc = {};
      list.forEach(a => {
        if (a.status) {
          rec[a.analystId] = a.status;
          loc[a.analystId] = true;
        }
      });
      setRecords(rec);
      setLocked(loc);
      setEditMode({});
      setDirty(false);
      setSelected([]);
    } catch (err) {
      showToast("error", "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [date, shift, filterDept]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ============================================================
     HELPERS
  ============================================================ */
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const setStatus = (analystId, status) => {
    setRecords(prev => ({ ...prev, [analystId]: status }));
    setDirty(true);
  };

  const toggleEdit = (id) =>
    setEditMode(prev => ({ ...prev, [id]: !prev[id] }));

  /* ============================================================
     BULK
  ============================================================ */
  const toggleSelect  = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleAll     = () => setSelected(selected.length===filtered.length&&filtered.length>0 ? [] : filtered.map(a=>a.analystId));

  const applyBulkStatus = () => {
    if (!bulkStatus || !selected.length) return;
    const updated = { ...records };
    selected.forEach(id => { updated[id] = bulkStatus; });
    setRecords(updated);
    setDirty(true);
    setSelected([]);
    setBulkStatus("");
  };

  const markAllPresent = () => {
    const updated = { ...records };
    analysts.forEach(a => { updated[a.analystId] = "PRESENT"; });
    setRecords(updated);
    setDirty(true);
  };

  /* ============================================================
     SAVE — compute new/changed only
  ============================================================ */
  const computeChanges = () => {
    let created = 0, updated = 0;
    Object.entries(records).forEach(([id, status]) => {
      const numId = Number(id);
      if (!status) return;
      if (!locked[numId])                         created++;
      else if (editMode[numId])                   updated++;
    });
    return { created, updated };
  };

  const doSave = async () => {
    const payload = Object.entries(records)
      .filter(([_, s]) => s)
      .map(([id, status]) => ({ analystId: Number(id), status }));

    if (!payload.length) { showToast("error","No attendance marked"); setSaveConfirm(false); return; }

    setSaving(true);
    try {
      const res = await api.post("/admin/attendance-by-shift", { date, shift, records: payload });
      showToast("success", `Saved — ${res.data.created||0} new, ${res.data.updated||0} updated`);
      setSaveConfirm(false);
      loadAll();
    } catch (err) {
      showToast("error", err.response?.data?.msg || "Save failed");
      setSaveConfirm(false);
    } finally { setSaving(false); }
  };

  /* ============================================================
     FILTERED
  ============================================================ */
  const depts = useMemo(() => [...new Set(analysts.map(a=>a.department))].sort(), [analysts]);

  const filtered = useMemo(() => {
    let list = [...analysts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.department.toLowerCase().includes(q));
    }
    if (filterStatus !== "ALL") {
      list = filterStatus === "UNMARKED"
        ? list.filter(a => !records[a.analystId])
        : list.filter(a => records[a.analystId] === filterStatus);
    }
    return list;
  }, [analysts, search, filterStatus, records]);

  /* ============================================================
     LOCAL SUMMARY (live as user marks)
  ============================================================ */
  const liveSummary = useMemo(() => {
    const s = { PRESENT:0, ABSENT:0, HALF_DAY:0, PAID_LEAVE:0, UNMARKED:0 };
    analysts.forEach(a => {
      const st = records[a.analystId];
      if (st && s[st]!==undefined) s[st]++;
      else s.UNMARKED++;
    });
    return s;
  }, [analysts, records]);

  const markedCount = analysts.length - liveSummary.UNMARKED;
  const allMarked   = analysts.length > 0 && liveSummary.UNMARKED === 0;
  const changes     = computeChanges();

  return (
    <Layout>
      <Toast toast={toast}/>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarCheck className="text-blue-600"/> Attendance Entry
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Mark shift-wise analyst attendance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadAll}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl">
            <FaSyncAlt size={11}/> Refresh
          </button>
          {dirty && (
            <button onClick={()=>setSaveConfirm(true)}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold shadow-sm shadow-blue-200">
              <FaSave size={12}/> Save
              {(changes.created+changes.updated) > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-lg text-xs">{changes.created+changes.updated}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* DATE + SHIFT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" value={date}
              onChange={e=>{ setDate(e.target.value); }}
              max={today}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Shift &nbsp;<span className="text-gray-400 font-normal normal-case">· auto-detected</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {SHIFTS.map(s=>{
                const st = SHIFT_STYLE[s];
                return (
                  <button key={s} onClick={()=>setShift(s)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      shift===s ? `border-blue-500 ${st.bg} ${st.text}` : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {st.icon} {s}
                    {shift===s && <FaCheckCircle size={10} className="ml-1 text-blue-500"/>}
                  </button>
                );
              })}
            </div>
          </div>
          {date===today && (
            <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-xl self-end mb-0.5">
              <FaCheckCircle size={10}/> Today
            </span>
          )}
        </div>
      </div>

      {/* ALL-SHIFT DAILY SUMMARY (collapsible) */}
      <DailySummaryPanel date={date} summary={summary}/>

      {/* LIVE STATS */}
      {analysts.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {[
              { label:"Present",   value:liveSummary.PRESENT,    bg:"bg-green-50",  text:"text-green-700",  filter:"PRESENT"    },
              { label:"Absent",    value:liveSummary.ABSENT,     bg:"bg-red-50",    text:"text-red-700",    filter:"ABSENT"     },
              { label:"Half Day",  value:liveSummary.HALF_DAY,   bg:"bg-amber-50",  text:"text-amber-700",  filter:"HALF_DAY"   },
              { label:"Paid Leave",value:liveSummary.PAID_LEAVE, bg:"bg-blue-50",   text:"text-blue-700",   filter:"PAID_LEAVE" },
              { label:"Unmarked",  value:liveSummary.UNMARKED,   bg:"bg-gray-50",   text:"text-gray-600",   filter:"UNMARKED"   },
            ].map(s=>(
              <button key={s.label}
                onClick={()=>setFilterStatus(filterStatus===s.filter?"ALL":s.filter)}
                className={`${s.bg} rounded-xl p-3 text-center hover:shadow-md transition-all hover:-translate-y-0.5 ${filterStatus===s.filter?"ring-2 ring-blue-400 ring-offset-1":""}`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className={`text-xs mt-0.5 ${s.text} opacity-80`}>{s.label}</div>
              </button>
            ))}
          </div>

          {/* PROGRESS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-sm font-bold text-gray-800">
                {markedCount} / {analysts.length}
                {allMarked && <span className="ml-2 text-green-600 text-xs font-medium">✓ Complete</span>}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allMarked?"bg-green-500":"bg-blue-500"}`}
                style={{ width: analysts.length>0?`${(markedCount/analysts.length)*100}%`:"0%" }}
              />
            </div>
          </div>
        </>
      )}

      {/* SEARCH + FILTER + BULK */}
      {analysts.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name or department..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
          </div>
          {depts.length > 1 && (
            <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none">
              <option value="">All Depts</option>
              {depts.map(d=><option key={d}>{d}</option>)}
            </select>
          )}
          <button onClick={markAllPresent}
            className="flex items-center gap-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2.5 rounded-xl font-medium">
            <FaBolt size={11}/> All Present
          </button>
          {(search||filterStatus!=="ALL"||filterDept) && (
            <button onClick={()=>{setSearch("");setFilterStatus("ALL");setFilterDept("");}}
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-2.5 rounded-xl hover:bg-gray-200">
              <FaTimes size={10}/> Clear
            </button>
          )}
        </div>
      )}

      {/* BULK BAR */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex-wrap">
          <span className="text-sm font-semibold text-blue-700">{selected.length} selected</span>
          <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}
            className="border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white flex-1 min-w-[160px] focus:outline-none">
            <option value="">Set Status</option>
            {STATUSES.map(s=><option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <button onClick={applyBulkStatus} disabled={!bulkStatus}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-medium">
            <FaCheckCircle size={11}/> Apply
          </button>
          <button onClick={()=>setSelected([])} className="text-gray-400 hover:text-gray-600"><FaTimes size={12}/></button>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      ) : analysts.length===0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <FaUsers className="text-gray-300" size={28}/>
          </div>
          <p className="text-gray-500 font-medium">No analysts in {shift} shift</p>
          <p className="text-gray-400 text-sm">Assign analysts to this shift from Analyst Master</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">

          {/* HEADER ROW */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[620px]">
            <div className="col-span-1 flex items-center">
              <input type="checkbox"
                checked={selected.length===filtered.length&&filtered.length>0}
                onChange={toggleAll}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"/>
            </div>
            <div className="col-span-4">Analyst</div>
            <div className="col-span-2 hidden sm:block">Dept</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map(a=>{
              const isLocked  = locked[a.analystId] && !editMode[a.analystId];
              const status    = records[a.analystId];
              const isEditing = editMode[a.analystId];
              const isNew     = !locked[a.analystId] && !!status;

              return (
                <div key={a.analystId}
                  className={`grid grid-cols-12 gap-4 px-5 py-4 items-center transition-colors ${
                    isEditing ? "bg-amber-50/40" : isNew ? "bg-green-50/30" : "hover:bg-gray-50/80"
                  }`}>

                  <div className="col-span-1">
                    <input type="checkbox" checked={selected.includes(a.analystId)} onChange={()=>toggleSelect(a.analystId)}
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"/>
                  </div>

                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar name={a.name}/>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400">#{a.analystId}</p>
                    </div>
                  </div>

                  <div className="col-span-2 hidden sm:block">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{a.department}</span>
                  </div>

                  <div className="col-span-3">
                    {isLocked ? (
                      <StatusBadge status={status}/>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUSES.map(s=>{
                          const sc = STATUS_CONFIG[s];
                          return (
                            <button key={s} onClick={()=>setStatus(a.analystId,s)} title={sc.label}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                                status===s
                                  ? `${sc.bg} ${sc.text} border-current`
                                  : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                              }`}>
                              {sc.icon} {sc.short}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    {isNew && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">New</span>}
                    {locked[a.analystId] && (
                      <button onClick={()=>toggleEdit(a.analystId)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                          isEditing
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        }`}>
                        {isEditing ? <><FaLock size={9}/>Lock</> : <><FaUnlock size={9}/>Edit</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              {filtered.length} of {analysts.length} shown · {markedCount} marked
            </p>
            {dirty && (
              <button onClick={()=>setSaveConfirm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold">
                <FaSave size={12}/> Save Attendance
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {saveConfirm && (
        <SaveConfirmModal
          created={changes.created}
          updated={changes.updated}
          onConfirm={doSave}
          onCancel={()=>setSaveConfirm(false)}
          saving={saving}
        />
      )}

    </Layout>
  );
}