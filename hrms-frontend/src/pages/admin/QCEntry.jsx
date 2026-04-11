import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaPlus, FaTimes, FaSave, FaEye, FaUserPlus,
  FaGamepad, FaClock, FaCheckCircle, FaExclamationCircle,
  FaArrowRight, FaEdit,
} from "react-icons/fa";

/* ── constants ── */
const SPORTS = [
  { value: "SOCCER",       label: "Soccer" },
  { value: "ICE_HOCKEY",   label: "Ice Hockey" },
  { value: "FIELD_HOCKEY", label: "Field Hockey" },
  { value: "HANDBALL",     label: "Handball" },
  { value: "BASKETBALL",   label: "Basketball" },
];

const SPORT_COLOR = {
  SOCCER:       "bg-green-100 text-green-700",
  ICE_HOCKEY:   "bg-blue-100 text-blue-700",
  FIELD_HOCKEY: "bg-teal-100 text-teal-700",
  HANDBALL:     "bg-orange-100 text-orange-700",
  BASKETBALL:   "bg-amber-100 text-amber-700",
};

/* ── time helpers ── */
const timeToSec = (t = "") => {
  const parts = t.replace(/\./g, ":").split(":");
  return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
};

const parseErrorBlock = (text) =>
  text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l)
    .map(l => {
      const m = l.match(/^(\d{1,2}[.:]\d{2}[.:]\d{2})\s+(.+)$/);
      return m ? { timestamp: m[1].replace(/\./g, ":"), errorText: m[2].trim() } : null;
    })
    .filter(Boolean);

const assignErrors = (parsedErrors, employees) =>
  parsedErrors.map(err => {
    const sec = timeToSec(err.timestamp);
    const emp = employees.find(e => {
      if (!e.employeeId || !e.fromTime || !e.toTime) return false;
      return sec >= timeToSec(e.fromTime) && sec <= timeToSec(e.toTime);
    });
    return { ...err, employeeId: emp?.employeeId || null, employeeName: emp?.name || "Unassigned" };
  });

/* ── empty row ── */
const emptyEmpRow = () => ({ employeeId: "", name: "", fromTime: "", toTime: "" });

