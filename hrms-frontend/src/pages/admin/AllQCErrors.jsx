import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaSearch, FaSyncAlt, FaCalendarAlt, FaCheckCircle,
  FaTimesCircle, FaClock, FaChevronDown, FaChevronRight,
  FaExclamationTriangle, FaUsers, FaGamepad, FaFilter,
} from "react-icons/fa";

const SPORTS = ["ALL", "SOCCER", "ICE_HOCKEY", "FIELD_HOCKEY", "HANDBALL", "BASKETBALL"];
const SPORT_LABEL = { SOCCER:"Soccer", ICE_HOCKEY:"Ice Hockey", FIELD_HOCKEY:"Field Hockey", HANDBALL:"Handball", BASKETBALL:"Basketball" };
const SPORT_COLOR = {
  SOCCER:"bg-green-100 text-green-700", ICE_HOCKEY:"bg-blue-100 text-blue-700",
  FIELD_HOCKEY:"bg-teal-100 text-teal-700", HANDBALL:"bg-orange-100 text-orange-700",
  BASKETBALL:"bg-amber-100 text-amber-700",
};
const STATUS_COLOR = {
  PENDING:"bg-gray-100 text-gray-600", VALID:"bg-green-100 text-green-700", INVALID:"bg-red-100 text-red-600",
};
const DISPUTE_STATUS_COLOR = {
  PENDING:"bg-amber-100 text-amber-700", APPROVED:"bg-green-100 text-green-700", REJECTED:"bg-red-100 text-red-700",
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── DISPUTE RESOLUTION MODAL ── */
function ResolveModal({ dispute, onClose, onResolved }) {
  const [loading, setLoading] = useState(false);

  const resolve = async (action) => {
    setLoading(true);
    try {
      await api.patch(`/qc/disputes/${dispute.id}`, { action });
      onResolved(dispute.id, action);
      onClose();
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to resolve");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h3 className="font-bold text-gray-800 text-base mb-1">Resolve Dispute</h3>
        <p className="text-xs text-gray-500 mb-4">Employee has disputed this error as invalid</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 w-20 flex-shrink-0">Employee:</span>
            <span className="font-semibold text-gray-800">{dispute.employee?.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-20 flex-shrink-0">Game:</span>
            <span className="text-gray-700">{dispute.error?.session?.gameName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-20 flex-shrink-0">Time:</span>
            <span className="font-mono text-indigo-600">{dispute.error?.timestamp}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-20 flex-shrink-0">Error:</span>
            <span className="text-gray-700">{dispute.error?.errorText}</span>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <span className="text-gray-500 w-20 flex-shrink-0">Reason:</span>
            <span className="text-gray-700 italic">"{dispute.reason}"</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          Is this error <strong>invalid</strong> (approve dispute → remove error) or <strong>valid</strong> (reject dispute → keep error)?
        </p>

        <div className="flex gap-3">
          <button onClick={() => resolve("APPROVED")} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <FaCheckCircle size={13}/>}
            Approve — Remove Error
          </button>
          <button onClick={() => resolve("REJECTED")} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <FaTimesCircle size={13}/> Reject — Error Valid
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    </div>
  );
}

/* ── SESSION ROW (collapsible) ── */
function SessionRow({ session, pendingDisputes, onDisputeClick }) {
  const [open, setOpen] = useState(false);

  const byEmp = {};
  session.errors?.forEach(e => {
    const name = e.employee?.name || "Unknown";
    if (!byEmp[name]) byEmp[name] = [];
    byEmp[name].push(e);
  });

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      {/* Session header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left">
        {open ? <FaChevronDown size={11} className="text-gray-400 flex-shrink-0"/> : <FaChevronRight size={11} className="text-gray-400 flex-shrink-0"/>}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{session.gameName}</span>
            {session.gameId && <span className="text-xs text-gray-400">#{session.gameId}</span>}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${SPORT_COLOR[session.sport] || "bg-gray-100 text-gray-600"}`}>
              {SPORT_LABEL[session.sport] || session.sport}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              session.qcType === "DEEP" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}>
              {session.qcType === "DEEP" ? "Deep QC" : "Review"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span>{session.league}</span>
            <span>•</span>
            <span>{fmtDate(session.gameDate)}</span>
            <span>•</span>
            <span>by {session.manager?.name}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FaUsers size={10}/> {session.employees?.length || 0} employees
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {pendingDisputes > 0 && (
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
              <FaExclamationTriangle size={9}/> {pendingDisputes} dispute{pendingDisputes > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">
            {session._count?.errors || session.errors?.length || 0} errors
          </span>
        </div>
      </button>

      {/* Expanded: errors grouped by employee */}
      {open && session.errors && (
        <div className="border-t border-gray-100">
          {Object.entries(byEmp).map(([empName, errors]) => (
            <div key={empName} className="border-b border-gray-50 last:border-0">
              <div className="px-5 py-2 bg-indigo-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700">{empName}</span>
                <span className="text-[10px] text-indigo-400">{errors.length} error{errors.length > 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {errors.map(e => {
                  const hasPendingDispute = e.disputes?.some(d => d.status === "PENDING");
                  const lastDispute = e.disputes?.[0];
                  return (
                    <div key={e.id} className={`px-5 py-2.5 flex items-start gap-3 ${hasPendingDispute ? "bg-amber-50/30" : ""}`}>
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                        {e.timestamp}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">{e.errorText}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLOR[e.status]}`}>
                          {e.status}
                        </span>
                        {hasPendingDispute && (
                          <button
                            onClick={() => onDisputeClick(lastDispute)}
                            className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold transition-colors">
                            Resolve
                          </button>
                        )}
                        {!hasPendingDispute && lastDispute && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${DISPUTE_STATUS_COLOR[lastDispute.status]}`}>
                            {lastDispute.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Time ranges */}
          <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Time Ranges</p>
            <div className="flex flex-wrap gap-2">
              {session.employees?.map(e => (
                <span key={e.id} className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600">
                  <strong>{e.employee?.name}</strong>: {e.fromTime} → {e.toTime}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN
============================================================ */
export default function AllQCErrors() {
  const [tab,       setTab]      = useState("sessions");  // sessions | disputes
  const [sessions,  setSessions] = useState([]);
  const [disputes,  setDisputes] = useState([]);
  const [loading,   setLoading]  = useState(false);

  /* filters */
  const [sport,  setSport]  = useState("ALL");
  const [search, setSearch] = useState("");
  const [from,   setFrom]   = useState("");
  const [to,     setTo]     = useState("");

  /* sessions with full errors for display */
  const [sessionDetails, setSessionDetails] = useState({});

  /* resolve modal */
  const [resolveModal, setResolveModal] = useState(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sport !== "ALL") params.set("sport", sport);
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      const res = await api.get(`/qc/sessions?${params}`);
      setSessions(res.data.sessions || []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  }, [sport, from, to]);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/qc/disputes");
      setDisputes(res.data || []);
    } catch { setDisputes([]); }
    finally { setLoading(false); }
  }, []);

  /* load session detail (errors) on expand */
  const loadDetail = async (sessionId) => {
    if (sessionDetails[sessionId]) return;
    try {
      const res = await api.get(`/qc/sessions/${sessionId}`);
      setSessionDetails(p => ({ ...p, [sessionId]: res.data }));
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, errors: res.data.errors, employees: res.data.employees } : s));
    } catch {}
  };

  useEffect(() => {
    if (tab === "sessions") loadSessions();
    else                    loadDisputes();
  }, [tab, loadSessions, loadDisputes]);

  /* count pending disputes per session */
  const pendingBySession = {};
  disputes.forEach(d => {
    const sid = d.error?.session?.id || d.error?.sessionId;
    if (sid) pendingBySession[sid] = (pendingBySession[sid] || 0) + 1;
  });

  const filteredSessions = sessions.filter(s =>
    !search ||
    s.gameName.toLowerCase().includes(search.toLowerCase()) ||
    s.league.toLowerCase().includes(search.toLowerCase()) ||
    s.manager?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleResolved = (disputeId, action) => {
    setDisputes(prev => prev.filter(d => d.id !== disputeId));
    /* refresh sessions to update error statuses */
    loadSessions();
  };

  return (
    <Layout>
      {resolveModal && (
        <ResolveModal
          dispute={resolveModal}
          onClose={() => setResolveModal(null)}
          onResolved={handleResolved}
        />
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">QC Error Reports</h1>
            <p className="text-red-200 text-sm mt-1">View all game sessions, errors, and employee disputes</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-black">{sessions.length}</div>
              <div className="text-red-200 text-[10px]">Sessions</div>
            </div>
            <div className="bg-amber-400/30 border border-amber-300/40 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-black text-amber-100">{disputes.length}</div>
              <div className="text-amber-200 text-[10px]">Pending Disputes</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
          {[["sessions","Game Sessions"],["disputes","Pending Disputes"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab===k ? "bg-white text-red-600 shadow-sm" : "text-white/80 hover:text-white"
              }`}>{l}
              {k === "disputes" && disputes.length > 0 && (
                <span className="ml-1.5 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{disputes.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        {tab === "sessions" && (
          <>
            {/* Sport filter */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
              <FaFilter className="text-gray-400" size={11}/>
              <select value={sport} onChange={e => setSport(e.target.value)}
                className="text-sm text-gray-700 bg-transparent focus:outline-none">
                {SPORTS.map(s => <option key={s} value={s}>{s === "ALL" ? "All Sports" : SPORT_LABEL[s]}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-400" size={12}/>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="border border-gray-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="border border-gray-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>
          </>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <FaSearch className="text-gray-400" size={12}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === "sessions" ? "Search game, league, manager..." : "Search employee..."}
            className="text-sm text-gray-700 bg-transparent focus:outline-none flex-1"/>
        </div>

        <button onClick={() => tab === "sessions" ? loadSessions() : loadDisputes()}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
          <FaSyncAlt size={12} className="text-gray-500"/>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin"/>
        </div>
      ) : tab === "sessions" ? (
        /* ── SESSIONS TAB ── */
        <div>
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
              <FaGamepad className="text-gray-200 mx-auto mb-3" size={32}/>
              <p className="text-gray-400 text-sm">No sessions found</p>
            </div>
          ) : filteredSessions.map(s => (
            <div key={s.id} onClick={() => loadDetail(s.id)}>
              <SessionRow
                session={s}
                pendingDisputes={pendingBySession[s.id] || 0}
                onDisputeClick={setResolveModal}
              />
            </div>
          ))}
        </div>
      ) : (
        /* ── DISPUTES TAB ── */
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
              <FaCheckCircle className="text-gray-200 mx-auto mb-3" size={32}/>
              <p className="text-gray-400 text-sm">No pending disputes</p>
            </div>
          ) : disputes
            .filter(d => !search || d.employee?.name?.toLowerCase().includes(search.toLowerCase()))
            .map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-amber-100 p-5 flex items-start gap-4 hover:border-amber-200 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FaExclamationTriangle className="text-amber-500" size={16}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-gray-800">{d.employee?.name}</span>
                  <span className="text-xs text-gray-400">{d.employee?.department}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{fmtDate(d.createdAt)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Game:</span> {d.error?.session?.gameName}
                  {" "}<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${SPORT_COLOR[d.error?.session?.sport]||""}`}>
                    {SPORT_LABEL[d.error?.session?.sport]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d.error?.timestamp}</span>
                  <span className="text-gray-700">{d.error?.errorText}</span>
                </div>
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 italic">
                  "{d.reason}"
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => setResolveModal(d)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors">
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
