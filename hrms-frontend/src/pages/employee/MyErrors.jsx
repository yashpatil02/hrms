import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaClock, FaChartBar, FaLightbulb, FaSyncAlt,
  FaTimes, FaPaperPlane, FaFilter, FaCalendarAlt,
} from "react-icons/fa";

const STATUS_COLOR = {
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
  VALID:   "bg-green-100 text-green-700 border-green-200",
  INVALID: "bg-red-100 text-red-600 border-red-200",
};
const STATUS_ICON = {
  PENDING: <FaClock size={10} className="text-gray-400"/>,
  VALID:   <FaCheckCircle size={10} className="text-green-500"/>,
  INVALID: <FaTimesCircle size={10} className="text-red-500"/>,
};
const SPORT_LABEL = { SOCCER:"Soccer", ICE_HOCKEY:"Ice Hockey", FIELD_HOCKEY:"Field Hockey", HANDBALL:"Handball", BASKETBALL:"Basketball" };
const SPORT_COLOR = {
  SOCCER:"bg-green-100 text-green-700", ICE_HOCKEY:"bg-blue-100 text-blue-700",
  FIELD_HOCKEY:"bg-teal-100 text-teal-700", HANDBALL:"bg-orange-100 text-orange-700",
  BASKETBALL:"bg-amber-100 text-amber-700",
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

/* ── DISPUTE MODAL ── */
function DisputeModal({ error, onClose, onSubmitted }) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await api.post("/qc/disputes", { errorId: error.id, reason: reason.trim() });
      setDone(true);
      setTimeout(() => { onSubmitted(error.id); onClose(); }, 1500);
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to submit dispute");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Request Error Removal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Explain why this error is invalid — manager will review</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes size={14}/></button>
        </div>

        {/* Error details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs bg-white border border-gray-200 text-indigo-600 px-2 py-0.5 rounded">{error.timestamp}</span>
            <span className="text-sm font-semibold text-gray-700">{error.errorText}</span>
          </div>
          <div className="text-xs text-gray-500">{error.session?.gameName} • {SPORT_LABEL[error.session?.sport] || ""} • {error.session?.league}</div>
        </div>

        {done ? (
          <div className="text-center py-4">
            <FaCheckCircle className="text-green-500 mx-auto mb-2" size={28}/>
            <p className="font-semibold text-green-700">Dispute submitted!</p>
            <p className="text-xs text-gray-500 mt-1">Your manager has been notified.</p>
          </div>
        ) : (
          <>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Reason for dispute *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this error is incorrect, e.g. 'The shot was clearly on target, I correctly marked it...'"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none mb-4"
            />
            <button onClick={submit} disabled={loading || !reason.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <><FaPaperPlane size={12}/> Send Dispute Request</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── MINI SPARKLINE BAR ── */
function DailyBar({ day, count, max }) {
  const height = max > 0 ? Math.max(4, (count / max) * 60) : 4;
  return (
    <div className="flex flex-col items-center gap-0.5 group cursor-default" title={`${day}: ${count} errors`}>
      <div className="text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">{count||""}</div>
      <div style={{ height: 60 }} className="flex items-end">
        <div
          style={{ height: `${height}px`, width: 8 }}
          className={`rounded-sm transition-all ${count > 0 ? "bg-rose-400" : "bg-gray-100"}`}
        />
      </div>
      <div className="text-[8px] text-gray-400">
        {new Date(day+"T00:00:00").getDate()}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MyErrors() {
  const [data,    setData]    = useState(null);  // { errors, stats, topErrors, daily, suggestions }
  const [loading, setLoading] = useState(false);
  const [dispute, setDispute] = useState(null);  // error being disputed

  /* filters */
  const [status, setStatus]   = useState("ALL");
  const [search, setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/qc/my-errors");
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDisputeSubmitted = (errorId) => {
    setData(prev => prev ? {
      ...prev,
      errors: prev.errors.map(e =>
        e.id === errorId ? { ...e, disputes: [{ status: "PENDING" }] } : e
      ),
    } : prev);
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin"/>
      </div>
    </Layout>
  );

  const errors     = data?.errors || [];
  const stats      = data?.stats  || { total:0, valid:0, invalid:0, pending:0 };
  const topErrors  = data?.topErrors || [];
  const daily      = data?.daily  || {};
  const suggestions= data?.suggestions || [];

  /* filter */
  const filtered = errors.filter(e => {
    if (status !== "ALL" && e.status !== status) return false;
    if (search && !e.errorText.toLowerCase().includes(search.toLowerCase()) &&
        !e.session?.gameName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const dailyValues = Object.values(daily);
  const maxDaily    = Math.max(...dailyValues, 1);
  const dailyKeys   = Object.keys(daily);

  return (
    <Layout>
      {dispute && (
        <DisputeModal
          error={dispute}
          onClose={() => setDispute(null)}
          onSubmitted={handleDisputeSubmitted}
        />
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-rose-600 to-red-500 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">My QC Errors</h1>
            <p className="text-red-200 text-sm mt-1">Track your errors, improve performance, and dispute invalid entries</p>
          </div>
          <button onClick={load} className="text-white/70 hover:text-white transition-colors">
            <FaSyncAlt size={15}/>
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label:"Total Errors",    val: stats.total,   color:"bg-rose-50",  text:"text-rose-700",   icon:<FaExclamationTriangle/> },
          { label:"Pending Review",  val: stats.pending, color:"bg-gray-50",  text:"text-gray-700",   icon:<FaClock/> },
          { label:"Confirmed Valid", val: stats.valid,   color:"bg-green-50", text:"text-green-700",  icon:<FaCheckCircle/> },
          { label:"Marked Invalid",  val: stats.invalid, color:"bg-red-50",   text:"text-red-700",    icon:<FaTimesCircle/> },
        ].map(({ label, val, color, text, icon }) => (
          <div key={label} className={`${color} rounded-2xl p-4`}>
            <div className={`text-2xl font-black ${text}`}>{val}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <span className={text}>{icon}</span> {label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* ── DAILY CHART ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaChartBar className="text-rose-500" size={14}/>
            <h2 className="font-bold text-gray-700 text-sm">Daily Error Count (Last 30 Days)</h2>
          </div>
          {dailyValues.every(v => v === 0) ? (
            <div className="flex items-center justify-center h-20 text-gray-300 text-sm">No errors in the last 30 days</div>
          ) : (
            <div className="flex items-end gap-0.5 overflow-x-auto pb-1">
              {dailyKeys.map(day => (
                <DailyBar key={day} day={day} count={daily[day]} max={maxDaily}/>
              ))}
            </div>
          )}
        </div>

        {/* ── TOP ERROR TYPES + IMPROVEMENTS ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* Top errors */}
          <div className="flex items-center gap-2 mb-3">
            <FaExclamationTriangle className="text-amber-500" size={13}/>
            <h2 className="font-bold text-gray-700 text-sm">Most Common Errors</h2>
          </div>
          {topErrors.length === 0 ? (
            <p className="text-xs text-gray-400 mb-4">No errors logged yet</p>
          ) : (
            <div className="space-y-1.5 mb-4">
              {topErrors.map(({ word, count }) => (
                <div key={word} className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-400 h-2 rounded-full transition-all"
                      style={{ width: `${(count / topErrors[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-16 text-right font-mono">{word} ({count})</span>
                </div>
              ))}
            </div>
          )}

          {/* Improvement tips */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-2 border-t border-gray-100 pt-3">
                <FaLightbulb className="text-yellow-400" size={13}/>
                <h2 className="font-bold text-gray-700 text-sm">Improvement Tips</h2>
              </div>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                    {s}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── ERROR LIST ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <h2 className="font-bold text-gray-700 text-sm flex-shrink-0">All My Errors</h2>
          <div className="flex items-center gap-1.5">
            {["ALL","PENDING","VALID","INVALID"].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all border ${
                  status === s ? STATUS_COLOR[s] || "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                }`}>
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 flex-1 min-w-[160px] ml-auto">
            <FaFilter className="text-gray-400" size={11}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search errors or game..."
              className="text-sm text-gray-700 bg-transparent focus:outline-none flex-1"/>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FaCheckCircle className="text-gray-200 mx-auto mb-3" size={28}/>
            <p className="text-gray-400 text-sm">No errors found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(e => {
              const pendingDispute = e.disputes?.[0]?.status === "PENDING";
              const resolvedDispute = e.disputes?.[0];
              const canDispute = e.status !== "INVALID" && !pendingDispute;

              return (
                <div key={e.id} className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors ${e.status === "INVALID" ? "opacity-60" : ""}`}>
                  {/* Status icon */}
                  <div className="mt-1 flex-shrink-0">{STATUS_ICON[e.status]}</div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{e.timestamp}</span>
                      <span className="font-semibold text-gray-800 text-sm">{e.errorText}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_COLOR[e.status]}`}>
                        {e.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                      <span>{e.session?.gameName}</span>
                      {e.session?.sport && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${SPORT_COLOR[e.session.sport]||""}`}>
                          {SPORT_LABEL[e.session.sport]}
                        </span>
                      )}
                      <span>•</span>
                      <span>{e.session?.league}</span>
                      <span>•</span>
                      <span>{fmtDate(e.createdAt)}</span>
                    </div>

                    {/* Dispute status */}
                    {resolvedDispute && (
                      <div className={`mt-1.5 text-xs px-2.5 py-1 rounded-lg w-fit font-semibold ${
                        resolvedDispute.status === "PENDING"  ? "bg-amber-50 text-amber-700" :
                        resolvedDispute.status === "APPROVED" ? "bg-green-50 text-green-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        Dispute {resolvedDispute.status.toLowerCase()}
                        {resolvedDispute.status === "PENDING" && " — awaiting manager review"}
                        {resolvedDispute.status === "APPROVED" && " — error marked invalid ✓"}
                        {resolvedDispute.status === "REJECTED" && " — error confirmed valid"}
                      </div>
                    )}
                  </div>

                  {/* Dispute button */}
                  {canDispute && (
                    <button
                      onClick={() => setDispute(e)}
                      className="flex-shrink-0 text-xs border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap">
                      Dispute Error
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
