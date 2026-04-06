import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import {
  FaUserSlash, FaSearch, FaUndoAlt, FaSyncAlt,
  FaTimes, FaFilter, FaExclamationTriangle,
  FaCalendarAlt, FaUserTie, FaBuilding,
} from "react-icons/fa";

const DEPARTMENTS = ["Spiideo","SQ","Vidswap","ST","Management"];

const SHIFT_COLORS = {
  MORNING:"bg-amber-100 text-amber-700", AFTERNOON:"bg-blue-100 text-blue-700",
  GENERAL:"bg-gray-100 text-gray-700",   EVENING:"bg-purple-100 text-purple-700",
  NIGHT:"bg-indigo-100 text-indigo-700",
};

const Avatar = ({ name }) => {
  const grd = ["from-red-400 to-rose-500","from-gray-400 to-slate-500","from-orange-400 to-amber-500"];
  const i   = (name?.charCodeAt(0)||0) % grd.length;
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grd[i]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 opacity-70`}>
      {name?.charAt(0)?.toUpperCase()||"A"}
    </div>
  );
};

/* ---- RESTORE CONFIRM MODAL ---- */
const RestoreModal = ({ analyst, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaUndoAlt className="text-green-600" size={22}/>
        </div>
        <h3 className="font-bold text-gray-800 text-lg mb-1">Restore Analyst</h3>
        <p className="text-sm text-gray-500 mb-5">
          Restore <strong className="text-gray-700">{analyst.name}</strong> as an active analyst?
        </p>
        <div className="flex gap-3">
          <button onClick={async()=>{ setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">
            {loading?"Restoring...":"Yes, Restore"}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TerminatedAnalysts() {
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/analysts/terminated");
      setList(res.data||[]);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const restore = async () => {
    await api.put(`/analysts/${restoreTarget.id}/restore`);
    setList(p=>p.filter(a=>a.id!==restoreTarget.id));
    setRestoreTarget(null);
  };

  const filtered = useMemo(()=>
    list.filter(a=>
      (!filterDept || a.department===filterDept) &&
      (!search || a.name.toLowerCase().includes(search.toLowerCase()))
    ),[list,search,filterDept]);

  const hasFilters = search||filterDept;

  return (
    <Layout>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaUserSlash className="text-red-500"/> Terminated Employees
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">View and restore terminated analysts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold border border-red-100">
            {list.length} terminated
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl">
            <FaSyncAlt size={11}/> Refresh
          </button>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search terminated analysts..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"/>
        </div>
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
        </select>
        {hasFilters && (
          <button onClick={()=>{setSearch("");setFilterDept("");}}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-2.5 rounded-xl">
            <FaTimes size={10}/> Clear
          </button>
        )}
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">

        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[620px]">
          <div className="col-span-4">Analyst</div>
          <div className="col-span-2 hidden sm:block">Department</div>
          <div className="col-span-2 hidden md:block">Last Shift</div>
          <div className="col-span-2 hidden lg:block">Terminated By</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-red-100 border-t-red-500 rounded-full animate-spin"/>
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaUserSlash className="text-gray-300" size={24}/>
            </div>
            <p className="text-gray-500 font-medium">No terminated analysts</p>
            <p className="text-gray-400 text-sm">{hasFilters?"Try clearing your filters":"All analysts are active"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(a=>(
              <div key={a.id}>
                {/* ROW */}
                <div
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors cursor-pointer"
                  onClick={()=>setExpandedId(expandedId===a.id?null:a.id)}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar name={a.name}/>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{a.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <FaCalendarAlt size={9}/>
                        {a.terminatedAt ? new Date(a.terminatedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{a.department}</span>
                  </div>
                  <div className="col-span-2 hidden md:block">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SHIFT_COLORS[a.shift]||"bg-gray-100 text-gray-600"}`}>
                      {a.shift}
                    </span>
                  </div>
                  <div className="col-span-2 hidden lg:block">
                    <span className="text-xs text-gray-500">{a.terminatedByName||"—"}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={e=>{ e.stopPropagation(); setRestoreTarget(a); }}
                      className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <FaUndoAlt size={10}/> Restore
                    </button>
                  </div>
                </div>

                {/* EXPANDED REASON */}
                {expandedId===a.id && (
                  <div className="mx-5 mb-4 bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <FaExclamationTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={13}/>
                      <div>
                        <p className="text-xs font-semibold text-red-600 mb-1">Termination Reason</p>
                        <p className="text-sm text-gray-700">{a.terminationReason||"No reason provided"}</p>
                      </div>
                    </div>
                    {a.terminatedByName && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <FaUserTie size={10}/> Terminated by <strong>{a.terminatedByName}</strong>
                        {a.terminatedAt && <> on {new Date(a.terminatedAt).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length>0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {list.length} terminated analysts · Click a row to see reason</p>
          </div>
        )}
      </div>

      {restoreTarget && (
        <RestoreModal analyst={restoreTarget} onClose={()=>setRestoreTarget(null)} onConfirm={restore}/>
      )}

    </Layout>
  );
}