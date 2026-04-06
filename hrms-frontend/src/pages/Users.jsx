import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaUsers, FaUserTie, FaUserShield, FaSearch, FaFilter,
  FaPlus, FaTrashAlt, FaEye, FaEdit, FaKey, FaCheckCircle,
  FaTimesCircle, FaCalendarCheck, FaLeaf, FaFolderOpen,
  FaEnvelope, FaIdBadge, FaClock, FaTimes, FaExclamationTriangle,
  FaSyncAlt, FaUserCheck,
} from "react-icons/fa";

/* ================================
   CONSTANTS
================================ */
const ROLES       = ["ALL", "ADMIN", "HR", "EMPLOYEE"];
const DEPARTMENTS = ["SQ", "Spiideo", "Annotation", "Vidswap"];
const WEEK_DAYS   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

const ROLE_STYLE = {
  ADMIN:    { bg: "bg-purple-100", text: "text-purple-700", icon: <FaUserShield size={11}/> },
  HR:       { bg: "bg-blue-100",   text: "text-blue-700",   icon: <FaUserTie   size={11}/> },
  EMPLOYEE: { bg: "bg-green-100",  text: "text-green-700",  icon: <FaUsers     size={11}/> },
};

const RoleBadge = ({ role }) => {
  const s = ROLE_STYLE[role] || ROLE_STYLE.EMPLOYEE;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {role}
    </span>
  );
};

const Avatar = ({ name, size = "md" }) => {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const colors = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
  const idx    = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || "U"}
    </div>
  );
};

/* ================================
   STAT MINI CARD
================================ */
const StatCard = ({ label, value, color, icon }) => (
  <div className={`rounded-xl p-3 ${color} text-center`}>
    <div className="flex justify-center mb-1 opacity-70">{icon}</div>
    <div className="text-xl font-bold">{value}</div>
    <div className="text-xs opacity-70 mt-0.5">{label}</div>
  </div>
);

