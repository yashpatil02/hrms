import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaArrowLeft, FaEdit, FaSave, FaTimes, FaUser, FaBriefcase,
  FaMoneyBillWave, FaCalendarAlt, FaFileAlt, FaUniversity,
  FaHeartbeat, FaPhone, FaEnvelope, FaShieldAlt, FaCheckCircle,
  FaClock, FaTimesCircle, FaExclamationCircle,
} from "react-icons/fa";

/* ── Helpers ── */
const ROLE_COLORS = {
  ADMIN:    { bg: "bg-red-100",    text: "text-red-700"    },
  HR:       { bg: "bg-purple-100", text: "text-purple-700" },
  MANAGER:  { bg: "bg-blue-100",   text: "text-blue-700"   },
  EMPLOYEE: { bg: "bg-green-100",  text: "text-green-700"  },
};

const AVATAR_BG = {
  ADMIN: "bg-red-500", HR: "bg-purple-500", MANAGER: "bg-blue-500", EMPLOYEE: "bg-green-500",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMonthYear(key) {
  // key = "2025-04"
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m)-1]} ${y}`;
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function maskAccount(acc) {
  if (!acc) return "—";
  if (acc.length <= 4) return acc;
  return "****" + acc.slice(-4);
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider w-full sm:w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700 font-medium">{value || "—"}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

const TABS = [
  { id: "overview",    label: "Overview",    icon: <FaUser size={12} /> },
  { id: "personal",    label: "Personal",    icon: <FaHeartbeat size={12} /> },
  { id: "employment",  label: "Employment",  icon: <FaBriefcase size={12} /> },
  { id: "salary",      label: "Salary",      icon: <FaMoneyBillWave size={12} /> },
  { id: "attendance",  label: "Attendance",  icon: <FaCalendarAlt size={12} /> },
  { id: "leaves",      label: "Leaves",      icon: <FaCalendarAlt size={12} /> },
  { id: "documents",   label: "Documents",   icon: <FaFileAlt size={12} /> },
  { id: "bank",        label: "Bank",        icon: <FaUniversity size={12} /> },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── Edit Modal ── */
function EditModal({ tab, user, onSave, onClose }) {
  const [form, setForm] = useState({ ...user });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Only send the keys shown in this tab — not the entire user object
      const payload = {};
      activeFields.forEach(({ key }) => { payload[key] = form[key] ?? null; });
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.msg || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";
  const labelCls = "text-xs font-medium text-gray-500 mb-1 block";

  const fields = {
    personal: [
      { key: "name",        label: "Full Name",    type: "text"   },
      { key: "phone",       label: "Phone",        type: "text"   },
      { key: "dateOfBirth", label: "Date of Birth",type: "date"   },
      { key: "gender",      label: "Gender",       type: "select", options: ["","MALE","FEMALE","OTHER"] },
      { key: "bloodGroup",  label: "Blood Group",  type: "text"   },
      { key: "address",     label: "Address",      type: "text"   },
      { key: "city",        label: "City",         type: "text"   },
      { key: "state",       label: "State",        type: "text"   },
      { key: "pincode",     label: "Pincode",      type: "text"   },
      { key: "emergencyName",  label: "Emergency Contact Name",     type: "text" },
      { key: "emergencyPhone", label: "Emergency Contact Phone",    type: "text" },
      { key: "emergencyRel",   label: "Emergency Contact Relation", type: "text" },
    ],
    employment: [
      { key: "employeeCode", label: "Employee Code", type: "text" },
      { key: "department",   label: "Department",    type: "text" },
      { key: "designation",  label: "Designation",   type: "text" },
      { key: "joinDate",     label: "Join Date",     type: "date" },
    ],
    bank: [
      { key: "bankName",    label: "Bank Name",            type: "text" },
      { key: "bankAccount", label: "Account Number",       type: "text" },
      { key: "bankIFSC",    label: "IFSC Code",            type: "text" },
      { key: "bankHolder",  label: "Account Holder Name",  type: "text" },
    ],
    overview: [
      { key: "name",        label: "Full Name",  type: "text" },
      { key: "phone",       label: "Phone",      type: "text" },
      { key: "department",  label: "Department", type: "text" },
      { key: "designation", label: "Designation",type: "text" },
      { key: "employeeCode",label: "Employee Code",type:"text"},
      { key: "panNumber",   label: "PAN Number", type: "text" },
    ],
  };

  const activeFields = fields[tab] || fields.overview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 capitalize">Edit {tab} Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FaTimes size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeFields.map(f => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={form[f.key] || ""}
                  onChange={e => set(f.key, e.target.value)}
                  className={inputCls}
                >
                  {f.options.map(o => <option key={o} value={o}>{o || "— Select —"}</option>)}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={
                    f.type === "date" && form[f.key]
                      ? new Date(form[f.key]).toISOString().split("T")[0]
                      : (form[f.key] || "")
                  }
                  onChange={e => set(f.key, e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <FaSave size={12} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KPICard({ label, value, color, icon }) {
  return (
    <div className={`rounded-2xl p-4 ${color} flex items-center gap-3`}>
      <div className="text-2xl opacity-70">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value ?? "—"}</p>
        <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function EmployeeProfileView() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const canEdit = ["ADMIN","HR"].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editOpen, setEditOpen]   = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/users/${id}/full-profile`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.msg || "Failed to load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async (form) => {
    await api.patch(`/users/${id}/details`, form);
    load();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <FaExclamationCircle size={40} className="text-red-400" />
          <p className="text-gray-600 font-medium">{error || "Employee not found"}</p>
          <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline text-sm">Go Back</button>
        </div>
      </Layout>
    );
  }

  const { user, salaryStructure, payrolls, documents, leaves, monthlyStats, leaveStats, qcErrors } = data;
  const rc = ROLE_COLORS[user.role] || ROLE_COLORS.EMPLOYEE;
  const ab = AVATAR_BG[user.role]   || "bg-gray-500";

  // Present this month (first key in monthlyStats)
  const thisMonthKey = Object.keys(monthlyStats)[0];
  const thisMonthData = monthlyStats[thisMonthKey] || {};

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl mx-auto">

        {/* ── Back Button ── */}
        <button
          onClick={() => navigate("/admin/employees")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FaArrowLeft size={12} /> Back to Directory
        </button>

        {/* ── Profile Header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-wrap items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl ${ab} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
            {getInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${rc.bg} ${rc.text}`}>
                {user.role}
              </span>
              {user.department && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {user.department}
                </span>
              )}
              {user.designation && (
                <span className="text-xs text-gray-500">{user.designation}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1"><FaEnvelope size={11} />{user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><FaPhone size={11} />{user.phone}</span>}
              {user.employeeCode && <span className="flex items-center gap-1"><FaBriefcase size={11} />{user.employeeCode}</span>}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FaEdit size={12} /> Edit Profile
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-none">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
                  ${activeTab === t.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ─── Tab Content ─── */}
          <div className="p-5">

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KPICard
                    label="Present This Month"
                    value={thisMonthData.present}
                    color="bg-green-50 text-green-700"
                    icon={<FaCheckCircle className="text-green-500" />}
                  />
                  <KPICard
                    label="Leave Balance"
                    value={leaveStats.balance}
                    color="bg-blue-50 text-blue-700"
                    icon={<FaCalendarAlt className="text-blue-500" />}
                  />
                  <KPICard
                    label="Documents"
                    value={documents.length}
                    color="bg-purple-50 text-purple-700"
                    icon={<FaFileAlt className="text-purple-500" />}
                  />
                  <KPICard
                    label="Payslips"
                    value={payrolls.length}
                    color="bg-amber-50 text-amber-700"
                    icon={<FaMoneyBillWave className="text-amber-500" />}
                  />
                </div>

                {/* Quick Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <SectionCard title="Quick Info" icon={<FaUser size={12} />}>
                    <InfoRow label="Employee Code" value={user.employeeCode} />
                    <InfoRow label="Department"    value={user.department} />
                    <InfoRow label="Designation"   value={user.designation} />
                    <InfoRow label="Role"          value={user.role} />
                    <InfoRow label="Join Date"     value={fmtDate(user.joinDate)} />
                    <InfoRow label="Weekly Off"    value={user.weeklyOff} />
                    <InfoRow label="PAN Number"    value={user.panNumber} />
                    <InfoRow label="QC Errors"     value={qcErrors} />
                  </SectionCard>

                  <SectionCard title="Leave Summary" icon={<FaCalendarAlt size={12} />}>
                    <InfoRow label="Total Leaves"    value={leaveStats.total} />
                    <InfoRow label="Approved"        value={leaveStats.approved} />
                    <InfoRow label="Pending"         value={leaveStats.pending} />
                    <InfoRow label="Rejected"        value={leaveStats.rejected} />
                    <InfoRow label="Leave Balance"   value={leaveStats.balance} />
                  </SectionCard>
                </div>
              </div>
            )}

            {/* PERSONAL */}
            {activeTab === "personal" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <SectionCard title="Personal Information" icon={<FaUser size={12} />}>
                  <InfoRow label="Date of Birth" value={fmtDate(user.dateOfBirth)} />
                  <InfoRow label="Gender"        value={user.gender} />
                  <InfoRow label="Blood Group"   value={user.bloodGroup} />
                  <InfoRow label="Address"       value={user.address} />
                  <InfoRow label="City"          value={user.city} />
                  <InfoRow label="State"         value={user.state} />
                  <InfoRow label="Pincode"       value={user.pincode} />
                </SectionCard>

                <SectionCard title="Emergency Contact" icon={<FaPhone size={12} />}>
                  <InfoRow label="Name"     value={user.emergencyName} />
                  <InfoRow label="Phone"    value={user.emergencyPhone} />
                  <InfoRow label="Relation" value={user.emergencyRel} />
                </SectionCard>
              </div>
            )}

            {/* EMPLOYMENT */}
            {activeTab === "employment" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <SectionCard title="Employment Details" icon={<FaBriefcase size={12} />}>
                  <InfoRow label="Employee Code" value={user.employeeCode} />
                  <InfoRow label="Department"    value={user.department} />
                  <InfoRow label="Designation"   value={user.designation} />
                  <InfoRow label="Role"          value={user.role} />
                  <InfoRow label="Join Date"     value={fmtDate(user.joinDate)} />
                  <InfoRow label="Weekly Off"    value={user.weeklyOff} />
                  <InfoRow label="OT Rate/hr"    value={user.overtimeRatePerHour ? `₹${user.overtimeRatePerHour}` : "—"} />
                  <InfoRow label="PAN Number"    value={user.panNumber} />
                  <InfoRow label="Member Since"  value={fmtDate(user.createdAt)} />
                </SectionCard>
              </div>
            )}

            {/* SALARY */}
            {activeTab === "salary" && (
              <div className="space-y-5">
                {/* Salary Structure */}
                {salaryStructure ? (
                  <SectionCard title="Salary Structure" icon={<FaMoneyBillWave size={12} />}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-50">
                          {[
                            ["Basic Salary",       `₹${salaryStructure.basicSalary.toLocaleString("en-IN")}`],
                            ["HRA",                `₹${salaryStructure.hra.toLocaleString("en-IN")}`],
                            ["DA",                 `₹${salaryStructure.da.toLocaleString("en-IN")}`],
                            ["Other Allowances",   `₹${salaryStructure.otherAllowances.toLocaleString("en-IN")}`],
                            ["Gross Salary",       `₹${(salaryStructure.basicSalary + salaryStructure.hra + salaryStructure.da + salaryStructure.otherAllowances).toLocaleString("en-IN")}`, true],
                            ["PF (Employee)",      `${salaryStructure.pfEmployee}%`],
                            ["ESI (Employee)",     `${salaryStructure.esiEmployee}%`],
                            ["Professional Tax",   `₹${salaryStructure.professionalTax}`],
                            ["TDS",                `₹${salaryStructure.tds}`],
                            ["Other Deductions",   `₹${salaryStructure.otherDeductions}`],
                          ].map(([label, val, bold]) => (
                            <tr key={label} className={bold ? "bg-blue-50" : ""}>
                              <td className={`py-2.5 pr-4 text-gray-500 text-xs uppercase tracking-wide ${bold ? "font-semibold text-blue-700" : ""}`}>{label}</td>
                              <td className={`py-2.5 font-semibold ${bold ? "text-blue-700" : "text-gray-700"}`}>{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                ) : (
                  <div className="text-center py-10 text-gray-400 text-sm">No salary structure assigned</div>
                )}

                {/* Last 6 Payslips */}
                {payrolls.length > 0 && (
                  <SectionCard title="Recent Payslips" icon={<FaFileAlt size={12} />}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-gray-100">
                            <th className="pb-2 text-xs text-gray-400 font-medium">Period</th>
                            <th className="pb-2 text-xs text-gray-400 font-medium">Gross</th>
                            <th className="pb-2 text-xs text-gray-400 font-medium">Deductions</th>
                            <th className="pb-2 text-xs text-gray-400 font-medium">Net</th>
                            <th className="pb-2 text-xs text-gray-400 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {payrolls.slice(0, 6).map(p => (
                            <tr key={p.id}>
                              <td className="py-2 font-medium text-gray-700">{MONTH_NAMES[p.month-1]} {p.year}</td>
                              <td className="py-2 text-gray-600">₹{p.grossSalary.toLocaleString("en-IN")}</td>
                              <td className="py-2 text-red-500">-₹{p.totalDeductions.toLocaleString("en-IN")}</td>
                              <td className="py-2 font-semibold text-green-600">₹{p.netSalary.toLocaleString("en-IN")}</td>
                              <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  p.status === "PAID"     ? "bg-green-100 text-green-700" :
                                  p.status === "APPROVED" ? "bg-blue-100 text-blue-700"   :
                                  p.status === "DRAFT"    ? "bg-gray-100 text-gray-600"   :
                                                            "bg-red-100 text-red-600"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}
              </div>
            )}

            {/* ATTENDANCE */}
            {activeTab === "attendance" && (
              <SectionCard title="Monthly Attendance (Last 3 Months)" icon={<FaCalendarAlt size={12} />}>
                {Object.keys(monthlyStats).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No attendance data</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs text-gray-400 font-medium">Month</th>
                          <th className="pb-2 text-center text-xs text-gray-400 font-medium">Present</th>
                          <th className="pb-2 text-center text-xs text-gray-400 font-medium">Absent</th>
                          <th className="pb-2 text-center text-xs text-gray-400 font-medium">Half Day</th>
                          <th className="pb-2 text-center text-xs text-gray-400 font-medium">Leaves</th>
                          <th className="pb-2 text-center text-xs text-gray-400 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {Object.entries(monthlyStats).map(([key, s]) => (
                          <tr key={key}>
                            <td className="py-2.5 font-medium text-gray-700">{fmtMonthYear(key)}</td>
                            <td className="py-2.5 text-center">
                              <span className="inline-block w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center">{s.present}</span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="inline-block w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center">{s.absent}</span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="inline-block w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold flex items-center justify-center">{s.halfDay}</span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="inline-block w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">{s.leaves}</span>
                            </td>
                            <td className="py-2.5 text-center text-gray-500 font-medium">{s.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}

            {/* LEAVES */}
            {activeTab === "leaves" && (
              <SectionCard title="Leave History" icon={<FaCalendarAlt size={12} />}>
                {leaves.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No leave history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs text-gray-400 font-medium">From</th>
                          <th className="pb-2 text-left text-xs text-gray-400 font-medium">To</th>
                          <th className="pb-2 text-left text-xs text-gray-400 font-medium">Reason</th>
                          <th className="pb-2 text-left text-xs text-gray-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leaves.map(l => (
                          <tr key={l.id}>
                            <td className="py-2.5 text-gray-600">{fmtDate(l.fromDate)}</td>
                            <td className="py-2.5 text-gray-600">{fmtDate(l.toDate)}</td>
                            <td className="py-2.5 text-gray-700 max-w-xs truncate">{l.reason}</td>
                            <td className="py-2.5">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                l.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                l.status === "PENDING"  ? "bg-amber-100 text-amber-700"  :
                                                          "bg-red-100 text-red-700"
                              }`}>
                                {l.status === "APPROVED" ? <FaCheckCircle size={9} /> :
                                 l.status === "PENDING"  ? <FaClock size={9} /> :
                                                           <FaTimesCircle size={9} />}
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}

            {/* DOCUMENTS */}
            {activeTab === "documents" && (
              <SectionCard title="Documents" icon={<FaFileAlt size={12} />}>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FaFileAlt size={14} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{d.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{d.documentType}</span>
                              <span className="text-xs text-gray-400">Uploaded by {d.uploadedBy?.name || "—"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0 ml-2">{fmtDate(d.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* BANK */}
            {activeTab === "bank" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <SectionCard title="Bank Details" icon={<FaUniversity size={12} />}>
                  <InfoRow label="Bank Name"       value={user.bankName} />
                  <InfoRow label="Account Number"  value={maskAccount(user.bankAccount)} />
                  <InfoRow label="IFSC Code"       value={user.bankIFSC} />
                  <InfoRow label="Account Holder"  value={user.bankHolder} />
                </SectionCard>
                {canEdit && (
                  <div className="flex items-start">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 w-full">
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        <FaShieldAlt size={12} /> Sensitive Information
                      </div>
                      <p className="text-xs leading-relaxed">
                        Bank account numbers are masked for display. Only authorized HR/Admin personnel
                        can update these details. Ensure accuracy before saving.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {editOpen && canEdit && (
        <EditModal
          tab={activeTab}
          user={user}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
        />
      )}
    </Layout>
  );
}
