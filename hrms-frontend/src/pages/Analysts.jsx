import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import {
  FaUsers, FaSearch, FaExchangeAlt, FaHistory, FaFilter,
  FaUserSlash, FaPlus, FaTimes, FaCheckCircle, FaExclamationCircle,
  FaSyncAlt, FaEye, FaUserTie, FaMoon, FaSun, FaClock,
  FaBuilding, FaChevronDown, FaEdit,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const SHIFTS      = ["MORNING","AFTERNOON","GENERAL","EVENING","NIGHT"];
const DEPARTMENTS = ["Spiideo","SQ","Vidswap","ST","Management"];

const SHIFT_STYLE = {
  MORNING:   { bg:"bg-amber-100",  text:"text-amber-700",  dot:"bg-amber-500",  icon:<FaSun size={10}/>    },
  AFTERNOON: { bg:"bg-blue-100",   text:"text-blue-700",   dot:"bg-blue-500",   icon:<FaClock size={10}/>  },
  GENERAL:   { bg:"bg-gray-100",   text:"text-gray-700",   dot:"bg-gray-500",   icon:<FaUsers size={10}/>  },
  EVENING:   { bg:"bg-purple-100", text:"text-purple-700", dot:"bg-purple-500", icon:<FaMoon size={10}/>   },
  NIGHT:     { bg:"bg-indigo-100", text:"text-indigo-700", dot:"bg-indigo-500", icon:<FaMoon size={10}/>   },
};

const DEPT_COLORS = {
  Spiideo:"bg-blue-100 text-blue-700", SQ:"bg-teal-100 text-teal-700",
  Vidswap:"bg-purple-100 text-purple-700", ST:"bg-amber-100 text-amber-700",
  Management:"bg-green-100 text-green-700",
};

const ShiftBadge = ({ shift }) => {
  const s = SHIFT_STYLE[shift] || SHIFT_STYLE.GENERAL;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {shift}
    </span>
  );
};

const Avatar = ({ name, size="md" }) => {
  const sz = size==="lg"?"w-12 h-12 text-base":size==="sm"?"w-7 h-7 text-xs":"w-9 h-9 text-sm";
  const grd = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const i   = (name?.charCodeAt(0)||0) % grd.length;
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()||"A"}
    </div>
  );
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s<3600) return `${Math.floor(s/60)}m ago`;
  if (s<86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
};

