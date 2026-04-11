import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaClock, FaChartBar, FaLightbulb, FaSyncAlt,
  FaTimes, FaPaperPlane, FaFilter, FaListUl, FaBullseye,
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
const PIE_COLORS = ["#f59e0b", "#22c55e", "#e11d48"];

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
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Reason for dispute *</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this error is incorrect…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none mb-4"
            />
            <button onClick={submit} disabled={loading || !reason.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <><FaPaperPlane size={12}/> Send Dispute Request</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── CUSTOM TOOLTIP for recharts ── */
function CustomBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{payload[0].payload.phrase}</p>
      <p className="text-rose-600 font-bold">{payload[0].value} occurrence{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

function CustomAreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-rose-600 font-bold">{payload[0].value} error{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

/* ── IMPROVEMENT TAB ── */
function ImprovementTab({ topErrors, daily, suggestions, stats }) {
  /* Build area chart data */
  const areaData = Object.entries(daily).map(([date, count]) => ({
    date: new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short" }),
    errors: count,
  }));

  /* Build bar chart data — truncate long phrases for display */
  const barData = topErrors.map(({ phrase, count }) => ({
    phrase,
    shortLabel: phrase.length > 18 ? phrase.slice(0, 16) + "…" : phrase,
    count,
  }));

  /* Pie data */
  const pieData = [
    { name: "Pending", value: stats.pending },
    { name: "Valid",   value: stats.valid   },
    { name: "Invalid", value: stats.invalid },
  ].filter(d => d.value > 0);

  const hasData = stats.total > 0;

  return (
    <div className="space-y-6">
      {!hasData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FaBullseye className="text-gray-200 mx-auto mb-3" size={32}/>
          <p className="text-gray-400 text-sm">No errors logged yet — keep up the great work!</p>
        </div>
      )}

      {hasData && (
        <>
          {/* ── Row 1: 30-day trend ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <FaChartBar className="text-rose-500" size={14}/>
              <h2 className="font-bold text-gray-700 text-sm">30-Day Error Trend</h2>
              <span className="ml-auto text-xs text-gray-400">{stats.total} total errors</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={4}/>
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip content={<CustomAreaTooltip />}/>
                <Area type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={2} fill="url(#errGrad)" dot={false} activeDot={{ r: 4, fill: "#f43f5e" }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Row 2: Top errors bar + Pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Bar chart — most common errors */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <FaExclamationTriangle className="text-amber-500" size={13}/>
                <h2 className="font-bold text-gray-700 text-sm">Most Common Error Types</h2>
              </div>
              {barData.length === 0 ? (
                <p className="text-xs text-gray-400">No error data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false}/>
                    <YAxis type="category" dataKey="shortLabel" tick={{ fontSize: 10, fill: "#374151" }} tickLine={false} axisLine={false} width={110}/>
                    <Tooltip content={<CustomBarTooltip />}/>
                    <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={18}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart — status breakdown */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <FaBullseye className="text-indigo-500" size={13}/>
                <h2 className="font-bold text-gray-700 text-sm">Status Breakdown</h2>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Row 3: Improvement suggestions ── */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <FaLightbulb className="text-yellow-400" size={14}/>
                <h2 className="font-bold text-gray-700 text-sm">Personalised Improvement Plan</h2>
                <span className="ml-auto text-[10px] text-gray-400 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full">Based on your error history</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {suggestions.map((s, i) => (
                  <div key={i} className="relative bg-gradient-to-br from-yellow-50 to-amber-50 border border-amber-100 rounded-xl p-4">
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-[10px] font-black flex items-center justify-center">
                      #{i + 1}
                    </div>
                    <FaLightbulb className="text-amber-400 mb-2" size={16}/>
                    <p className="text-sm text-gray-700 leading-relaxed pr-6">{s}</p>
                  </div>
                ))}
              </div>

              {/* Top errors detail list */}
              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Full Error Breakdown</p>
                <div className="space-y-2">
                  {topErrors.map(({ phrase, count }, i) => (
                    <div key={phrase} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-4 text-right font-bold">{i + 1}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-400 h-2 rounded-full transition-all"
                          style={{ width: `${(count / topErrors[0].count) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-700 font-semibold min-w-[80px]">{phrase}</span>
                      <span className="text-xs text-gray-400 font-mono">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MyErrors() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispute, setDispute] = useState(null);
  const [tab,     setTab]     = useState("errors"); // "errors" | "improvement"

  /* filters */
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

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

  const errors      = data?.errors      || [];
  const stats       = data?.stats       || { total:0, valid:0, invalid:0, pending:0 };
  const topErrors   = data?.topErrors   || [];
  const daily       = data?.daily       || {};
  const suggestions = data?.suggestions || [];

  const filtered = errors.filter(e => {
    if (status !== "ALL" && e.status !== status) return false;
    if (search && !e.errorText.toLowerCase().includes(search.toLowerCase()) &&
        !e.session?.gameName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label:"Total Errors",    val: stats.total,   color:"bg-rose-50",  text:"text-rose-700",  icon:<FaExclamationTriangle/> },
          { label:"Pending Review",  val: stats.pending, color:"bg-gray-50",  text:"text-gray-700",  icon:<FaClock/> },
          { label:"Confirmed Valid", val: stats.valid,   color:"bg-green-50", text:"text-green-700", icon:<FaCheckCircle/> },
          { label:"Marked Invalid",  val: stats.invalid, color:"bg-red-50",   text:"text-red-700",   icon:<FaTimesCircle/> },
        ].map(({ label, val, color, text, icon }) => (
          <div key={label} className={`${color} rounded-2xl p-4`}>
            <div className={`text-2xl font-black ${text}`}>{val}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <span className={text}>{icon}</span> {label}
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        <button
          onClick={() => setTab("errors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "errors"
              ? "bg-white text-rose-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FaListUl size={12}/> My Errors
        </button>
        <button
          onClick={() => setTab("improvement")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "improvement"
              ? "bg-white text-rose-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FaLightbulb size={12}/> Improvement
          {suggestions.length > 0 && (
            <span className="bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT */}
      {tab === "improvement" ? (
        <ImprovementTab topErrors={topErrors} daily={daily} suggestions={suggestions} stats={stats}/>
      ) : (
        /* ── ERRORS TAB ── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <h2 className="font-bold text-gray-700 text-sm flex-shrink-0">All My Errors</h2>
            <div className="flex items-center gap-1.5">
              {["ALL","PENDING","VALID","INVALID"].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all border ${
                    status === s
                      ? STATUS_COLOR[s] || "bg-indigo-100 text-indigo-700 border-indigo-200"
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}>
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 flex-1 min-w-[160px] ml-auto">
              <FaFilter className="text-gray-400" size={11}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search errors or game…"
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
                const pendingDispute  = e.disputes?.[0]?.status === "PENDING";
                const resolvedDispute = e.disputes?.[0];
                const canDispute      = e.status !== "INVALID" && !pendingDispute;

                return (
                  <div key={e.id} className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors ${e.status === "INVALID" ? "opacity-60" : ""}`}>
                    <div className="mt-1 flex-shrink-0">{STATUS_ICON[e.status]}</div>
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
                      {resolvedDispute && (
                        <div className={`mt-1.5 text-xs px-2.5 py-1 rounded-lg w-fit font-semibold ${
                          resolvedDispute.status === "PENDING"  ? "bg-amber-50 text-amber-700" :
                          resolvedDispute.status === "APPROVED" ? "bg-green-50 text-green-700" :
                          "bg-red-50 text-red-700"
                        }`}>
                          Dispute {resolvedDispute.status.toLowerCase()}
                          {resolvedDispute.status === "PENDING"  && " — awaiting manager review"}
                          {resolvedDispute.status === "APPROVED" && " — error permanently removed ✓"}
                          {resolvedDispute.status === "REJECTED" && " — error confirmed valid"}
                        </div>
                      )}
                    </div>
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
      )}
    </Layout>
  );
}
