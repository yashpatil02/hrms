import { useEffect, useState } from "react";
import api from "../../api/axios";

const DAY_CFG = {
  FULL:            { label:"Full Day",     short:"F",  bg:"#22c55e22", border:"#22c55e", text:"#16a34a" },
  HALF:            { label:"Half Day",     short:"H",  bg:"#f59e0b22", border:"#f59e0b", text:"#d97706" },
  ABSENT:          { label:"Absent",       short:"A",  bg:"#ef444422", border:"#ef4444", text:"#dc2626" },
  WEEKOFF:         { label:"Week Off",     short:"WO", bg:"#94a3b822", border:"#94a3b8", text:"#64748b" },
  WEEKOFF_PRESENT: { label:"WO Present",   short:"WP", bg:"#0d948822", border:"#0d9488", text:"#0f766e" },
  PAID_LEAVE:      { label:"Paid Leave",   short:"PL", bg:"#3b82f622", border:"#3b82f6", text:"#2563eb" },
  PAID_HOLIDAY:    { label:"Paid Holiday", short:"PH", bg:"#7c3aed22", border:"#7c3aed", text:"#6d28d9" },
  PENDING_WEEKOFF: { label:"Pending WO",   short:"PW", bg:"#f9731622", border:"#f97316", text:"#ea580c" },
};

const MONTHS = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString("en",{month:"long"}));

/* ============================================================
   ATTENDANCE CALENDAR
   Props:
     attendance — optional array from parent (dashboard passes this)
                  if not given, component self-loads from API
============================================================ */
const AttendanceCalendar = ({ attendance }) => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth()+1);
  const [year,  setYear]  = useState(today.getFullYear());
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  /* load attendance — use prop if available & same month */
  useEffect(()=>{
    const isCurrentMonth = month===today.getMonth()+1 && year===today.getFullYear();

    if (attendance && isCurrentMonth) {
      /* use data passed from parent */
      const map = {};
      attendance.forEach(r => {
        const d = new Date(r.date).getDate();
        map[d] = { dayType: r.dayType, checkIn: r.checkIn, checkOut: r.checkOut, hours: r.hours };
      });
      setRecords(map);
    } else {
      /* self-load for other months */
      const fetch = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/employee/attendance?month=${month}&year=${year}`);
          const map = {};
          (res.data||[]).forEach(r => {
            const d = new Date(r.date).getDate();
            map[d] = { dayType:r.dayType, checkIn:r.checkIn, checkOut:r.checkOut, hours:r.hours };
          });
          setRecords(map);
        } catch {}
        finally { setLoading(false); }
      };
      fetch();
    }
  }, [month, year, attendance]);

  const firstDay  = new Date(year, month-1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const dayLabels = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const cells     = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=totalDays; d++) cells.push(d);

  const isToday = (d) =>
    today.getDate()===d && today.getMonth()+1===month && today.getFullYear()===year;

  /* summary for this month */
  const summary = Object.values(records).reduce((acc,r)=>{
    acc[r.dayType] = (acc[r.dayType]||0)+1;
    return acc;
  },{});

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          📅 Attendance Calendar
        </h2>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e=>setMonth(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            {[year-1,year,year+1].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* QUICK SUMMARY PILLS */}
      {Object.keys(records).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(summary).map(([type,count])=>{
            const c = DAY_CFG[type];
            if (!c) return null;
            return (
              <span key={type}
                style={{ background:c.bg, borderColor:c.border, color:c.text, borderWidth:"1px", borderStyle:"solid" }}
                className="text-[10px] px-2.5 py-1 rounded-full font-semibold">
                {c.short}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* CALENDAR GRID */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* DAY LABELS */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map(d=>(
              <div key={d} className="text-center text-[10px] text-gray-400 font-semibold py-0.5">{d}</div>
            ))}
          </div>

          {/* CELLS */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day,i)=>{
              if (!day) return <div key={i}/>;
              const rec   = records[day];
              const cfg   = rec ? DAY_CFG[rec.dayType] : null;
              const tod   = isToday(day);
              return (
                <div key={i}
                  style={{
                    background:  cfg ? cfg.bg : "#f8fafc",
                    borderColor: tod ? "#10b981" : cfg ? cfg.border : "transparent",
                    borderWidth: "1.5px",
                    borderStyle: "solid",
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-default transition-all hover:scale-105 relative
                    ${tod?"ring-2 ring-emerald-400 ring-offset-1 shadow-sm":""}
                  `}
                  onMouseEnter={()=>setTooltip({day, rec, cfg})}
                  onMouseLeave={()=>setTooltip(null)}
                >
                  <span style={{ color: tod?"#059669": cfg ? cfg.text : "#94a3b8" }}
                    className="text-[10px] font-bold leading-none">{day}</span>
                  {cfg && (
                    <span style={{ color: cfg.text }} className="text-[8px] font-semibold leading-none mt-0.5 opacity-80">
                      {cfg.short}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* LEGEND */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4">
            {Object.entries(DAY_CFG).slice(0,6).map(([k,v])=>(
              <div key={k} className="flex items-center gap-1">
                <div style={{ background:v.bg, borderColor:v.border, borderWidth:"1.5px", borderStyle:"solid" }}
                  className="w-3 h-3 rounded"/>
                <span className="text-[10px] text-gray-400">{v.short} – {v.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceCalendar;