import { useEffect, useState, useMemo, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaLeaf, FaPlus, FaTimes, FaCheckCircle, FaTimesCircle,
  FaHourglassHalf, FaCalendarAlt, FaSyncAlt, FaExclamationTriangle,
  FaArrowRight, FaTrash, FaChevronDown, FaInfoCircle,
  FaChartBar, FaCalendarCheck, FaRegClock, FaBan,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const STATUS_CFG = {
  PENDING:  { bg:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-300",  icon:<FaHourglassHalf size={11}/>, label:"Pending"  },
  APPROVED: { bg:"bg-green-100",  text:"text-green-700",  border:"border-green-300",  icon:<FaCheckCircle   size={11}/>, label:"Approved" },
  REJECTED: { bg:"bg-red-100",    text:"text-red-700",    border:"border-red-300",    icon:<FaTimesCircle   size={11}/>, label:"Rejected" },
};

const QUICK_REASONS = [
  "Sick Leave","Family Emergency","Personal Work",
  "Medical Appointment","Out of Station","Wedding / Ceremony","Other",
];

/* ============================================================
   HELPERS
============================================================ */
const todayStr = () => {
  const now = new Date();
  const ist = new Date(now.getTime()+(5*60+30)*60*1000);
  return ist.toISOString().split("T")[0];
};

const fmtDate = (d, opts={}) =>
  new Date(d+"T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", ...opts });

const fmtDateShort = (d) =>
  new Date(d+"T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short" });

const diffDays = (from, to) => {
  const ms = new Date(to+"T00:00:00") - new Date(from+"T00:00:00");
  return Math.max(1, Math.ceil(ms/(1000*60*60*24))+1);
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now()-new Date(date))/1000);
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return fmtDateShort(new Date(date).toISOString().split("T")[0]);
};

const daysUntil = (d) => {
  const ms = new Date(d+"T00:00:00") - new Date(todayStr()+"T00:00:00");
  return Math.ceil(ms/(1000*60*60*24));
};

/* ============================================================
   TOAST
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const s = { success:"bg-green-600", error:"bg-red-600", info:"bg-blue-600" };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${s[toast.type]||s.info}`}>
      {toast.type==="success"?<FaCheckCircle size={14}/>:<FaExclamationTriangle size={14}/>}
      {toast.msg}
    </div>
  );
};

/* ============================================================
   STATUS BADGE
============================================================ */
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon} {c.label}
    </span>
  );
};

