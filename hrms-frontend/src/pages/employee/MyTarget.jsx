import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaCalendarAlt, FaSave, FaChartBar, FaClock, FaCheckCircle,
  FaArrowLeft, FaArrowRight, FaSyncAlt, FaInfoCircle,
} from "react-icons/fa";

/* ============================================================
   TARGET RATES — must match backend TARGET_RATES
============================================================ */
const RATES = {
  soccerStdSingle:      2.75,
  soccerStdDouble:      3,
  soccerAdvSingle:      6,
  soccerAdvDouble:      7.25,
  iceHockey20S1:        1.25,
  iceHockey20S2:        0.75,
  iceHockey20Event:     1,
  iceHockey17S1:        1,
  iceHockey17S2:        0.66,
  iceHockey17Event:     0.91,
  iceHockey15S1:        0.75,
  iceHockey15S2:        0.57,
  iceHockey15Event:     0.84,
  liveSoccer:           2.5,
  liveFutsal:           2,
  liveVolleyball:       2.5,
  liveBasketball:       2,
  liveHandball:         3,
  basketballS1:         0.5,
  basketballS2:         0.5,
  basketballEvent:      0.84,
  fieldHockeyStdSingle: 2.25,
  fieldHockeyStdDouble: 2.5,
  event:                1,
};

/* ============================================================
   COLUMN GROUPS — mirrors the image header exactly
============================================================ */
const GROUPS = [
  {
    label: "Soccer Std-Q1",
    bg: "bg-green-100",
    cols: [
      { key: "soccerStdSingle", label: "Single", rate: 2.75 },
      { key: "soccerStdDouble", label: "Double", rate: 3 },
    ],
  },
  {
    label: "Soccer Adv",
    bg: "bg-green-200",
    cols: [
      { key: "soccerAdvSingle", label: "Single", rate: 6 },
      { key: "soccerAdvDouble", label: "Double", rate: 7.25 },
    ],
  },
  {
    label: "Ice Hockey 20 min",
    bg: "bg-blue-100",
    cols: [
      { key: "iceHockey20S1",    label: "S1",    rate: 1.25 },
      { key: "iceHockey20S2",    label: "S2",    rate: 0.75 },
      { key: "iceHockey20Event", label: "Event", rate: 1 },
    ],
  },
  {
    label: "Ice Hockey 17 min",
    bg: "bg-blue-200",
    cols: [
      { key: "iceHockey17S1",    label: "S1",    rate: 1 },
      { key: "iceHockey17S2",    label: "S2",    rate: 0.66 },
      { key: "iceHockey17Event", label: "Event", rate: 0.91 },
    ],
  },
  {
    label: "Ice Hockey 15 min",
    bg: "bg-blue-300",
    cols: [
      { key: "iceHockey15S1",    label: "S1",    rate: 0.75 },
      { key: "iceHockey15S2",    label: "S2",    rate: 0.57 },
      { key: "iceHockey15Event", label: "Event", rate: 0.84 },
    ],
  },
  {
    label: "LIVE",
    bg: "bg-red-100",
    cols: [
      { key: "liveSoccer",     label: "Soccer",     rate: 2.5 },
      { key: "liveFutsal",     label: "Futsal",     rate: 2 },
      { key: "liveVolleyball", label: "Volleyball", rate: 2.5 },
      { key: "liveBasketball", label: "Basketball", rate: 2 },
      { key: "liveHandball",   label: "Handball",   rate: 3 },
    ],
  },
  {
    label: "Basketball",
    bg: "bg-orange-100",
    cols: [
      { key: "basketballS1",    label: "S1",    rate: 0.5 },
      { key: "basketballS2",    label: "S2",    rate: 0.5 },
      { key: "basketballEvent", label: "Event", rate: 0.84 },
    ],
  },
  {
    label: "Field Hockey Std",
    bg: "bg-purple-100",
    cols: [
      { key: "fieldHockeyStdSingle", label: "Single", rate: 2.25 },
      { key: "fieldHockeyStdDouble", label: "Double", rate: 2.5 },
    ],
  },
  {
    label: "EVENT",
    bg: "bg-yellow-100",
    cols: [
      { key: "event", label: "EVENT", rate: 1 },
    ],
  },
];

const ALL_COLS = GROUPS.flatMap(g => g.cols);
const EMPTY    = () => Object.fromEntries(ALL_COLS.map(c => [c.key, ""]));

const calcTotal = (counts) =>
  ALL_COLS.reduce((sum, c) => sum + (RATES[c.key] || 0) * (Number(counts[c.key]) || 0), 0);

