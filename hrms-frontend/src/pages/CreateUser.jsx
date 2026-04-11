import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaUserPlus, FaEnvelope, FaUserTag, FaBuilding,
  FaCheckCircle, FaExclamationCircle, FaPaperPlane,
  FaClock, FaRedo, FaTimes, FaInbox, FaUserShield,
  FaUserTie, FaUsers, FaSearch,
} from "react-icons/fa";

const DEPARTMENTS = ["SQ", "Spiideo", "Annotation", "Vidswap"];
const ROLES       = ["EMPLOYEE", "MANAGER", "HR"];

const ROLE_STYLE = {
  ADMIN:    { bg:"bg-purple-100", text:"text-purple-700", icon:<FaUserShield size={11}/> },
  HR:       { bg:"bg-blue-100",   text:"text-blue-700",   icon:<FaUserTie   size={11}/> },
  MANAGER:  { bg:"bg-amber-100",  text:"text-amber-700",  icon:<FaUserShield size={11}/> },
  EMPLOYEE: { bg:"bg-green-100",  text:"text-green-700",  icon:<FaUsers     size={11}/> },
};

const RoleBadge = ({ role }) => {
  const s = ROLE_STYLE[role] || ROLE_STYLE.EMPLOYEE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {role}
    </span>
  );
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

