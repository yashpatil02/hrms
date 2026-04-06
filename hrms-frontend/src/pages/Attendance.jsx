import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaUserCheck, FaClock, FaHistory, FaSignInAlt, FaSignOutAlt,
  FaCalendarCheck, FaCheckCircle, FaTimesCircle, FaLeaf,
  FaTimes, FaSyncAlt, FaFireAlt, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaEdit, FaLock,
  FaChartBar, FaCalendarAlt, FaMedal, FaBolt,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const WEEK_DAYS_ARR = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

const DAY_TYPES = [
  { value:"FULL",         label:"Present",      emoji:"✅", hint:"Full working day" },
  { value:"HALF",         label:"Half Day",     emoji:"🌗", hint:"Half day present" },
  { value:"ABSENT",       label:"Absent",       emoji:"❌", hint:"Not present today" },
  { value:"PAID_LEAVE",   label:"Paid Leave",   emoji:"🌿", hint:"Approved paid leave" },
  { value:"PAID_HOLIDAY", label:"Paid Holiday", emoji:"🎉", hint:"Company holiday" },
];

const DAY_CFG = {
  FULL:            { label:"Present",      short:"P",  bg:"bg-green-100",   text:"text-green-700",   ring:"ring-green-400",  dot:"#22c55e" },
  HALF:            { label:"Half Day",     short:"H",  bg:"bg-amber-100",   text:"text-amber-700",   ring:"ring-amber-400",  dot:"#f59e0b" },
  ABSENT:          { label:"Absent",       short:"A",  bg:"bg-red-100",     text:"text-red-700",     ring:"ring-red-400",    dot:"#ef4444" },
  WEEKOFF:         { label:"Week Off",     short:"WO", bg:"bg-gray-100",    text:"text-gray-500",    ring:"ring-gray-300",   dot:"#94a3b8" },
  WEEKOFF_PRESENT: { label:"WO + Present", short:"WP", bg:"bg-teal-100",    text:"text-teal-700",    ring:"ring-teal-400",   dot:"#0d9488" },
  PAID_LEAVE:      { label:"Paid Leave",   short:"PL", bg:"bg-blue-100",    text:"text-blue-700",    ring:"ring-blue-400",   dot:"#3b82f6" },
  PAID_HOLIDAY:    { label:"Paid Holiday", short:"PH", bg:"bg-purple-100",  text:"text-purple-700",  ring:"ring-purple-400", dot:"#7c3aed" },
  PENDING_WEEKOFF: { label:"Pending WO",   short:"PW", bg:"bg-orange-100",  text:"text-orange-700",  ring:"ring-orange-400", dot:"#f97316" },
};

/* ============================================================
   HELPERS
============================================================ */
const getISTDateStr = () => {
  const now   = new Date();
  const istMs = now.getTime() + (5*60+30)*60*1000;
  return new Date(istMs).toISOString().split("T")[0];
};

const getISTTimeStr = () => {
  const now   = new Date();
  const istMs = now.getTime() + (5*60+30)*60*1000;
  const d     = new Date(istMs);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
};

const getWeekDay = (dateStr) => {
  const [y,m,d] = dateStr.split("-").map(Number);
  return ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][new Date(Date.UTC(y,m-1,d)).getUTCDay()];
};

const calcHoursDisplay = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [ih,im] = checkIn.split(":").map(Number);
  const [oh,om] = checkOut.split(":").map(Number);
  const diff = (oh*60+om)-(ih*60+im);
  if (diff<=0) return null;
  const h = Math.floor(diff/60);
  const m = diff%60;
  return `${h}h ${m}m`;
};

const calcHoursNum = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [ih,im] = checkIn.split(":").map(Number);
  const [oh,om] = checkOut.split(":").map(Number);
  const diff = (oh*60+om)-(ih*60+im);
  return diff>0 ? parseFloat((diff/60).toFixed(2)) : null;
};

const fmtFullDate = (iso) =>
  // ✅ T12:00:00 (noon) avoids timezone day-shift in any timezone
  new Date(iso+"T12:00:00").toLocaleDateString("en-IN",{
    weekday:"long", day:"numeric", month:"long", year:"numeric",
  });

const fmtShortDate = (iso) =>
  // ✅ T12:00:00 (noon) avoids timezone day-shift in any timezone
  new Date(iso+"T12:00:00").toLocaleDateString("en-IN",{
    day:"numeric", month:"short",
  });

/* ============================================================
   LIVE IST CLOCK
============================================================ */
const LiveClock = () => {
  const [time, setTime] = useState(getISTTimeStr());
  const [secs, setSecs] = useState(new Date().getSeconds());

  useEffect(()=>{
    const t = setInterval(()=>{
      setTime(getISTTimeStr());
      setSecs(new Date().getSeconds());
    }, 1000);
    return ()=>clearInterval(t);
  },[]);

  const now    = new Date();
  const istMs  = now.getTime()+(5*60+30)*60*1000;
  const istDate = new Date(istMs);
  const dateStr = istDate.toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-white tracking-widest tabular-nums">
        {time}<span className="text-white/60 text-2xl">:{String(secs).padStart(2,"0")}</span>
      </div>
      <p className="text-white/70 text-sm mt-1">{dateStr} · IST</p>
    </div>
  );
};

/* ============================================================
   TOAST
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const styles = {
    success: "bg-green-600",
    error:   "bg-red-600",
    info:    "bg-blue-600",
  };
  const icons = {
    success: <FaCheckCircle size={14}/>,
    error:   <FaExclamationTriangle size={14}/>,
    info:    <FaClock size={14}/>,
  };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white transition-all ${styles[toast.type]||styles.info}`}>
      {icons[toast.type]||icons.info} {toast.msg}
    </div>
  );
};

/* ============================================================
   HEATMAP CALENDAR
============================================================ */
const HeatmapCalendar = ({ records=[], month, year, onDayClick }) => {
  const firstDay  = new Date(year,month-1,1).getDay();
  const totalDays = new Date(year,month,0).getDate();
  const dayLabels = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const cells     = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=totalDays;d++) cells.push(d);

  const recMap = {};
  records.forEach(r=>{
    // ✅ FIX: directly parse day from "YYYY-MM-DD" string
    // new Date() with local timezone shifts date -1 day in IST
    const day = parseInt(r.date.split("-")[2], 10);
    recMap[day] = r;
  });

  const now = new Date();
  const isToday = (d) => now.getDate()===d && now.getMonth()+1===month && now.getFullYear()===year;
  const isFuture = (d) => {
    const cellDate = new Date(year,month-1,d);
    const today    = new Date(); today.setHours(0,0,0,0);
    return cellDate > today;
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {dayLabels.map(d=>(
          <div key={d} className="text-center text-[10px] text-gray-400 font-semibold py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const rec  = recMap[day];
          const cfg  = rec ? DAY_CFG[rec.dayType] : null;
          const tod  = isToday(day);
          const fut  = isFuture(day);
          return (
            <button key={i}
              onClick={()=>{
                if(fut) return;
                const m2=String(month).padStart(2,"0");
                const d2=String(day).padStart(2,"0");
                onDayClick(`${year}-${m2}-${d2}`);
              }}
              disabled={fut}
              title={cfg?`${rec.date}: ${cfg.label}${rec.checkIn?` | In: ${rec.checkIn}`:""}${rec.checkOut?` Out: ${rec.checkOut}`:""}`:tod?"Today — click to mark":""}
              style={{
                background:  fut?"#f8fafc": cfg ? cfg.dot+"22" : "#f1f5f9",
                borderColor: tod ? "#3b82f6" : cfg ? cfg.dot : "transparent",
                borderWidth: "1.5px", borderStyle:"solid",
              }}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                ${!fut?"hover:scale-110 hover:shadow-md cursor-pointer":"cursor-not-allowed opacity-30"}
                ${tod?"ring-2 ring-blue-400 ring-offset-1 shadow-sm":""}
              `}>
              <span style={{ color: tod?"#2563eb": cfg?cfg.dot:fut?"#cbd5e1":"#94a3b8" }}
                className="text-[10px] font-bold leading-none">{day}</span>
              {cfg && <span style={{ color:cfg.dot }} className="text-[8px] font-semibold leading-none mt-0.5">{cfg.short}</span>}
              {rec?.checkIn && !rec.checkOut && (
                <div className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"/>
              )}
            </button>
          );
        })}
      </div>
      {/* LEGEND */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4">
        {Object.entries(DAY_CFG).map(([k,v])=>(
          <div key={k} className="flex items-center gap-1">
            <div style={{ background:v.dot+"33", borderColor:v.dot, borderWidth:"1.5px", borderStyle:"solid" }} className="w-2.5 h-2.5 rounded"/>
            <span className="text-[10px] text-gray-400">{v.short}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   MAIN
============================================================ */
const Attendance = () => {
  const todayStr = getISTDateStr();

  /* state */
  const [todayData, setTodayData] = useState(null);
  const [weeklyOff, setWeeklyOff] = useState("");
  const [tempWO, setTempWO]       = useState("");
  const [editingWO, setEditingWO] = useState(false);
  const [weekoffBalance, setWeekoffBalance] = useState(0);
  const [stats, setStats]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(null); // "in" | "out" | null
  const [toast, setToast]         = useState(null);

  /* manual form */
  const [manualDate, setManualDate]     = useState(todayStr);
  const [manualIn, setManualIn]         = useState("");
  const [manualOut, setManualOut]       = useState("");
  const [manualType, setManualType]     = useState("FULL");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  /* filters */
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [typeFilter, setTypeFilter]   = useState("ALL");

  /* calendar */
  const [calMonth, setCalMonth] = useState(new Date().getMonth()+1);
  const [calYear,  setCalYear]  = useState(new Date().getFullYear());
  const [tab, setTab]           = useState("today"); // today | history | calendar | manual

  /* ============================================================
     LOAD
  ============================================================ */
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(()=>setToast(null), 3500);
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const res = await api.get("/attendance/today");
      setTodayData(res.data);
      setWeeklyOff(res.data.weeklyOff||"");
      setTempWO(res.data.weeklyOff||"");
      setWeekoffBalance(res.data.weekoffBalance||0);
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/attendance/stats");
      setStats(res.data);
    } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = new URLSearchParams();
      if(fromDate)           params.append("fromDate", fromDate);
      if(toDate)             params.append("toDate",   toDate);
      if(monthFilter)        params.append("month",    monthFilter);
      if(typeFilter!=="ALL") params.append("dayType",  typeFilter);
      const res = await api.get(`/attendance/history?${params}`);
      setHistory(Array.isArray(res.data)?res.data:[]);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  }, [fromDate, toDate, monthFilter, typeFilter]);

  useEffect(()=>{ loadToday(); loadStats(); },[]);
  useEffect(()=>{ loadHistory(); },[loadHistory]);

  /* prefill manual form when date changes */
  useEffect(()=>{
    const rec = history.find(h=>h.date===manualDate);
    if(rec){
      setManualEditMode(true);
      setManualIn(rec.checkIn||"");
      setManualOut(rec.checkOut||"");
      const baseType = ["WEEKOFF","WEEKOFF_PRESENT"].includes(rec.dayType)?"FULL":rec.dayType;
      setManualType(baseType);
    } else {
      setManualEditMode(false);
      setManualIn(""); setManualOut(""); setManualType("FULL");
    }
  },[manualDate, history]);

  /* ============================================================
     CLOCK IN
  ============================================================ */
  const handleClockIn = async () => {
    try {
      setClockLoading("in");
      const res = await api.post("/attendance/clock-in");
      showToast("success", res.data.msg);
      await Promise.all([loadToday(), loadHistory(), loadStats()]);
    } catch(err){
      showToast("error", err.response?.data?.msg||"Clock-in failed");
    } finally { setClockLoading(null); }
  };

  /* ============================================================
     CLOCK OUT
  ============================================================ */
  const handleClockOut = async () => {
    try {
      setClockLoading("out");
      const res = await api.post("/attendance/clock-out");
      showToast("success", `${res.data.msg}${res.data.hours?` · ${res.data.hours}h worked`:""}`);
      await Promise.all([loadToday(), loadHistory(), loadStats()]);
    } catch(err){
      showToast("error", err.response?.data?.msg||"Clock-out failed");
    } finally { setClockLoading(null); }
  };

  /* ============================================================
     MANUAL SAVE
  ============================================================ */
  const submitManual = async () => {
    try {
      setManualLoading(true);
      const res = await api.post("/attendance/manual", {
        date:     manualDate,
        checkIn:  manualIn  || undefined,
        checkOut: manualOut || undefined,
        dayType:  manualType,
      });
      if(res.data.weekoffBalanceChange){
        setWeekoffBalance(p=>p+res.data.weekoffBalanceChange);
      }
      showToast("success", manualEditMode?"Attendance updated!":"Attendance marked!");
      setShowManualForm(false);
      await Promise.all([loadToday(), loadHistory(), loadStats()]);
    } catch(err){
      showToast("error", err.response?.data?.msg||"Save failed");
    } finally { setManualLoading(false); }
  };

  /* ============================================================
     WEEKLY OFF SAVE
  ============================================================ */
  const saveWeeklyOff = async () => {
    if(!tempWO) return;
    await api.post("/users/update-weekly-off", { weeklyOff: tempWO });
    setWeeklyOff(tempWO);
    setEditingWO(false);
    showToast("success", "Weekly off updated!");
    loadToday();
  };

  /* ============================================================
     COMPUTED
  ============================================================ */
  const att          = todayData?.attendance;
  const isClockedIn  = att?.isClockedIn;
  const isClockedOut = att?.isClockedOut;
  const isWO         = todayData?.isWeeklyOff;
  const s            = stats?.monthSummary;

  /* calendar records for current month */
  const calRecords = useMemo(()=>
    history.filter(h=>{
      // ✅ FIX: parse YYYY-MM-DD directly — avoids timezone shift
      const [y, m] = h.date.split("-").map(Number);
      return m===calMonth && y===calYear;
    })
  ,[history, calMonth, calYear]);

  /* month summary pills */
  const calSummary = useMemo(()=>{
    const m={};
    calRecords.forEach(r=>{ m[r.dayType]=(m[r.dayType]||0)+1; });
    return m;
  },[calRecords]);

  /* hours preview in manual form */
  const hoursPreview = useMemo(()=>
    manualIn && manualOut ? calcHoursDisplay(manualIn, manualOut) : null
  ,[manualIn, manualOut]);

  const hasFilters = fromDate||toDate||monthFilter||typeFilter!=="ALL";
  const clearFilters = () => { setFromDate(""); setToDate(""); setMonthFilter(""); setTypeFilter("ALL"); };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Layout>
      <Toast toast={toast}/>

      {/* ============================
          HERO — LIVE CLOCK + CLOCK IN/OUT
      ============================ */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 mb-6 shadow-xl relative overflow-hidden">
        {/* BG DECOR */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"/>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white rounded-full"/>
        </div>

        <div className="relative z-10">
          {/* LIVE CLOCK */}
          <div className="text-center mb-6">
            <LiveClock/>
          </div>

          {/* TODAY STATUS */}
          {att && (
            <div className="flex justify-center mb-5">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${DAY_CFG[att.dayType]?.bg} ${DAY_CFG[att.dayType]?.text}`}>
                {DAY_CFG[att.dayType]?.label}
                {att.checkIn && <span className="font-normal">· In: {att.checkIn} IST</span>}
                {att.checkOut && <span className="font-normal">· Out: {att.checkOut} IST</span>}
                {att.hours && <span className="font-normal">· {att.hours}h</span>}
              </div>
            </div>
          )}

          {isWO && !att && (
            <div className="flex justify-center mb-5">
              <div className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold">
                😴 Weekly Off — {weeklyOff}
              </div>
            </div>
          )}

          {/* CLOCK IN / OUT BUTTONS */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* CLOCK IN */}
            <button
              onClick={handleClockIn}
              disabled={!!isClockedIn || !!isClockedOut || clockLoading==="in"}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all shadow-lg ${
                isClockedIn || isClockedOut
                  ? "bg-white/20 text-white/50 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-400 text-white hover:scale-105 active:scale-95"
              }`}>
              {clockLoading==="in"
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Clocking In...</>
                : <><FaSignInAlt size={18}/> Clock In {isClockedIn && <FaCheckCircle size={14}/>}</>
              }
            </button>

            {/* DIVIDER */}
            <div className="text-white/30 text-2xl font-thin hidden sm:block">|</div>

            {/* CLOCK OUT */}
            <button
              onClick={handleClockOut}
              disabled={!isClockedIn || !!isClockedOut || clockLoading==="out"}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all shadow-lg ${
                !isClockedIn || isClockedOut
                  ? "bg-white/20 text-white/50 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-400 text-white hover:scale-105 active:scale-95"
              }`}>
              {clockLoading==="out"
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Clocking Out...</>
                : <><FaSignOutAlt size={18}/> Clock Out {isClockedOut && <FaCheckCircle size={14}/>}</>
              }
            </button>
          </div>

          {/* STATUS ROW */}
          <div className="flex items-center justify-center gap-6 mt-5 text-xs text-white/70 flex-wrap">
            {att?.checkIn && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400"/>
                <span>Clocked in at <strong className="text-white">{att.checkIn} IST</strong></span>
              </div>
            )}
            {att?.checkOut && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400"/>
                <span>Clocked out at <strong className="text-white">{att.checkOut} IST</strong></span>
              </div>
            )}
            {att?.hours && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400"/>
                <span>Total <strong className="text-white">{att.hours}h</strong> worked</span>
              </div>
            )}
            {!att && !isWO && (
              <span className="text-amber-300 font-medium">⏳ Not clocked in yet</span>
            )}
          </div>

          {/* MANUAL ENTRY TOGGLE */}
          <div className="flex justify-center mt-4">
            <button onClick={()=>setShowManualForm(!showManualForm)}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 underline underline-offset-2 transition-colors">
              <FaEdit size={10}/> Manual Entry / Past Date
            </button>
          </div>
        </div>
      </div>

      {/* ============================
          MANUAL FORM (collapsible)
      ============================ */}
      {showManualForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <FaEdit className="text-amber-500"/> Manual Attendance Entry
              {manualEditMode && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">Editing</span>
              )}
            </h3>
            <button onClick={()=>setShowManualForm(false)}
              className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
              <FaTimes size={12}/>
            </button>
          </div>

          {/* WEEKOFF BANNER */}
          {manualDate && getWeekDay(manualDate)===weeklyOff && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
              <p className="font-semibold text-blue-700">📅 Weekly Off Day</p>
              <p className="text-blue-600 text-xs mt-0.5">
                Selecting <b>Present</b> will mark as <b>WO + Present</b> and add +1 to weekoff balance.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* DATE */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
              <input type="date" value={manualDate}
                onChange={e=>setManualDate(e.target.value)}
                max={todayStr}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>

            {/* CHECK IN */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <FaSignInAlt className="inline mr-1 text-green-500" size={10}/>Check In (IST)
              </label>
              <input type="time" value={manualIn}
                onChange={e=>setManualIn(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
            </div>

            {/* CHECK OUT */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <FaSignOutAlt className="inline mr-1 text-red-500" size={10}/>Check Out (IST)
              </label>
              <input type="time" value={manualOut}
                onChange={e=>setManualOut(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"/>
            </div>

            {/* HOURS PREVIEW */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hours</label>
              <div className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700 font-bold text-center">
                {hoursPreview || "—"}
              </div>
            </div>
          </div>

          {/* STATUS SELECTOR */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {DAY_TYPES.map(t=>(
                <button key={t.value} onClick={()=>setManualType(t.value)}
                  title={t.hint}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    manualType===t.value
                      ? `${DAY_CFG[t.value]?.bg} ${DAY_CFG[t.value]?.text} border-current`
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  }`}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={submitManual} disabled={manualLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
              {manualLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</>
                : <><FaCalendarCheck size={12}/>{manualEditMode?"Update":"Save Attendance"}</>
              }
            </button>
            <button onClick={()=>setShowManualForm(false)}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================
          STATS CARDS
      ============================ */}
      {s && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label:"Full Days",  value:s.full,        bg:"bg-green-50",  text:"text-green-700",  icon:<FaCheckCircle size={14}/> },
            { label:"Half Days",  value:s.half,        bg:"bg-amber-50",  text:"text-amber-700",  icon:<FaClock size={14}/>       },
            { label:"Absent",     value:s.absent,      bg:"bg-red-50",    text:"text-red-700",    icon:<FaTimesCircle size={14}/> },
            { label:"Paid Leave", value:s.paidLeave,   bg:"bg-blue-50",   text:"text-blue-700",   icon:<FaLeaf size={14}/>        },
            { label:"WO Present", value:s.weekoffPresent, bg:"bg-teal-50",text:"text-teal-700",   icon:<FaCalendarCheck size={14}/> },
            { label:"Total Hrs",  value:`${s.totalHours}h`, bg:"bg-indigo-50", text:"text-indigo-700", icon:<FaChartBar size={14}/> },
            { label:"WO Balance", value:weekoffBalance, bg:"bg-orange-50",text:"text-orange-700", icon:<FaCalendarAlt size={14}/> },
          ].map(card=>(
            <div key={card.label} className={`${card.bg} rounded-2xl p-3 text-center`}>
              <div className={`${card.text} mb-1 flex justify-center`}>{card.icon}</div>
              <div className={`text-lg font-bold ${card.text}`}>{card.value??0}</div>
              <div className="text-[10px] text-gray-400 font-medium mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* STREAK + RATE */}
      {s && (stats?.streak > 0 || s.attendanceRate > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {stats?.streak > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl">🔥</div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.streak} day streak</p>
                <p className="text-xs text-amber-600">Consecutive attendance maintained</p>
              </div>
            </div>
          )}
          <div className={`border rounded-2xl p-4 flex items-center gap-4 ${
            s.attendanceRate>=80?"bg-green-50 border-green-200":s.attendanceRate>=60?"bg-amber-50 border-amber-200":"bg-red-50 border-red-200"
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
              s.attendanceRate>=80?"bg-green-100":s.attendanceRate>=60?"bg-amber-100":"bg-red-100"
            }`}>
              {s.attendanceRate>=80?"🏆":s.attendanceRate>=60?"👍":"⚠️"}
            </div>
            <div className="flex-1">
              <p className={`text-2xl font-bold ${s.attendanceRate>=80?"text-green-700":s.attendanceRate>=60?"text-amber-700":"text-red-700"}`}>
                {s.attendanceRate}%
              </p>
              <p className="text-xs text-gray-500">This month's attendance rate</p>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                <div className={`h-full rounded-full ${s.attendanceRate>=80?"bg-green-500":s.attendanceRate>=60?"bg-amber-400":"bg-red-500"}`}
                  style={{ width:`${s.attendanceRate}%` }}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================
          WEEKLY OFF
      ============================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            <FaCalendarCheck className="text-blue-500"/> Weekly Off Day
          </h2>
          {weeklyOff && !editingWO && (
            <button onClick={()=>setEditingWO(true)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <FaEdit size={9}/> Change
            </button>
          )}
        </div>

        {!editingWO && weeklyOff ? (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">
              {weeklyOff.slice(0,2)}
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800">{weeklyOff}</p>
              <p className="text-xs text-blue-400">Your weekly rest day · Balance: {weekoffBalance} day{weekoffBalance!==1?"s":""}</p>
            </div>
          </div>
        ) : !editingWO ? (
          <button onClick={()=>setEditingWO(true)}
            className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium">
            <FaCalendarCheck size={12}/> Set Weekly Off Day
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Select your weekly off day:</p>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS_ARR.map(day=>(
                <button key={day} onClick={()=>setTempWO(day)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    tempWO===day
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                  }`}>
                  {day.slice(0,3)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={saveWeeklyOff}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <FaCheckCircle size={11}/> Save
              </button>
              <button onClick={()=>{ setTempWO(weeklyOff); setEditingWO(false); }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================
          TABS
      ============================ */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-5 w-fit">
        {[
          { id:"history",  label:"History",      icon:<FaHistory size={10}/>      },
          { id:"calendar", label:"Calendar",     icon:<FaCalendarAlt size={10}/>  },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab===t.id?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ============================
          TAB: HISTORY
      ============================ */}
      {tab==="history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {/* FILTERS */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            <span className="text-gray-300 text-xs">–</span>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            <input type="month" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
              <option value="ALL">All Types</option>
              {Object.entries(DAY_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl">
                <FaTimes size={10}/> Clear
              </button>
            )}
          </div>

          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[560px]">
            <div className="col-span-3">Date</div>
            <div className="col-span-2 text-center hidden sm:block">In (IST)</div>
            <div className="col-span-2 text-center hidden sm:block">Out (IST)</div>
            <div className="col-span-2 text-center hidden md:block">Hours</div>
            <div className="col-span-5 md:col-span-3">Status</div>
          </div>

          {histLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            </div>
          ) : history.length===0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <FaHistory className="text-gray-200" size={32}/>
              <p className="text-gray-400 text-sm">{hasFilters?"No records match filters":"No attendance records yet"}</p>
              {hasFilters && <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Clear filters</button>}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map(h=>{
                const cfg = DAY_CFG[h.dayType];
                return (
                  <button key={h.id}
                    onClick={()=>{ setManualDate(h.date); setShowManualForm(true); window.scrollTo({top:0,behavior:"smooth"}); }}
                    className="w-full grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-gray-50/80 transition-colors text-left group">
                    <div className="col-span-3">
                      <p className="text-xs font-semibold text-gray-700">
                        {fmtShortDate(h.date)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(h.date+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long",year:"numeric"})}
                      </p>
                    </div>
                    <div className="col-span-2 hidden sm:flex items-center justify-center gap-1">
                      {h.checkIn
                        ? <span className="text-xs text-green-600 font-bold">{h.checkIn}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </div>
                    <div className="col-span-2 hidden sm:flex items-center justify-center">
                      {h.checkOut
                        ? <span className="text-xs text-red-500 font-bold">{h.checkOut}</span>
                        : h.checkIn
                          ? <span className="text-xs text-amber-500 font-semibold animate-pulse">Clocked In</span>
                          : <span className="text-xs text-gray-300">—</span>
                      }
                    </div>
                    <div className="col-span-2 hidden md:flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{h.hours?`${h.hours}h`:"—"}</span>
                    </div>
                    <div className="col-span-5 md:col-span-3 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.bg} ${cfg?.text}`}>
                        {cfg?.label||h.dayType}
                      </span>
                      <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        <FaEdit size={8}/> edit
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!histLoading && history.length>0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400">{history.length} record{history.length!==1?"s":""} {hasFilters?"(filtered)":""}</p>
              <p className="text-xs text-gray-400">Click any row to edit</p>
            </div>
          )}
        </div>
      )}

      {/* ============================
          TAB: CALENDAR
      ============================ */}
      {tab==="calendar" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={()=>{ if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
              className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaChevronLeft size={12}/>
            </button>
            <h3 className="font-semibold text-gray-700">
              {new Date(calYear,calMonth-1).toLocaleString("en-IN",{month:"long",year:"numeric"})}
            </h3>
            <button onClick={()=>{ if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
              className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <FaChevronRight size={12}/>
            </button>
          </div>

          {/* MONTH SUMMARY */}
          {Object.keys(calSummary).length>0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(calSummary).map(([type,count])=>{
                const c=DAY_CFG[type]; if(!c) return null;
                return (
                  <span key={type}
                    style={{ background:c.dot+"22", borderColor:c.dot, color:c.dot, borderWidth:"1px", borderStyle:"solid" }}
                    className="text-xs px-3 py-1 rounded-full font-semibold">
                    {c.short}: {count}
                  </span>
                );
              })}
            </div>
          )}

          <HeatmapCalendar
            records={calRecords}
            month={calMonth}
            year={calYear}
            onDayClick={(d)=>{ setManualDate(d); setShowManualForm(true); window.scrollTo({top:0,behavior:"smooth"}); }}
          />

          <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
            <FaEdit size={9}/> Click any past day to mark or edit attendance · Orange dot = clocked in, not out yet
          </p>
        </div>
      )}

    </Layout>
  );
};

export default Attendance;  