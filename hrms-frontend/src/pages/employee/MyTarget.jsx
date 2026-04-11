import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaCalendarAlt, FaSave, FaChartBar, FaClock, FaCheckCircle,
  FaArrowLeft, FaArrowRight, FaSyncAlt, FaInfoCircle, FaRupeeSign,
  FaExclamationTriangle, FaRegClock, FaTimes, FaCheck,
} from "react-icons/fa";

/* ============================================================
   RATES
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

const DAILY_TARGET = 7.25; // hours

/* ============================================================
   COLUMN GROUPS
============================================================ */
const GROUPS = [
  { label: "Soccer Std-Q1",  bg: "bg-green-100",  cols: [
    { key: "soccerStdSingle", label: "Single", rate: 2.75 },
    { key: "soccerStdDouble", label: "Double", rate: 3 },
  ]},
  { label: "Soccer Adv",     bg: "bg-green-200",  cols: [
    { key: "soccerAdvSingle", label: "Single", rate: 6 },
    { key: "soccerAdvDouble", label: "Double", rate: 7.25 },
  ]},
  { label: "Ice Hockey 20 min", bg: "bg-blue-100", cols: [
    { key: "iceHockey20S1",    label: "S1",    rate: 1.25 },
    { key: "iceHockey20S2",    label: "S2",    rate: 0.75 },
    { key: "iceHockey20Event", label: "Event", rate: 1 },
  ]},
  { label: "Ice Hockey 17 min", bg: "bg-blue-200", cols: [
    { key: "iceHockey17S1",    label: "S1",    rate: 1 },
    { key: "iceHockey17S2",    label: "S2",    rate: 0.66 },
    { key: "iceHockey17Event", label: "Event", rate: 0.91 },
  ]},
  { label: "Ice Hockey 15 min", bg: "bg-blue-300", cols: [
    { key: "iceHockey15S1",    label: "S1",    rate: 0.75 },
    { key: "iceHockey15S2",    label: "S2",    rate: 0.57 },
    { key: "iceHockey15Event", label: "Event", rate: 0.84 },
  ]},
  { label: "LIVE", bg: "bg-red-100", live: true, cols: [
    { key: "liveSoccer",     label: "Soccer",     rate: 2.5 },
    { key: "liveFutsal",     label: "Futsal",     rate: 2 },
    { key: "liveVolleyball", label: "Volleyball", rate: 2.5 },
    { key: "liveBasketball", label: "Basketball", rate: 2 },
    { key: "liveHandball",   label: "Handball",   rate: 3 },
  ]},
  { label: "Basketball",      bg: "bg-orange-100", cols: [
    { key: "basketballS1",    label: "S1",    rate: 0.5 },
    { key: "basketballS2",    label: "S2",    rate: 0.5 },
    { key: "basketballEvent", label: "Event", rate: 0.84 },
  ]},
  { label: "Field Hockey Std", bg: "bg-purple-100", cols: [
    { key: "fieldHockeyStdSingle", label: "Single", rate: 2.25 },
    { key: "fieldHockeyStdDouble", label: "Double", rate: 2.5 },
  ]},
  { label: "EVENT", bg: "bg-yellow-100", cols: [
    { key: "event", label: "EVENT", rate: 1 },
  ]},
];

/* Overtime groups = same minus LIVE */
const OT_GROUPS = GROUPS.filter(g => !g.live);
const ALL_COLS  = GROUPS.flatMap(g => g.cols);
const OT_COLS   = OT_GROUPS.flatMap(g => g.cols);

const EMPTY    = () => Object.fromEntries(ALL_COLS.map(c => [c.key, ""]));
const EMPTY_OT = () => Object.fromEntries(OT_COLS.map(c => [c.key, ""]));

const calcTotal = (counts)   => ALL_COLS.reduce((s, c) => s + (RATES[c.key]||0)*(Number(counts[c.key])||0), 0);
const calcOT    = (overtime) => OT_COLS.reduce((s, c)  => s + (RATES[c.key]||0)*(Number(overtime[c.key])||0), 0);

/* round to nearest 0.25 */
const nearestQ  = (h) => Math.round(h * 4) / 4;
const isQuarter = (h) => Math.abs(h * 4 - Math.round(h * 4)) < 0.001;

const fmtDate = (d) => d.toISOString().split("T")[0];
const today   = ()  => fmtDate(new Date());
const fmtINR  = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ============================================================
   FORMAT ALERT MODAL