/* ================================
   MAIN
================================ */
export default function CreateUser() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  /* MANAGER can only invite EMPLOYEE or MANAGER, not HR */
  const availableRoles = currentUser.role === "MANAGER"
    ? ["EMPLOYEE", "MANAGER"]
    : ["EMPLOYEE", "MANAGER", "HR"];

  const [form, setForm]         = useState({ name:"", email:"", role:"EMPLOYEE", department:"" });
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState("");
  const [error, setError]       = useState("");
  const [invites, setInvites]   = useState([]);
  const [invLoading, setInvLoading] = useState(true);
  const [search, setSearch]     = useState("");
  const [actionId, setActionId] = useState(null); // which invite is being actioned
  const [activeTab, setActiveTab] = useState("invite"); // invite | pending

  useEffect(() => { loadInvites(); }, []);

  const loadInvites = async () => {
    try {
      setInvLoading(true);
      const res = await api.get("/auth/invites");
      setInvites(res.data || []);
    } catch { setInvites([]); }
    finally { setInvLoading(false); }
  };

  /* ---- SEND INVITE ---- */
  const submit = async () => {
    setMsg(""); setError("");
    if (!form.name.trim())  return setError("Full name is required");
    if (!form.email.trim()) return setError("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email address");
    if (["EMPLOYEE","MANAGER"].includes(form.role) && !form.department) return setError("Department is required for employees and managers");

    try {
      setLoading(true);
      await api.post("/auth/invite-user", form);
      setMsg(`Invite sent to ${form.email} successfully!`);
      setForm({ name:"", email:"", role:"EMPLOYEE", department:"" });
      loadInvites();
      setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      setError(e.response?.data?.msg || "Failed to send invite");
    } finally { setLoading(false); }
  };

  /* ---- RESEND ---- */
  const resend = async (id, email) => {
    setActionId(id);
    try {
      await api.post(`/auth/invites/${id}/resend`);
      setInvites(prev => prev.map(i =>
        i.id === id ? { ...i, expiresIn:"24h", isExpired:false } : i
      ));
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to resend");
    } finally { setActionId(null); }
  };

  /* ---- CANCEL ---- */
  const cancel = async (id) => {
    if (!window.confirm("Cancel this invite?")) return;
    setActionId(id);
    try {
      await api.delete(`/auth/invites/${id}`);
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to cancel");
    } finally { setActionId(null); }
  };

  const filteredInvites = invites.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.email?.toLowerCase().includes(search.toLowerCase())
  );

  const expiredCount = invites.filter(i => i.isExpired).length;
  const activeCount  = invites.filter(i => !i.isExpired).length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">

        {/* ============================
            HEADER
        ============================ */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaUserPlus className="text-blue-600"/> Invite User
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Send email invitations to new employees or HR staff
          </p>
        </div>

        {/* ============================
            TABS
        ============================ */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-6 w-fit">
          <button onClick={() => setActiveTab("invite")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab==="invite" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <FaPaperPlane size={12}/> Send Invite
          </button>
          <button onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab==="pending" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <FaInbox size={12}/>
            Pending Invites
            {invites.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {invites.length}
              </span>
            )}
          </button>
        </div>

        {/* ============================
            TAB: SEND INVITE
        ============================ */}
        {activeTab === "invite" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* FORM */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-700 mb-5 flex items-center gap-2">
                <FaEnvelope className="text-blue-500"/> Invite Details
              </h2>

              {/* SUCCESS */}
              {msg && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">
                  <FaCheckCircle className="flex-shrink-0"/> {msg}
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">
                  <FaExclamationCircle className="flex-shrink-0"/> {error}
                </div>
              )}

              <div className="space-y-4">

                {/* NAME */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <FaUserTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13}/>
                    <input
                      value={form.name}
                      onChange={e => setForm({...form, name:e.target.value})}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13}/>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({...form, email:e.target.value})}
                      placeholder="e.g. rahul@company.com"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {/* ROLE */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Role *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {availableRoles.map(r => (
                      <button key={r} type="button"
                        onClick={() => setForm({...form, role:r, department: r==="HR" ? "" : form.department})}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          form.role === r
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}>
                        <span className="text-base">
                          {r === "HR" ? <FaUserTie size={16}/> : r === "MANAGER" ? <FaUserShield size={16}/> : <FaUsers size={16}/>}
                        </span>
                        <span className="text-xs font-semibold">{r === "MANAGER" ? "Manager" : r}</span>
                        {form.role === r && <FaCheckCircle size={11} className="text-blue-500"/>}
                      </button>
                    ))}
                  </div>
                  {form.role === "MANAGER" && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                      Manager can view and manage their department's employees, attendance, leaves and documents. No payroll, audit or analytics access.
                    </p>
                  )}
                </div>

                {/* DEPARTMENT (for EMPLOYEE and MANAGER) */}
                {["EMPLOYEE","MANAGER"].includes(form.role) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Department *
                    </label>
                    <div className="relative">
                      <FaBuilding className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13}/>
                      <select
                        value={form.department}
                        onChange={e => setForm({...form, department:e.target.value})}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all mt-2"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Sending Invite...</>
                  ) : (
                    <><FaPaperPlane size={13}/> Send Invitation</>
                  )}
                </button>
              </div>
            </div>

            {/* INFO PANEL */}
            <div className="lg:col-span-2 space-y-4">

              {/* HOW IT WORKS */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-700 text-sm mb-4">How it works</h3>
                <div className="space-y-3">
                  {[
                    { step:"1", color:"bg-blue-100 text-blue-600",   text:"Fill in the user's details and send invite" },
                    { step:"2", color:"bg-indigo-100 text-indigo-600", text:"User receives an email with a registration link" },
                    { step:"3", color:"bg-purple-100 text-purple-600", text:"User sets their password and joins HRMS" },
                    { step:"4", color:"bg-teal-100 text-teal-600",    text:"Account is active — user can login immediately" },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full ${s.color} flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>{s.step}</span>
                      <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* QUICK STATS */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-700 text-sm mb-4">Invite Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{invites.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Pending</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Active</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-red-500">{expiredCount}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Expired</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">24h</div>
                    <div className="text-xs text-gray-500 mt-0.5">Link Validity</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ============================
            TAB: PENDING INVITES
        ============================ */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">

            {/* TABLE HEADER */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button onClick={loadInvites}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
                <FaRedo size={10}/> Refresh
              </button>
            </div>

            {/* COLUMN HEADERS */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[620px]">
              <div className="col-span-4">Invited Person</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2 hidden sm:block">Department</div>
              <div className="col-span-2 hidden md:block">Sent</div>
              <div className="col-span-2 text-right">Status / Actions</div>
            </div>

            {invLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
              </div>
            ) : filteredInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <FaInbox className="text-gray-300" size={24}/>
                </div>
                <p className="text-gray-500 font-medium">No pending invites</p>
                <p className="text-gray-400 text-sm">
                  {search ? "No results for your search" : "All invites have been accepted or cancelled"}
                </p>
                <button onClick={() => setActiveTab("invite")}
                  className="text-sm text-blue-600 hover:underline mt-1">
                  Send a new invite →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredInvites.map(invite => (
                  <div key={invite.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/80 transition-colors group">

                    {/* PERSON */}
                    <div className="col-span-4">
                      <p className="text-sm font-semibold text-gray-800">{invite.name}</p>
                      <p className="text-xs text-gray-400 truncate">{invite.email}</p>
                    </div>

                    {/* ROLE */}
                    <div className="col-span-2">
                      <RoleBadge role={invite.role}/>
                    </div>

                    {/* DEPT */}
                    <div className="col-span-2 hidden sm:block">
                      <span className="text-sm text-gray-500">{invite.department || <span className="text-gray-300">—</span>}</span>
                    </div>

                    {/* SENT */}
                    <div className="col-span-2 hidden md:block">
                      <span className="text-xs text-gray-400">{timeAgo(invite.createdAt)}</span>
                    </div>

                    {/* STATUS + ACTIONS */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {/* EXPIRY BADGE */}
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${
                        invite.isExpired
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        <FaClock size={9}/>
                        {invite.isExpired ? "Expired" : invite.expiresIn}
                      </span>

                      {/* RESEND */}
                      <button
                        onClick={() => resend(invite.id, invite.email)}
                        disabled={actionId === invite.id}
                        className="w-7 h-7 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Resend Invite"
                      >
                        {actionId === invite.id
                          ? <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"/>
                          : <FaRedo size={11}/>
                        }
                      </button>

                      {/* CANCEL */}
                      <button
                        onClick={() => cancel(invite.id)}
                        disabled={actionId === invite.id}
                        className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Cancel Invite"
                      >
                        <FaTimes size={11}/>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* FOOTER */}
            {filteredInvites.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-400">
                  {filteredInvites.length} pending invite{filteredInvites.length !== 1 ? "s" : ""} ·{" "}
                  {expiredCount > 0 && <span className="text-red-500">{expiredCount} expired</span>}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}