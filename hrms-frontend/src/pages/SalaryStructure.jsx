import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaMoneyBillWave, FaUserTie, FaEdit, FaPlus, FaSearch,
  FaTimes, FaSave, FaExclamationTriangle, FaCheckCircle,
  FaRupeeSign, FaPercent, FaBuilding,
} from "react-icons/fa";

/* ─── helpers ─── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const gross = (s) =>
  (parseFloat(s.basicSalary) || 0) +
  (parseFloat(s.hra) || 0) +
  (parseFloat(s.da) || 0) +
  (parseFloat(s.otherAllowances) || 0);

const totalDed = (s) => {
  const g = gross(s);
  const b = parseFloat(s.basicSalary) || 0;
  const pf = (b * (parseFloat(s.pfEmployee) || 0)) / 100;
  const esi = (g * (parseFloat(s.esiEmployee) || 0)) / 100;
  return pf + esi + (parseFloat(s.professionalTax) || 0) + (parseFloat(s.tds) || 0) + (parseFloat(s.otherDeductions) || 0);
};

/* ─── empty form ─── */
const EMPTY = {
  basicSalary: "", hra: "", da: "", otherAllowances: "",
  pfEmployee: "12", pfEmployer: "12",
  esiEmployee: "0.75", esiEmployer: "3.25",
  professionalTax: "", tds: "", otherDeductions: "",
};

/* ─── Field row component ─── */
const Field = ({ label, name, value, onChange, suffix, hint }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
        {suffix === "%" ? <FaPercent size={10} /> : <FaRupeeSign size={10} />}
      </span>
      <input
        type="number"
        min="0"
        name={name}
        value={value}
        onChange={onChange}
        placeholder="0"
        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
      />
    </div>
    {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

/* ─── Modal ─── */
const StructureModal = ({ employee, initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSave = async () => {
    if (!form.basicSalary || parseFloat(form.basicSalary) <= 0) {
      setError("Basic Salary required and must be > 0");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.put(`/payroll/salary-structure/${employee.id}`, form);
      onSaved(data.structure);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const g = gross(form);
  const ded = totalDed(form);
  const net = g - ded;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Salary Structure</h2>
            <p className="text-sm text-gray-500 mt-0.5">{employee.name} · {employee.designation || "—"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Earnings */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Earnings</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Basic Salary" name="basicSalary" value={form.basicSalary} onChange={handleChange} />
              <Field label="HRA" name="hra" value={form.hra} onChange={handleChange} />
              <Field label="Dearness Allowance (DA)" name="da" value={form.da} onChange={handleChange} />
              <Field label="Other Allowances" name="otherAllowances" value={form.otherAllowances} onChange={handleChange} />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Deductions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PF Employee (%)" name="pfEmployee" value={form.pfEmployee} onChange={handleChange} suffix="%" hint="% of Basic Salary" />
              <Field label="PF Employer (%)" name="pfEmployer" value={form.pfEmployer} onChange={handleChange} suffix="%" hint="Employer contribution (info only)" />
              <Field label="ESI Employee (%)" name="esiEmployee" value={form.esiEmployee} onChange={handleChange} suffix="%" hint="% of Gross Salary" />
              <Field label="ESI Employer (%)" name="esiEmployer" value={form.esiEmployer} onChange={handleChange} suffix="%" hint="Employer contribution (info only)" />
              <Field label="Professional Tax (₹)" name="professionalTax" value={form.professionalTax} onChange={handleChange} hint="Fixed monthly amount" />
              <Field label="TDS (₹)" name="tds" value={form.tds} onChange={handleChange} hint="Fixed monthly amount" />
              <Field label="Other Deductions (₹)" name="otherDeductions" value={form.otherDeductions} onChange={handleChange} hint="Fixed monthly amount" />
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Monthly Estimate (Full Month)</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500">Gross</p>
                <p className="text-lg font-bold text-gray-800">₹{fmt(g)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500">Deductions</p>
                <p className="text-lg font-bold text-red-600">₹{fmt(ded)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500">Net Pay</p>
                <p className="text-lg font-bold text-green-600">₹{fmt(net)}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <FaExclamationTriangle size={13} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition"
          >
            <FaSave size={12} /> {loading ? "Saving…" : "Save Structure"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
export default function SalaryStructure() {
  const [structures, setStructures] = useState([]);
  const [unset, setUnset] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { employee, initial }
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        api.get("/payroll/salary-structures"),
        api.get("/payroll/employees-without-structure"),
      ]);
      setStructures(s.data);
      setUnset(u.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSaved = (structure) => {
    setModal(null);
    showToast("Salary structure saved!");
    load();
  };

  const openEdit = (s) =>
    setModal({ employee: s.user, initial: s });

  const openCreate = (emp) =>
    setModal({ employee: emp, initial: null });

  const filtered = structures.filter((s) =>
    s.user.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.user.department || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaMoneyBillWave className="text-blue-600" /> Salary Structures
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage CTC components for each employee</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee…"
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-52"
              />
            </div>
          </div>
        </div>

        {/* Employees without structure */}
        {unset.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3">
              <FaExclamationTriangle size={13} />
              {unset.length} employee{unset.length > 1 ? "s" : ""} without salary structure
            </div>
            <div className="flex flex-wrap gap-2">
              {unset.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => openCreate(emp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition"
                >
                  <FaPlus size={9} /> {emp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No salary structures found</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">HRA</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DA</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Pay</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s) => {
                    const g = gross(s);
                    const ded = totalDed(s);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {s.user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{s.user.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <FaBuilding size={9} /> {s.user.department || "—"} · {s.user.designation || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 font-medium">₹{fmt(s.basicSalary)}</td>
                        <td className="px-4 py-3.5 text-right text-gray-600">₹{fmt(s.hra)}</td>
                        <td className="px-4 py-3.5 text-right text-gray-600">₹{fmt(s.da)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-800">₹{fmt(g)}</td>
                        <td className="px-4 py-3.5 text-right text-red-600 font-medium">₹{fmt(ded)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-green-700">₹{fmt(g - ded)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => openEdit(s)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition ml-auto"
                          >
                            <FaEdit size={10} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <StructureModal
          employee={modal.employee}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold animate-slide-up">
          <FaCheckCircle /> {toast}
        </div>
      )}
    </Layout>
  );
}
