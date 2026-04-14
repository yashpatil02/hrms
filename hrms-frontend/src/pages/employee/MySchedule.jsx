import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaChevronLeft, FaChevronRight, FaExchangeAlt,
  FaCheckCircle, FaTimesCircle, FaClock,
} from "react-icons/fa";

const SHIFTS = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];
const SHIFT_COLORS = {
  MORNING:   { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  label: "Morning",   time: "06:00 – 14:00" },
  AFTERNOON: { bg: "bg-sky-100",    text: "text-sky-800",    border: "border-sky-300",    label: "Afternoon", time: "14:00 – 22:00" },
  GENERAL:   { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300",  label: "General",   time: "09:00 – 18:00" },
  EVENING:   { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", label: "Evening",   time: "14:00 – 23:00" },
  NIGHT:     { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300", label: "Night",     time: "22:00 – 06:00" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAD    = (n) => String(n).padStart(2, "0");
const fmtMonth = (y, m) => `${y}-${PAD(m + 1)}`;
const toKey  = (d) => `${d.getFullYear()}-${PAD(d.getMonth()+1)}-${PAD(d.getDate())}`;

const STATUS_PILL = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-blue-100   text-blue-700",
  APPROVED: "bg-green-100  text-green-700",
  REJECTED: "bg-red-100    text-red-700",
};

export default function MySchedule() {
  const today   = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Swap modal
  const [swapModal,    setSwapModal]    = useState(null); // { myEntry }
  const [swapTargets,  setSwapTargets]  = useState([]);   // all roster entries that month (other people)
  const [selTarget,    setSelTarget]    = useState("");
  const [swapReason,   setSwapReason]   = useState("");
  const [swapSaving,   setSwapSaving]   = useState(false);
  const [swapError,    setSwapError]    = useState("");

  // Swap requests
  const [swaps,     setSwaps]     = useState([]);
  const [swapLoad,  setSwapLoad]  = useState(false);
  const [showSwaps, setShowSwaps] = useState(false);

  /* ── Fetch my schedule ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/roster/my", { params: { month: fmtMonth(year, month) } });
      setEntries(data.entries);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, month]);

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

  useEffect(() => { if (showSwaps) loadSwaps(); }, [showSwaps, loadSwaps]);

  /* ── Month nav ── */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  /* ── Open swap modal ── */
  const openSwapModal = async (entry) => {
    setSwapError("");
    setSwapReason("");
    setSelTarget("");
    setSwapModal({ myEntry: entry });
    // Fetch all roster entries for this month (other users)
    try {
      const { data } = await api.get("/roster", { params: { month: fmtMonth(year, month) } });
      // Filter out own entries
      const others = data.entries.filter(e => e.userId !== entry.userId);
      setSwapTargets(others);
    } catch { /* ignore */ }
  };

  /* ── Submit swap request ── */
  const submitSwap = async () => {
    if (!selTarget) { setSwapError("Select a shift to swap with"); return; }
    setSwapSaving(true);
    setSwapError("");
    try {
      await api.post("/roster/swap", {
        myRosterId:     swapModal.myEntry.id,
        targetRosterId: Number(selTarget),
        reason:         swapReason,
      });
      setSwapModal(null);
      setShowSwaps(true);
      await loadSwaps();
    } catch (err) {
      setSwapError(err?.response?.data?.msg || "Failed to send swap request");
    }
    setSwapSaving(false);
  };

  /* ── Respond to incoming swap request ── */
  const respondSwap = async (id, accept) => {
    try {
      await api.patch(`/roster/swap/${id}/respond`, { accept });
      await loadSwaps();
    } catch { /* ignore */ }
  };

  /* ── Build calendar grid ── */
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDay     = new Date(year, month, 1).getDay(); // 0=Sun
  const entryMap     = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    entryMap[toKey(d)] = e;
  });

  const calCells = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(new Date(year, month, d));

  /* ── Stats ── */
  const shiftCounts = {};
  entries.forEach(e => { shiftCounts[e.shift] = (shiftCounts[e.shift] || 0) + 1; });

  return (
    <Layout>
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-800">My Schedule</h1>
          <button
            onClick={() => setShowSwaps(!showSwaps)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <FaExchangeAlt /> My Swap Requests
            {swaps.filter(s => s.status === "PENDING" && s.targetId === swaps[0]?.targetId).length > 0 && (
              <span className="bg-red-400 text-white text-xs rounded-full px-1.5 py-0.5">!</span>
            )}
          </button>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm mb-5 w-fit">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
            <FaChevronLeft className="text-gray-500 text-xs" />
          </button>
          <span className="font-semibold text-gray-700 text-sm min-w-[120px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
            <FaChevronRight className="text-gray-500 text-xs" />
          </button>
        </div>

        {/* Stats */}
        {entries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(shiftCounts).map(([s, cnt]) => {
              const c = SHIFT_COLORS[s];
              return (
                <div key={s} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}>
                  {c.label}: <strong>{cnt}</strong> day{cnt > 1 ? "s" : ""}
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calCells.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const key     = toKey(date);
                const entry   = entryMap[key];
                const isTd    = key === toKey(today);
                const isWknd  = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={key}
                    className={`rounded-lg p-1.5 min-h-[60px] border relative ${
                      isTd ? "border-blue-400 ring-2 ring-blue-200" :
                      isWknd ? "border-gray-100 bg-gray-50" :
                      "border-gray-100"
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 ${isTd ? "text-blue-600" : "text-gray-600"}`}>
                      {date.getDate()}
                    </div>
                    {entry ? (
                      <div className={`rounded px-1.5 py-1 ${SHIFT_COLORS[entry.shift].bg} ${SHIFT_COLORS[entry.shift].text}`}>
                        <div className="text-[11px] font-semibold">{SHIFT_COLORS[entry.shift].label}</div>
                        <div className="text-[10px] opacity-75">{SHIFT_COLORS[entry.shift].time}</div>
                        <button
                          onClick={() => openSwapModal(entry)}
                          className="mt-1 text-[10px] underline opacity-70 hover:opacity-100"
                        >
                          Request swap
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-300 text-center mt-2">—</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming shifts list */}
        {entries.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Upcoming Shifts</h2>
            <div className="space-y-2">
              {entries
                .filter(e => new Date(e.date) >= today)
                .slice(0, 7)
                .map(e => {
                  const d  = new Date(e.date);
                  const c  = SHIFT_COLORS[e.shift];
                  return (
                    <div key={e.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${c.border} ${c.bg}`}>
                      <div className={`text-sm font-bold ${c.text} w-24`}>
                        {d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div className={`text-sm font-semibold ${c.text}`}>{c.label}</div>
                      <div className={`text-xs ${c.text} opacity-70`}>{c.time}</div>
                      {e.note && <div className="text-xs text-gray-500 italic ml-auto">"{e.note}"</div>}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Swap requests */}
        {showSwaps && (
          <div className="mt-6 bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Swap Requests</h2>
              <button onClick={loadSwaps} className="text-indigo-600 text-sm hover:underline">Refresh</button>
            </div>
            {swapLoad ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : swaps.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No swap requests</div>
            ) : (
              <div className="space-y-3">
                {swaps.map(s => {
                  const rDate = new Date(s.requesterRoster.date);
                  const tDate = new Date(s.targetRoster.date);
                  const isMine    = s.requesterId !== s.targetId; // always true but for clarity
                  const isIncoming = s.targetId === (swaps[0]?.targetId); // approximate — set by auth user

                  return (
                    <div key={s.id} className="border rounded-lg p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">{s.requester.name}</span>
                            {" "}<FaExchangeAlt className="inline mx-1 text-gray-400 text-xs" />{" "}
                            <span className="font-medium">{s.target.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.requester.name}: {rDate.toDateString()} ({SHIFT_COLORS[s.requesterRoster.shift]?.label})
                            {" ↔ "}
                            {s.target.name}: {tDate.toDateString()} ({SHIFT_COLORS[s.targetRoster.shift]?.label})
                          </div>
                          {s.reason && <div className="text-xs text-gray-400 mt-1 italic">"{s.reason}"</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_PILL[s.status]}`}>
                            {s.status}
                          </span>
                          {s.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => respondSwap(s.id, true)}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                              >
                                <FaCheckCircle /> Accept
                              </button>
                              <button
                                onClick={() => respondSwap(s.id, false)}
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                              >
                                <FaTimesCircle /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Swap Request Modal ── */}
      {swapModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Request Shift Swap</h2>
            <p className="text-sm text-gray-500 mb-4">
              Your shift: <strong>{new Date(swapModal.myEntry.date).toDateString()}</strong> — {SHIFT_COLORS[swapModal.myEntry.shift]?.label}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Swap with</label>
            <select
              value={selTarget}
              onChange={e => setSelTarget(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">— Select a shift —</option>
              {swapTargets.map(t => {
                const d = new Date(t.date);
                return (
                  <option key={t.id} value={t.id}>
                    {t.user?.name || `User #${t.userId}`} — {d.toDateString()} ({SHIFT_COLORS[t.shift]?.label})
                  </option>
                );
              })}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input
              type="text"
              placeholder="Why do you want to swap?"
              value={swapReason}
              onChange={e => setSwapReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {swapError && <p className="text-xs text-red-500 mb-3">{swapError}</p>}

            <div className="flex gap-2">
              <button onClick={() => setSwapModal(null)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submitSwap}
                disabled={swapSaving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {swapSaving ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
