import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaHistory, FaFilter, FaSyncAlt, FaUser, FaChevronLeft, FaChevronRight,
  FaCheckCircle, FaTimesCircle, FaMoneyBillWave, FaCalendarCheck,
  FaShieldAlt, FaExclamationTriangle, FaUserCog, FaClipboardCheck,
} from "react-icons/fa";

/* ── action config: colour + icon ── */
const ACTION_CONFIG = {
  LEAVE_APPROVED:        { label: "Leave Approved",        color: "bg-green-100 text-green-700 border-green-200",   icon: <FaCheckCircle/> },
  LEAVE_REJECTED:        { label: "Leave Rejected",        color: "bg-red-100 text-red-700 border-red-200",         icon: <FaTimesCircle/> },
  PAYROLL_GENERATED:     { label: "Payroll Generated",     color: "bg-blue-100 text-blue-700 border-blue-200",      icon: <FaMoneyBillWave/> },
  PAYROLL_APPROVED:      { label: "Payroll Approved",      color: "bg-indigo-100 text-indigo-700 border-indigo-200",icon: <FaMoneyBillWave/> },
  PAYROLL_PAID:          { label: "Payroll Paid",          color: "bg-purple-100 text-purple-700 border-purple-200",icon: <FaMoneyBillWave/> },
  PAYROLL_CANCELLED:     { label: "Payroll Cancelled",     color: "bg-gray-100 text-gray-600 border-gray-200",      icon: <FaMoneyBillWave/> },
  ATTENDANCE_UPDATED:    { label: "Attendance Updated",    color: "bg-amber-100 text-amber-700 border-amber-200",   icon: <FaCalendarCheck/> },
  USER_ROLE_CHANGED:     { label: "Role Changed",          color: "bg-orange-100 text-orange-700 border-orange-200",icon: <FaUserCog/> },
  USER_DELETED:          { label: "User Deleted",          color: "bg-red-100 text-red-700 border-red-200",         icon: <FaUser/> },
  QC_SESSION_CREATED:    { label: "QC Session",            color: "bg-rose-100 text-rose-700 border-rose-200",      icon: <FaClipboardCheck/> },
  QC_DISPUTE_APPROVED:   { label: "Dispute Approved",      color: "bg-green-100 text-green-700 border-green-200",   icon: <FaShieldAlt/> },
  QC_DISPUTE_REJECTED:   { label: "Dispute Rejected",      color: "bg-red-100 text-red-700 border-red-200",         icon: <FaShieldAlt/> },
};

const ROLE_COLOR = {
  ADMIN:   "bg-red-100 text-red-700",
  HR:      "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
};

const ENTITY_OPTIONS = ["LEAVE","PAYROLL","ATTENDANCE","USER","QC"];

function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] || { label: action, color: "bg-gray-100 text-gray-600 border-gray-200", icon: <FaHistory/> };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

