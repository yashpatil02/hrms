import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import {
  FaLeaf, FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaSearch, FaSyncAlt, FaTimes, FaDownload, FaEye,
  FaUserTie, FaCalendarAlt, FaArrowRight, FaExclamationTriangle,
  FaChartBar, FaUsers, FaFilter, FaCheck, FaBan,
  FaChevronLeft, FaChevronRight,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const STATUS_CFG = {
  PENDING:  { bg:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-200",  dot:"bg-amber-400",  label:"Pending"  },
  APPROVED: { bg:"bg-green-100",  text:"text-green-700",  border:"border-green-200",  dot:"bg-green-500",  label:"Approved" },
  REJECTED: { bg:"bg-red-100",    text:"text-red-700",    border:"border-red-200",    dot:"bg-red-500",    label:"Rejected" },
};

const REJECT_REASONS = [
  "Insufficient notice period",
  "Critical project deadline",
  "Team already on leave",
  "Attendance issues",
  "Exceeds leave balance",
  "Other",
];

/* ============================================================
   HELPERS
============================================================ */
const fmtDate = (d, opts={}) =>
  new Date(d+"T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", ...opts });

const fmtShort = (d) =>
  new Date(d+"T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short" });

const diffDays = (from, to) => {
  const ms = new Date(to+"T00:00:00") - new Date(from+"T00:00:00");
  return Math.max(1, Math.ceil(ms/(1000*60*60*24))+1);
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now()-new Date(date))/1000);
  if (s<3600)   return `${Math.floor(s/60)}m ago`;
  if (s<86400)  return `${Math.floor(s/3600)}h ago`;
  if (s<604800) return `${Math.floor(s/86400)}d ago`;
  return fmtShort(new Date(date).toISOString().split("T")[0]);
};

const daysFromNow = (d) => {
  const ms = new Date(d+"T00:00:00") - new Date();
  const days = Math.ceil(ms/(1000*60*60*24));
  if (days < 0)  return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
};

