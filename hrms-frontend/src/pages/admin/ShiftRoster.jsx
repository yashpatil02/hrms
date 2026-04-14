import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaChevronLeft, FaChevronRight, FaFilter, FaExchangeAlt,
  FaCheckCircle, FaTimesCircle, FaClock, FaTrash,
} from "react-icons/fa";

/* ── Shift config ── */
const SHIFTS = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];
const SHIFT_COLORS = {
  MORNING:   { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-400",  label: "Morning"   },
  AFTERNOON: { bg: "bg-sky-100",    text: "text-sky-800",    dot: "bg-sky-400",    label: "Afternoon" },
  GENERAL:   { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-400",  label: "General"   },
  EVENING:   { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-400", label: "Evening"   },
  NIGHT:     { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-400", label: "Night"     },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAD    = (n) => String(n).padStart(2, "0");
const toKey  = (date) => `${date.getFullYear()}-${PAD(date.getMonth()+1)}-${PAD(date.getDate())}`;
const fmtMonth = (y, m) => `${y}-${PAD(m + 1)}`;

const STATUS_COLORS = {
  PENDING:  { bg: "bg-yellow-100", text: "text-yellow-700",  icon: <FaClock className="inline mr-1" /> },
  ACCEPTED: { bg: "bg-blue-100",   text: "text-blue-700",    icon: <FaClock className="inline mr-1" /> },
  APPROVED: { bg: "bg-green-100",  text: "text-green-700",   icon: <FaCheckCircle className="inline mr-1" /> },
  REJECTED: { bg: "bg-red-100",    text: "text-red-700",     icon: <FaTimesCircle className="inline mr-1" /> },
};

export default function ShiftRoster() {
  const today   = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dept,  setDept]  = useState("");
  const [users,   setUsers]   = useState([]);
  const [entries, setEntries] = useState({}); // key: "userId-YYYY-MM-DD" → entry
  const [depts,   setDepts]   = useState([]);
  const [loading, setLoading] = useState(false);

  // Assign modal
  const [modal, setModal] = useState(null); // { userId, userName, date, existing }
  const [selShift, setSelShift] = useState("MORNING");
  const [selNote,  setSelNote]  = useState("");
  const [saving,   setSaving]   = useState(false);

  // Swap panel
  const [showSwap, setShowSwap]   = useState(false);
  const [swaps,    setSwaps]      = useState([]);
  const [swapLoad, setSwapLoad]   = useState(false);

  /* ── Build date array for current month ── */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  /* ── Fetch roster ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: fmtMonth(year, month) };
      if (dept) params.department = dept;
      const { data } = await api.get("/roster", { params });

      // Build lookup: "userId-date" → entry
      const map = {};
      data.entries.forEach((e) => {
        const d = new Date(e.date);
        map[`${e.userId}-${toKey(d)}`] = e;
      });
      setEntries(map);
      setUsers(data.users);

      // Collect unique departments
      const ds = [...new Set(data.users.map((u) => u.department).filter(Boolean))].sort();
      setDepts(ds);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [year, month, dept]);

  useEffect(() => { load(); }, [load]);

  /* ── Fetch swap requests ── */
  const loadSwaps = useCallback(async () => {
    setSwapLoad(true);
    try {
      const { data } = await api.get("/roster/swap", { params: { month: fmtMonth(year, month) } });
      setSwaps(data.swaps);
    } catch { /* ignore */ }
    setSwapLoad(false);
  }, [year, month]);

  useEffect(() => { if (showSwap) loadSwaps(); }, [showSwap, loadSwaps]);

  /* ── Month navigation ── */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  /* ── Open assign modal ── */
  const openModal = (user, date) => {
    const key      = `${user.id}-${toKey(date)}`;
    const existing = entries[key];
    setSelShift(existing?.shift || "MORNING");
    setSelNote(existing?.note || "");
    setModal({ userId: user.id, userName: user.name, date, existing });
  };

  /* ── Save shift ── */
  const saveShift = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await api.post("/roster", {
        userId: modal.userId,
        date:   toKey(modal.date),
        shift:  selShift,
        note:   selNote,
      });
      setModal(null);
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  /* ── Remove shift ── */
  const removeShift = async (entryId) => {
    try {
      await api.delete(`/roster/${entryId}`);
      await load();
    } catch { /* ignore */ }
  };

  /* ── Resolve swap ── */
  const resolveSwap = async (id, approve) => {
    try {
      await api.patch(`/roster/swap/${id}/resolve`, { approve });
      await loadSwaps();
    } catch { /* ignore */ }
  };

  const filteredUsers = dept
    ? users.filter((u) => u.department === dept)
    : users;

  return (
    <Layout>
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-800">Shift Roster</h1>
          <button
            onClick={() => setShowSwap(!showSwap)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <FaExchangeAlt /> Swap Requests
            {swaps.filter(s => s.status === "ACCEPTED").length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {swaps.filter(s => s.status === "ACCEPTED").length}
              </span>
            )}
          </button>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SHIFTS.map(s => {
            const c = SHIFT_COLORS[s];
            return (
              <span key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {c.label}
              </span>
            );
          })}
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Month nav */}
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
              <FaChevronLeft className="text-gray-500 text-xs" />
            </button>
            <span className="font-semibold text-gray-700 text-sm min-w-[110px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
              <FaChevronRight className="text-gray-500 text-xs" />
            </button>
          </div>

          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <FaFilter className="text-gray-400 text-xs" />
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              className="text-sm text-gray-700 outline-none bg-transparent"
            >
              <option value="">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* ── Roster Grid ── */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="text-xs border-collapse min-w-max w-full">
              <thead>
                <tr className="bg-gray-100 sticky top-0 z-10">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-r min-w-[140px] sticky left-0 bg-gray-100 z-20">
                    Employee
                  </th>
                  {dates.map(d => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th
                        key={d.getDate()}
                        className={`px-1.5 py-2 font-semibold border-b border-r min-w-[48px] text-center ${isWeekend ? "bg-gray-200 text-gray-500" : "text-gray-600"}`}
                      >
                        <div>{["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]}</div>
                        <div className="text-[10px] font-normal">{d.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={dates.length + 1} className="text-center py-10 text-gray-400">No employees found</td></tr>
                ) : filteredUsers.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {/* Employee name — sticky */}
                    <td className={`px-3 py-1.5 border-b border-r sticky left-0 z-10 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800 truncate max-w-[100px]">{user.name}</div>
                          {user.department && (
                            <div className="text-gray-400 text-[10px]">{user.department}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Shift cells */}
                    {dates.map(d => {
                      const key     = `${user.id}-${toKey(d)}`;
                      const entry   = entries[key];
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = toKey(d) === toKey(today);

                      return (
                        <td
                          key={d.getDate()}
                          className={`border-b border-r text-center px-0.5 py-0.5 cursor-pointer transition-colors group ${isWeekend ? "bg-gray-100" : ""} ${isToday ? "ring-2 ring-inset ring-blue-300" : ""}`}
                          onClick={() => openModal(user, d)}
                        >
                          {entry ? (
                            <div className={`relative rounded px-1 py-0.5 ${SHIFT_COLORS[entry.shift].bg} ${SHIFT_COLORS[entry.shift].text} group`}>
                              <div className="font-medium truncate">
                                {SHIFT_COLORS[entry.shift].label.substring(0, 3).toUpperCase()}
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); removeShift(entry.id); }}
                                className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-[9px]"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-200 hover:text-gray-400 text-lg leading-none">+</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Swap Requests Panel ── */}
        {showSwap && (
          <div className="mt-6 bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Shift Swap Requests</h2>
              <button onClick={loadSwaps} className="text-indigo-600 text-sm hover:underline">Refresh</button>
            </div>
            {swapLoad ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : swaps.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No swap requests this month</div>
            ) : (
              <div className="space-y-3">
                {swaps.map(s => {
                  const sc = STATUS_COLORS[s.status] || {};
                  const rDate = new Date(s.requesterRoster.date);
                  const tDate = new Date(s.targetRoster.date);
                  return (
                    <div key={s.id} className="border rounded-lg p-4 flex flex-wrap gap-4 items-start justify-between">
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-sm font-medium text-gray-800 mb-1">
                          <span className="text-indigo-600">{s.requester.name}</span>
                          {" "}<FaExchangeAlt className="inline mx-1 text-gray-400" />{" "}
                          <span className="text-purple-600">{s.target.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.requester.name}: <strong>{rDate.toDateString()}</strong> ({SHIFT_COLORS[s.requesterRoster.shift]?.label})
                          {" → "}
                          {s.target.name}: <strong>{tDate.toDateString()}</strong> ({SHIFT_COLORS[s.targetRoster.shift]?.label})
                        </div>
                        {s.reason && <div className="text-xs text-gray-400 mt-1 italic">"{s.reason}"</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                          {sc.icon}{s.status}
                        </span>
                        {s.status === "ACCEPTED" && (
                          <>
                            <button
                              onClick={() => resolveSwap(s.id, true)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => resolveSwap(s.id, false)}
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Assign Shift Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">{modal.existing ? "Update Shift" : "Assign Shift"}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {modal.userName} — {modal.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}
            </p>

            {/* Shift selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {SHIFTS.map(s => {
                const c = SHIFT_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSelShift(s)}
                    className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      selShift === s
                        ? `${c.bg} ${c.text} border-current`
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Note */}
            <input
              type="text"
              placeholder="Note (optional)"
              value={selNote}
              onChange={e => setSelNote(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveShift}
                disabled={saving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