/* ============================================================
   PREVIEW MODAL
============================================================ */
function PreviewModal({ grouped, unassigned, onClose, onSave, saving }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Error Assignment Preview</h2>
            <p className="text-xs text-gray-500 mt-0.5">Review before saving — errors are auto-assigned by time range</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <FaTimes size={16}/>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* assigned */}
          {Object.entries(grouped).map(([empName, errors]) => (
            <div key={empName} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-indigo-50 flex items-center justify-between">
                <span className="font-semibold text-indigo-800 text-sm">{empName}</span>
                <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  {errors.length} error{errors.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {errors.map((e, i) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-3 text-sm hover:bg-gray-50/50">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {e.timestamp}
                    </span>
                    <span className="text-gray-700">{e.errorText}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* unassigned */}
          {unassigned.length > 0 && (
            <div className="border border-red-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50 flex items-center justify-between">
                <span className="font-semibold text-red-700 text-sm flex items-center gap-2">
                  <FaExclamationCircle size={13}/> Unassigned Errors
                </span>
                <span className="text-xs text-red-600">{unassigned.length} errors outside all time ranges</span>
              </div>
              <div className="divide-y divide-red-50">
                {unassigned.map((e, i) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-3 text-sm">
                    <span className="font-mono text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {e.timestamp}
                    </span>
                    <span className="text-red-700">{e.errorText}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-500 px-4 py-2 bg-red-50/50">
                These errors will NOT be saved. Adjust employee time ranges to include them.
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <FaEdit size={12}/> Edit
          </button>
          <button onClick={onSave} disabled={saving || Object.keys(grouped).length === 0}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</>
              : <><FaSave size={12}/> Save {Object.values(grouped).reduce((s, e) => s + e.length, 0)} Errors</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function QCEntry() {
  /* form state */
  const [gameDate, setGameDate]   = useState(new Date().toISOString().split("T")[0]);
  const [gameName, setGameName]   = useState("");
  const [gameId,   setGameId]     = useState("");
  const [sport,    setSport]      = useState("SOCCER");
  const [league,   setLeague]     = useState("");
  const [qcType,   setQcType]     = useState("REVIEW");
  const [empRows,  setEmpRows]    = useState([emptyEmpRow()]);
  const [errorText,setErrorText]  = useState("");

  /* employees list for dropdown */
  const [employees, setEmployees] = useState([]);

  /* preview */
  const [preview,  setPreview]    = useState(null); // null | { grouped, unassigned, parsed }
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);

  /* load employees */
  useEffect(() => {
    api.get("/users?role=EMPLOYEE").then(r => setEmployees(r.data || [])).catch(() => {});
  }, []);

  /* ── employee row handlers ── */
  const addRow = () => setEmpRows(r => [...r, emptyEmpRow()]);
  const removeRow = (i) => setEmpRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => {
    setEmpRows(r => {
      const next = [...r];
      next[i] = { ...next[i], [field]: value };
      if (field === "employeeId") {
        const emp = employees.find(e => String(e.id) === String(value));
        next[i].name = emp?.name || "";
      }
      return next;
    });
  };

  /* ── PREVIEW ── */
  const handlePreview = () => {
    const parsed = parseErrorBlock(errorText);
    if (parsed.length === 0) { alert("No valid errors found. Format: HH:MM:SS error description"); return; }

    const assigned  = assignErrors(parsed, empRows);
    const grouped   = {};
    const unassigned = [];

    assigned.forEach(e => {
      if (e.employeeId) {
        if (!grouped[e.employeeName]) grouped[e.employeeName] = [];
        grouped[e.employeeName].push(e);
      } else {
        unassigned.push(e);
      }
    });

    setPreview({ grouped, unassigned, assigned });
  };

  /* ── SAVE ── */
  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const validRows = empRows.filter(r => r.employeeId && r.fromTime && r.toTime);
      const errorsToSave = preview.assigned.filter(e => e.employeeId);

      await api.post("/qc/sessions", {
        gameDate,
        gameName,
        gameId:    gameId || null,
        sport,
        league,
        qcType,
        employees: validRows.map(r => ({
          employeeId: r.employeeId,
          fromTime:   r.fromTime,
          toTime:     r.toTime,
        })),
        errors: errorsToSave.map(e => ({
          employeeId: e.employeeId,
          timestamp:  e.timestamp,
          errorText:  e.errorText,
        })),
      });

      setSaved(true);
      setPreview(null);
      /* reset form */
      setGameName(""); setGameId(""); setLeague(""); setErrorText("");
      setEmpRows([emptyEmpRow()]);
    } catch (err) {
      console.error("QC save error:", err.response?.data || err.message);
      alert(err.response?.data?.msg || err.message || "Failed to save session");
    } finally { setSaving(false); }
  };

  const totalErrors = parseErrorBlock(errorText).length;

  return (
    <Layout>
      {preview && (
        <PreviewModal
          grouped={preview.grouped}
          unassigned={preview.unassigned}
          onClose={() => setPreview(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">QC Error Entry</h1>
            <p className="text-red-200 text-sm mt-1">Log quality control errors for employees by game session</p>
          </div>
          {saved && (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-xl px-4 py-2 text-green-200 text-sm font-semibold">
              <FaCheckCircle size={13}/> Session saved successfully!
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* ── GAME DETAILS ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaGamepad className="text-rose-500" size={15}/>
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Game Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Game Date *</label>
              <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>

            {/* Game Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Game Name *</label>
              <input type="text" value={gameName} onChange={e => setGameName(e.target.value)}
                placeholder="e.g. Arsenal vs Chelsea"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>

            {/* Game ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Game ID <span className="text-gray-300">(optional)</span></label>
              <input type="text" value={gameId} onChange={e => setGameId(e.target.value)}
                placeholder="e.g. GAM-20260411-001"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>

            {/* Sport */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sport *</label>
              <select value={sport} onChange={e => setSport(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
                {SPORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* League */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">League *</label>
              <input type="text" value={league} onChange={e => setLeague(e.target.value)}
                placeholder="e.g. Premier League"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>

            {/* QC Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">QC Type *</label>
              <div className="flex gap-2">
                {["REVIEW", "DEEP"].map(t => (
                  <button key={t} onClick={() => setQcType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      qcType === t
                        ? t === "REVIEW"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {t === "REVIEW" ? "Review" : "Deep QC"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── EMPLOYEES + TIME RANGES ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaClock className="text-rose-500" size={15}/>
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Employees & Time Ranges</h2>
            </div>
            <button onClick={addRow}
              className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              <FaUserPlus size={11}/> Add Employee
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Each employee's time range will be used to auto-assign errors from the error block below.
          </p>

          <div className="space-y-2">
            {empRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Employee selector */}
                <select
                  value={row.employeeId}
                  onChange={e => updateRow(i, "employeeId", e.target.value)}
                  className="flex-1 min-w-[160px] border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
                  <option value="">Select Employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} {e.department ? `(${e.department})` : ""}</option>
                  ))}
                </select>

                {/* From time */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-gray-400 font-semibold">FROM</span>
                  <input
                    type="text"
                    value={row.fromTime}
                    onChange={e => updateRow(i, "fromTime", e.target.value)}
                    placeholder="00:00:00"
                    className="w-24 border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>

                {/* Arrow */}
                <FaArrowRight className="text-gray-300 flex-shrink-0" size={12}/>

                {/* To time */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-gray-400 font-semibold">TO</span>
                  <input
                    type="text"
                    value={row.toTime}
                    onChange={e => updateRow(i, "toTime", e.target.value)}
                    placeholder="01:30:00"
                    className="w-24 border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>

                {/* Remove */}
                {empRows.length > 1 && (
                  <button onClick={() => removeRow(i)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0">
                    <FaTimes size={12}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── ERROR TEXT BOX ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaExclamationCircle className="text-rose-500" size={15}/>
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Paste Errors</h2>
            </div>
            {totalErrors > 0 && (
              <span className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                {totalErrors} errors detected
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-3">
            <FaExclamationCircle size={11} className="flex-shrink-0 mt-0.5"/>
            <span>Format: <strong>HH:MM:SS</strong> or <strong>HH.MM.SS</strong> followed by error description. One error per line.</span>
          </div>

          <textarea
            value={errorText}
            onChange={e => setErrorText(e.target.value)}
            rows={10}
            placeholder={"00:54:33 shot miss\n01:23:44 cross miss\n02:33:22 corner miss\n01:45:10 offside not marked\n..."}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300 resize-y"
            style={{ minHeight: 200 }}
          />

          {/* Live preview of parsed errors */}
          {totalErrors > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parseErrorBlock(errorText).slice(0, 6).map((e, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                  <span className="font-mono text-indigo-600">{e.timestamp}</span>
                  <span className="text-gray-600">{e.errorText}</span>
                </span>
              ))}
              {totalErrors > 6 && (
                <span className="text-xs text-gray-400 self-center">+{totalErrors - 6} more</span>
              )}
            </div>
          )}
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handlePreview}
            disabled={!gameName || !league || totalErrors === 0 || empRows.every(r => !r.employeeId)}
            className="flex items-center gap-2 bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 disabled:border-gray-200 disabled:text-gray-400 px-6 py-3 rounded-xl text-sm font-bold transition-all">
            <FaEye size={13}/> Preview Assignment
          </button>
        </div>
      </div>
    </Layout>
  );
}