============================================================ */
function FormatModal({ data, onAddMore, onSnap, onClose }) {
  const { raw, nearest, diff } = data;
  const needMore = diff > 0; // nearest is higher than raw → need to add more

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-amber-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <FaExclamationTriangle className="text-amber-500" size={18}/>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Overtime Format Alert</h3>
            <p className="text-xs text-gray-500">Hours don't fit standard 0.25 increments</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <FaTimes size={14}/>
          </button>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Your overtime hours:</span>
            <span className="font-bold text-amber-700">{raw.toFixed(2)} hrs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Nearest valid format:</span>
            <span className="font-bold text-indigo-700">{nearest.toFixed(2)} hrs</span>
          </div>
          {needMore ? (
            <div className="flex justify-between border-t border-amber-200 pt-2">
              <span className="text-gray-600">Extra needed to reach format:</span>
              <span className="font-bold text-green-600">+{diff.toFixed(2)} hrs</span>
            </div>
          ) : (
            <div className="flex justify-between border-t border-amber-200 pt-2">
              <span className="text-gray-600">Will round down by:</span>
              <span className="font-bold text-red-500">{(-diff).toFixed(2)} hrs</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-5">
          {needMore
            ? `You need ${diff.toFixed(2)} more overtime hours to reach the standard format of ${nearest.toFixed(2)} hrs. Would you like to add more overtime?`
            : `Your overtime will be rounded down to ${nearest.toFixed(2)} hrs. Snap to format or add more?`
          }
        </p>

        <div className="flex gap-3">
          <button
            onClick={onAddMore}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
            <FaCheck size={12}/> Add More Overtime
          </button>
          <button
            onClick={onSnap}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-semibold transition-colors">
            Snap to {nearest.toFixed(2)} hrs & Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   OVERTIME RATE CARD
============================================================ */
function OtRateCard({ rate, onSave }) {
  const [draft, setDraft]   = useState(rate);
  const [saving, setSaving] = useState(false);
  const [ok, setOk]         = useState(false);

  useEffect(() => { setDraft(rate); }, [rate]);

  const save = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <FaRupeeSign className="text-green-600" size={13}/>
        </div>
        <span className="text-sm font-semibold text-gray-700">Overtime Rate</span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
        <span className="text-gray-400 text-sm">₹</span>
        <input
          type="number"
          min="0"
          step="0.5"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="0.00"
          className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
        />
        <span className="text-gray-400 text-xs">per hour</span>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          ok ? "bg-green-100 text-green-700" : "bg-green-600 hover:bg-green-700 text-white"
        }`}>
        {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> :
         ok ? <><FaCheckCircle size={11}/> Saved!</> :
         <><FaSave size={11}/> Save Rate</>}
      </button>
      <span className="text-[11px] text-gray-400 flex-shrink-0">Used to calculate your overtime pay</span>
    </div>
  );
}

/* ============================================================
   TARGET SHEET TABLE (reusable for both regular & overtime)
============================================================ */
function TargetSheet({ groups, counts, onChange, label }) {
  const allCols = groups.flatMap(g => g.cols);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs" style={{ minWidth: groups.length * 80 + 120 }}>
        <thead>
          {/* RATE ROW */}
          <tr>
            {groups.map(g => g.cols.map(c => (
              <th key={c.key}
                className="border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-500 bg-gray-50"
                style={{ minWidth: 64 }}>
                {c.rate}
              </th>
            )))}
            <th className="border border-gray-200 px-3 py-1.5 text-center font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">
              {label || "TOTAL HOURS"}
            </th>
          </tr>
          {/* GROUP HEADERS */}
          <tr>
            {groups.map(g => (
              <th key={g.label} colSpan={g.cols.length}
                className={`border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 ${g.bg}`}>
                {g.label}
              </th>
            ))}
            <th className="border border-gray-300 bg-indigo-50" rowSpan={2}/>
          </tr>
          {/* COL LABELS */}
          <tr>
            {groups.map(g => g.cols.map(c => (
              <th key={c.key}
                className={`border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-600 ${g.bg}`}>
                {c.label}
              </th>
            )))}
          </tr>
        </thead>
        <tbody>
          {/* INPUT ROW */}
          <tr>
            {allCols.map(c => (
              <td key={c.key} className="border border-gray-200 p-1 text-center">
                <input
                  type="number"
                  min="0"
                  value={counts[c.key] ?? ""}
                  onChange={e => onChange(c.key, e.target.value)}
                  placeholder="0"
                  className="w-full text-center text-sm font-semibold rounded-lg border border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 py-2 px-1 transition-all"
                  style={{ minWidth: 52 }}
                />
              </td>
            ))}
            {/* TOTAL */}
            <td className="border border-gray-200 p-3 text-center">
              <div className="text-xl font-black text-indigo-700">
                {allCols.reduce((s, c) => s + (RATES[c.key]||0)*(Number(counts[c.key])||0), 0).toFixed(2)}
              </div>
            </td>
          </tr>
          {/* SUBTOTALS ROW */}
          <tr className="bg-gray-50">
            {allCols.map(c => {
              const hrs = (RATES[c.key]||0)*(Number(counts[c.key])||0);
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
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MyTarget() {
  const [date,     setDate]     = useState(today());
  const [counts,   setCounts]   = useState(EMPTY());
  const [overtime, setOvertime] = useState(EMPTY_OT());
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [history,  setHistory]  = useState([]);
  const [rate,     setRate]     = useState(0);
  const [loadingH, setLoadingH] = useState(false);
  const [tab,      setTab]      = useState("entry");
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [year,     setYear]     = useState(new Date().getFullYear());

  /* format alert modal */
  const [formatModal, setFormatModal] = useState(null); // null | { raw, nearest, diff }

  /* pending save data (used when format modal is open) */
  const pendingSave = useRef(null);

  /* ── LOAD ENTRY FOR DATE ── */
  const loadDate = useCallback(async (d) => {
    try {
      const m = new Date(d).getMonth() + 1;
      const y = new Date(d).getFullYear();
      const res = await api.get(`/targets/my?month=${m}&year=${y}`);
      const { targets, rate: r } = res.data;
      setRate(r ?? 0);
      const found = targets.find(t => t.date === d);
      if (found) {
        setCounts({ ...EMPTY(),    ...found.counts });
        setOvertime({ ...EMPTY_OT(), ...(found.overtime || {}) });
        setNotes(found.notes || "");
      } else {
        setCounts(EMPTY());
        setOvertime(EMPTY_OT());
        setNotes("");
      }
    } catch {
      setCounts(EMPTY());
      setOvertime(EMPTY_OT());
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingH(true);
    try {
      const res = await api.get(`/targets/my?month=${month}&year=${year}`);
      setHistory(res.data.targets || []);
      setRate(res.data.rate ?? 0);
    } catch { setHistory([]); }
    finally  { setLoadingH(false); }
  }, [month, year]);

  useEffect(() => { loadDate(date); }, [date, loadDate]);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  const totalHours = calcTotal(counts);
  const otHoursRaw = calcOT(overtime);
  const otPay      = otHoursRaw * rate;

  /* ── HANDLE INPUT ── */
  const handleCount = (key, val) => {
    const n = val === "" ? "" : Math.max(0, parseInt(val) || 0);
    setCounts(p => ({ ...p, [key]: n }));
    setSaved(false);
  };
  const handleOT = (key, val) => {
    const n = val === "" ? "" : Math.max(0, parseInt(val) || 0);
    setOvertime(p => ({ ...p, [key]: n }));
    setSaved(false);
  };

  /* ── UPDATE RATE ── */
  const handleRateSave = async (newRate) => {
    await api.patch("/targets/rate", { rate: parseFloat(newRate) || 0 });
    setRate(parseFloat(newRate) || 0);
  };

  /* ── ACTUAL SAVE ── */
  const doSave = async (overtimeHours) => {
    setSaving(true);
    setSaved(false);
    try {
      await api.post("/targets", {
        date,
        counts,
        notes,
        overtime,
        overtimeHours,
      });
      setSaved(true);
      pendingSave.current = null;
      if (tab === "history") loadHistory();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to save");
    } finally { setSaving(false); }
  };

  /* ── SAVE CLICK ── */
  const handleSave = () => {
    const rawOT = calcOT(overtime);

    /* If overtime exists and hours don't fit 0.25 format → show modal */
    if (rawOT > 0 && !isQuarter(rawOT)) {
      const nearest = nearestQ(rawOT);
      const diff    = parseFloat((nearest - rawOT).toFixed(3));
      pendingSave.current = { snappedHours: nearest };
      setFormatModal({ raw: rawOT, nearest, diff });
      return;
    }

    doSave(rawOT);
  };

  /* ── DATE NAVIGATION ── */
  const shiftDate = (dir) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(fmtDate(d));
  };
  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  /* ── EXCEED BANNER ── */
  const exceed = totalHours - DAILY_TARGET;

  return (
    <Layout>
      {/* ── FORMAT ALERT MODAL ── */}
      {formatModal && (
        <FormatModal
          data={formatModal}
          onClose={() => setFormatModal(null)}
          onAddMore={() => {
            setFormatModal(null);
            /* Focus overtime section — user can add more */
          }}
          onSnap={() => {
            const snapped = pendingSave.current?.snappedHours ?? nearestQ(calcOT(overtime));
            setFormatModal(null);
            doSave(snapped);
          }}
        />
      )}

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Daily Target</h1>
            <p className="text-indigo-200 text-sm mt-1">Enter daily counts — hours auto-calculated using fixed rates</p>
          </div>
          {/* KPI PILLS */}
          <div className="flex gap-2 flex-wrap">
            <div className="bg-white/20 border border-white/30 rounded-2xl px-5 py-2.5 text-center">
              <div className="text-2xl font-black">{totalHours.toFixed(2)}</div>
              <div className="text-indigo-200 text-[10px] mt-0.5">Regular Hrs</div>
            </div>
            {otHoursRaw > 0 && (
              <div className="bg-amber-400/30 border border-amber-300/40 rounded-2xl px-5 py-2.5 text-center">
                <div className="text-2xl font-black text-amber-100">{otHoursRaw.toFixed(2)}</div>
                <div className="text-amber-200 text-[10px] mt-0.5">OT Hrs</div>
              </div>
            )}
            {otHoursRaw > 0 && rate > 0 && (
              <div className="bg-green-400/25 border border-green-300/40 rounded-2xl px-5 py-2.5 text-center">
                <div className="text-lg font-black text-green-100">{fmtINR(otPay)}</div>
                <div className="text-green-200 text-[10px] mt-0.5">OT Pay Today</div>
              </div>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
          {[["entry","Today's Entry"],["history","Monthly History"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab===k ? "bg-white text-indigo-600 shadow-sm" : "text-white/80 hover:text-white"
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          TAB: ENTRY
      ══════════════════════════════ */}
      {tab === "entry" && (
        <>
          {/* OVERTIME RATE */}
          <OtRateCard rate={rate} onSave={handleRateSave} />

          {/* DATE PICKER */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
            <button onClick={() => shiftDate(-1)}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaArrowLeft size={12} className="text-gray-600"/>
            </button>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-500"/>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
            </div>
            <button onClick={() => shiftDate(1)}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaArrowRight size={12} className="text-gray-600"/>
            </button>
            <button onClick={() => setDate(today())}
              className="ml-auto text-xs text-indigo-600 hover:underline font-medium">Today</button>
          </div>

          {/* INFO */}
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4">
            <FaInfoCircle size={12} className="flex-shrink-0"/>
            Enter clips/events completed. Hours auto-calculated. Daily target: <strong className="ml-1">{DAILY_TARGET} hrs</strong>
          </div>

          {/* ── REGULAR TARGET SHEET ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-700 text-sm">Daily Target</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                totalHours >= DAILY_TARGET ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {totalHours.toFixed(2)} / {DAILY_TARGET} hrs
              </span>
            </div>
            <TargetSheet
              groups={GROUPS}
              counts={counts}
              onChange={handleCount}
              label="TOTAL WORKING HOURS"
            />
          </div>

          {/* ── EXCEED DAILY TARGET BANNER ── */}
          {exceed > 0.001 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
              <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={14}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Exceeded Daily Target!</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Your total is <strong>{totalHours.toFixed(2)} hrs</strong> — that's <strong>{exceed.toFixed(2)} hrs</strong> over the {DAILY_TARGET} hr target.
                  Log the extra work in the <strong>Overtime</strong> section below.
                </p>
              </div>
            </div>
          )}

          {/* ── OVERTIME SHEET ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2">
                <FaRegClock className="text-amber-500" size={14}/>
                <span className="font-bold text-gray-700 text-sm">Overtime</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">No LIVE</span>
              </div>
              <div className="flex items-center gap-3">
                {otHoursRaw > 0 && !isQuarter(otHoursRaw) && (
                  <span className="text-[10px] text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    ⚠ Not in 0.25 format
                  </span>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  otHoursRaw > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {otHoursRaw.toFixed(2)} OT hrs
                </span>
              </div>
            </div>
            <TargetSheet
              groups={OT_GROUPS}
              counts={overtime}
              onChange={handleOT}
              label="OVERTIME HOURS"
            />

            {/* OT PAY SUMMARY */}
            {otHoursRaw > 0 && rate > 0 && (
              <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex items-center gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  <FaClock className="text-green-500" size={12}/>
                  <span className="text-gray-600">{otHoursRaw.toFixed(2)} hrs</span>
                </div>
                <span className="text-gray-400">×</span>
                <div className="flex items-center gap-1">
                  <FaRupeeSign className="text-green-500" size={11}/>
                  <span className="text-gray-600">{Number(rate).toFixed(2)}/hr</span>
                </div>
                <span className="text-gray-400">=</span>
                <span className="font-black text-green-700 text-base">{fmtINR(otPay)}</span>
                <span className="text-[10px] text-gray-400 ml-auto">Today's overtime pay</span>
              </div>
            )}
            {otHoursRaw > 0 && !isQuarter(otHoursRaw) && (
              <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-center gap-2">
                <FaExclamationTriangle size={11}/>
                <span>
                  OT hours ({otHoursRaw.toFixed(2)}) are not in 0.25 format. Nearest: <strong>{nearestQ(otHoursRaw).toFixed(2)}</strong>.
                  Click Save — you'll be prompted to add more or snap to format.
                </span>
              </div>
            )}
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
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <FaArrowLeft size={12} className="text-gray-600"/>
            </button>
            <div className="flex items-center gap-2 flex-1 justify-center">
              <FaCalendarAlt className="text-indigo-500"/>
              <span className="font-semibold text-gray-700">{MONTH_NAMES[month-1]} {year}</span>
            </div>
            <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
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
              {/* Monthly KPIs */}
              {(() => {
                const totalReg  = history.reduce((s, r) => s + r.totalHours, 0);
                const totalOT   = history.reduce((s, r) => s + (r.overtimeHours || 0), 0);
                const totalPay  = totalOT * rate;
                const bestDay   = Math.max(...history.map(r => r.totalHours));
                const avg       = history.length ? totalReg / history.length : 0;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-indigo-700">{totalReg.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Regular Hrs</div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-amber-700">{totalOT.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Overtime Hrs</div>
                    </div>
                    {rate > 0 ? (
                      <div className="bg-green-50 rounded-2xl p-4 text-center">
                        <div className="text-xl font-black text-green-700">{fmtINR(totalPay)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">OT Pay (Monthly)</div>
                      </div>
                    ) : (
                      <div className="bg-green-50 rounded-2xl p-4 text-center">
                        <div className="text-2xl font-black text-green-700">{history.length}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Days Submitted</div>
                      </div>
                    )}
                    <div className="bg-purple-50 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-purple-700">{avg.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Avg Hrs/Day</div>
                    </div>
                  </div>
                );
              })()}

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
                        <th className="px-4 py-3 font-semibold text-center">Reg Hrs</th>
                        <th className="px-4 py-3 font-semibold text-center">OT Hrs</th>
                        {rate > 0 && <th className="px-4 py-3 font-semibold text-center">OT Pay</th>}
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
                            const hrs = g.cols.reduce((s, c) => s + (RATES[c.key]||0)*(Number(r.counts?.[c.key])||0), 0);
                            return (
                              <td key={g.label} className="px-3 py-3 text-center text-xs text-gray-500">
                                {hrs > 0 ? `${hrs.toFixed(2)}h` : <span className="text-gray-200">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 font-black text-indigo-700 text-sm">
                              <FaClock size={10} className="text-indigo-400"/>
                              {r.totalHours.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(r.overtimeHours || 0) > 0
                              ? <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-sm">
                                  <FaRegClock size={10}/>
                                  {Number(r.overtimeHours).toFixed(2)}
                                </span>
                              : <span className="text-gray-200 text-xs">—</span>
                            }
                          </td>
                          {rate > 0 && (
                            <td className="px-4 py-3 text-center text-xs font-semibold text-green-600">
                              {(r.overtimeHours || 0) > 0 ? fmtINR(r.overtimeHours * rate) : <span className="text-gray-200">—</span>}
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <button onClick={() => { setDate(r.date); setTab("entry"); }}
                              className="text-xs text-indigo-600 hover:underline">Edit</button>
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
