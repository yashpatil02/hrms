import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaMoneyCheckAlt, FaPlay, FaCheckCircle, FaCreditCard,
  FaBan, FaEye, FaTimes, FaFilter, FaSpinner,
  FaExclamationTriangle, FaCalendarAlt, FaUsers,
  FaRupeeSign, FaFileAlt, FaPrint,
} from "react-icons/fa";

/* ─── helpers ─── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLE = {
  DRAFT:     { bg: "bg-yellow-100", text: "text-yellow-700", label: "Draft" },
  APPROVED:  { bg: "bg-blue-100",   text: "text-blue-700",   label: "Approved" },
  PAID:      { bg: "bg-green-100",  text: "text-green-700",  label: "Paid" },
  CANCELLED: { bg: "bg-red-100",    text: "text-red-700",    label: "Cancelled" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.DRAFT;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

/* ─── Payslip Detail Modal ─── */
const PayslipModal = ({ payroll, onClose, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [remark, setRemark] = useState(payroll.remarks || "");
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [actionError, setActionError] = useState("");

  const changeStatus = async (status) => {
    setLoading(true);
    setActionError("");
    try {
      await api.put(`/payroll/${payroll.id}/status`, { status, remarks: remark });
      onStatusChange(payroll.id, status);
      setConfirmPaid(false);
    } catch (err) {
      setActionError(err.response?.data?.message || "Action failed. Please try again.");
    }
    setLoading(false);
  };

  const handlePrint = () => window.print();

  const emp = payroll.user;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col print:shadow-none print:rounded-none print:max-h-full">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              {emp.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{emp.name}</h2>
              <p className="text-xs text-gray-500">{emp.designation || "—"} · {emp.department || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <FaPrint size={11} /> Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Payslip Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 print:p-6">

          {/* Period + Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">
                Payslip — {MONTHS[payroll.month - 1]} {payroll.year}
              </p>
              {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
            </div>
            <StatusBadge status={payroll.status} />
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "Working Days", val: payroll.totalWorkingDays },
              { label: "Present", val: payroll.presentDays },
              { label: "Absent", val: payroll.absentDays },
              { label: "Leaves", val: payroll.leaveDays },
              { label: "Week Off", val: payroll.weekoffDays },
              { label: "Holidays", val: payroll.paidHolidays },
            ].map((c) => (
              <div key={c.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-800">{c.val}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Earnings vs Deductions */}
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Earnings</h3>
              <div className="space-y-2 text-sm">
                {[
                  ["Basic Salary", payroll.basicSalary],
                  ["HRA", payroll.hra],
                  ["DA", payroll.da],
                  ["Other Allowances", payroll.otherAllowances],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-gray-800">₹{fmt(val)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-green-200 flex justify-between font-bold text-green-800">
                  <span>Gross Salary</span>
                  <span>₹{fmt(payroll.grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">Deductions</h3>
              <div className="space-y-2 text-sm">
                {[
                  ["PF (Employee)", payroll.pfDeduction],
                  ["ESI (Employee)", payroll.esiDeduction],
                  ["Professional Tax", payroll.professionalTax],
                  ["TDS", payroll.tds],
                  ["Other", payroll.otherDeductions],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-red-700">₹{fmt(val)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-red-200 flex justify-between font-bold text-red-800">
                  <span>Total Deductions</span>
                  <span>₹{fmt(payroll.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-blue-600 rounded-xl p-4 text-center">
            <p className="text-blue-200 text-sm">Net Take-Home Pay</p>
            <p className="text-3xl font-black text-white mt-1">₹{fmt(payroll.netSalary)}</p>
            <p className="text-blue-300 text-xs mt-1">{MONTHS[payroll.month - 1]} {payroll.year}</p>
          </div>

          {/* Remarks */}
          {payroll.status === "DRAFT" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Remarks (optional)</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                placeholder="Add a note..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none print:hidden"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {payroll.status !== "PAID" && payroll.status !== "CANCELLED" && (
          <div className="flex flex-col gap-2 p-4 border-t border-gray-100 print:hidden">
            {actionError && (
              <p className="text-xs text-red-600 flex items-center gap-1 bg-red-50 px-3 py-2 rounded-lg">
                <FaExclamationTriangle size={10} /> {actionError}
              </p>
            )}
            {/* ✅ Confirm "Mark as Paid" dialog */}
            {confirmPaid && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                <p className="font-semibold text-green-800 mb-2">Confirm: Mark as Paid?</p>
                <p className="text-green-700 text-xs mb-3">This will mark ₹{fmt(payroll.netSalary)} as paid to {payroll.user?.name}. This action cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmPaid(false)} className="flex-1 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg">Cancel</button>
                  <button onClick={() => changeStatus("PAID")} disabled={loading} className="flex-1 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60">
                    {loading ? "…" : "Confirm Paid"}
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
            {payroll.status === "DRAFT" && (
              <>
                <button
                  onClick={() => changeStatus("CANCELLED")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-60"
                >
                  <FaBan size={11} /> Cancel
                </button>
                <button
                  onClick={() => changeStatus("APPROVED")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60"
                >
                  <FaCheckCircle size={11} /> {loading ? "…" : "Approve"}
                </button>
              </>
            )}
            {payroll.status === "APPROVED" && !confirmPaid && (
              <button
                onClick={() => setConfirmPaid(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition"
              >
                <FaCreditCard size={11} /> Mark as Paid
              </button>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const currentDate = new Date();

export default function PayrollManagement() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [genResult, setGenResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/payroll/list?month=${month}&year=${year}`);
      setPayrolls(data);
    } catch (err) {
      console.error("Load payroll error:", err);
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const { data } = await api.post("/payroll/generate", { month, year });
      setGenResult(data);
      await load();
    } catch (err) {
      setGenResult({ error: err.response?.data?.message || "Generation failed" });
    }
    setGenerating(false);
  };

  const handleStatusChange = (id, status) => {
    setPayrolls((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    setSelected((prev) => prev && prev.id === id ? { ...prev, status } : prev);
  };

  const filtered = filterStatus === "ALL"
    ? payrolls
    : payrolls.filter((p) => p.status === filterStatus);

  const stats = {
    total: payrolls.length,
    draft: payrolls.filter((p) => p.status === "DRAFT").length,
    approved: payrolls.filter((p) => p.status === "APPROVED").length,
    paid: payrolls.filter((p) => p.status === "PAID").length,
    totalNet: payrolls.reduce((s, p) => s + (p.netSalary || 0), 0),
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaMoneyCheckAlt className="text-blue-600" /> Payroll Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Generate and manage monthly salary payslips</p>
          </div>
        </div>

        {/* Filters + Generate */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <FaCalendarAlt className="text-gray-400" size={14} />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <div className="flex items-center gap-1 ml-2">
            <FaFilter className="text-gray-400" size={11} />
            {["ALL", "DRAFT", "APPROVED", "PAID", "CANCELLED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
          >
            {generating ? <FaSpinner className="animate-spin" size={12} /> : <FaPlay size={11} />}
            {generating ? "Generating…" : `Generate ${MONTHS[month - 1]}`}
          </button>
        </div>

        {/* Generation result */}
        {genResult && (
          <div className={`rounded-xl p-4 text-sm border ${genResult.error ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
            {genResult.error ? (
              <div className="flex items-center gap-2"><FaExclamationTriangle size={13} /> {genResult.error}</div>
            ) : (
              <div className="flex items-start gap-2">
                <FaCheckCircle size={13} className="mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Payroll generated!</strong> {genResult.results?.filter((r) => !r.skipped).length} records created/updated.
                  {genResult.results?.filter((r) => r.skipped).length > 0 && (
                    <span className="text-green-600"> · {genResult.results.filter((r) => r.skipped).length} skipped (no salary structure).</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",    val: stats.total,    color: "bg-gray-50 text-gray-700" },
            { label: "Draft",    val: stats.draft,    color: "bg-yellow-50 text-yellow-700" },
            { label: "Approved", val: stats.approved, color: "bg-blue-50 text-blue-700" },
            { label: "Paid",     val: stats.paid,     color: "bg-green-50 text-green-700" },
            { label: "Total Payout", val: `₹${fmt(stats.totalNet)}`, color: "bg-indigo-50 text-indigo-700" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl p-3 text-center ${c.color}`}>
              <p className="text-xl font-bold">{c.val}</p>
              <p className="text-xs opacity-70 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading payroll…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FaFileAlt size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No payroll records for {MONTHS[month - 1]} {year}</p>
            <p className="text-xs mt-1 opacity-60">Click "Generate" to create payroll for employees with salary structures</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Working Days</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Pay</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {p.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.user.name}</p>
                            <p className="text-xs text-gray-400">{p.user.designation || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{p.totalWorkingDays}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{p.presentDays}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-800">₹{fmt(p.grossSalary)}</td>
                      <td className="px-4 py-3.5 text-right text-red-600">₹{fmt(p.totalDeductions)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-green-700">₹{fmt(p.netSalary)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition ml-auto"
                        >
                          <FaEye size={10} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selected && (
        <PayslipModal
          payroll={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </Layout>
  );
}