/* ============================================================
   LEAVE CARD
============================================================ */
const LeaveCard = ({ leave, onCancel }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg      = STATUS_CFG[leave.status] || STATUS_CFG.PENDING;
  const days     = leave.days || diffDays(leave.fromDate, leave.toDate);
  const upcoming = leave.isUpcoming;
  const until    = leave.status==="APPROVED" ? daysUntil(leave.fromDate) : null;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
      leave.status==="PENDING"  ? "border-amber-200" :
      leave.status==="APPROVED" ? "border-green-200" :
      "border-red-200"
    }`}>
      {/* UPCOMING BANNER */}
      {upcoming && until!==null && until>=0 && until<=7 && (
        <div className="bg-green-500 text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-1.5">
          <FaCalendarCheck size={10}/>
          {until===0?"Leave starts today!":until===1?"Leave starts tomorrow!": `Leave starts in ${until} days`}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* LEFT INFO */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={leave.status}/>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {days} day{days!==1?"s":""}
              </span>
              {leave.isPast && leave.status==="APPROVED" && (
                <span className="text-xs text-gray-400 italic">Past</span>
              )}
            </div>

            {/* DATE RANGE */}
            <div className="flex items-center gap-2 mb-2">
              <FaCalendarAlt className="text-gray-400 flex-shrink-0" size={12}/>
              <span className="text-sm font-semibold text-gray-800">
                {fmtDate(leave.fromDate)}
              </span>
              {leave.fromDate !== leave.toDate && (
                <>
                  <FaArrowRight className="text-gray-300" size={10}/>
                  <span className="text-sm font-semibold text-gray-800">
                    {fmtDate(leave.toDate)}
                  </span>
                </>
              )}
            </div>

            {/* REASON */}
            <p className="text-sm text-gray-600 leading-relaxed">{leave.reason}</p>

            {/* REJECT REASON */}
            {leave.status==="REJECTED" && leave.rejectReason && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={12}/>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-0.5">Rejection Reason</p>
                  <p className="text-xs text-red-700">{leave.rejectReason}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex flex-col items-end gap-2">
            <p className="text-[10px] text-gray-400">{timeAgo(leave.createdAt)}</p>
            {leave.status==="PENDING" && (
              <button onClick={()=>onCancel(leave)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors font-medium">
                <FaBan size={10}/> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   APPLY LEAVE MODAL
============================================================ */
const ApplyModal = ({ onClose, onSuccess }) => {
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [reason, setReason]       = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const today     = todayStr();
  const days      = fromDate && toDate ? diffDays(fromDate, toDate) : 0;
  const finalReason = reason==="Other" ? customReason : reason;
  const isValid   = fromDate && toDate && finalReason.trim() && days>0;

  const submit = async () => {
    if (!isValid) { setError("Please fill all fields correctly"); return; }
    if (new Date(toDate+"T00:00:00") < new Date(fromDate+"T00:00:00")) {
      setError("End date cannot be before start date"); return;
    }
    try {
      setLoading(true); setError("");
      await api.post("/leaves", { fromDate, toDate, reason: finalReason.trim() });
      onSuccess();
      onClose();
    } catch(e) {
      setError(e.response?.data?.msg || "Failed to apply leave");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FaLeaf/> Apply for Leave
              </h2>
              <p className="text-green-200 text-sm mt-0.5">Submit a leave request</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <FaTimes size={13}/>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* ERROR */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
              <FaExclamationTriangle size={12}/> {error}
            </div>
          )}

          {/* DATE ROW */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From Date *</label>
              <input type="date" value={fromDate}
                min={today}
                onChange={e=>{ setFromDate(e.target.value); if(!toDate||e.target.value>toDate) setToDate(e.target.value); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To Date *</label>
              <input type="date" value={toDate}
                min={fromDate||today}
                onChange={e=>setToDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"/>
            </div>
          </div>

          {/* DAYS PREVIEW */}
          {days>0 && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <FaCalendarAlt className="text-green-500 flex-shrink-0" size={14}/>
              <div>
                <p className="text-sm font-bold text-green-700">
                  {days} day{days!==1?"s":""} of leave
                </p>
                <p className="text-xs text-green-500">
                  {fmtDate(fromDate)} {days>1?`→ ${fmtDate(toDate)}`:""}
                </p>
              </div>
            </div>
          )}

          {/* REASON CHIPS */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reason *</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_REASONS.map(r=>(
                <button key={r} onClick={()=>setReason(r)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                    reason===r
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-200 text-gray-600 hover:border-green-400 bg-white"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            {reason==="Other" && (
              <textarea value={customReason} onChange={e=>setCustomReason(e.target.value)}
                placeholder="Describe your reason..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"/>
            )}
            {reason && reason!=="Other" && (
              <input value={reason} onChange={e=>setReason(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                placeholder="Or type a custom reason..."/>
            )}
          </div>

          {/* SUBMIT */}
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={!isValid || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting...</>
                : <><FaLeaf size={12}/>Submit Leave Request</>
              }
            </button>
            <button onClick={onClose}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   CANCEL CONFIRM MODAL
============================================================ */
const CancelModal = ({ leave, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaBan className="text-red-500" size={20}/>
        </div>
        <h3 className="font-bold text-gray-800 text-center text-lg mb-1">Cancel Leave</h3>
        <p className="text-sm text-gray-500 text-center mb-2">
          Cancel your leave from <strong>{fmtDate(leave.fromDate)}</strong>
          {leave.fromDate!==leave.toDate && <> to <strong>{fmtDate(leave.toDate)}</strong></>}?
        </p>
        <p className="text-xs text-gray-400 text-center mb-5">This will permanently delete the leave request.</p>
        <div className="flex gap-3">
          <button onClick={async()=>{ setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">
            {loading?"Cancelling...":"Yes, Cancel"}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
            Keep It
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN
============================================================ */
const Leave = () => {
  const [leaves, setLeaves]       = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [toast, setToast]         = useState(null);

  /* filters */
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [yearFilter, setYearFilter]     = useState(String(new Date().getFullYear()));
  const [tab, setTab]                   = useState("all"); // all | upcoming | past

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(()=>setToast(null), 3500);
  }, []);

  /* ── LOAD ── */
  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter!=="ALL") params.append("status", statusFilter);
      if (yearFilter)           params.append("year",   yearFilter);
      const res = await api.get(`/leaves/my?${params}`);
      setLeaves(Array.isArray(res.data)?res.data:[]);
    } catch { setLeaves([]); }
    finally { setLoading(false); }
  }, [statusFilter, yearFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/leaves/my-stats");
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(()=>{ loadLeaves(); loadStats(); },[loadLeaves]);

  /* ── CANCEL ── */
  const confirmCancel = async () => {
    try {
      await api.delete(`/leaves/${cancelTarget.id}`);
      showToast("success","Leave cancelled successfully");
      setCancelTarget(null);
      loadLeaves(); loadStats();
    } catch(e) {
      showToast("error", e.response?.data?.msg||"Failed to cancel");
    }
  };

  /* ── FILTERED LIST ── */
  const filtered = useMemo(()=>{
    if (tab==="upcoming") return leaves.filter(l=>l.isUpcoming);
    if (tab==="past")     return leaves.filter(l=>l.isPast);
    return leaves;
  },[leaves, tab]);

  const years = [
    String(new Date().getFullYear()),
    String(new Date().getFullYear()-1),
    String(new Date().getFullYear()-2),
  ];

  return (
    <Layout>
      <Toast toast={toast}/>

      {/* ============================
          HEADER
      ============================ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaLeaf className="text-green-600"/> My Leaves
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and track your leave requests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{ loadLeaves(); loadStats(); }}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl">
            <FaSyncAlt size={11}/> Refresh
          </button>
          <button onClick={()=>setShowApply(true)}
            className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold shadow-sm shadow-green-200 transition-all">
            <FaPlus size={12}/> Apply Leave
          </button>
        </div>
      </div>

      {/* ============================
          STAT CARDS
      ============================ */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label:"Total",          value:stats.total,            icon:<FaChartBar size={14}/>,      bg:"bg-gray-50",    text:"text-gray-700"   },
            { label:"Pending",        value:stats.pending,          icon:<FaHourglassHalf size={14}/>, bg:"bg-amber-50",   text:"text-amber-700"  },
            { label:"Approved",       value:stats.approved,         icon:<FaCheckCircle size={14}/>,   bg:"bg-green-50",   text:"text-green-700"  },
            { label:"Rejected",       value:stats.rejected,         icon:<FaTimesCircle size={14}/>,   bg:"bg-red-50",     text:"text-red-700"    },
            { label:"Days Taken",     value:stats.totalApprovedDays,icon:<FaCalendarAlt size={14}/>,   bg:"bg-blue-50",    text:"text-blue-700"   },
            { label:"Upcoming",       value:stats.upcoming,         icon:<FaCalendarCheck size={14}/>, bg:"bg-teal-50",    text:"text-teal-700"   },
          ].map(s=>(
            <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 text-center`}>
              <div className={`${s.text} mb-1 flex justify-center`}>{s.icon}</div>
              <div className={`text-xl font-bold ${s.text}`}>{s.value??0}</div>
              <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* PENDING ALERT */}
      {(stats?.pending||0)>0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
          <FaHourglassHalf className="text-amber-500 flex-shrink-0" size={16}/>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {stats.pending} leave request{stats.pending>1?"s":""} pending approval
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Your admin will review it shortly</p>
          </div>
        </div>
      )}

      {/* ============================
          FILTERS + TABS
      ============================ */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* STATUS FILTER */}
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* YEAR FILTER */}
        <select value={yearFilter} onChange={e=>setYearFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>

        {/* TAB PILLS */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 ml-auto">
          {[
            { id:"all",      label:"All" },
            { id:"upcoming", label:"Upcoming" },
            { id:"past",     label:"Past" },
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab===t.id?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================
          LEAVE CARDS
      ============================ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"/>
          <p className="text-gray-400 text-sm">Loading your leaves...</p>
        </div>
      ) : filtered.length===0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
            <FaLeaf className="text-green-200" size={28}/>
          </div>
          <p className="text-gray-500 font-medium">
            {tab==="upcoming"?"No upcoming leaves":tab==="past"?"No past leaves":"No leave requests found"}
          </p>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            {statusFilter!=="ALL"
              ? `No ${statusFilter.toLowerCase()} leaves for ${yearFilter}`
              : "Apply for your first leave using the button above"}
          </p>
          <button onClick={()=>setShowApply(true)}
            className="flex items-center gap-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl font-medium mt-1 transition-colors">
            <FaPlus size={11}/> Apply Leave
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(l=>(
            <LeaveCard key={l.id} leave={l} onCancel={setCancelTarget}/>
          ))}
        </div>
      )}

      {!loading && filtered.length>0 && (
        <p className="text-xs text-center text-gray-400 mt-4">
          {filtered.length} leave{filtered.length!==1?"s":""} shown
        </p>
      )}

      {/* ============================
          MODALS
      ============================ */}
      {showApply && (
        <ApplyModal
          onClose={()=>setShowApply(false)}
          onSuccess={()=>{
            showToast("success","Leave applied successfully! Awaiting approval.");
            loadLeaves(); loadStats();
          }}
        />
      )}

      {cancelTarget && (
        <CancelModal
          leave={cancelTarget}
          onClose={()=>setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      )}

    </Layout>
  );
};

export default Leave;