import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  FaCheckCircle, FaTimesCircle, FaClock, FaLeaf,
  FaChartBar, FaCalendarAlt, FaMedal,
} from "react-icons/fa";

const MONTHS = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString("en",{month:"long"}));

/* ============================================================
   MONTHLY SUMMARY
   Props:
     summary — optional from parent (dashboard passes this)
               if not given, self-loads from API
============================================================ */
const MonthlySummary = ({ summary: propSummary }) => {
  const today = new Date();
  const [month, setMonth]     = useState(today.getMonth()+1);
  const [year,  setYear]      = useState(today.getFullYear());
  const [summary, setSummary] = useState(propSummary||null);
  const [loading, setLoading] = useState(false);

  /* if summary prop changes (parent update), use it */
  useEffect(()=>{
    if (propSummary) setSummary(propSummary);
  },[propSummary]);

  /* self-load when month/year changes (or no prop) */
  useEffect(()=>{
    const isCurrentMonth = month===today.getMonth()+1 && year===today.getFullYear();
    if (propSummary && isCurrentMonth) return; // already have data from parent

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/employee/attendance-summary?month=${month}&year=${year}`);
        /* map to our format */
        const d = res.data;
        setSummary({
          full:     d.present||0,
          half:     d.half||0,
          absent:   d.absent||0,
          totalHours: d.totalHours||0,
          attendanceRate: d.total>0 ? Math.round(((d.present||0)/d.total)*100) : 0,
          paidLeave: 0, weekoffPresent: 0, weekoff: 0,
        });
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
  },[month, year]);

  const rate = summary?.attendanceRate || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FaChartBar className="text-indigo-500"/> Monthly Summary
        </h2>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e=>setMonth(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            {[year-1,year,year+1].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"/>
        </div>
      ) : !summary ? (
        <p className="text-center text-gray-400 text-sm py-8">No data available</p>
      ) : (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label:"Full Days",    value:summary.full||0,        icon:<FaCheckCircle/>,  bg:"bg-green-50",  text:"text-green-700"  },
              { label:"Absent",       value:summary.absent||0,      icon:<FaTimesCircle/>,  bg:"bg-red-50",    text:"text-red-700"    },
              { label:"Half Day",     value:summary.half||0,        icon:<FaClock/>,        bg:"bg-amber-50",  text:"text-amber-700"  },
              { label:"Attendance",   value:`${rate}%`,             icon:<FaMedal/>,        bg:"bg-indigo-50", text:"text-indigo-700" },
            ].map(s=>(
              <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                <div className={`${s.text} mb-1 text-sm`}>{s.icon}</div>
                <div className={`text-xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* EXTRA STATS */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gray-700">{summary.totalHours||0}h</div>
              <div className="text-xs text-gray-400">Total Hours</div>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-teal-600">{summary.weekoffPresent||0}</div>
              <div className="text-xs text-gray-400">WO Present</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-600">{summary.paidLeave||0}</div>
              <div className="text-xs text-gray-400">Paid Leave</div>
            </div>
          </div>

          {/* ATTENDANCE RATE BAR */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Attendance Rate</span>
              <span className="font-bold">{rate}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${rate>=80?"bg-green-500":rate>=60?"bg-amber-400":"bg-red-400"}`}
                style={{ width:`${rate}%` }}/>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0%</span>
              <span className={rate>=80?"text-green-600":rate>=60?"text-amber-600":"text-red-500"}>
                {rate>=80?"Excellent":rate>=60?"Good":"Needs Improvement"}
              </span>
              <span>100%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlySummary;