import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import { FaChevronLeft, FaChevronRight, FaMoon, FaSun, FaCloudSun, FaCloudMoon } from "react-icons/fa";

const SC = {
  MORNING:   { bg: "bg-amber-50",   text: "text-amber-800",  border: "border-amber-300",  badge: "bg-amber-500",   icon: "🌅", label: "Morning",   time: "06:00 – 14:00" },
  AFTERNOON: { bg: "bg-sky-50",     text: "text-sky-800",    border: "border-sky-300",    badge: "bg-sky-500",     icon: "☀️",  label: "Afternoon", time: "14:00 – 22:00" },
  GENERAL:   { bg: "bg-green-50",   text: "text-green-800",  border: "border-green-300",  badge: "bg-green-500",   icon: "🕙", label: "General",   time: "09:00 – 18:00" },
  EVENING:   { bg: "bg-purple-50",  text: "text-purple-800", border: "border-purple-300", badge: "bg-purple-500",  icon: "🌇", label: "Evening",   time: "14:00 – 23:00" },
  NIGHT:     { bg: "bg-indigo-50",  text: "text-indigo-800", border: "border-indigo-300", badge: "bg-indigo-500",  icon: "🌙", label: "Night",     time: "22:00 – 06:00" },
};

const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const THIS_YEAR    = new Date().getFullYear();
const THIS_MONTH   = new Date().getMonth() + 1;

export default function MySchedule() {
  const [year,      setYear]      = useState(THIS_YEAR);
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/roster/my-schedule", { params: { year } });
      setSchedules(data.schedules);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // Build lookup: month → schedule
  const scheduleMap = {};
  schedules.forEach(s => { scheduleMap[s.month] = s; });

  const currentEntry  = scheduleMap[THIS_MONTH];
  const assignedCount = schedules.length;

  return (
    <Layout>
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Shift Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your assigned shifts for the year</p>
        </div>

        {/* Current month highlight */}
        {year === THIS_YEAR && currentEntry && (
          <div className={`mb-6 rounded-2xl p-5 border-2 ${SC[currentEntry.shift].border} ${SC[currentEntry.shift].bg} flex items-center gap-4`}>
            <div className="text-4xl">{SC[currentEntry.shift].icon}</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">This Month — {MONTHS_FULL[THIS_MONTH - 1]}</div>
              <div className={`text-2xl font-bold ${SC[currentEntry.shift].text}`}>{SC[currentEntry.shift].label} Shift</div>
              <div className={`text-sm mt-0.5 ${SC[currentEntry.shift].text} opacity-70`}>{SC[currentEntry.shift].time}</div>
              {currentEntry.note && <div className="text-xs text-gray-500 italic mt-1">"{currentEntry.note}"</div>}
            </div>
          </div>
        )}
        {year === THIS_YEAR && !currentEntry && (
          <div className="mb-6 rounded-2xl p-5 border-2 border-dashed border-gray-200 bg-white flex items-center gap-4">
            <div className="text-3xl opacity-30">📅</div>
            <div>
              <div className="text-sm font-semibold text-gray-400">This Month — {MONTHS_FULL[THIS_MONTH - 1]}</div>
              <div className="text-gray-400 text-sm mt-0.5">No shift assigned yet. Contact your manager.</div>
            </div>
          </div>
        )}

        {/* Year nav */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <button onClick={() => setYear(y => y-1)} className="p-1 hover:bg-gray-100 rounded">
              <FaChevronLeft className="text-gray-500 text-xs" />
            </button>
            <span className="font-bold text-gray-700 text-sm min-w-[50px] text-center">{year}</span>
            <button onClick={() => setYear(y => y+1)} className="p-1 hover:bg-gray-100 rounded">
              <FaChevronRight className="text-gray-500 text-xs" />
            </button>
          </div>
          {assignedCount > 0 && (
            <span className="text-xs text-gray-500">{assignedCount} / 12 months scheduled</span>
          )}
        </div>

        {/* 12-month grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MONTHS_FULL.map((name, idx) => {
              const mNum    = idx + 1;
              const entry   = scheduleMap[mNum];
              const isCurr  = year === THIS_YEAR && mNum === THIS_MONTH;
              const isPast  = year < THIS_YEAR || (year === THIS_YEAR && mNum < THIS_MONTH);
              const isFutur = year > THIS_YEAR || (year === THIS_YEAR && mNum > THIS_MONTH);

              return (
                <div
                  key={mNum}
                  className={`relative rounded-xl p-4 border-2 transition-all ${
                    entry
                      ? `${SC[entry.shift].bg} ${SC[entry.shift].border} shadow-sm`
                      : isCurr
                      ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-200"
                      : isPast
                      ? "bg-gray-50 border-gray-100 opacity-60"
                      : "bg-white border-gray-100"
                  }`}
                >
                  {/* Month label */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wide ${entry ? SC[entry.shift].text : "text-gray-400"}`}>
                      {MONTHS_SHORT[idx]}
                    </span>
                    {isCurr && (
                      <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-semibold">NOW</span>
                    )}
                    {isPast && !isCurr && (
                      <span className="text-[9px] text-gray-300 font-medium">past</span>
                    )}
                  </div>

                  {entry ? (
                    <>
                      <div className="text-2xl mb-1">{SC[entry.shift].icon}</div>
                      <div className={`text-sm font-bold ${SC[entry.shift].text}`}>{SC[entry.shift].label}</div>
                      <div className={`text-xs mt-0.5 ${SC[entry.shift].text} opacity-60`}>{SC[entry.shift].time}</div>
                      {entry.note && (
                        <div className="text-[10px] text-gray-500 italic mt-1.5 truncate">"{entry.note}"</div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-300 mt-3">Not assigned</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary stats */}
        {schedules.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Year Summary — {year}</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(
                schedules.reduce((acc, s) => {
                  acc[s.shift] = (acc[s.shift] || 0) + 1;
                  return acc;
                }, {})
              ).map(([shift, count]) => (
                <div key={shift} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${SC[shift].bg} ${SC[shift].text}`}>
                  <span className="text-base">{SC[shift].icon}</span>
                  <div>
                    <div className="text-xs font-bold">{SC[shift].label}</div>
                    <div className="text-[10px] opacity-70">{count} month{count > 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
