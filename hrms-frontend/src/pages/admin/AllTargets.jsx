import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaCalendarAlt, FaChartBar, FaClock, FaArrowLeft, FaArrowRight,
  FaSyncAlt, FaCheckCircle, FaTimesCircle, FaBuilding,
  FaSearch, FaDownload, FaRegClock, FaRupeeSign,
} from "react-icons/fa";

const RATES = {
  soccerStdSingle: 2.75, soccerStdDouble: 3,
  soccerAdvSingle: 6, soccerAdvDouble: 7.25,
  iceHockey20S1: 1.25, iceHockey20S2: 0.75, iceHockey20Event: 1,
  iceHockey17S1: 1, iceHockey17S2: 0.66, iceHockey17Event: 0.91,
  iceHockey15S1: 0.75, iceHockey15S2: 0.57, iceHockey15Event: 0.84,
  liveSoccer: 2.5, liveFutsal: 2, liveVolleyball: 2.5, liveBasketball: 2, liveHandball: 3,
  basketballS1: 0.5, basketballS2: 0.5, basketballEvent: 0.84,
  fieldHockeyStdSingle: 2.25, fieldHockeyStdDouble: 2.5, event: 1,
};

const GROUPS = [
  { label: "Soccer Std-Q1", bg: "bg-green-100", cols: [{ key:"soccerStdSingle",label:"Single",rate:2.75 },{ key:"soccerStdDouble",label:"Double",rate:3 }] },
  { label: "Soccer Adv",    bg: "bg-green-200", cols: [{ key:"soccerAdvSingle",label:"Single",rate:6 },{ key:"soccerAdvDouble",label:"Double",rate:7.25 }] },
  { label: "Ice Hockey 20 min", bg:"bg-blue-100", cols:[{ key:"iceHockey20S1",label:"S1",rate:1.25 },{ key:"iceHockey20S2",label:"S2",rate:0.75 },{ key:"iceHockey20Event",label:"Event",rate:1 }] },
  { label: "Ice Hockey 17 min", bg:"bg-blue-200", cols:[{ key:"iceHockey17S1",label:"S1",rate:1 },{ key:"iceHockey17S2",label:"S2",rate:0.66 },{ key:"iceHockey17Event",label:"Event",rate:0.91 }] },
  { label: "Ice Hockey 15 min", bg:"bg-blue-300", cols:[{ key:"iceHockey15S1",label:"S1",rate:0.75 },{ key:"iceHockey15S2",label:"S2",rate:0.57 },{ key:"iceHockey15Event",label:"Event",rate:0.84 }] },
  { label: "LIVE", bg:"bg-red-100", cols:[{ key:"liveSoccer",label:"Soccer",rate:2.5 },{ key:"liveFutsal",label:"Futsal",rate:2 },{ key:"liveVolleyball",label:"Volleyball",rate:2.5 },{ key:"liveBasketball",label:"Basketball",rate:2 },{ key:"liveHandball",label:"Handball",rate:3 }] },
  { label: "Basketball", bg:"bg-orange-100", cols:[{ key:"basketballS1",label:"S1",rate:0.5 },{ key:"basketballS2",label:"S2",rate:0.5 },{ key:"basketballEvent",label:"Event",rate:0.84 }] },
  { label: "Field Hockey Std", bg:"bg-purple-100", cols:[{ key:"fieldHockeyStdSingle",label:"Single",rate:2.25 },{ key:"fieldHockeyStdDouble",label:"Double",rate:2.5 }] },
  { label: "EVENT", bg:"bg-yellow-100", cols:[{ key:"event",label:"EVENT",rate:1 }] },
];

const ALL_COLS = GROUPS.flatMap(g => g.cols);
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEPTS = ["All","SQ","Spiideo","Annotation","Vidswap"];

