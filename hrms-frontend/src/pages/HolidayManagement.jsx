import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaCalendarAlt, FaPlus, FaEdit, FaTrashAlt, FaTimes,
  FaSave, FaCheckCircle, FaExclamationTriangle, FaGift,
  FaGlobe, FaStar,
} from "react-icons/fa";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_STYLE = {
  PUBLIC:     { bg: "bg-red-100",    text: "text-red-700",    icon: <FaGlobe size={10} />,  label: "Public" },
  OPTIONAL:   { bg: "bg-blue-100",   text: "text-blue-700",   icon: <FaStar  size={10} />,  label: "Optional" },
  RESTRICTED: { bg: "bg-amber-100",  text: "text-amber-700",  icon: <FaGift  size={10} />,  label: "Restricted" },
};

const TypeBadge = ({ type }) => {
  const s = TYPE_STYLE[type] || TYPE_STYLE.PUBLIC;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {s.label}
    </span>
  );
};

const EMPTY = { name: "", date: "", type: "PUBLIC", description: "" };

/* ── Quick Import: common Indian holidays ── */
const PRESET_HOLIDAYS = (year) => [
  { name: "New Year's Day",       date: `${year}-01-01`, type: "PUBLIC" },
  { name: "Republic Day",         date: `${year}-01-26`, type: "PUBLIC" },
  { name: "Holi",                 date: `${year}-03-14`, type: "PUBLIC" },
  { name: "Good Friday",          date: `${year}-04-18`, type: "PUBLIC" },
  { name: "Independence Day",     date: `${year}-08-15`, type: "PUBLIC" },
  { name: "Gandhi Jayanti",       date: `${year}-10-02`, type: "PUBLIC" },
  { name: "Dussehra",             date: `${year}-10-02`, type: "PUBLIC" },
  { name: "Diwali",               date: `${year}-10-20`, type: "PUBLIC" },
  { name: "Christmas",            date: `${year}-12-25`, type: "PUBLIC" },
];

const HolidayModal = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial || { ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!form.name.trim() || !form.date) { setError("Name and date are required"); return; }
    setLoading(true);
    try {
      if (isEdit) {
        const { data } = await api.put(`/holidays/${initial.id}`, form);
        onSaved(data.holiday, "update");
      } else {
        const { data } = await api.post("/holidays", form);
        onSaved(data.holiday, "create");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{isEdit ? "Edit Holiday" : "Add Holiday"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><FaTimes /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Holiday Name *</label>
            <input
              value={form.name}
              onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setError(""); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="e.g. Diwali"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); setError(""); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="PUBLIC">Public Holiday</option>
              <option value="OPTIONAL">Optional Holiday</option>
              <option value="RESTRICTED">Restricted Holiday</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="Optional note"
            />
          </div>
          {error && <p className="text-xs text-red-600 flex items-center gap-1"><FaExclamationTriangle size={10} /> {error}</p>}
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition"
          >
            <FaSave size={12} /> {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function HolidayManagement() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async (y = year) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/holidays?year=${y}`);
      setHolidays(data);
    } catch (err) {
      console.error("Load holidays error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(year); }, [year]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = (holiday, action) => {
    if (action === "create") setHolidays((p) => [...p, holiday].sort((a, b) => new Date(a.date) - new Date(b.date)));
    else setHolidays((p) => p.map((h) => (h.id === holiday.id ? holiday : h)));
    setModal(null);
    showToast(action === "create" ? "Holiday added!" : "Holiday updated!");
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/holidays/${id}`);
      setHolidays((p) => p.filter((h) => h.id !== id));
      setDeleteConfirm(null);
      showToast("Holiday deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data } = await api.post("/holidays/bulk", { holidays: PRESET_HOLIDAYS(year) });
      showToast(`${data.count} holidays imported!`);
      load(year);
    } catch (err) {
      showToast(err.response?.data?.message || "Import failed", "error");
    }
    setImporting(false);
  };

  // Group by month
  const grouped = {};
  holidays.forEach((h) => {
    const m = new Date(h.date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600" /> Holiday Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage company holidays for the year</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
            >
              <FaGift size={12} /> {importing ? "Importing…" : "Import Indian Holidays"}
            </button>
            <button
              onClick={() => setModal({ form: { ...EMPTY } })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <FaPlus size={12} /> Add Holiday
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",      val: holidays.length,                                          color: "bg-gray-50 text-gray-700" },
            { label: "Public",     val: holidays.filter((h) => h.type === "PUBLIC").length,       color: "bg-red-50 text-red-700" },
            { label: "Optional",   val: holidays.filter((h) => h.type === "OPTIONAL").length,     color: "bg-blue-50 text-blue-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FaCalendarAlt size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No holidays for {year}</p>
            <p className="text-xs mt-1 opacity-60">Click "Add Holiday" or import Indian holidays</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([monthIdx, items]) => (
              <div key={monthIdx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-700 text-sm">{MONTHS[monthIdx]}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map((h) => {
                    const d = new Date(h.date);
                    const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
                    return (
                      <div key={h.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        {/* Date Badge */}
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex flex-col items-center justify-center text-white flex-shrink-0">
                          <span className="text-xs font-semibold leading-none">{d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</span>
                          <span className="text-xl font-black leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{h.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{dayName} {h.description && `· ${h.description}`}</p>
                        </div>
                        <TypeBadge type={h.type} />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setModal({ id: h.id, form: { name: h.name, date: h.date.slice(0, 10), type: h.type, description: h.description || "" } })}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <FaEdit size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(h)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <FaTrashAlt size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <HolidayModal
          initial={modal.id ? { id: modal.id, ...modal.form } : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900">Delete Holiday?</h3>
            <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.type === "error" ? "bg-red-600" : "bg-green-600"} text-white`}>
          {toast.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />} {toast.msg}
        </div>
      )}
    </Layout>
  );
}
