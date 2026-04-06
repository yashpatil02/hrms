import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaGlobe, FaStar, FaGift } from "react-icons/fa";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const TYPE_STYLE = {
  PUBLIC:     { bg: "bg-red-500",   dot: "bg-red-500",   text: "text-red-700",   label: "Public",     icon: <FaGlobe size={10} /> },
  OPTIONAL:   { bg: "bg-blue-500",  dot: "bg-blue-500",  text: "text-blue-700",  label: "Optional",   icon: <FaStar  size={10} /> },
  RESTRICTED: { bg: "bg-amber-500", dot: "bg-amber-500", text: "text-amber-700", label: "Restricted", icon: <FaGift  size={10} /> },
};

export default function HolidayCalendar() {
  const now = new Date();
  const [year,  setYear]     = useState(now.getFullYear());
  const [month, setMonth]    = useState(now.getMonth());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/holidays?year=${year}`);
        setHolidays(data);
      } catch (err) {
        console.error("Load holidays error:", err);
      }
      setLoading(false);
    };
    load();
  }, [year]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);

  // Holiday map: "YYYY-MM-DD" -> holiday
  const holidayMap = {};
  holidays.forEach((h) => {
    const d = new Date(h.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    holidayMap[key] = h;
  });

  const getKey = (day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .slice(0, 5);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaCalendarAlt className="text-blue-600" /> Holiday Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">View all company holidays</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {/* Nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600">
                <FaChevronLeft size={13} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600">
                <FaChevronRight size={13} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const key = getKey(day);
                  const holiday = holidayMap[key];
                  const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                  const isSunday = new Date(year, month, day).getDay() === 0;

                  return (
                    <div
                      key={key}
                      title={holiday?.name}
                      className={`
                        relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition
                        ${holiday ? `${TYPE_STYLE[holiday.type]?.bg} text-white` : ""}
                        ${!holiday && isToday ? "bg-blue-600 text-white" : ""}
                        ${!holiday && !isToday && isSunday ? "text-red-400" : ""}
                        ${!holiday && !isToday && !isSunday ? "text-gray-700 hover:bg-gray-100" : ""}
                      `}
                    >
                      {day}
                      {holiday && <div className="text-[8px] leading-none opacity-80 mt-0.5 px-1 text-center truncate w-full">{holiday.name.split(" ")[0]}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 flex-wrap">
              {Object.entries(TYPE_STYLE).map(([type, s]) => (
                <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-3 h-3 rounded-full ${s.bg}`} />
                  {s.label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                Today
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* This Month */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">{MONTHS[month]} Holidays</h3>
              {monthHolidays.length === 0 ? (
                <p className="text-sm text-gray-400">No holidays this month</p>
              ) : (
                <div className="space-y-2">
                  {monthHolidays.map((h) => {
                    const d = new Date(h.date);
                    const s = TYPE_STYLE[h.type];
                    return (
                      <div key={h.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {d.getDate()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
                          <p className="text-xs text-gray-400">{d.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Upcoming Holidays</h3>
              {upcomingHolidays.length === 0 ? (
                <p className="text-sm text-gray-400">No upcoming holidays</p>
              ) : (
                <div className="space-y-3">
                  {upcomingHolidays.map((h) => {
                    const d = new Date(h.date);
                    const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
                    const s = TYPE_STYLE[h.type];
                    return (
                      <div key={h.id} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex flex-col items-center justify-center text-white flex-shrink-0`}>
                          <span className="text-[9px] font-bold leading-none">{MONTHS[d.getMonth()].slice(0,3).toUpperCase()}</span>
                          <span className="text-base font-black leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
                          <p className="text-xs text-gray-400">{diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `In ${diff} days`}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Year summary */}
            <div className="bg-blue-600 rounded-2xl p-5 text-white">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Year {year}</p>
              <p className="text-4xl font-black mt-1">{holidays.length}</p>
              <p className="text-blue-200 text-sm">Total Holidays</p>
              <div className="mt-3 space-y-1">
                {Object.entries(TYPE_STYLE).map(([type, s]) => (
                  <div key={type} className="flex justify-between text-xs">
                    <span className="text-blue-200">{s.label}</span>
                    <span className="font-bold">{holidays.filter((h) => h.type === type).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