const fmtDate = (d) => d.toISOString().split("T")[0];
const fmtINR  = (n) => `₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function AllTargets() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isManager   = currentUser.role === "MANAGER";

  const [tab,      setTab]      = useState("daily");
  const [date,     setDate]     = useState(fmtDate(new Date()));
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [dept,     setDept]     = useState(isManager ? currentUser.department : "All");
  const [search,   setSearch]   = useState("");
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [summary,  setSummary]  = useState([]);

  /* ── DAILY ── */
  const loadDaily = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (dept !== "All") params.set("department", dept);
      const res = await api.get(`/targets/all?${params}`);
      setData(res.data);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [date, dept]);

  /* ── MONTHLY ── */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, year });
      if (dept !== "All") params.set("department", dept);
      const res = await api.get(`/targets/summary?${params}`);
      setSummary(res.data);
    } catch { setSummary([]); }
    finally { setLoading(false); }
  }, [month, year, dept]);

  useEffect(() => {
    if (tab === "daily")  loadDaily();
    else                  loadSummary();
  }, [tab, loadDaily, loadSummary]);

  const shiftDate = (dir) => {
    const d = new Date(date); d.setDate(d.getDate() + dir);
    setDate(fmtDate(d));
  };
  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const filtered = data.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.department||"").toLowerCase().includes(search.toLowerCase())
  );

  const submitted    = filtered.filter(u => u.submitted).length;
  const notSubmitted = filtered.filter(u => !u.submitted).length;
  const totalHrs     = filtered.reduce((s,u) => s + (u.totalHours||0), 0);
  const totalOtHrs   = filtered.reduce((s,u) => s + (u.overtimeHours||0), 0);

  /* ── CSV Export ── */
  const exportCSV = () => {
    const rows = [
      ["Name","Department","Date",...ALL_COLS.map(c=>c.label),"Total Hours","OT Hours","OT Pay","Notes"],
      ...filtered.map(u => [
        u.name, u.department||"", date,
        ...ALL_COLS.map(c => u.counts?.[c.key] || 0),
        u.totalHours?.toFixed(2)||"0",
        (u.overtimeHours||0).toFixed(2),
        ((u.overtimeHours||0) * (u.overtimeRatePerHour||0)).toFixed(2),
        u.notes||"",
      ]),
    ];
    const csv = rows.map(r => r.map(v=>`"${v}"`).join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `targets-${date}.csv`;
    a.click();
  };

  return (
    <Layout>
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Team Productivity Targets</h1>
            <p className="text-indigo-200 text-sm mt-1">Monitor daily targets and overtime for all employees</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tab === "daily" && (
              <>
                <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2 text-center">
                  <div className="text-xl font-black">{totalHrs.toFixed(2)}</div>
                  <div className="text-indigo-200 text-[10px]">Team Reg Hrs</div>
                </div>
                {totalOtHrs > 0 && (
                  <div className="bg-amber-400/30 border border-amber-300/40 rounded-xl px-4 py-2 text-center">
                    <div className="text-xl font-black text-amber-100">{totalOtHrs.toFixed(2)}</div>
                    <div className="text-amber-200 text-[10px]">Team OT Hrs</div>
                  </div>
                )}
              </>
            )}
            <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-black">{submitted}</div>
              <div className="text-indigo-200 text-[10px]">Submitted</div>
            </div>
            <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-black">{notSubmitted}</div>
              <div className="text-indigo-200 text-[10px]">Pending</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
          {[["daily","Daily View"],["monthly","Monthly Summary"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab===k ? "bg-white text-indigo-600 shadow-sm" : "text-white/80 hover:text-white"
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        {tab === "daily" ? (
          <>
            <button onClick={() => shiftDate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><FaArrowLeft size={11} className="text-gray-600"/></button>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-500"/>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
            </div>
            <button onClick={() => shiftDate(1)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><FaArrowRight size={11} className="text-gray-600"/></button>
          </>
        ) : (
          <>
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><FaArrowLeft size={11} className="text-gray-600"/></button>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
              <FaCalendarAlt className="text-indigo-500"/>
              <span className="font-semibold text-gray-700 text-sm">{MONTH_NAMES[month-1]} {year}</span>
            </div>
            <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><FaArrowRight size={11} className="text-gray-600"/></button>
          </>
        )}

        {!isManager && (
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
            <FaBuilding className="text-gray-400" size={12}/>
            <select value={dept} onChange={e => setDept(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-none">
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <FaSearch className="text-gray-400" size={12}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="text-sm text-gray-700 bg-transparent focus:outline-none flex-1"/>
        </div>

        <button onClick={() => tab==="daily"?loadDaily():loadSummary()}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
          <FaSyncAlt size={12} className="text-gray-500"/>
        </button>

        {tab === "daily" && (
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
            <FaDownload size={11}/> CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"/>
        </div>
      ) : tab === "daily" ? (
        /* ════════════════ DAILY VIEW ════════════════ */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: 1300 }}>
              <thead>
                {/* RATE ROW */}
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left text-gray-500 font-semibold sticky left-0 bg-gray-50 z-10 whitespace-nowrap">Employee</th>
                  {GROUPS.map(g => g.cols.map(c => (
                    <th key={c.key} className="border border-gray-200 px-2 py-1.5 text-center text-gray-400 font-bold bg-gray-50" style={{minWidth:54}}>
                      {c.rate}
                    </th>
                  )))}
                  <th className="border border-gray-200 px-3 py-1.5 text-center font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">REG HRS</th>
                  <th className="border border-gray-200 px-3 py-1.5 text-center font-bold text-amber-700 bg-amber-50 whitespace-nowrap">OT HRS</th>
                  <th className="border border-gray-200 px-3 py-1.5 text-center font-bold text-green-700 bg-green-50 whitespace-nowrap">OT PAY</th>
                </tr>
                {/* GROUP ROW */}
                <tr>
                  <th className="border border-gray-300 bg-gray-100 sticky left-0 z-10"/>
                  {GROUPS.map(g => (
                    <th key={g.label} colSpan={g.cols.length}
                      className={`border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 ${g.bg}`}>
                      {g.label}
                    </th>
                  ))}
                  <th className="border border-gray-300 bg-indigo-50"/>
                  <th className="border border-gray-300 bg-amber-50"/>
                  <th className="border border-gray-300 bg-green-50"/>
                </tr>
                {/* COL LABELS */}
                <tr>
                  <th className="border border-gray-200 px-4 py-1.5 text-left text-gray-500 sticky left-0 bg-white z-10">Name / Dept</th>
                  {GROUPS.map(g => g.cols.map(c => (
                    <th key={c.key} className={`border border-gray-200 px-2 py-1.5 text-center text-gray-600 font-semibold ${g.bg}`}>
                      {c.label}
                    </th>
                  )))}
                  <th className="border border-gray-200 bg-indigo-50"/>
                  <th className="border border-gray-200 bg-amber-50"/>
                  <th className="border border-gray-200 bg-green-50"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={ALL_COLS.length + 4} className="py-16 text-center text-gray-400">No employees found</td></tr>
                ) : filtered.map(u => {
                  const otPay = (u.overtimeHours||0) * (u.overtimeRatePerHour||0);
                  return (
                    <tr key={u.userId} className={`hover:bg-indigo-50/30 transition-colors ${!u.submitted ? "opacity-55" : ""}`}>
                      {/* NAME */}
                      <td className="border border-gray-100 px-4 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          {u.submitted
                            ? <FaCheckCircle className="text-green-500 flex-shrink-0" size={12}/>
                            : <FaTimesCircle className="text-gray-300 flex-shrink-0" size={12}/>
                          }
                          <div>
                            <div className="font-semibold text-gray-800 whitespace-nowrap">{u.name}</div>
                            <div className="text-[10px] text-gray-400">{u.department || "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* COUNTS */}
                      {ALL_COLS.map(c => {
                        const count = u.counts?.[c.key] || 0;
                        return (
                          <td key={c.key} className="border border-gray-100 px-2 py-2 text-center">
                            {count > 0
                              ? <span className="font-bold text-gray-800">{count}</span>
                              : <span className="text-gray-200">—</span>
                            }
                          </td>
                        );
                      })}

                      {/* REG TOTAL */}
                      <td className="border border-gray-100 px-3 py-2 text-center bg-indigo-50/30">
                        {u.submitted
                          ? <span className="inline-flex items-center gap-1 font-black text-indigo-700 text-sm whitespace-nowrap">
                              <FaClock size={10} className="text-indigo-400"/>
                              {(u.totalHours||0).toFixed(2)}
                            </span>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>

                      {/* OT HOURS */}
                      <td className="border border-gray-100 px-3 py-2 text-center bg-amber-50/30">
                        {(u.overtimeHours||0) > 0
                          ? <span className="inline-flex items-center gap-1 font-bold text-amber-700 text-sm whitespace-nowrap">
                              <FaRegClock size={10} className="text-amber-400"/>
                              {(u.overtimeHours||0).toFixed(2)}
                            </span>
                          : <span className="text-gray-200">—</span>
                        }
                      </td>

                      {/* OT PAY */}
                      <td className="border border-gray-100 px-3 py-2 text-center bg-green-50/30">
                        {(u.overtimeRatePerHour||0) > 0 && (u.overtimeHours||0) > 0
                          ? <span className="inline-flex items-center gap-0.5 font-semibold text-green-700 text-xs whitespace-nowrap">
                              <FaRupeeSign size={9}/>
                              {otPay.toFixed(2)}
                            </span>
                          : (u.overtimeRatePerHour||0) === 0
                            ? <span className="text-gray-300 text-[10px]">No rate</span>
                            : <span className="text-gray-200">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}

                {/* TEAM TOTAL ROW */}
                {filtered.some(u=>u.submitted) && (
                  <tr className="bg-indigo-50 font-bold">
                    <td className="border border-indigo-200 px-4 py-2 text-indigo-700 sticky left-0 bg-indigo-50 z-10 text-xs">TEAM TOTAL</td>
                    {ALL_COLS.map(c => {
                      const tot = filtered.reduce((s,u) => s+(Number(u.counts?.[c.key])||0), 0);
                      return (
                        <td key={c.key} className="border border-indigo-200 px-2 py-2 text-center text-indigo-700">
                          {tot > 0 ? tot : <span className="text-indigo-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="border border-indigo-200 px-3 py-2 text-center text-indigo-800 font-black text-sm whitespace-nowrap">
                      <FaClock size={10} className="inline mr-1 text-indigo-500"/>
                      {totalHrs.toFixed(2)}
                    </td>
                    <td className="border border-amber-200 px-3 py-2 text-center text-amber-800 font-black text-sm whitespace-nowrap bg-amber-50">
                      <FaRegClock size={10} className="inline mr-1 text-amber-500"/>
                      {totalOtHrs.toFixed(2)}
                    </td>
                    <td className="border border-green-200 px-3 py-2 text-center bg-green-50 text-green-800 font-black text-xs whitespace-nowrap">
                      {fmtINR(filtered.reduce((s,u) => s + (u.overtimeHours||0)*(u.overtimeRatePerHour||0), 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ════════════════ MONTHLY SUMMARY ════════════════ */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {summary.length === 0 ? (
            <div className="py-20 text-center">
              <FaChartBar className="text-gray-200 mx-auto mb-3" size={32}/>
              <p className="text-gray-400 text-sm">No data for {MONTH_NAMES[month-1]} {year}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                    <th className="px-5 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Dept</th>
                    <th className="px-4 py-3 font-semibold text-center">Days</th>
                    <th className="px-4 py-3 font-semibold text-center">Reg Hours</th>
                    <th className="px-4 py-3 font-semibold text-center">Avg/Day</th>
                    <th className="px-4 py-3 font-semibold text-center">Best Day</th>
                    <th className="px-4 py-3 font-semibold text-center text-amber-600">OT Hours</th>
                    <th className="px-4 py-3 font-semibold text-center text-amber-600">Rate/Hr</th>
                    <th className="px-4 py-3 font-semibold text-center text-green-600">OT Pay</th>
                    <th className="px-4 py-3 font-semibold">Days Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summary.map(u => {
                    const best = u.targets.length ? Math.max(...u.targets.map(t=>t.totalHours)) : 0;
                    const avg  = u.targets.length ? (Number(u.totalHours)/u.targets.length).toFixed(2) : "0";
                    return (
                      <tr key={u.userId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-gray-800">{u.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.department||"—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg text-xs">
                            {u.targets.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 font-black text-indigo-700">
                            <FaClock size={10} className="text-indigo-400"/>
                            {Number(u.totalHours).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 font-semibold">{avg}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${best>=8?"bg-green-100 text-green-700":best>=5?"bg-blue-100 text-blue-700":"bg-gray-100 text-gray-500"}`}>
                            {best.toFixed(2)}h
                          </span>
                        </td>
                        {/* OT HOURS */}
                        <td className="px-4 py-3 text-center">
                          {Number(u.overtimeHours) > 0
                            ? <span className="inline-flex items-center gap-1 font-bold text-amber-700 text-sm">
                                <FaRegClock size={10} className="text-amber-400"/>
                                {Number(u.overtimeHours).toFixed(2)}
                              </span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        {/* RATE */}
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {(u.overtimeRatePerHour||0) > 0
                            ? <span className="flex items-center justify-center gap-0.5"><FaRupeeSign size={9}/>{Number(u.overtimeRatePerHour).toFixed(2)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        {/* OT PAY */}
                        <td className="px-4 py-3 text-center">
                          {Number(u.overtimePay) > 0
                            ? <span className="font-black text-green-700 text-sm">{fmtINR(u.overtimePay)}</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap max-w-xs">
                            {u.targets.slice(-15).map(t => (
                              <div key={t.date}
                                title={`${t.date}: ${t.totalHours}h reg${t.overtimeHours>0?` + ${t.overtimeHours}h OT`:""}`}
                                className={`w-6 h-6 rounded text-[8px] font-bold flex items-center justify-center text-white ${
                                  t.overtimeHours>0?"ring-2 ring-amber-400":""
                                } ${
                                  t.totalHours>=8?"bg-green-500":t.totalHours>=5?"bg-blue-500":t.totalHours>0?"bg-amber-400":"bg-gray-200"
                                }`}>
                                {new Date(t.date+"T00:00:00").getDate()}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* TEAM TOTAL */}
                  <tr className="bg-indigo-50 font-bold border-t-2 border-indigo-200">
                    <td className="px-5 py-3 text-indigo-800">TEAM TOTAL</td>
                    <td className="px-4 py-3"/>
                    <td className="px-4 py-3 text-center text-indigo-700">
                      {summary.reduce((s,u)=>s+u.targets.length,0)}
                    </td>
                    <td className="px-4 py-3 text-center text-indigo-800 font-black">
                      <FaClock size={10} className="inline mr-1 text-indigo-500"/>
                      {summary.reduce((s,u)=>s+Number(u.totalHours),0).toFixed(2)}
                    </td>
                    <td colSpan={2} className="px-4 py-3"/>
                    <td className="px-4 py-3 text-center text-amber-800 font-black">
                      <FaRegClock size={10} className="inline mr-1 text-amber-500"/>
                      {summary.reduce((s,u)=>s+Number(u.overtimeHours||0),0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3"/>
                    <td className="px-4 py-3 text-center text-green-800 font-black text-sm">
                      {fmtINR(summary.reduce((s,u)=>s+Number(u.overtimePay||0),0))}
                    </td>
                    <td className="px-4 py-3"/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