/* ================================
   USER DETAIL DRAWER
================================ */
const UserDrawer = ({ user, onClose, onRoleUpdate, onPasswordReset, onDelete, currentUserRole }) => {
  const [detail, setDetail]         = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [roleModal, setRoleModal]   = useState(false);
  const [pwModal, setPwModal]       = useState(false);
  const [newRole, setNewRole]       = useState(user.role);
  const [newPw, setNewPw]           = useState("");
  const [pwConfirm, setPwConfirm]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");
  const [err, setErr]               = useState("");

  useEffect(() => {
    api.get(`/users/${user.id}`)
      .then(r => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [user.id]);

  const handleRoleUpdate = async () => {
    if (newRole === user.role) { setRoleModal(false); return; }
    setSaving(true); setMsg(""); setErr("");
    try {
      await api.put(`/users/${user.id}/role`, { role: newRole });
      setMsg("Role updated successfully");
      onRoleUpdate(user.id, newRole);
      setTimeout(() => { setRoleModal(false); setMsg(""); }, 1500);
    } catch (e) {
      setErr(e.response?.data?.msg || "Failed to update role");
    } finally { setSaving(false); }
  };

  const handlePasswordReset = async () => {
    if (newPw.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (newPw !== pwConfirm) { setErr("Passwords do not match"); return; }
    setSaving(true); setMsg(""); setErr("");
    try {
      await api.put(`/users/${user.id}/reset-password`, { password: newPw });
      setMsg("Password reset successfully");
      onPasswordReset && onPasswordReset();
      setTimeout(() => { setPwModal(false); setNewPw(""); setPwConfirm(""); setMsg(""); }, 1500);
    } catch (e) {
      setErr(e.response?.data?.msg || "Failed to reset password");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} size="lg" />
              <div>
                <h2 className="text-lg font-bold">{user.name}</h2>
                <p className="text-blue-200 text-sm">{user.email}</p>
                <div className="mt-1.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 p-5 space-y-5">

          {/* INFO */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {[
              { icon: <FaIdBadge className="text-gray-400"/>, label: "User ID", val: `#${user.id}` },
              { icon: <FaUserTie className="text-gray-400"/>, label: "Department", val: user.department || "—" },
              { icon: <FaCalendarCheck className="text-gray-400"/>, label: "Weekly Off", val: user.weeklyOff || "Not set" },
              { icon: <FaClock className="text-gray-400"/>, label: "Joined", val: new Date(user.createdAt).toLocaleDateString("en-IN",{ day:"numeric", month:"long", year:"numeric" }) },
              { icon: <FaLeaf className="text-gray-400"/>, label: "Weekoff Balance", val: `${user.weekoffBalance || 0} days` },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 flex-shrink-0">{row.icon}</span>
                <span className="text-xs text-gray-500 w-28 flex-shrink-0">{row.label}</span>
                <span className="text-sm text-gray-700 font-medium">{row.val}</span>
              </div>
            ))}
          </div>

          {/* THIS MONTH STATS */}
          {loadingDetail ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"/>
            </div>
          ) : detail && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">This Month</h3>
                <div className="grid grid-cols-4 gap-2">
                  <StatCard label="Present" value={detail.thisMonth.presentDays} color="bg-green-50 text-green-700" icon={<FaCheckCircle size={14}/>}/>
                  <StatCard label="Absent"  value={detail.thisMonth.absentDays}  color="bg-red-50 text-red-700"    icon={<FaTimesCircle size={14}/>}/>
                  <StatCard label="Half"    value={detail.thisMonth.halfDays}    color="bg-amber-50 text-amber-700" icon={<FaClock size={14}/>}/>
                  <StatCard label="Leave"   value={detail.thisMonth.leaveDays}   color="bg-blue-50 text-blue-700"  icon={<FaLeaf size={14}/>}/>
                </div>
              </div>

              {/* TOTALS */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-gray-700">{user.totalAttendance}</div>
                  <div className="text-xs text-gray-400">Total Records</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-gray-700">{user.totalLeaves}</div>
                  <div className="text-xs text-gray-400">Total Leaves</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-gray-700">{user.totalDocuments}</div>
                  <div className="text-xs text-gray-400">Documents</div>
                </div>
              </div>

              {/* RECENT LEAVES */}
              {detail.recentLeaves?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Leaves</h3>
                  <div className="space-y-2">
                    {detail.recentLeaves.map(l => (
                      <div key={l.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{l.reason}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(l.fromDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} →{" "}
                            {new Date(l.toDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                          l.status==="APPROVED"?"bg-green-100 text-green-700":
                          l.status==="REJECTED"?"bg-red-100 text-red-700":
                          "bg-amber-100 text-amber-700"
                        }`}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ACTIONS */}
          {currentUserRole === "ADMIN" && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Admin Actions</h3>
              <div className="space-y-2">
                <button onClick={() => { setRoleModal(true); setMsg(""); setErr(""); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors text-sm font-medium">
                  <FaEdit size={13}/> Change Role
                </button>
                <button onClick={() => { setPwModal(true); setMsg(""); setErr(""); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors text-sm font-medium">
                  <FaKey size={13}/> Reset Password
                </button>
                {user.role !== "ADMIN" && (
                  <button onClick={() => onDelete(user.id, user.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors text-sm font-medium">
                    <FaTrashAlt size={13}/> Delete User
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROLE MODAL */}
      {roleModal && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <h3 className="font-semibold text-gray-800 mb-4">Change Role — {user.name}</h3>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {["HR","EMPLOYEE"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {msg && <p className="text-green-600 text-sm mb-3">{msg}</p>}
            {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
            <div className="flex gap-2">
              <button onClick={handleRoleUpdate} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : "Update Role"}
              </button>
              <button onClick={() => { setRoleModal(false); setMsg(""); setErr(""); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {pwModal && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <h3 className="font-semibold text-gray-800 mb-4">Reset Password — {user.name}</h3>
            <div className="space-y-3 mb-4">
              <input type="password" placeholder="New Password (min 6 chars)" value={newPw} onChange={e => setNewPw(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
              <input type="password" placeholder="Confirm Password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
            </div>
            {msg && <p className="text-green-600 text-sm mb-3">{msg}</p>}
            {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
            <div className="flex gap-2">
              <button onClick={handlePasswordReset} disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? "Resetting..." : "Reset Password"}
              </button>
              <button onClick={() => { setPwModal(false); setNewPw(""); setPwConfirm(""); setMsg(""); setErr(""); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================
   MAIN PAGE
================================ */
const Users = () => {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [deleting, setDeleting]   = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  /* ---- FILTERS ---- */
  const filtered = useMemo(() => {
    let list = [...users];
    if (roleFilter !== "ALL") list = list.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, roleFilter, search]);

  /* ---- STATS ---- */
  const stats = useMemo(() => ({
    total:     users.length,
    admins:    users.filter(u => u.role === "ADMIN").length,
    hr:        users.filter(u => u.role === "HR").length,
    employees: users.filter(u => u.role === "EMPLOYEE").length,
  }), [users]);

  /* ---- HANDLERS ---- */
  const handleDelete = async (id, name) => {
    setDeleteConfirm({ id, name });
    setSelectedUser(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteConfirm.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to delete user");
    } finally { setDeleting(false); }
  };

  const handleRoleUpdate = (id, newRole) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    if (selectedUser?.id === id) setSelectedUser(prev => ({ ...prev, role: newRole }));
  };

  return (
    <Layout>

      {/* ============================
          HEADER
      ============================ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} total users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl transition-colors">
            <FaSyncAlt size={12}/> Refresh
          </button>
          {currentUser.role === "ADMIN" && (
            <button onClick={() => navigate("/admin/create-user")}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium">
              <FaPlus size={12}/> Invite User
            </button>
          )}
        </div>
      </div>

      {/* ============================
          STATS ROW
      ============================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Total Users",  value: stats.total,     color:"text-blue-600",   bg:"bg-blue-50",   icon:<FaUsers size={16}/>,      filter:"ALL"      },
          { label:"Admins",       value: stats.admins,    color:"text-purple-600", bg:"bg-purple-50", icon:<FaUserShield size={16}/>, filter:"ADMIN"    },
          { label:"HR",           value: stats.hr,        color:"text-blue-600",   bg:"bg-blue-50",   icon:<FaUserTie size={16}/>,    filter:"HR"       },
          { label:"Employees",    value: stats.employees, color:"text-green-600",  bg:"bg-green-50",  icon:<FaUserCheck size={16}/>,  filter:"EMPLOYEE" },
        ].map(s => (
          <button key={s.label} onClick={() => setRoleFilter(s.filter)}
            className={`${s.bg} rounded-2xl p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5 ${roleFilter===s.filter?"ring-2 ring-offset-1 ring-blue-400":""}`}>
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* ============================
          SEARCH + FILTER
      ============================ */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, department..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
        </div>
        <div className="flex items-center gap-2">
          <FaFilter size={11} className="text-gray-400"/>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  roleFilter===r ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>{r==="ALL"?"All":r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================
          USER TABLE
      ============================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">

        {/* TABLE HEADER */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-2 hidden md:block">This Month</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* ROWS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaUsers className="text-gray-300" size={24}/>
            </div>
            <p className="text-gray-500 font-medium">No users found</p>
            <p className="text-gray-400 text-sm">{search ? "Try a different search" : "No users match this filter"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(user => (
              <div key={user.id}>

                {/* MOBILE CARD */}
                <div className="sm:hidden px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={user.name} size="md"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <RoleBadge role={user.role}/>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {user.department && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{user.department}</span>}
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold">
                          <FaCalendarCheck size={9}/> {user.presentDaysThisMonth}d
                        </div>
                        {user.pendingLeaves > 0 && (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-lg px-2 py-0.5 text-xs font-semibold">
                            <FaLeaf size={9}/> {user.pendingLeaves} pending
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl font-medium">
                      <FaEye size={11}/> View
                    </button>
                    {currentUser.role === "ADMIN" && user.role !== "ADMIN" && (
                      <button onClick={() => handleDelete(user.id, user.name)}
                        className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl font-medium">
                        <FaTrashAlt size={10}/> Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* DESKTOP ROW */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors group">

                  {/* USER INFO */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <Avatar name={user.name} size="md"/>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* ROLE */}
                  <div className="col-span-2">
                    <RoleBadge role={user.role}/>
                  </div>

                  {/* DEPARTMENT */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">{user.department || <span className="text-gray-300">—</span>}</span>
                  </div>

                  {/* THIS MONTH PRESENT */}
                  <div className="col-span-2 hidden md:flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-1">
                      <FaCalendarCheck size={10}/>
                      <span className="text-xs font-semibold">{user.presentDaysThisMonth}d</span>
                    </div>
                    {user.pendingLeaves > 0 && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-lg px-2 py-1">
                        <FaLeaf size={10}/>
                        <span className="text-xs font-semibold">{user.pendingLeaves}</span>
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <button onClick={() => setSelectedUser(user)}
                      className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                      title="View Details">
                      <FaEye size={13}/>
                    </button>
                    {currentUser.role === "ADMIN" && user.role !== "ADMIN" && (
                      <button onClick={() => handleDelete(user.id, user.name)}
                        className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete User">
                        <FaTrashAlt size={12}/>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {users.length} users
            </p>
          </div>
        )}
      </div>

      {/* ============================
          USER DETAIL DRAWER
      ============================ */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRoleUpdate={handleRoleUpdate}
          onPasswordReset={() => {}}
          onDelete={handleDelete}
          currentUserRole={currentUser.role}
        />
      )}

      {/* ============================
          DELETE CONFIRM MODAL
      ============================ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle className="text-red-500" size={20}/>
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-1">Delete User?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              <span className="font-semibold text-gray-700">{deleteConfirm.name}</span> will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default Users;