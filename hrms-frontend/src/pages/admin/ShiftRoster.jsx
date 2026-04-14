import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaChevronLeft, FaChevronRight, FaFilter, FaExchangeAlt,
  FaCheckCircle, FaTimesCircle, FaClock, FaPlus, FaTrash,
  FaUsers, FaCalendarAlt,
} from "react-icons/fa";

/* ── Shift config ── */
const SHIFTS = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];
const SHIFT_COLORS = {
  MORNING:   { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-400",  badge: "bg-amber-500",  label: "Morning"   },
  AFTERNOON: { bg: "bg-sky-100",    text: "text-sky-800",    dot: "bg-sky-400",    badge: "bg-sky-500",    label: "Afternoon" },
  GENERAL:   { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-400",  badge: "bg-green-500",  label: "General"   },
  EVENING:   { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-400", badge: "bg-purple-500", label: "Evening"   },
  NIGHT:     { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-400", badge: "bg-indigo-500", label: "Night"     },
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAD    = (n) => String(n).padStart(2, "0");
const toKey  = (d) => `${d.getFullYear()}-${PAD(d.getMonth()+1)}-${PAD(d.getDate())}`;
const fmtMonth = (y, m) => `${y}-${PAD(m + 1)}`;
const STATUS_COLORS = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function ShiftRoster() {
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dept,  setDept]  = useState("");

  const [users,   setUsers]   = useState([]);
  const [entries, setEntries] = useState({});
  const [depts,   setDepts]   = useState([]);
  const [loading, setLoading] = useState(false);

  // Assignment form
  const [showForm,     setShowForm]     = useState(false);
  const [selUsers,     setSelUsers]     = useState([]);   // array of user ids
  const [selShift,     setSelShift]     = useState("MORNING");
  const [applyTo,      setApplyTo]      = useState("weekdays"); // all | weekdays | range
  const [rangeStart,   setRangeStart]   = useState("");
  const [rangeEnd,     setRangeEnd]     = useState("");
  const [overwrite,    setOverwrite]    = useState(false);
  const [assigning,    setAssigning]    = useState(false);
  const [assignMsg,    setAssignMsg]    = useState(null); // { type, text }
  const [userSearch,   setUserSearch]   = useState("");

  // Swap panel
  const [showSwap, setShowSwap] = useState(false);
  const [swaps,    setSwaps]    = useState([]);
  const [swapLoad, setSwapLoad] = useState(false);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  /* ── Load roster ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: fmtMonth(year, month) };
      if (dept) params.department = dept;
      const { data } = await api.get("/roster", { params });
      const map = {};
      data.entries.forEach(e => {
        const d = new Date(e.date);
        map[`${e.userId}-${toKey(d)}`] = e;
      });
      setEntries(map);
      setUsers(data.users);
      const ds = [...new Set(data.users.map(u => u.department).filter(Boolean))].sort();
      setDepts(ds);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, month, dept]);

  useEffect(() => { load(); }, [load]);

  /* ── Load swaps ── */
  const loadSwaps = useCallback(async () => {
    setSwapLoad(true);
    try {
      const { data } = await api.get("/roster/swap", { params: { month: fmtMonth(year, month) } });
      setSwaps(data.swaps);
    } catch { /* ignore */ }
    setSwapLoad(false);
  }, [year, month]);

  useEffect(() => { if (showSwap) loadSwaps(); }, [showSwap, loadSwaps]);

  /* ── Month nav ── */
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  /* ── Toggle employee selection ── */
  const toggleUser = (id) =>
    setSelUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelUsers(filteredUsers.map(u => u.id));
  const clearSel  = () => setSelUsers([]);

  /* ── Bulk assign ── */
  const handleAssign = async () => {
    if (selUsers.length === 0) { setAssignMsg({ type: "error", text: "Select at least one employee" }); return; }
    if (applyTo === "range" && (!rangeStart || !rangeEnd)) {
      setAssignMsg({ type: "error", text: "Select start and end date for range" }); return;
    }
    setAssigning(true);
    setAssignMsg(null);
    try {
      const payload = {
        userIds: selUsers,
        shift: selShift,
        month: fmtMonth(year, month),
        applyTo,
        overwrite,
        ...(applyTo === "range" ? { startDate: rangeStart, endDate: rangeEnd } : {}),
      };
      const { data } = await api.post("/roster/bulk", payload);
      setAssignMsg({ type: "success", text: `${data.created} shifts assigned${data.skipped ? `, ${data.skipped} skipped (already exist)` : ""}` });
      await load();
      setSelUsers([]);
    } catch (err) {
      setAssignMsg({ type: "error", text: err?.response?.data?.msg || "Failed to assign" });
    }
    setAssigning(false);
  };

  /* ── Remove single shift ── */
  const removeShift = async (entryId, e) => {
    e.stopPropagation();
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

  const filteredUsers = dept ? users.filter(u => u.department === dept) : users;
  const searchedUsers = userSearch.trim()
    ? filteredUsers.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()))
    : filteredUsers;

  const pendingApprovals = swaps.filter(s => s.status === "ACCEPTED").length;

  return (
    <Layout>
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-800">Shift Roster</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(!showForm); setAssignMsg(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <FaPlus /> Assign Shifts
            </button>
            <button
              onClick={() => setShowSwap(!showSwap)}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium relative"
            >
              <FaExchangeAlt /> Swap Requests
              {pendingApprovals > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingApprovals}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Shift Legend ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SHIFTS.map(s => {
            const c = SHIFT_COLORS[s];
            return (
              <span key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />{c.label}
              </span>
            );
          })}
        </div>

        {/* ── ASSIGN FORM ── */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-5 mb-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-500" /> Assign Shifts for {MONTHS[month]} {year}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left: Employee picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <FaUsers className="text-gray-400" /> Select Employees
                    {selUsers.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                        {selUsers.length} selected
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button onClick={selectAll} className="text-indigo-600 hover:underline">All</button>
                    <button onClick={clearSel}  className="text-gray-400 hover:underline">Clear</button>
                  </div>
                </div>

                {/* Department filter for picker */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <select
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">All Depts</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="border rounded-lg overflow-y-auto max-h-48 divide-y">
                  {searchedUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">No employees</div>
                  ) : searchedUsers.map(u => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${selUsers.includes(u.id) ? "bg-indigo-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selUsers.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="accent-indigo-600"
                      />
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{u.name}</div>
                        {u.department && <div className="text-xs text-gray-400">{u.department}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right: Shift + Apply options */}
              <div className="space-y-4">
                {/* Shift selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SHIFTS.map(s => {
                      const c = SHIFT_COLORS[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setSelShift(s)}
                          className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                            selShift === s
                              ? `${c.bg} ${c.text} border-current shadow-sm`
                              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Apply to */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apply To</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { val: "all",      label: "Entire Month" },
                      { val: "weekdays", label: "Weekdays Only" },
                      { val: "range",    label: "Date Range" },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setApplyTo(opt.val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          applyTo === opt.val
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range inputs */}
                {applyTo === "range" && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">From</label>
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={e => setRangeStart(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">To</label>
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={e => setRangeEnd(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </div>
                )}

                {/* Overwrite toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={e => setOverwrite(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-600">Overwrite existing assignments</span>
                </label>

                {/* Feedback */}
                {assignMsg && (
                  <div className={`text-sm px-3 py-2 rounded-lg ${
                    assignMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}>
                    {assignMsg.text}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {assigning
                    ? "Assigning..."
                    : `Assign ${SHIFT_COLORS[selShift]?.label} to ${selUsers.length} employee${selUsers.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
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

          {/* Summary counts */}
          <div className="flex gap-2 ml-auto flex-wrap">
            {SHIFTS.map(s => {
              const count = Object.values(entries).filter(e => e.shift === s).length;
              if (!count) return null;
              const c = SHIFT_COLORS[s];
              return (
                <span key={s} className={`text-xs px-2 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
                  {c.label}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Roster Grid (View) ── */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading roster...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="text-xs border-collapse min-w-max w-full">
              <thead>
                <tr className="bg-gray-100 sticky top-0 z-10">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 border-b border-r min-w-[150px] sticky left-0 bg-gray-100 z-20">
                    Employee
                  </th>
                  {dates.map(d => {
                    const isWknd = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={d.getDate()} className={`px-1 py-2 font-semibold border-b border-r min-w-[46px] text-center ${isWknd ? "bg-gray-200 text-gray-400" : "text-gray-600"}`}>
                        <div className="text-[10px]">{["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]}</div>
                        <div className="text-[11px] font-bold">{d.getDate()}</div>
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
                    <td className={`px-3 py-2 border-b border-r sticky left-0 z-10 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800 truncate max-w-[110px]">{user.name}</div>
                          {user.department && <div className="text-gray-400 text-[10px]">{user.department}</div>}
                        </div>
                      </div>
                    </td>
                    {dates.map(d => {
                      const key    = `${user.id}-${toKey(d)}`;
                      const entry  = entries[key];
                      const isWknd = d.getDay() === 0 || d.getDay() === 6;
                      const isTd   = toKey(d) === toKey(today);
                      return (
                        <td key={d.getDate()} className={`border-b border-r text-center px-0.5 py-0.5 ${isWknd ? "bg-gray-100" : ""} ${isTd ? "ring-2 ring-inset ring-blue-300" : ""}`}>
                          {entry ? (
                            <div className={`relative group rounded px-0.5 py-0.5 ${SHIFT_COLORS[entry.shift].bg} ${SHIFT_COLORS[entry.shift].text}`}>
                              <span className="font-semibold text-[10px]">{entry.shift.substring(0,3)}</span>
                              <button
                                onClick={e => removeShift(entry.id, e)}
                                className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] leading-none"
                              >×</button>
                            </div>
                          ) : (
                            <span className="text-gray-200 text-base leading-none">·</span>
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
                          {" ↔ "}
                          {s.target.name}: <strong>{tDate.toDateString()}</strong> ({SHIFT_COLORS[s.targetRoster.shift]?.label})
                        </div>
                        {s.reason && <div className="text-xs text-gray-400 mt-1 italic">"{s.reason}"</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>
                          {s.status}
                        </span>
                        {s.status === "ACCEPTED" && (
                          <>
                            <button onClick={() => resolveSwap(s.id, true)}  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                            <button onClick={() => resolveSwap(s.id, false)} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Reject</button>
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
    </Layout>
  );
}
