import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaChevronLeft, FaChevronRight, FaFilter, FaExchangeAlt,
  FaCheckCircle, FaTimesCircle, FaClock, FaTimes, FaUsers,
} from "react-icons/fa";

/* ── Config ── */
const SHIFTS = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];
const SC = {
  MORNING:   { bg: "bg-amber-100",  text: "text-amber-800",  badge: "bg-amber-500",   border: "border-amber-300",  label: "Morning",   short: "MOR" },
  AFTERNOON: { bg: "bg-sky-100",    text: "text-sky-800",    badge: "bg-sky-500",     border: "border-sky-300",    label: "Afternoon", short: "AFT" },
  GENERAL:   { bg: "bg-green-100",  text: "text-green-800",  badge: "bg-green-500",   border: "border-green-300",  label: "General",   short: "GEN" },
  EVENING:   { bg: "bg-purple-100", text: "text-purple-800", badge: "bg-purple-500",  border: "border-purple-300", label: "Evening",   short: "EVE" },
  NIGHT:     { bg: "bg-indigo-100", text: "text-indigo-800", badge: "bg-indigo-500",  border: "border-indigo-300", label: "Night",     short: "NGT" },
};
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUS_PILL = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};
const THIS_YEAR  = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1; // 1-based

export default function ShiftRoster() {
  const [year,  setYear]  = useState(THIS_YEAR);
  const [dept,  setDept]  = useState("");
  const [users,     setUsers]     = useState([]);
  const [schedules, setSchedules] = useState({}); // key: "userId-month" → schedule obj
  const [depts,     setDepts]     = useState([]);
  const [loading,   setLoading]   = useState(false);

  // Cell popover
  const [popover, setPopover] = useState(null); // { userId, userName, month, existing }
  const [popShift, setPopShift] = useState("MORNING");
  const [popNote,  setPopNote]  = useState("");
  const [popSaving, setPopSaving] = useState(false);

  // Bulk assign modal
  const [showBulk,   setShowBulk]   = useState(false);
  const [bulkUsers,  setBulkUsers]  = useState([]);
  const [bulkMonths, setBulkMonths] = useState([]);
  const [bulkShift,  setBulkShift]  = useState("MORNING");
  const [bulkNote,   setBulkNote]   = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg,    setBulkMsg]    = useState(null);
  const [userSearch, setUserSearch] = useState("");

  // Swap panel
  const [showSwap, setShowSwap] = useState(false);
  const [swaps,    setSwaps]    = useState([]);
  const [swapLoad, setSwapLoad] = useState(false);

  /* ── Load annual schedule ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year };
      if (dept) params.department = dept;
      const { data } = await api.get("/roster/schedule", { params });

      const map = {};
      data.schedules.forEach(s => { map[`${s.userId}-${s.month}`] = s; });
      setSchedules(map);
      setUsers(data.users);
      const ds = [...new Set(data.users.map(u => u.department).filter(Boolean))].sort();
      setDepts(ds);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, dept]);

  useEffect(() => { load(); }, [load]);

  /* ── Load swaps ── */
  const loadSwaps = useCallback(async () => {
    setSwapLoad(true);
    try {
      const { data } = await api.get("/roster/swap");
      setSwaps(data.swaps);
    } catch { /* ignore */ }
    setSwapLoad(false);
  }, []);

  useEffect(() => { if (showSwap) loadSwaps(); }, [showSwap, loadSwaps]);

  /* ── Open cell popover ── */
  const openCell = (user, month) => {
    const key      = `${user.id}-${month}`;
    const existing = schedules[key];
    setPopShift(existing?.shift || "MORNING");
    setPopNote(existing?.note  || "");
    setPopover({ userId: user.id, userName: user.name, month, existing });
  };

  /* ── Save single cell ── */
  const saveCell = async () => {
    if (!popover) return;
    setPopSaving(true);
    try {
      await api.post("/roster/schedule", {
        userIds: [popover.userId],
        months:  [popover.month],
        year,
        shift:   popShift,
        note:    popNote,
      });
      setPopover(null);
      await load();
    } catch { /* ignore */ }
    setPopSaving(false);
  };

  /* ── Remove single cell ── */
  const removeCell = async (entryId, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/roster/schedule/${entryId}`);
      await load();
    } catch { /* ignore */ }
  };

  /* ── Bulk assign ── */
  const handleBulk = async () => {
    if (!bulkUsers.length)  { setBulkMsg({ type: "error", text: "Select at least one employee" }); return; }
    if (!bulkMonths.length) { setBulkMsg({ type: "error", text: "Select at least one month" }); return; }
    setBulkSaving(true);
    setBulkMsg(null);
    try {
      const { data } = await api.post("/roster/schedule", {
        userIds: bulkUsers, months: bulkMonths, year, shift: bulkShift, note: bulkNote,
      });
      setBulkMsg({ type: "success", text: `${data.assigned} shifts assigned successfully` });
      await load();
      setBulkUsers([]);
      setBulkMonths([]);
    } catch (err) {
      setBulkMsg({ type: "error", text: err?.response?.data?.msg || "Failed" });
    }
    setBulkSaving(false);
  };

  const toggleUser  = id => setBulkUsers(p  => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleMonth = m  => setBulkMonths(p => p.includes(m)  ? p.filter(x => x !== m)  : [...p, m]);
  const selectAllUsers   = () => setBulkUsers(filteredUsers.map(u => u.id));
  const selectAllMonths  = () => setBulkMonths([1,2,3,4,5,6,7,8,9,10,11,12]);

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
  const pendingSwaps = swaps.filter(s => s.status === "ACCEPTED").length;

  return (
    <Layout>
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Shift Roster</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monthly shift schedule for all employees</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setShowBulk(true); setBulkMsg(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <FaUsers /> Bulk Assign
            </button>
            <button
              onClick={() => setShowSwap(!showSwap)}
              className="relative flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              <FaExchangeAlt /> Swap Requests
              {pendingSwaps > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{pendingSwaps}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Shift Legend ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SHIFTS.map(s => (
            <span key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${SC[s].bg} ${SC[s].text}`}>
              <span className={`w-2 h-2 rounded-full ${SC[s].badge}`} />{SC[s].label}
            </span>
          ))}
        </div>

        {/* ── Year + Dept controls ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <button onClick={() => setYear(y => y-1)} className="p-1 hover:bg-gray-100 rounded">
              <FaChevronLeft className="text-gray-500 text-xs" />
            </button>
            <span className="font-bold text-gray-700 text-sm min-w-[50px] text-center">{year}</span>
            <button onClick={() => setYear(y => y+1)} className="p-1 hover:bg-gray-100 rounded">
              <FaChevronRight className="text-gray-500 text-xs" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <FaFilter className="text-gray-400 text-xs" />
            <select value={dept} onChange={e => setDept(e.target.value)} className="text-sm text-gray-700 outline-none bg-transparent">
              <option value="">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {year === THIS_YEAR && (
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-full">Current Year</span>
          )}
        </div>

        {/* ── Main Grid ── */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="text-xs border-collapse w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-100 sticky top-0 z-10">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 border-b border-r min-w-[160px] sticky left-0 bg-gray-100 z-20">
                    Employee
                  </th>
                  {MONTHS_SHORT.map((m, idx) => {
                    const mNum = idx + 1;
                    const isCurrent = year === THIS_YEAR && mNum === THIS_MONTH;
                    return (
                      <th key={m} className={`px-2 py-3 text-center font-semibold border-b border-r min-w-[72px] ${isCurrent ? "bg-indigo-50 text-indigo-700" : "text-gray-600"}`}>
                        <div>{m}</div>
                        {isCurrent && <div className="text-[9px] font-normal text-indigo-500">current</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-12 text-gray-400">No employees found</td></tr>
                ) : filteredUsers.map((user, idx) => (
                  <tr key={user.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50/30 transition-colors`}>
                    {/* Employee — sticky */}
                    <td className={`px-4 py-2.5 border-b border-r sticky left-0 z-10 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 truncate max-w-[120px] text-[13px]">{user.name}</div>
                          {user.department && <div className="text-[10px] text-gray-400 truncate">{user.department}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Month cells */}
                    {MONTHS_SHORT.map((_, idx2) => {
                      const mNum    = idx2 + 1;
                      const key     = `${user.id}-${mNum}`;
                      const entry   = schedules[key];
                      const isCurr  = year === THIS_YEAR && mNum === THIS_MONTH;
                      const isPast  = year < THIS_YEAR || (year === THIS_YEAR && mNum < THIS_MONTH);

                      return (
                        <td
                          key={mNum}
                          onClick={() => openCell(user, mNum)}
                          className={`border-b border-r text-center px-1 py-1.5 cursor-pointer transition-all group ${isCurr ? "bg-indigo-50/60" : ""} ${isPast && !entry ? "bg-gray-50/50" : ""}`}
                        >
                          {entry ? (
                            <div className={`relative rounded-lg px-1.5 py-1.5 ${SC[entry.shift].bg} ${SC[entry.shift].text} transition-all group-hover:shadow-sm`}>
                              <div className="font-bold text-[11px]">{SC[entry.shift].short}</div>
                              <div className="text-[9px] opacity-70 truncate">{SC[entry.shift].label}</div>
                              {entry.note && <div className="text-[9px] opacity-60 truncate italic">"{entry.note}"</div>}
                              <button
                                onClick={e => removeCell(entry.id, e)}
                                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-[10px] shadow"
                              >×</button>
                            </div>
                          ) : (
                            <div className={`text-gray-200 group-hover:text-gray-400 text-xl leading-none transition-colors ${isCurr ? "text-indigo-200" : ""}`}>+</div>
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

        {/* ── Swap Requests ── */}
        {showSwap && (
          <div className="mt-6 bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Shift Swap Requests</h2>
              <button onClick={loadSwaps} className="text-indigo-600 text-sm hover:underline">Refresh</button>
            </div>
            {swapLoad ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : swaps.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No swap requests</div>
            ) : swaps.map(s => {
              const rDate = new Date(s.requesterRoster?.date || Date.now());
              const tDate = new Date(s.targetRoster?.date   || Date.now());
              return (
                <div key={s.id} className="border rounded-lg p-4 flex flex-wrap gap-4 items-center justify-between mb-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      <span className="text-indigo-600">{s.requester.name}</span>
                      {" "}<FaExchangeAlt className="inline mx-1 text-gray-400" />{" "}
                      <span className="text-purple-600">{s.target.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {rDate.toDateString()} ({SC[s.requesterRoster?.shift]?.label}) ↔ {tDate.toDateString()} ({SC[s.targetRoster?.shift]?.label})
                    </div>
                    {s.reason && <div className="text-xs text-gray-400 italic mt-1">"{s.reason}"</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_PILL[s.status]}`}>{s.status}</span>
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

      {/* ══════════════════════════════════
          CELL POPOVER — assign single month
      ══════════════════════════════════ */}
      {popover && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPopover(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-800">{popover.existing ? "Update Shift" : "Assign Shift"}</h2>
              <button onClick={() => setPopover(null)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              <strong>{popover.userName}</strong> — <strong>{MONTHS_FULL[popover.month - 1]} {year}</strong>
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {SHIFTS.map(s => (
                <button
                  key={s}
                  onClick={() => setPopShift(s)}
                  className={`py-2.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                    popShift === s
                      ? `${SC[s].bg} ${SC[s].text} ${SC[s].border}`
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {SC[s].label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Note (optional)"
              value={popNote}
              onChange={e => setPopNote(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <div className="flex gap-2">
              <button onClick={() => setPopover(null)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCell} disabled={popSaving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {popSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          BULK ASSIGN MODAL
      ══════════════════════════════════ */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBulk(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Bulk Assign Shifts — {year}</h2>
              <button onClick={() => setShowBulk(false)} className="text-gray-400 hover:text-gray-600"><FaTimes size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Employees */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    1. Select Employees
                    {bulkUsers.length > 0 && (
                      <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{bulkUsers.length} selected</span>
                    )}
                  </label>
                  <div className="flex gap-3 text-xs">
                    <button onClick={selectAllUsers} className="text-indigo-600 hover:underline">Select All</button>
                    <button onClick={() => setBulkUsers([])} className="text-gray-400 hover:underline">Clear</button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <div className="border rounded-xl overflow-y-auto max-h-44 divide-y">
                  {searchedUsers.map(u => (
                    <label key={u.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${bulkUsers.includes(u.id) ? "bg-indigo-50" : ""}`}>
                      <input type="checkbox" checked={bulkUsers.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-indigo-600" />
                      {u.avatar
                        ? <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{u.name.charAt(0)}</div>
                      }
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.name}</div>
                        {u.department && <div className="text-xs text-gray-400">{u.department}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 2: Months */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    2. Select Months
                    {bulkMonths.length > 0 && (
                      <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{bulkMonths.length} selected</span>
                    )}
                  </label>
                  <div className="flex gap-3 text-xs">
                    <button onClick={selectAllMonths} className="text-indigo-600 hover:underline">All 12</button>
                    <button onClick={() => setBulkMonths([])} className="text-gray-400 hover:underline">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {MONTHS_SHORT.map((m, idx) => {
                    const mNum = idx + 1;
                    const isCurr = year === THIS_YEAR && mNum === THIS_MONTH;
                    const sel = bulkMonths.includes(mNum);
                    return (
                      <button
                        key={mNum}
                        onClick={() => toggleMonth(mNum)}
                        className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                          sel
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : isCurr
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200 hover:border-indigo-400"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {m}
                        {isCurr && !sel && <div className="text-[8px] text-indigo-400 leading-none">now</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Shift */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">3. Select Shift</label>
                <div className="grid grid-cols-5 gap-2">
                  {SHIFTS.map(s => (
                    <button
                      key={s}
                      onClick={() => setBulkShift(s)}
                      className={`py-2.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        bulkShift === s
                          ? `${SC[s].bg} ${SC[s].text} ${SC[s].border} shadow-sm`
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {SC[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optional)</label>
                <input
                  type="text"
                  value={bulkNote}
                  onChange={e => setBulkNote(e.target.value)}
                  placeholder="e.g. Rotational shift change"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* Feedback */}
              {bulkMsg && (
                <div className={`text-sm px-4 py-2.5 rounded-lg ${bulkMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {bulkMsg.text}
                </div>
              )}

              {/* Summary + Submit */}
              <div className="pt-2 border-t">
                {bulkUsers.length > 0 && bulkMonths.length > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Will assign <strong>{SC[bulkShift].label}</strong> shift to{" "}
                    <strong>{bulkUsers.length} employee{bulkUsers.length > 1 ? "s" : ""}</strong> for{" "}
                    <strong>{bulkMonths.length} month{bulkMonths.length > 1 ? "s" : ""}</strong>{" "}
                    ({bulkUsers.length * bulkMonths.length} total entries)
                  </p>
                )}
                <button
                  onClick={handleBulk}
                  disabled={bulkSaving}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {bulkSaving ? "Assigning..." : "Assign Shifts"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