/* ============================================================
   COMPONENTS
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const styles = { success:"bg-green-600", error:"bg-red-600", info:"bg-blue-600" };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${styles[toast.type]}`}>
      {toast.type==="success" ? <FaCheckCircle size={14}/> : toast.type==="error" ? <FaTimesCircle size={14}/> : <FaLeaf size={14}/>}
      {toast.msg}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
      {c.label}
    </span>
  );
};

const Avatar = ({ name }) => {
  const grd = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const i   = (name?.charCodeAt(0)||0)%grd.length;
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()||"U"}
    </div>
  );
};

/* ============================================================
   REJECT MODAL
============================================================ */
const RejectModal = ({ leave, onClose, onConfirm }) => {
  const [reason, setReason]     = useState("");
  const [custom, setCustom]     = useState("");
  const [loading, setLoading]   = useState(false);
  const finalReason = reason==="Other" ? custom.trim() : reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2"><FaBan/> Reject Leave</h2>
          <p className="text-red-100 text-sm mt-0.5">{leave.user?.name} · {fmtShort(leave.fromDate)} → {fmtShort(leave.toDate)}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Reason</p>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map(r=>(
                <button key={r} onClick={()=>setReason(r)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                    reason===r ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-600 hover:border-red-400"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {reason==="Other" && (
            <textarea value={custom} onChange={e=>setCustom(e.target.value)}
              placeholder="Specify rejection reason..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"/>
          )}
          {reason && reason!=="Other" && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600 font-medium">Rejection reason: <span className="font-semibold">{reason}</span></p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={async()=>{ setLoading(true); await onConfirm(finalReason); setLoading(false); }}
              disabled={!finalReason || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Rejecting...</> : <><FaBan size={12}/>Confirm Reject</>}
            </button>
            <button onClick={onClose} className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   LEAVE DETAIL DRAWER
============================================================ */
const LeaveDrawer = ({ leave, onClose, onApprove, onReject }) => {
  if (!leave) return null;
  const days = leave.days || diffDays(leave.fromDate, leave.toDate);
  const cfg  = STATUS_CFG[leave.status] || STATUS_CFG.PENDING;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={leave.user?.name}/>
              <div>
                <h2 className="font-bold text-lg">{leave.user?.name}</h2>
                <p className="text-blue-200 text-sm">{leave.user?.email}</p>
                {leave.user?.department && (
                  <span className="inline-block mt-1 bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full">{leave.user.department}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center"><FaTimes size={13}/></button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 p-5 space-y-5">
          {/* STATUS */}
          <div className="flex items-center justify-between">
            <StatusBadge status={leave.status}/>
            <span className="text-xs text-gray-400">{timeAgo(leave.createdAt)}</span>
          </div>

          {/* DATE DETAILS */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">From</p>
                <p className="text-sm font-bold text-gray-800">{fmtDate(leave.fromDate)}</p>
                <p className="text-xs text-gray-400">{daysFromNow(leave.fromDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">To</p>
                <p className="text-sm font-bold text-gray-800">{fmtDate(leave.toDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
              <FaCalendarAlt className="text-blue-500" size={12}/>
              <span className="text-sm font-semibold text-gray-700">{days} day{days!==1?"s":""} of leave</span>
            </div>
          </div>

          {/* REASON */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Leave Reason</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed">{leave.reason}</p>
            </div>
          </div>

          {/* REJECT REASON */}
          {leave.status==="REJECTED" && leave.rejectReason && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rejection Reason</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">{leave.rejectReason}</p>
              </div>
            </div>
          )}

          {/* ACTIONS */}
          {leave.status==="PENDING" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={()=>onApprove(leave)}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-semibold transition-all">
                <FaCheckCircle size={13}/> Approve
              </button>
              <button onClick={()=>onReject(leave)}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold transition-all">
                <FaBan size={13}/> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN
============================================================ */
export default function AdminLeaveApproval() {
  /* data */
  const [pending, setPending]     = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [actionId, setActionId]   = useState(null);
  const [toast, setToast]         = useState(null);

  /* ui */
  const [tab, setTab]             = useState("pending"); // pending | all
  const [drawerLeave, setDrawerLeave] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [selected, setSelected]   = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  /* filters for "all" tab */
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage]           = useState(1);
  const LIMIT = 15;

  /* ============================================================
     LOAD
  ============================================================ */
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(()=>setToast(null), 3500);
  }, []);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/leaves/pending");
      setPending(Array.isArray(res.data)?res.data:[]);
    } catch { setPending([]); }
    finally { setLoading(false); }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setAllLoading(true);
      const params = new URLSearchParams({ page, limit:LIMIT });
      if (search.trim())         params.append("search", search.trim());
      if (statusFilter!=="ALL")  params.append("status", statusFilter);
      const res = await api.get(`/leaves/admin?${params}`);
      const d   = res.data;
      if (d.data) {
        setAllLeaves(Array.isArray(d.data)?d.data:[]);
        setTotal(d.total||0);
        setTotalPages(d.totalPages||1);
      } else {
        setAllLeaves(Array.isArray(d)?d:[]);
        setTotal(Array.isArray(d)?d.length:0);
        setTotalPages(1);
      }
    } catch { setAllLeaves([]); }
    finally { setAllLoading(false); }
  }, [page, search, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/leaves/pending");
      const pend = Array.isArray(res.data)?res.data:[];
      const allRes = await api.get("/leaves/admin?limit=500");
      const all  = Array.isArray(allRes.data?.data)?allRes.data.data:Array.isArray(allRes.data)?allRes.data:[];

      const approved  = all.filter(l=>l.status==="APPROVED").length;
      const rejected  = all.filter(l=>l.status==="REJECTED").length;
      const totalDays = all.filter(l=>l.status==="APPROVED").reduce((s,l)=>s+(l.days||diffDays(l.fromDate,l.toDate)),0);

      /* by department */
      const deptMap = {};
      pend.forEach(l=>{ const d=l.user?.department||"Other"; deptMap[d]=(deptMap[d]||0)+1; });

      setStats({ pending:pend.length, approved, rejected, total:all.length, totalDays, byDept:deptMap });
    } catch {}
  }, []);

  useEffect(()=>{ loadPending(); loadStats(); },[loadPending,loadStats]);
  useEffect(()=>{ if(tab==="all") loadAll(); },[tab, loadAll]);
  useEffect(()=>{ setPage(1); },[search, statusFilter]);

  /* ============================================================
     APPROVE
  ============================================================ */
  const approve = async (leave) => {
    setActionId(leave.id);
    try {
      await api.put(`/leaves/${leave.id}/approve`);
      showToast("success",`${leave.user?.name}'s leave approved`);
      setDrawerLeave(null);
      loadPending(); loadStats();
      if(tab==="all") loadAll();
    } catch(e) {
      showToast("error", e.response?.data?.msg||"Approval failed");
    } finally { setActionId(null); }
  };

  /* ============================================================
     REJECT
  ============================================================ */
  const reject = async (rejectReason) => {
    try {
      await api.put(`/leaves/${rejectTarget.id}/reject`, { rejectReason });
      showToast("success",`${rejectTarget.user?.name}'s leave rejected`);
      setRejectTarget(null);
      setDrawerLeave(null);
      loadPending(); loadStats();
      if(tab==="all") loadAll();
    } catch(e) {
      showToast("error", e.response?.data?.msg||"Rejection failed");
    }
  };

  /* ============================================================
     BULK APPROVE
  ============================================================ */
  const bulkApprove = async () => {
    if (!selected.length) return;
    setBulkLoading(true);
    let ok=0, fail=0;
    for (const id of selected) {
      try { await api.put(`/leaves/${id}/approve`); ok++; }
      catch { fail++; }
    }
    showToast(fail===0?"success":"info",`${ok} approved${fail>0?`, ${fail} failed`:""}`);
    setSelected([]);
    loadPending(); loadStats();
    if(tab==="all") loadAll();
    setBulkLoading(false);
  };

  /* ============================================================
     EXPORT CSV
  ============================================================ */
  const exportCSV = () => {
    const source = tab==="pending" ? pending : allLeaves;
    const rows = [
      ["Employee","Email","Department","From","To","Days","Reason","Status","Reject Reason","Applied On"],
      ...source.map(l=>[
        l.user?.name||"",
        l.user?.email||"",
        l.user?.department||"",
        l.fromDate,
        l.toDate,
        (l.days||diffDays(l.fromDate,l.toDate)),
        `"${l.reason}"`,
        l.status,
        l.rejectReason||"",
        new Date(l.createdAt).toLocaleDateString("en-IN"),
      ]),
    ];
    const csv  = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`leaves-${tab}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ============================================================
     SELECT HELPERS
  ============================================================ */
  const toggleSelect  = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleAll     = () => setSelected(selected.length===pending.length&&pending.length>0?[]:pending.map(l=>l.id));

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Layout>
      <Toast toast={toast}/>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaLeaf className="text-green-600"/> Leave Management
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Approve, reject and track employee leaves</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{ loadPending(); loadStats(); if(tab==="all") loadAll(); }}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl">
            <FaSyncAlt size={11}/> Refresh
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium">
            <FaDownload size={11}/> Export CSV
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label:"Pending",     value:stats.pending,   icon:<FaHourglassHalf size={14}/>, bg:"bg-amber-50",  text:"text-amber-700"  },
            { label:"Approved",    value:stats.approved,  icon:<FaCheckCircle   size={14}/>, bg:"bg-green-50",  text:"text-green-700"  },
            { label:"Rejected",    value:stats.rejected,  icon:<FaTimesCircle   size={14}/>, bg:"bg-red-50",    text:"text-red-700"    },
            { label:"Total",       value:stats.total,     icon:<FaChartBar      size={14}/>, bg:"bg-blue-50",   text:"text-blue-700"   },
            { label:"Days Approved",value:stats.totalDays,icon:<FaCalendarAlt   size={14}/>, bg:"bg-purple-50", text:"text-purple-700" },
          ].map(s=>(
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <div className={`${s.text} mb-1 flex justify-center`}>{s.icon}</div>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value??0}</div>
              <div className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* BY DEPT */}
      {stats?.byDept && Object.keys(stats.byDept).length>0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending by Department</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byDept).map(([dept,count])=>(
              <span key={dept} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-xl">
                <FaUsers size={10}/> {dept}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-6 w-fit">
        <button onClick={()=>setTab("pending")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab==="pending"?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"
          }`}>
          <FaHourglassHalf size={11}/> Pending
          {stats?.pending>0 && (
            <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{stats.pending}</span>
          )}
        </button>
        <button onClick={()=>setTab("all")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab==="all"?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"
          }`}>
          <FaFilter size={11}/> All Leaves
        </button>
      </div>

      {/* ========================
          TAB: PENDING
      ======================== */}
      {tab==="pending" && (
        <>
          {/* BULK BAR */}
          {selected.length>0 && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex-wrap">
              <span className="text-sm font-semibold text-green-700">{selected.length} selected</span>
              <button onClick={bulkApprove} disabled={bulkLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                {bulkLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Approving...</> : <><FaCheckCircle size={11}/>Bulk Approve</>}
              </button>
              <button onClick={()=>setSelected([])} className="text-gray-400 hover:text-gray-600 ml-auto"><FaTimes size={12}/></button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin"/>
              <p className="text-gray-400 text-sm">Loading pending leaves...</p>
            </div>
          ) : pending.length===0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
                <FaCheckCircle className="text-green-300" size={28}/>
              </div>
              <p className="text-gray-500 font-semibold">All caught up! 🎉</p>
              <p className="text-gray-400 text-sm">No pending leave requests right now</p>
            </div>
          ) : (
            <>
              {/* SELECT ALL BAR */}
              <div className="flex items-center gap-3 px-2 mb-3">
                <input type="checkbox"
                  checked={selected.length===pending.length && pending.length>0}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-green-600 cursor-pointer"/>
                <span className="text-xs text-gray-500">{selected.length>0?`${selected.length} of ${pending.length} selected`:`${pending.length} pending request${pending.length!==1?"s":""}`}</span>
              </div>

              <div className="space-y-3">
                {pending.map(l=>{
                  const days = l.days || diffDays(l.fromDate, l.toDate);
                  const isActioning = actionId===l.id;
                  return (
                    <div key={l.id}
                      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                        selected.includes(l.id)?"border-green-300":"border-gray-100"
                      }`}>
                      <div className="p-5">
                        <div className="flex items-start gap-3 flex-wrap">
                          {/* CHECKBOX */}
                          <input type="checkbox" checked={selected.includes(l.id)} onChange={()=>toggleSelect(l.id)}
                            className="w-4 h-4 accent-green-600 cursor-pointer mt-1 flex-shrink-0"/>

                          {/* AVATAR */}
                          <Avatar name={l.user?.name}/>

                          {/* INFO */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="font-bold text-gray-800">{l.user?.name}</p>
                                <p className="text-xs text-gray-400">{l.user?.email}</p>
                                {l.user?.department && (
                                  <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{l.user.department}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{timeAgo(l.createdAt)}</span>
                            </div>

                            {/* DATE ROW */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <FaCalendarAlt className="text-amber-500" size={11}/>
                                <span className="text-xs font-semibold text-amber-800">
                                  {fmtShort(l.fromDate)}
                                  {l.fromDate!==l.toDate && <> <FaArrowRight className="inline mx-1" size={8}/> {fmtShort(l.toDate)}</>}
                                </span>
                                <span className="text-xs text-amber-600 font-medium">· {days}d</span>
                              </div>
                              <span className="text-xs text-gray-400">{daysFromNow(l.fromDate)}</span>
                            </div>

                            {/* REASON */}
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">{l.reason}</p>
                          </div>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
                          <button onClick={()=>approve(l)} disabled={isActioning}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all">
                            {isActioning
                              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                              : <FaCheckCircle size={12}/>
                            }
                            Approve
                          </button>
                          <button onClick={()=>setRejectTarget(l)} disabled={isActioning}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all">
                            <FaBan size={12}/> Reject
                          </button>
                          <button onClick={()=>setDrawerLeave(l)}
                            className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl font-medium transition-colors ml-auto">
                            <FaEye size={11}/> Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ========================
          TAB: ALL LEAVES
      ======================== */}
      {tab==="all" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {/* FILTERS */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search employee name or email..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none">
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            {(search||statusFilter!=="ALL") && (
              <button onClick={()=>{ setSearch(""); setStatusFilter("ALL"); setPage(1); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl">
                <FaTimes size={10}/> Clear
              </button>
            )}
          </div>

          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[620px]">
            <div className="col-span-4">Employee</div>
            <div className="col-span-3">Leave Period</div>
            <div className="col-span-2 hidden md:block">Reason</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {allLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            </div>
          ) : allLeaves.length===0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <FaLeaf className="text-gray-200" size={32}/>
              <p className="text-gray-400 text-sm">No leave records found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {allLeaves.map(l=>{
                const days = l.days || diffDays(l.fromDate, l.toDate);
                return (
                  <div key={l.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors group">
                    {/* EMPLOYEE */}
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      <Avatar name={l.user?.name}/>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{l.user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{l.user?.email}</p>
                        {l.user?.department && (
                          <span className="text-[10px] text-blue-600 font-medium">{l.user.department}</span>
                        )}
                      </div>
                    </div>

                    {/* DATES */}
                    <div className="col-span-3">
                      <p className="text-xs font-semibold text-gray-700">
                        {fmtShort(l.fromDate)} {l.fromDate!==l.toDate&&<> → {fmtShort(l.toDate)}</>}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{days} day{days!==1?"s":""} · {timeAgo(l.createdAt)}</p>
                    </div>

                    {/* REASON */}
                    <div className="col-span-2 hidden md:block">
                      <p className="text-xs text-gray-600 line-clamp-2">{l.reason}</p>
                    </div>

                    {/* STATUS */}
                    <div className="col-span-2">
                      <StatusBadge status={l.status}/>
                      {l.status==="PENDING" && (
                        <p className="text-[10px] text-amber-500 mt-1">{daysFromNow(l.fromDate)}</p>
                      )}
                    </div>

                    {/* ACTION */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <button onClick={()=>setDrawerLeave(l)}
                        className="w-7 h-7 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                        <FaEye size={11}/>
                      </button>
                      {l.status==="PENDING" && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>approve(l)}
                            className="w-7 h-7 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center">
                            <FaCheck size={10}/>
                          </button>
                          <button onClick={()=>setRejectTarget(l)}
                            className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center">
                            <FaBan size={10}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {!allLoading && total>0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-gray-400">
                {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total} records
              </p>
              {totalPages>1 && (
                <div className="flex items-center gap-2">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="w-8 h-8 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center disabled:opacity-40">
                    <FaChevronLeft size={11}/>
                  </button>
                  <div className="flex gap-1">
                    {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                      let p;
                      if(totalPages<=5) p=i+1;
                      else if(page<=3) p=i+1;
                      else if(page>=totalPages-2) p=totalPages-4+i;
                      else p=page-2+i;
                      return (
                        <button key={p} onClick={()=>setPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-semibold transition-colors ${
                            p===page?"bg-blue-600 text-white":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}>{p}</button>
                      );
                    })}
                  </div>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    className="w-8 h-8 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center disabled:opacity-40">
                    <FaChevronRight size={11}/>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DRAWER */}
      {drawerLeave && (
        <LeaveDrawer
          leave={drawerLeave}
          onClose={()=>setDrawerLeave(null)}
          onApprove={(l)=>{ setDrawerLeave(null); approve(l); }}
          onReject={(l)=>{ setDrawerLeave(null); setRejectTarget(l); }}
        />
      )}

      {/* REJECT MODAL */}
      {rejectTarget && (
        <RejectModal
          leave={rejectTarget}
          onClose={()=>setRejectTarget(null)}
          onConfirm={reject}
        />
      )}

    </Layout>
  );
}