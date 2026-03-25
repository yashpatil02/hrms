import { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import {
  FaFolderOpen, FaSearch, FaTimes, FaSyncAlt,
  FaUsers, FaFile, FaExclamationTriangle,
  FaChevronRight, FaFilter,
} from "react-icons/fa";

/* ============================================================
   HELPERS
============================================================ */
const DEPT_CFG = {
  Spiideo:    { bg:"bg-blue-100",   text:"text-blue-700"   },
  SQ:         { bg:"bg-teal-100",   text:"text-teal-700"   },
  Vidswap:    { bg:"bg-purple-100", text:"text-purple-700" },
  ST:         { bg:"bg-amber-100",  text:"text-amber-700"  },
  Management: { bg:"bg-green-100",  text:"text-green-700"  },
  Annotation: { bg:"bg-pink-100",   text:"text-pink-700"   },
};

const Avatar = ({ name, size = "md" }) => {
  const colors = ["bg-blue-600","bg-indigo-600","bg-purple-600","bg-teal-600","bg-green-600","bg-amber-600","bg-rose-600"];
  const color  = colors[(name?.charCodeAt(0)||0) % colors.length];
  const sz     = size==="sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} ${color} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || "U"}
    </div>
  );
};

/* ============================================================
   TOAST
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${
      toast.type==="success" ? "bg-green-600" : "bg-red-600"
    }`}>
      {toast.msg}
    </div>
  );
};

/* ============================================================
   DOCUMENTS — EMPLOYEE LIST PAGE
============================================================ */
export default function Documents() {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [deptFilter,setDeptFilter]= useState("");
  const [toast,     setToast]     = useState(null);
  const navigate = useNavigate();

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* LOAD */
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/documents/employees");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast("error", "Failed to load employees");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  /* STATS */
  const stats = useMemo(() => {
    const total     = employees.length;
    const withDocs  = employees.filter(e => (e.documentCount||0) > 0).length;
    const noDocs    = total - withDocs;
    const totalDocs = employees.reduce((s,e) => s + (e.documentCount||0), 0);
    return { total, withDocs, noDocs, totalDocs };
  }, [employees]);

  /* DEPARTMENTS for filter */
  const departments = useMemo(() => {
    const s = new Set(employees.map(e => e.department).filter(Boolean));
    return [...s].sort();
  }, [employees]);

  /* FILTERED */
  const filtered = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
      const matchDept   = !deptFilter || e.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  const hasFilters = search || deptFilter;

  return (
    <Layout>
      <Toast toast={toast}/>
      <div className="min-w-0 w-full">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaFolderOpen className="text-blue-600"/> Employee Documents
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage and view documents for all employees</p>
          </div>
          <button onClick={fetchEmployees}
            className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl shadow-sm transition-all">
            <FaSyncAlt size={11}/> Refresh
          </button>
        </div>

        {/* STAT CARDS */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label:"Total Employees", value:stats.total,    icon:<FaUsers size={14}/>,              bg:"bg-blue-50",   text:"text-blue-700"   },
              { label:"With Documents",  value:stats.withDocs, icon:<FaFolderOpen size={14}/>,         bg:"bg-green-50",  text:"text-green-700"  },
              { label:"No Documents",    value:stats.noDocs,   icon:<FaExclamationTriangle size={14}/>,bg:"bg-amber-50",  text:"text-amber-700"  },
              { label:"Total Files",     value:stats.totalDocs,icon:<FaFile size={14}/>,               bg:"bg-indigo-50", text:"text-indigo-700" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <div className={`${s.text} mb-1 flex justify-center`}>{s.icon}</div>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* TOOLBAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">

            {/* SEARCH */}
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employee name or email..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>

            {/* DEPT FILTER */}
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>

            {hasFilters && (
              <button onClick={() => { setSearch(""); setDeptFilter(""); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl">
                <FaTimes size={10}/> Clear
              </button>
            )}
          </div>
        </div>

        {/* EMPLOYEE LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading employees...</p>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaUsers className="text-gray-300" size={28}/>
            </div>
            <p className="text-gray-500 font-semibold">No employees found</p>
            {hasFilters && (
              <button onClick={() => { setSearch(""); setDeptFilter(""); }}
                className="text-sm text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>

        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-5">Employee</div>
              <div className="col-span-3 hidden sm:block">Department</div>
              <div className="col-span-2 text-center">Documents</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {/* ROWS */}
            <div className="divide-y divide-gray-50">
              {filtered.map(emp => {
                const dc   = DEPT_CFG[emp.department] || { bg:"bg-gray-100", text:"text-gray-600" };
                const hasDocs = (emp.documentCount||0) > 0;
                return (
                  <div key={emp.id}
                    className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-blue-50/20 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/admin/documents/${emp.id}`)}>

                    {/* EMPLOYEE INFO */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Avatar name={emp.name}/>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                          {emp.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                      </div>
                    </div>

                    {/* DEPARTMENT */}
                    <div className="col-span-3 hidden sm:block">
                      {emp.department && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${dc.bg} ${dc.text}`}>
                          {emp.department}
                        </span>
                      )}
                    </div>

                    {/* DOC COUNT */}
                    <div className="col-span-2 flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                        hasDocs
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        <FaFile size={9}/>
                        {emp.documentCount || 0}
                      </span>
                    </div>

                    {/* ACTION */}
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/admin/documents/${emp.id}`); }}
                        className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-medium transition-all opacity-0 group-hover:opacity-100">
                        View <FaChevronRight size={9}/>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* FOOTER */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {filtered.length} of {employees.length} employees
                {hasFilters && " (filtered)"}
                {" · Click any row to view documents"}
              </p>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}