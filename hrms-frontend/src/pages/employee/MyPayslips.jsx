import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaMoneyBillWave, FaEye, FaTimes, FaFileAlt, FaPrint,
  FaCheckCircle, FaClock, FaCreditCard,
} from "react-icons/fa";

/* ─── helpers ─── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLE = {
  DRAFT:     { bg: "bg-yellow-100", text: "text-yellow-700", icon: <FaClock size={10} />,       label: "Pending" },
  APPROVED:  { bg: "bg-blue-100",   text: "text-blue-700",   icon: <FaCheckCircle size={10} />, label: "Approved" },
  PAID:      { bg: "bg-green-100",  text: "text-green-700",  icon: <FaCreditCard size={10} />,  label: "Paid" },
  CANCELLED: { bg: "bg-red-100",    text: "text-red-700",    icon: null,                         label: "Cancelled" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {s.label}
    </span>
  );
};

/* ─── Payslip Detail Modal ─── */
const PayslipModal = ({ payroll, onClose }) => {
  if (!payroll) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="font-bold text-gray-900">Payslip</h2>
            <p className="text-sm text-gray-500">{MONTHS[payroll.month - 1]} {payroll.year}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <FaPrint size={11} /> Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 print:p-6">

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {MONTHS[payroll.month - 1]} {payroll.year}
            </p>
            <StatusBadge status={payroll.status} />
          </div>

          {/* Attendance */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "Working", val: payroll.totalWorkingDays },
              { label: "Present", val: payroll.presentDays },
              { label: "Absent",  val: payroll.absentDays },
              { label: "Leaves",  val: payroll.leaveDays },
              { label: "Week Off", val: payroll.weekoffDays },
              { label: "Holidays", val: payroll.paidHolidays },
            ].map((c) => (
              <div key={c.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className="text-base font-bold text-gray-800">{c.val}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Earnings vs Deductions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3.5 border border-green-100">
              <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2.5">Earnings</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  ["Basic", payroll.basicSalary],
                  ["HRA", payroll.hra],
                  ["DA", payroll.da],
                  ["Others", payroll.otherAllowances],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-gray-600">{l}</span>
                    <span className="font-medium">₹{fmt(v)}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-green-200 flex justify-between font-bold text-green-800 text-sm">
                  <span>Gross</span>
                  <span>₹{fmt(payroll.grossSalary)}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-3.5 border border-red-100">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2.5">Deductions</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  ["PF", payroll.pfDeduction],
                  ["ESI", payroll.esiDeduction],
                  ["Prof. Tax", payroll.professionalTax],
                  ["TDS", payroll.tds],
                  ["Others", payroll.otherDeductions],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-gray-600">{l}</span>
                    <span className="font-medium text-red-700">₹{fmt(v)}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-red-200 flex justify-between font-bold text-red-800 text-sm">
                  <span>Total</span>
                  <span>₹{fmt(payroll.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-blue-600 rounded-xl p-4 text-center">
            <p className="text-blue-200 text-xs">Net Take-Home Pay</p>
            <p className="text-3xl font-black text-white mt-1">₹{fmt(payroll.netSalary)}</p>
          </div>

          {payroll.remarks && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 border border-gray-200">
              <strong>Remarks:</strong> {payroll.remarks}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/payroll/my-payslips");
        setPayslips(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load payslips. Please try again.");
      }
      setLoading(false);
    };
    load();
  }, []);

  const totalPaid = payslips
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + (p.netSalary || 0), 0);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaMoneyBillWave className="text-blue-600" /> My Payslips
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">View your monthly salary payslips</p>
        </div>

        {/* Quick stats */}
        {!loading && payslips.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{payslips.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Payslips</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-700">{payslips.filter((p) => p.status === "PAID").length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Paid</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-xl font-bold text-blue-700">₹{fmt(totalPaid)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Earned (Paid)</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <FaFileAlt size={13} /> {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading payslips…</div>
        ) : payslips.length === 0 && !error ? (
          <div className="text-center py-16 text-gray-400">
            <FaFileAlt size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No payslips yet</p>
            <p className="text-xs mt-1 opacity-60">Your payslips will appear here once generated by HR</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payslips.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Month Badge */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-xs font-semibold leading-none">{MONTHS[p.month - 1].slice(0, 3).toUpperCase()}</span>
                  <span className="text-base font-black leading-none mt-0.5">{p.year}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{MONTHS[p.month - 1]} {p.year}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Present: <strong className="text-gray-700">{p.presentDays}</strong></span>
                    <span>Gross: <strong className="text-gray-700">₹{fmt(p.grossSalary)}</strong></span>
                    <span className="text-red-500">Ded: ₹{fmt(p.totalDeductions)}</span>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Net Pay</p>
                  <p className="text-xl font-black text-green-700">₹{fmt(p.netSalary)}</p>
                </div>

                {/* Action */}
                <button
                  onClick={() => setSelected(p)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition flex-shrink-0"
                >
                  <FaEye size={11} /> View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && <PayslipModal payroll={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}