/* ============================================================
   ADD ANALYST MODAL
============================================================ */
const AddAnalystModal = ({ onClose, onSuccess }) => {
  const [form, setForm]   = useState({ name:"", department:"", shift:"GENERAL" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name.trim())   return setError("Name is required");
    if (!form.department)    return setError("Department is required");
    try {
      setLoading(true); setError("");
      await api.post("/analysts", form);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.response?.data?.msg || "Failed to add analyst");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><FaPlus className="text-blue-500"/> Add New Analyst</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><FaTimes size={13}/></button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              <FaExclamationCircle size={13}/> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Department *</label>
            <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Shift</label>
            <div className="grid grid-cols-3 gap-2">
              {SHIFTS.map(s=>{
                const st = SHIFT_STYLE[s];
                return (
                  <button key={s} onClick={()=>setForm({...form,shift:s})}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      form.shift===s ? `border-blue-500 ${st.bg} ${st.text}` : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {st.icon} {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={submit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Adding...</> : <><FaPlus size={12}/>Add Analyst</>}
          </button>
          <button onClick={onClose} className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TERMINATE MODAL
============================================================ */
const TerminateModal = ({ analyst, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaUserSlash className="text-red-500" size={22}/>
          </div>
          <h2 className="font-bold text-gray-800 text-lg mb-1">Terminate Analyst</h2>
          <p className="text-gray-500 text-sm mb-5">You are about to terminate <strong className="text-gray-700">{analyst.name}</strong>. This action can be reversed later.</p>
          <textarea
            value={reason} onChange={e=>setReason(e.target.value)}
            placeholder="Enter termination reason (required)..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 mb-4"
          />
          <div className="flex gap-3">
            <button onClick={handleConfirm} disabled={!reason.trim() || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
              {loading ? "Terminating..." : "Confirm Terminate"}
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   ANALYST DETAIL DRAWER
============================================================ */
const AnalystDrawer = ({ analyst, onClose, onTerminate, onShiftChange }) => {
  const [history, setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [editShift, setEditShift] = useState(false);
  const [newShift, setNewShift]   = useState(analyst.shift);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.get(`/analysts/${analyst.id}/shift-history`)
      .then(r => setHistory(r.data||[]))
      .finally(() => setHistLoading(false));
  }, [analyst.id]);

  const handleShiftUpdate = async () => {
    if (newShift === analyst.shift) { setEditShift(false); return; }
    setSaving(true);
    const now = new Date();
    await api.put("/analysts/bulk-shift", {
      analystIds: [analyst.id],
      shift: newShift,
      month: now.getMonth()+1,
      year:  now.getFullYear(),
    });
    onShiftChange(analyst.id, newShift);
    setSaving(false);
    setEditShift(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={analyst.name} size="lg"/>
              <div>
                <h2 className="text-lg font-bold">{analyst.name}</h2>
                <p className="text-indigo-200 text-sm mt-0.5">{analyst.department}</p>
                <div className="mt-2"><ShiftBadge shift={analyst.shift}/></div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center"><FaTimes size={14}/></button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 p-5 space-y-5">

          {/* INFO */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {[
              { label:"Analyst ID",  val:`#${analyst.id}` },
              { label:"Department",  val: analyst.department },
              { label:"Current Shift", val: analyst.shift },
              { label:"Joined",      val: new Date(analyst.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) },
            ].map((r,i)=>(
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-28 flex-shrink-0">{r.label}</span>
                <span className="text-sm text-gray-700 font-medium">{r.val}</span>
              </div>
            ))}
          </div>

          {/* CHANGE SHIFT */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Current Shift</h3>
              <button onClick={()=>setEditShift(!editShift)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <FaEdit size={10}/> {editShift?"Cancel":"Change"}
              </button>
            </div>
            {editShift ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {SHIFTS.map(s=>{
                    const st=SHIFT_STYLE[s];
                    return (
                      <button key={s} onClick={()=>setNewShift(s)}
                        className={`flex items-center gap-1 px-2 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                          newShift===s?`border-blue-500 ${st.bg} ${st.text}`:"border-gray-200 text-gray-600"
                        }`}>
                        {st.icon} {s}
                      </button>
                    );
                  })}
                </div>
                <button onClick={handleShiftUpdate} disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 rounded-xl text-sm font-medium">
                  {saving?"Saving...":"Save Change"}
                </button>
              </div>
            ) : (
              <ShiftBadge shift={analyst.shift}/>
            )}
          </div>

          {/* SHIFT HISTORY */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FaHistory size={11}/> Shift History
            </h3>
            {histLoading ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"/></div>
            ) : history.length===0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No shift history yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h,i)=>(
                  <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {i===0 && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">Latest</span>}
                      <span className="text-sm text-gray-700 font-medium">
                        {new Date(0,h.month-1).toLocaleString("en",{month:"long"})} {h.year}
                      </span>
                    </div>
                    <ShiftBadge shift={h.shift}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TERMINATE */}
          <div className="pt-2 border-t border-gray-100">
            <button onClick={onTerminate}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-medium transition-colors">
              <FaUserSlash size={13}/> Terminate Analyst
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN PAGE
============================================================ */
export default function Analysts() {
  const [list, setList]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [selected, setSelected]     = useState([]);
  const [bulkShift, setBulkShift]   = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [showAdd, setShowAdd]             = useState(false);
  const [drawerAnalyst, setDrawerAnalyst] = useState(null);
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [bulkConfirm, setBulkConfirm]     = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/analysts");
      setList(res.data||[]);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  /* ---- FILTERED ---- */
  const filtered = useMemo(()=>
    list.filter(a=>
      (!filterDept  || a.department===filterDept) &&
      (!filterShift || a.shift===filterShift) &&
      (!search || a.name.toLowerCase().includes(search.toLowerCase()))
    ), [list,filterDept,filterShift,search]);

  /* ---- STATS ---- */
  const stats = useMemo(()=>{
    const s = {};
    SHIFTS.forEach(sh=>{ s[sh]=list.filter(a=>a.shift===sh).length; });
    const d = {};
    DEPARTMENTS.forEach(dp=>{ d[dp]=list.filter(a=>a.department===dp).length; });
    return { total:list.length, byShift:s, byDept:d };
  },[list]);

  /* ---- SELECT ---- */
  const toggleSelect  = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleAll     = () => setSelected(selected.length===filtered.length&&filtered.length>0?[]:filtered.map(a=>a.id));

  /* ---- BULK SHIFT ---- */
  const applyBulk = async () => {
    if (!bulkShift||selected.length===0) return;
    setBulkLoading(true);
    const now=new Date();
    await api.put("/analysts/bulk-shift",{
      analystIds:selected, shift:bulkShift,
      month:now.getMonth()+1, year:now.getFullYear(),
    });
    setSelected([]); setBulkShift(""); setBulkConfirm(false);
    load();
    setBulkLoading(false);
  };

  /* ---- TERMINATE ---- */
  const terminate = async (reason) => {
    await api.put(`/analysts/${terminateTarget.id}/terminate`,{reason});
    setTerminateTarget(null);
    setDrawerAnalyst(null);
    load();
  };

  const handleShiftChange = (id,shift) => {
    setList(p=>p.map(a=>a.id===id?{...a,shift}:a));
    if (drawerAnalyst?.id===id) setDrawerAnalyst(p=>({...p,shift}));
  };

  const clearFilters = () => { setSearch(""); setFilterDept(""); setFilterShift(""); };
  const hasFilters   = search||filterDept||filterShift;

  return (
    <Layout>

      {/* ============================
          HEADER
      ============================ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaUsers className="text-indigo-600"/> Analyst Master
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage analysts, shifts and terminations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl transition-colors">
            <FaSyncAlt size={12}/> Refresh
          </button>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors font-medium">
            <FaPlus size={12}/> Add Analyst
          </button>
        </div>
      </div>

      {/* ============================
          STATS CARDS
      ============================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center sm:col-span-1 col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Active</div>
        </div>
        {SHIFTS.map(s=>{
          const st=SHIFT_STYLE[s];
          return (
            <button key={s} onClick={()=>setFilterShift(filterShift===s?"":s)}
              className={`rounded-2xl p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md ${st.bg} ${filterShift===s?"ring-2 ring-offset-1 ring-indigo-400":""}`}>
              <div className={`text-2xl font-bold ${st.text}`}>{stats.byShift[s]||0}</div>
              <div className={`text-xs mt-0.5 ${st.text} opacity-80`}>{s}</div>
            </button>
          );
        })}
      </div>

      {/* ============================
          SEARCH + FILTERS
      ============================ */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search analyst name..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
        </div>
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={filterShift} onChange={e=>setFilterShift(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">All Shifts</option>
          {SHIFTS.map(s=><option key={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl transition-colors">
            <FaTimes size={10}/> Clear
          </button>
        )}
      </div>

      {/* ============================
          BULK ACTION BAR
      ============================ */}
      {selected.length>0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 flex-wrap">
          <span className="text-sm font-semibold text-indigo-700">{selected.length} selected</span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select value={bulkShift} onChange={e=>setBulkShift(e.target.value)}
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
              <option value="">Select New Shift</option>
              {SHIFTS.map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={()=>{ if(!bulkShift){ alert("Select a shift first"); return; } setBulkConfirm(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <FaExchangeAlt size={12}/> Apply Shift
            </button>
          </div>
          <button onClick={()=>setSelected([])} className="text-xs text-gray-500 hover:text-gray-700">
            <FaTimes size={12}/>
          </button>
        </div>
      )}

      {/* BULK CONFIRM */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-800 mb-2">Confirm Bulk Shift Change</h3>
            <p className="text-sm text-gray-500 mb-5">
              Change shift of <strong>{selected.length} analyst(s)</strong> to <strong className="text-indigo-600">{bulkShift}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={applyBulk} disabled={bulkLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                {bulkLoading?"Applying...":"Yes, Apply"}
              </button>
              <button onClick={()=>setBulkConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================
          TABLE
      ============================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">

        {/* TABLE HEADER */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[620px]">
          <div className="col-span-1 flex items-center">
            <input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0}
              onChange={toggleAll} className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"/>
          </div>
          <div className="col-span-4">Analyst</div>
          <div className="col-span-3">Department</div>
          <div className="col-span-2">Shift</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading analysts...</p>
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaUsers className="text-gray-300" size={24}/>
            </div>
            <p className="text-gray-500 font-medium">No analysts found</p>
            <p className="text-gray-400 text-sm">{hasFilters?"Try clearing filters":"Add your first analyst"}</p>
            {!hasFilters && (
              <button onClick={()=>setShowAdd(true)} className="text-sm text-indigo-600 hover:underline mt-1">
                + Add Analyst
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(a=>(
              <div key={a.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors group">
                <div className="col-span-1">
                  <input type="checkbox" checked={selected.includes(a.id)} onChange={()=>toggleSelect(a.id)}
                    className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"/>
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar name={a.name}/>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400">ID #{a.id}</p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${DEPT_COLORS[a.department]||"bg-gray-100 text-gray-600"}`}>
                    {a.department}
                  </span>
                </div>
                <div className="col-span-2">
                  <ShiftBadge shift={a.shift}/>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <button onClick={()=>setDrawerAnalyst(a)}
                    className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
                    title="View Details">
                    <FaEye size={13}/>
                  </button>
                  <button onClick={()=>setTerminateTarget(a)}
                    className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Terminate">
                    <FaUserSlash size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length>0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {list.length} analysts</p>
            {selected.length>0 && <p className="text-xs text-indigo-600 font-medium">{selected.length} selected</p>}
          </div>
        )}
      </div>

      {/* ============================
          MODALS & DRAWERS
      ============================ */}
      {showAdd && <AddAnalystModal onClose={()=>setShowAdd(false)} onSuccess={load}/>}

      {drawerAnalyst && (
        <AnalystDrawer
          analyst={drawerAnalyst}
          onClose={()=>setDrawerAnalyst(null)}
          onTerminate={()=>{ setTerminateTarget(drawerAnalyst); }}
          onShiftChange={handleShiftChange}
        />
      )}

      {terminateTarget && (
        <TerminateModal
          analyst={terminateTarget}
          onClose={()=>setTerminateTarget(null)}
          onConfirm={terminate}
        />
      )}

    </Layout>
  );
}