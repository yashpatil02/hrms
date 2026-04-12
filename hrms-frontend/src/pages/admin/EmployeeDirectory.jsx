import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaUser, FaSearch, FaBriefcase, FaPhone, FaEnvelope,
  FaCalendarAlt, FaThLarge, FaList, FaFilter, FaUsers,
} from "react-icons/fa";

const ROLE_COLORS = {
  ADMIN:    { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  HR:       { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  MANAGER:  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  EMPLOYEE: { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
};

const AVATAR_BG = {
  ADMIN:    "bg-red-500",
  HR:       "bg-purple-500",
  MANAGER:  "bg-blue-500",
  EMPLOYEE: "bg-green-500",
};

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

/* ── Employee Card (Grid View) ── */
function EmployeeCard({ emp, onClick }) {
  const rc = ROLE_COLORS[emp.role] || ROLE_COLORS.EMPLOYEE;
  const ab = AVATAR_BG[emp.role]   || "bg-gray-500";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl ${ab} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
          {getInitials(emp.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 truncate">{emp.name}</p>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${rc.bg} ${rc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
            {emp.role}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm text-gray-500">
        {emp.department && (
          <div className="flex items-center gap-2">
            <FaBriefcase size={11} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{emp.department}</span>
          </div>
        )}
        {emp.designation && (
          <div className="flex items-center gap-2">
            <FaUser size={11} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{emp.designation}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FaEnvelope size={11} className="flex-shrink-0 text-gray-400" />
          <span className="truncate text-xs">{emp.email}</span>
        </div>
        {emp.phone && (
          <div className="flex items-center gap-2">
            <FaPhone size={11} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{emp.phone}</span>
          </div>
        )}
        {emp.joinDate && (
          <div className="flex items-center gap-2">
            <FaCalendarAlt size={11} className="flex-shrink-0 text-gray-400" />
            <span>Joined {fmtDate(emp.joinDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Employee Row (List View) ── */
function EmployeeRow({ emp, onClick }) {
  const rc = ROLE_COLORS[emp.role] || ROLE_COLORS.EMPLOYEE;
  const ab = AVATAR_BG[emp.role]   || "bg-gray-500";

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${ab} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {getInitials(emp.name)}
          </div>
          <div>
            <p className="font-medium text-gray-800 text-sm">{emp.name}</p>
            <p className="text-xs text-gray-400">{emp.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${rc.bg} ${rc.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
          {emp.role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{emp.department || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{emp.designation || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{emp.phone || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(emp.joinDate)}</td>
    </tr>
  );
}

/* ── Main Page ── */
export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState("grid"); // grid | list
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter]   = useState("ALL");
  const [deptFilter, setDeptFilter]   = useState("ALL");

  useEffect(() => {
    api.get("/users")
      .then(r => setEmployees(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Unique departments
  const departments = ["ALL", ...new Set(employees.map(e => e.department).filter(Boolean))];

  // Filtered employees
  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || e.role === roleFilter;
    const matchDept = deptFilter === "ALL" || e.department === deptFilter;
    return matchSearch && matchRole && matchDept;
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaUsers className="text-blue-500" />
              Employee Directory
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Loading..." : `${filtered.length} of ${employees.length} employees`}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title="Grid view"
            >
              <FaThLarge size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title="List view"
            >
              <FaList size={14} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-2">
            <FaFilter size={12} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="HR">HR</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>

          {/* Department filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d === "ALL" ? "All Departments" : d}</option>
            ))}
          </select>

          {/* Role count badges */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {["ADMIN","HR","MANAGER","EMPLOYEE"].map(r => {
              const count = employees.filter(e => e.role === r).length;
              const rc = ROLE_COLORS[r];
              return (
                <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${rc.bg} ${rc.text}`}>
                  {r}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <FaUsers size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Grid View */}
        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(emp => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                onClick={() => navigate(`/admin/employees/${emp.id}`)}
              />
            ))}
          </div>
        )}

        {/* List View */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(emp => (
                    <EmployeeRow
                      key={emp.id}
                      emp={emp}
                      onClick={() => navigate(`/admin/employees/${emp.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