/* ── metadata expander ── */
function MetaRow({ metadata }) {
  const [open, setOpen] = useState(false);
  if (!metadata || Object.keys(metadata).length === 0) return null;
  return (
    <div className="mt-1.5">
      <button onClick={() => setOpen(o => !o)} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold underline-offset-2 underline">
        {open ? "Hide details" : "Show details"}
      </button>
      {open && (
        <div className="mt-1 bg-gray-50 rounded-lg px-3 py-2 text-[10px] text-gray-600 font-mono space-y-0.5">
          {Object.entries(metadata).map(([k, v]) => (
            <div key={k}><span className="text-gray-400">{k}:</span> {JSON.stringify(v)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagementAudit() {
  const [logs,    setLogs]    = useState([]);
  const [actors,  setActors]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);

  /* filters */
  const [page,     setPage]     = useState(1);
  const [actorId,  setActorId]  = useState("");
  const [action,   setAction]   = useState("");
  const [entity,   setEntity]   = useState("");
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");
  const [search,   setSearch]   = useState("");

  /* load actors for dropdown */
  useEffect(() => {
    api.get("/audit/actors").then(r => setActors(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p });
      if (actorId) params.set("actorId", actorId);
      if (action)  params.set("action",  action);
      if (entity)  params.set("entity",  entity);
      if (from)    params.set("from",    from);
      if (to)      params.set("to",      to);
      if (search)  params.set("search",  search);

      const res = await api.get(`/audit?${params}`);
      setLogs(res.data.logs   || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(p);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [actorId, action, entity, from, to, search, page]);

  useEffect(() => { load(1); }, []); // eslint-disable-line

  const applyFilters = () => load(1);
  const clearFilters = () => {
    setActorId(""); setAction(""); setEntity("");
    setFrom(""); setTo(""); setSearch("");
    setTimeout(() => load(1), 0);
  };

  /* ── summary counts from current page ── */
  const countByEntity = logs.reduce((acc, l) => {
    acc[l.entity] = (acc[l.entity] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaHistory className="text-slate-300"/> Management Audit Trail
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Every management action — who did what, when, and to whom
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/10 text-white text-sm px-4 py-1.5 rounded-full font-semibold">
              {total.toLocaleString("en-IN")} total actions
            </span>
            <button onClick={() => load(page)} className="text-slate-300 hover:text-white transition-colors">
              <FaSyncAlt size={15}/>
            </button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-400" size={12}/>
          <span className="text-sm font-semibold text-gray-600">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Actor */}
          <select value={actorId} onChange={e => setActorId(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">All Actors</option>
            {actors.map(a => (
              <option key={a.actorId} value={a.actorId}>{a.actorName} ({a.actorRole})</option>
            ))}
          </select>

          {/* Entity */}
          <select value={entity} onChange={e => setEntity(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">All Entities</option>
            {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Action */}
          <select value={action} onChange={e => setAction(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">All Actions</option>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Date from */}
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"/>

          {/* Date to */}
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"/>

          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search description…"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={applyFilters}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">
            Apply
          </button>
          <button onClick={clearFilters}
            className="px-5 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-semibold transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* MINI SUMMARY CHIPS */}
      {Object.keys(countByEntity).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(countByEntity).map(([ent, cnt]) => (
            <span key={ent} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">
              {ent}: {cnt}
            </span>
          ))}
        </div>
      )}

      {/* AUDIT TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin"/>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <FaHistory className="text-gray-200 mx-auto mb-3" size={32}/>
            <p className="text-gray-400 text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-4">

                  {/* Timeline dot */}
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"/>

                  <div className="flex-1 min-w-0">
                    {/* Top row: action badge + time */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <ActionBadge action={log.action}/>
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDateTime(log.createdAt)}</span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-800 font-medium leading-snug mb-1.5">
                      {log.description}
                    </p>

                    {/* Actor + target */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Actor */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-slate-500" size={9}/>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{log.actorName}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${ROLE_COLOR[log.actorRole] || "bg-gray-100 text-gray-600"}`}>
                          {log.actorRole}
                        </span>
                      </div>

                      {/* Target employee */}
                      {log.targetUserName && (
                        <>
                          <span className="text-gray-300">→</span>
                          <div className="flex items-center gap-1.5">
                            <FaUser className="text-indigo-400" size={10}/>
                            <span className="text-xs text-indigo-700 font-semibold">{log.targetUserName}</span>
                          </div>
                        </>
                      )}

                      {/* Entity chip */}
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold ml-auto">
                        {log.entity}
                      </span>
                    </div>

                    {/* Metadata expandable */}
                    <MetaRow metadata={log.metadata}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {pages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {page} of {pages} — {total.toLocaleString("en-IN")} total
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => load(page - 1)} disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                <FaChevronLeft size={11} className="text-gray-600"/>
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > pages) return null;
                return (
                  <button key={p} onClick={() => load(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                      p === page ? "bg-indigo-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => load(page + 1)} disabled={page >= pages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                <FaChevronRight size={11} className="text-gray-600"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
