import { useEffect, useState, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaLeaf, FaSearch, FaSyncAlt, FaTimes, FaDownload,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaChevronLeft, FaChevronRight, FaEye, FaUserTie,
  FaCalendarAlt, FaArrowRight, FaExclamationTriangle,
  FaBan, FaCheck,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const STATUS_CFG = {
  PENDING:  { bg:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-200", label:"Pending"  },
  APPROVED: { bg:"bg-green-100",  text:"text-green-700",  border:"border-green-200", label:"Approved" },
  REJECTED: { bg:"bg-red-100",    text:"text-red-700",    border:"border-red-200",   label:"Rejected" },
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
const fmtDate = (d) => {
  const str = typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
  return new Date(str + "T00:00:00").toLocaleDateString("en-IN", {
    day:"numeric", month:"short", year:"numeric",
  });
};

const fmtShort = (d) => {
  const str = typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
  return new Date(str + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short" });
};

const diffDays = (from, to) => {
  const f = typeof from === "string" ? from.split("T")[0] : new Date(from).toISOString().split("T")[0];
  const t = typeof to   === "string" ? to.split("T")[0]   : new Date(to).toISOString().split("T")[0];
  const ms = new Date(t+"T00:00:00") - new Date(f+"T00:00:00");
  return Math.max(1, Math.ceil(ms/(1000*60*60*24))+1);
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now()-new Date(date))/1000);
  if (s<3600)   return `${Math.floor(s/60)}m ago`;
  if (s<86400)  return `${Math.floor(s/3600)}h ago`;
  if (s<604800) return `${Math.floor(s/86400)}d ago`;
  return fmtShort(new Date(date).toISOString().split("T")[0]);
};

/* ============================================================
   SUB-COMPONENTS
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const s = { success:"bg-green-600", error:"bg-red-600", info:"bg-blue-600" };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${s[toast.type]||s.info}`}>
      {toast.type==="success" ? <FaCheckCircle size={14}/> : <FaExclamationTriangle size={14}/>}
      {toast.msg}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {status==="APPROVED"?<FaCheckCircle size={9}/>:status==="REJECTED"?<FaTimesCircle size={9}/>:<FaHourglassHalf size={9}/>}
      {c.label}
    </span>
  );
};

const Avatar = ({ name }) => {
  const grd = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const i = (name?.charCodeAt(0)||0)%grd.length;
  return (
    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()||"U"}
    </div>
  );
};

/* REJECT MODAL */
const RejectModal = ({ leave, onClose, onConfirm }) => {
  const [reason, setReason]   = useState("");
  const [custom, setCustom]   = useState("");
  const [loading, setLoading] = useState(false);
  const final = reason==="Other" ? custom.trim() : reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 text-white">
          <h2 className="font-bold text-base flex items-center gap-2"><FaBan/> Reject Leave</h2>
          <p className="text-red-100 text-xs mt-0.5">
            {leave.user?.name} · {fmtShort(leave.fromDate)} → {fmtShort(leave.toDate)}
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Reason</p>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map(r=>(
                <button key={r} onClick={()=>setReason(r)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                    reason===r ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-600 hover:border-red-300"
                  }`}>{r}
                </button>
              ))}
            </div>
          </div>
          {reason==="Other" && (
            <textarea value={custom} onChange={e=>setCustom(e.target.value)}
              placeholder="Specify rejection reason..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20"/>
          )}
          {reason && reason!=="Other" && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
              Reason: <span className="font-semibold">{reason}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={async()=>{ setLoading(true); await onConfirm(final); setLoading(false); }}
              disabled={!final||loading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Rejecting...</> : <><FaBan size={11}/>Confirm Reject</>}
            </button>
            <button onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* DETAIL DRAWER */
const LeaveDrawer = ({ leave, onClose, onApprove, onReject }) => {
  if (!leave) return null;
  const days = leave.days || diffDays(leave.fromDate, leave.toDate);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
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
        <div className="flex-1 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={leave.status}/>
            <span className="text-xs text-gray-400">{timeAgo(leave.createdAt)}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">From</p>
                <p className="text-sm font-bold text-gray-800">{fmtDate(leave.fromDate)}</p>
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
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Leave Reason</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed">{leave.reason}</p>
            </div>
          </div>
          {leave.status==="REJECTED" && leave.rejectReason && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rejection Reason</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">{leave.rejectReason}</p>
              </div>
            </div>
          )}
          {leave.status==="PENDING" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={()=>onApprove(leave)}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-semibold transition-all">
                <FaCheckCircle size={12}/> Approve
              </button>
              <button onClick={()=>onReject(leave)}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold transition-all">
                <FaBan size={12}/> Reject
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
const AdminLeaveManagement = () => {
  /* ✅ FIX: leaves always array */
  const [leaves, setLeaves]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast]     = useState(null);
  const [drawerLeave, setDrawerLeave] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  /* filters */
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [page, setPage]           = useState(1);
  const LIMIT = 15;

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(()=>setToast(null), 3500);
  }, []);

  /* ============================================================
     LOAD — handles BOTH old (array) and new (paginated) response
  ============================================================ */
  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit:LIMIT });
      if (search.trim()) params.append("search", search.trim());
      if (status)        params.append("status", status);

      const res  = await api.get(`/leaves/admin?${params}`);
      const data = res.data;

      /* ✅ KEY FIX: handle both formats */
      if (Array.isArray(data)) {
        /* old backend — returns plain array */
        setLeaves(data);
        setTotal(data.length);
        setTotalPages(1);
      } else if (data && Array.isArray(data.data)) {
        /* new backend — returns { data, total, totalPages } */
        setLeaves(data.data);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        /* fallback — unknown format, safe empty */
        setLeaves([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("loadLeaves error:", err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(()=>{ loadLeaves(); },[loadLeaves]);
  useEffect(()=>{ setPage(1); },[search, status]);

  /* ============================================================
     APPROVE
  ============================================================ */
  const approve = async (leave) => {
    setActionId(leave.id);
    try {
      await api.put(`/leaves/${leave.id}/approve`);
      showToast("success", `${leave.user?.name}'s leave approved ✅`);
      setDrawerLeave(null);
      loadLeaves();
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
      showToast("success", `${rejectTarget.user?.name}'s leave rejected`);
      setRejectTarget(null);
      setDrawerLeave(null);
      loadLeaves();
    } catch(e) {
      showToast("error", e.response?.data?.msg||"Rejection failed");
    }
  };

  /* ============================================================
     EXPORT CSV
  ============================================================ */
  const exportCSV = () => {
    if (!leaves.length) { showToast("info","No data to export"); return; }
    const rows = [
      ["Employee","Email","Department","From","To","Days","Reason","Status","Reject Reason","Applied On"],
      ...leaves.map(l=>[
        l.user?.name||"",
        l.user?.email||"",
        l.user?.department||"",
        typeof l.fromDate==="string" ? l.fromDate.split("T")[0] : "",
        typeof l.toDate==="string"   ? l.toDate.split("T")[0]   : "",
        l.days||diffDays(l.fromDate,l.toDate),
        `"${(l.reason||"").replace(/"/g,"'")}"`,
        l.status,
        l.rejectReason||"",
        new Date(l.createdAt).toLocaleDateString("en-IN"),
      ]),
    ];
    const csv  = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`leave-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const clearFilters = () => { setSearch(""); setStatus(""); setPage(1); };
  const hasFilters   = search || status;

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
          <p className="text-sm text-gray-400 mt-0.5">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLeaves}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl">
            <FaSyncAlt size={11}/> Refresh
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium">
            <FaDownload size={11}/> Export CSV
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search employee name or email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl">
              <FaTimes size={10}/> Clear
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* HEADER ROW */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">Employee</div>
          <div className="col-span-3">Leave Period</div>
          <div className="col-span-2 hidden md:block">Reason</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading leaves...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaLeaf className="text-gray-300" size={24}/>
            </div>
            <p className="text-gray-500 font-medium">No leave records found</p>
            <p className="text-gray-400 text-sm">{hasFilters?"Try clearing filters":"No leaves submitted yet"}</p>
            {hasFilters && <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Clear filters</button>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leaves.map(l => {
              const days = l.days || diffDays(l.fromDate, l.toDate);
              const isActioning = actionId === l.id;
              return (
                <div key={l.id}
                  className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors group">

                  {/* EMPLOYEE */}
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                    <Avatar name={l.user?.name}/>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{l.user?.name||"—"}</p>
                      <p className="text-xs text-gray-400 truncate">{l.user?.email||""}</p>
                      {l.user?.department && (
                        <span className="text-[10px] text-blue-600 font-medium">{l.user.department}</span>
                      )}
                    </div>
                  </div>

                  {/* DATE */}
                  <div className="col-span-3">
                    <p className="text-xs font-semibold text-gray-700">
                      {fmtShort(l.fromDate)}
                      {l.fromDate!==l.toDate && <> <FaArrowRight className="inline mx-0.5 text-gray-400" size={8}/> {fmtShort(l.toDate)}</>}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{days} day{days!==1?"s":""} · {timeAgo(l.createdAt)}</p>
                  </div>

                  {/* REASON */}
                  <div className="col-span-2 hidden md:block">
                    <p className="text-xs text-gray-600 line-clamp-2">{l.reason}</p>
                    {l.status==="REJECTED" && l.rejectReason && (
                      <p className="text-[10px] text-red-500 mt-0.5 line-clamp-1">↳ {l.rejectReason}</p>
                    )}
                  </div>

                  {/* STATUS */}
                  <div className="col-span-2">
                    <StatusBadge status={l.status}/>
                  </div>

                  {/* ACTIONS */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    {/* VIEW */}
                    <button onClick={()=>setDrawerLeave(l)}
                      className="w-7 h-7 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors flex-shrink-0"
                      title="View Details">
                      <FaEye size={11}/>
                    </button>
                    {/* QUICK APPROVE/REJECT on hover */}
                    {l.status==="PENDING" && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>approve(l)} disabled={isActioning}
                          className="w-7 h-7 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center disabled:opacity-50"
                          title="Approve">
                          {isActioning
                            ? <div className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"/>
                            : <FaCheck size={10}/>
                          }
                        </button>
                        <button onClick={()=>setRejectTarget(l)} disabled={isActioning}
                          className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center disabled:opacity-50"
                          title="Reject">
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

        {/* FOOTER + PAGINATION */}
        {!loading && leaves.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              {totalPages>1 ? `${(page-1)*LIMIT+1}–${Math.min(page*LIMIT,total)} of ${total}` : `${leaves.length} record${leaves.length!==1?"s":""}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="w-8 h-8 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center disabled:opacity-40">
                  <FaChevronLeft size={11}/>
                </button>
                <div className="flex gap-1">
                  {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                    let p;
                    if(totalPages<=5)      p=i+1;
                    else if(page<=3)       p=i+1;
                    else if(page>=totalPages-2) p=totalPages-4+i;
                    else                   p=page-2+i;
                    return (
                      <button key={p} onClick={()=>setPage(p)}
                        className={`w-8 h-8 rounded-xl text-xs font-semibold transition-colors ${
                          p===page?"bg-blue-600 text-white":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>{p}
                      </button>
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

      {/* DETAIL DRAWER */}
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
};

export default AdminLeaveManagement;