const fmtDate = (d) => d.toISOString().split("T")[0];
const today   = () => fmtDate(new Date());

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MyTarget() {
  const [date,     setDate]     = useState(today());
  const [counts,   setCounts]   = useState(EMPTY());
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [history,  setHistory]  = useState([]);
  const [loadingH, setLoadingH] = useState(false);
  const [tab,      setTab]      = useState("entry"); // "entry" | "history"
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [year,     setYear]     = useState(new Date().getFullYear());

  /* load existing entry for selected date */
  const loadDate = useCallback(async (d) => {
    try {
      const m = new Date(d).getMonth() + 1;
      const y = new Date(d).getFullYear();
      const res = await api.get(`/targets/my?month=${m}&year=${y}`);
      const found = res.data.find(r => r.date === d);
      if (found) {
        setCounts({ ...EMPTY(), ...found.counts });
        setNotes(found.notes || "");
      } else {
        setCounts(EMPTY());
        setNotes("");
      }
    } catch {
      setCounts(EMPTY());
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingH(true);
    try {
      const res = await api.get(`/targets/my?month=${month}&year=${year}`);
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally { setLoadingH(false); }
  }, [month, year]);

  useEffect(() => { loadDate(date); }, [date, loadDate]);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  const totalHours = calcTotal(counts);

  const handleCount = (key, val) => {
    const n = val === "" ? "" : Math.max(0, parseInt(val) || 0);
    setCounts(p => ({ ...p, [key]: n }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.post("/targets", { date, counts, notes });
      setSaved(true);
      if (tab === "history") loadHistory();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to save");
    } finally { setSaving(false); }
  };

  const shiftDate = (dir) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(fmtDate(d));
  };

  /* month navigation */
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <Layout>
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Daily Target</h1>
            <p className="text-indigo-200 text-sm mt-1">Enter your daily productivity counts — hours are calculated automatically</p>
          </div>
          {/* TOTAL hours pill */}
          <div className="bg-white/20 border border-white/30 rounded-2xl px-6 py-3 text-center">
            <div className="text-3xl font-black">{totalHours.toFixed(2)}</div>
            <div className="text-indigo-200 text-xs mt-0.5">Total Hours</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
          {["entry","history"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? "bg-white text-indigo-600 shadow-sm" : "text-white/80 hover:text-white"
              }`}>
              {t === "entry" ? "Today's Entry" : "Monthly History"}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          TAB: ENTRY
      ══════════════════════════════ */}
      {tab === "entry" && (
        <>
          {/* DATE PICKER */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
            <button onClick={() => shiftDate(-1)}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaArrowLeft size={12} className="text-gray-600"/>
            </button>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-500"/>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button onClick={() => shiftDate(1)}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaArrowRight size={12} className="text-gray-600"/>
            </button>
            <button onClick={() => setDate(today())}
              className="ml-auto text-xs text-indigo-600 hover:underline font-medium">
              Today
            </button>
          </div>

          {/* RATE INFO */}
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4">
            <FaInfoCircle size={12} className="flex-shrink-0"/>
            Enter the number of clips/events completed. Hours are auto-calculated using standard rates shown in each column header.
          </div>

          {/* TARGET SHEET — horizontally scrollable */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs" style={{ minWidth: 1100 }}>
                {/* ── RATE ROW ── */}
                <thead>
                  <tr>
                    {GROUPS.map(g => g.cols.map(c => (
                      <th key={c.key}
                        className="border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-500 bg-gray-50"
                        style={{ minWidth: 64 }}>
                        {c.rate}
                      </th>
                    )))}
                    <th className="border border-gray-200 px-3 py-1.5 text-center font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">
                      TOTAL WORKING HOURS
                    </th>
                  </tr>
                  {/* ── GROUP HEADER ── */}
                  <tr>
                    {GROUPS.map(g => (
                      <th key={g.label} colSpan={g.cols.length}
                        className={`border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 ${g.bg}`}>
                        {g.label}
                      </th>
                    ))}
                    <th className="border border-gray-300 bg-indigo-50" rowSpan={2}/>
                  </tr>
                  {/* ── COLUMN LABELS ── */}
                  <tr>
                    {GROUPS.map(g => g.cols.map(c => (
                      <th key={c.key}
                        className={`border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-600 ${g.bg}`}>
                        {c.label}
                      </th>
                    )))}
                  </tr>
                </thead>

                {/* ── INPUT ROW ── */}
                <tbody>
                  <tr>
                    {ALL_COLS.map(c => (
                      <td key={c.key} className="border border-gray-200 p-1 text-center">
                        <input
                          type="number"
                          min="0"
                          value={counts[c.key]}
                          onChange={e => handleCount(c.key, e.target.value)}
                          placeholder="0"
                          className="w-full text-center text-sm font-semibold rounded-lg border border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 py-2 px-1 transition-all"
                          style={{ minWidth: 52 }}
                        />
                      </td>
                    ))}
                    {/* TOTAL */}
                    <td className="border border-gray-200 p-3 text-center">
                      <div className="text-xl font-black text-indigo-700">{totalHours.toFixed(2)}</div>
                    </td>
                  </tr>

                  {/* ── PER-COL HOURS ── (for reference) */}
                  <tr className="bg-gray-50">
                    {ALL_COLS.map(c => {
                      const hrs = (RATES[c.key] || 0) * (Number(counts[c.key]) || 0);
                      return (
                        <td key={c.key} className="border border-gray-100 py-1 text-center text-[10px] text-indigo-500 font-semibold">
                          {hrs > 0 ? `${hrs.toFixed(2)}h` : "—"}
                        </td>
                      );
                    })}
                    <td className="border border-gray-100 py-1 text-center text-xs text-gray-400">Subtotals</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* NOTES + SAVE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => { setNotes(e.target.value); setSaved(false); }}
                rows={2}
                placeholder="Any extra info about today's work..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
            <div className="flex flex-col items-end justify-end gap-2">
              {saved && (
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                  <FaCheckCircle size={13}/> Saved!
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</>
                  : <><FaSave size={13}/> Save Target</>
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════
          TAB: HISTORY
      ══════════════════════════════ */}
      {tab === "history" && (
        <>
          {/* Month nav */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3">
            <button onClick={prevMonth}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaArrowLeft size={12} className="text-gray-600"/>
            </button>
            <div className="flex items-center gap-2 flex-1 justify-center">
              <FaCalendarAlt className="text-indigo-500"/>
              <span className="font-semibold text-gray-700">{MONTH_NAMES[month-1]} {year}</span>
            </div>
            <button onClick={nextMonth}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaArrowRight size={12} className="text-gray-600"/>
            </button>
            <button onClick={loadHistory} className="ml-2 text-gray-400 hover:text-indigo-600 transition-colors">
              <FaSyncAlt size={13}/>
            </button>
          </div>

          {loadingH ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"/>
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <FaChartBar className="text-gray-200 mx-auto mb-3" size={32}/>
              <p className="text-gray-400 text-sm">No targets submitted for {MONTH_NAMES[month-1]} {year}</p>
            </div>
          ) : (
            <>
              {/* Monthly total */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-indigo-700">
                    {history.reduce((s, r) => s + r.totalHours, 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Hours</div>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-green-700">{history.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Days Submitted</div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-blue-700">
                    {history.length > 0 ? (history.reduce((s,r)=>s+r.totalHours,0)/history.length).toFixed(2) : "0"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Avg Hours/Day</div>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-purple-700">
                    {Math.max(...history.map(r => r.totalHours)).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Best Day</div>
                </div>
              </div>

              {/* History table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="px-5 py-3 font-semibold">Date</th>
                        {GROUPS.map(g => (
                          <th key={g.label} className="px-3 py-3 font-semibold text-center whitespace-nowrap">{g.label}</th>
                        ))}
                        <th className="px-5 py-3 font-semibold text-center">Total Hours</th>
                        <th className="px-5 py-3 font-semibold">Notes</th>
                        <th className="px-3 py-3"/>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map(r => (
                        <tr key={r.date} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-700 whitespace-nowrap">
                            {new Date(r.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
                          </td>
                          {GROUPS.map(g => {
                            const hrs = g.cols.reduce((s,c) => s + (RATES[c.key]||0)*(Number(r.counts?.[c.key])||0), 0);
                            return (
                              <td key={g.label} className="px-3 py-3 text-center text-xs text-gray-500">
                                {hrs > 0 ? `${hrs.toFixed(2)}h` : <span className="text-gray-200">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center gap-1 font-black text-indigo-700 text-base">
                              <FaClock size={11} className="text-indigo-400"/>
                              {r.totalHours.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs max-w-[140px] truncate">{r.notes || "—"}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => { setDate(r.date); setTab("entry"); }}
                              className="text-xs text-indigo-600 hover:underline">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
