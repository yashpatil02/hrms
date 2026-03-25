import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import {
  FaCalendarAlt, FaSyncAlt, FaDownload, FaSearch, FaTimes,
  FaCheckCircle, FaTimesCircle, FaClock, FaLeaf, FaUsers,
  FaChartBar, FaFire, FaChevronDown, FaChevronUp,
  FaFilter, FaEye, FaMoon, FaSun, FaArrowRight,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const DEPARTMENTS = ["Spiideo","SQ","Vidswap","ST","Management"];
const SHIFTS      = ["MORNING","AFTERNOON","GENERAL","EVENING","NIGHT"];
const MONTHS      = Array.from({length:12},(_,i)=>({
  v:i+1, l:new Date(0,i).toLocaleString("en",{month:"long"}),
  s:new Date(0,i).toLocaleString("en",{month:"short"}),
}));

const ST = {
  P:  { bg:"#dcfce7", color:"#15803d", border:"#86efac", label:"Present"    },
  A:  { bg:"#fee2e2", color:"#dc2626", border:"#fca5a5", label:"Absent"     },
  H:  { bg:"#fef9c3", color:"#a16207", border:"#fde047", label:"Half Day"   },
  PL: { bg:"#dbeafe", color:"#1d4ed8", border:"#93c5fd", label:"Paid Leave" },
};

const SHIFT_CFG = {
  MORNING:   { icon:"🌅", color:"#b45309", bg:"#fef3c7", short:"MOR" },
  AFTERNOON: { icon:"☀️",  color:"#0369a1", bg:"#e0f2fe", short:"AFT" },
  GENERAL:   { icon:"🕐",  color:"#374151", bg:"#f3f4f6", short:"GEN" },
  EVENING:   { icon:"🌆",  color:"#6d28d9", bg:"#ede9fe", short:"EVE" },
  NIGHT:     { icon:"🌙",  color:"#1e40af", bg:"#dbeafe", short:"NGT" },
};

const DEPT_CFG = {
  Spiideo:    { c:"#0369a1", bg:"#e0f2fe" },
  SQ:         { c:"#0f766e", bg:"#ccfbf1" },
  Vidswap:    { c:"#7c3aed", bg:"#ede9fe" },
  ST:         { c:"#b45309", bg:"#fef3c7" },
  Management: { c:"#15803d", bg:"#dcfce7" },
};

/* ============================================================
   HELPERS
============================================================ */
const gd  = (y,m,d) => new Date(y,m-1,d).toLocaleDateString("en-IN",{weekday:"short"});
const isWE= (y,m,d) => {const w=new Date(y,m-1,d).getDay();return w===0||w===6;};

const doExport = (rows,month,year,dim) => {
  if(!rows.length) return;
  const days=Array.from({length:dim},(_,i)=>i+1);
  const hdr =["Analyst","Dept","Shift",...days,"P","A","H","PL","Rate%"];
  const body=rows.map(a=>[
    a.name,a.department,a.shift,
    ...days.map(d=>a.attendance?.[d]||""),
    a.summary?.present||0, a.summary?.absent||0,
    a.summary?.halfDay||0, a.summary?.paidLeave||0,
    a.summary?.total>0?Math.round(((a.summary.present||0)/a.summary.total)*100)+"%":"—",
  ]);
  const csv =[[hdr,...body].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n")][0];
  const blob=new Blob([csv],{type:"text/csv"});
  const url =URL.createObjectURL(blob);
  const el  =document.createElement("a");
  el.href=url; el.download=`shift-${MONTHS[month-1].s}-${year}.csv`;
  el.click(); URL.revokeObjectURL(url);
};

/* ============================================================
   MINI HEATMAP (per analyst row)
   Shows all days as tiny colored squares — no horizontal scroll
============================================================ */
const MiniHeatmap = ({ attendance, daysInMonth, year, month, todayDate }) => {
  const days = Array.from({length:daysInMonth},(_,i)=>i+1);
  return (
    <div className="flex flex-wrap gap-[3px]">
      {days.map(d => {
        const st  = attendance?.[d];
        const cfg = st ? ST[st] : null;
        const tod = d===todayDate;
        const we  = isWE(year,month,d);
        return (
          <div key={d}
            title={`Day ${d} (${gd(year,month,d)}): ${cfg?.label || "Not marked"}`}
            style={{
              width:14, height:14,
              background: cfg ? cfg.bg : we ? "#f1f5f9" : "#f8fafc",
              border: `1.5px solid ${tod?"#6366f1": cfg ? cfg.border : we?"#e2e8f0":"#f1f5f9"}`,
              borderRadius:3,
              flexShrink:0,
              boxShadow: tod ? "0 0 0 1px #818cf8" : "none",
            }}
            className="flex items-center justify-center"
          >
            {st && (
              <span style={{fontSize:7,fontWeight:900,color:cfg.color,lineHeight:1}}>
                {st}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ============================================================
   ANALYST CARD — expandable
============================================================ */
const AnalystCard = ({ a, month, year, daysInMonth, todayDate }) => {
  const [open, setOpen] = useState(false);
  const s    = a.summary || {};
  const rate = s.total>0 ? Math.round(((s.present||0)/s.total)*100) : 0;
  const dc   = DEPT_CFG[a.department]  || {c:"#6b7280",bg:"#f3f4f6"};
  const sc   = SHIFT_CFG[a.shift]     || SHIFT_CFG.GENERAL;

  /* streak */
  const today = new Date();
  const isCM  = today.getMonth()+1===month && today.getFullYear()===year;
  const lim   = isCM ? today.getDate() : daysInMonth;
  let streak=0, cur=0;
  for(let d=1;d<=lim;d++){
    if(a.attendance?.[d]==="P"){ cur++; if(d===lim) streak=cur; }
    else { if(d===lim&&a.attendance?.[d]!=="P") streak=0; cur=0; }
  }

  const rateColor = rate>=80?"#15803d":rate>=60?"#b45309":"#dc2626";
  const rateBg    = rate>=80?"#dcfce7":rate>=60?"#fef9c3":"#fee2e2";

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      open ? "border-blue-300 shadow-lg shadow-blue-50" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
    }`}>
      {/* ── COLLAPSED ROW ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={()=>setOpen(!open)}
      >
        {/* AVATAR */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{background:dc.c}}>
          {a.name?.charAt(0)?.toUpperCase()}
        </div>

        {/* NAME + BADGES */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800 truncate">{a.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{background:dc.bg,color:dc.c}}>{a.department}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{background:sc.bg,color:sc.color}}>{sc.icon} {sc.short}</span>
            {streak>=5 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-600 flex-shrink-0 flex items-center gap-1">
                <FaFire size={8}/>{streak}d
              </span>
            )}
          </div>
        </div>

        {/* MINI STATS */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {[["P",s.present||0,"#16a34a","#dcfce7"],
            ["A",s.absent||0,"#dc2626","#fee2e2"],
            ["H",s.halfDay||0,"#b45309","#fef9c3"],
          ].map(([k,v,c,bg])=>(
            <div key={k} className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{background:bg}}>
              <span className="text-[10px] font-black" style={{color:c}}>{k}</span>
              <span className="text-[10px] font-bold" style={{color:c}}>{v}</span>
            </div>
          ))}
          <div className="px-2.5 py-1 rounded-lg text-xs font-black"
            style={{background:rateBg,color:rateColor}}>
            {rate}%
          </div>
        </div>

        {/* CHEVRON */}
        <div className="flex-shrink-0 text-gray-400">
          {open ? <FaChevronUp size={12}/> : <FaChevronDown size={12}/>}
        </div>
      </div>

      {/* ── EXPANDED ── */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">

          {/* RATE BAR */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24 flex-shrink-0">Attendance Rate</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{width:`${rate}%`,background:rateColor}}/>
            </div>
            <span className="text-xs font-black w-10 text-right" style={{color:rateColor}}>{rate}%</span>
          </div>

          {/* FULL STATS */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {k:"Present",   v:s.present||0,   ...ST.P  },
              {k:"Absent",    v:s.absent||0,    ...ST.A  },
              {k:"Half Day",  v:s.halfDay||0,   ...ST.H  },
              {k:"Paid Leave",v:s.paidLeave||0, ...ST.PL },
            ].map(x=>(
              <div key={x.k} className="rounded-xl p-2.5 text-center"
                style={{background:x.bg,border:`1px solid ${x.border}`}}>
                <div className="text-lg font-black" style={{color:x.color}}>{x.v}</div>
                <div className="text-[9px] font-semibold mt-0.5" style={{color:x.color}}>{x.k}</div>
              </div>
            ))}
          </div>

          {/* HEATMAP */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Daily View — {MONTHS[month-1].l} {year}
            </p>
            <MiniHeatmap
              attendance={a.attendance}
              daysInMonth={daysInMonth}
              year={year} month={month}
              todayDate={todayDate}
            />
          </div>

          {/* DAY-LABELS ROW */}
          <div className="flex flex-wrap gap-[3px]">
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>(
              <div key={d} style={{width:14,flexShrink:0}}
                className="text-center text-[7px] text-gray-300 font-semibold">
                {d%5===0?d:""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   MAIN
============================================================ */
export default function AdminShiftAttendanceReport() {
  const today = new Date();

  const [month, setMonth]             = useState(today.getMonth()+1);
  const [year,  setYear]              = useState(today.getFullYear());
  const [department, setDepartment]   = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [search, setSearch]           = useState("");
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [sortBy, setSortBy]           = useState("name");
  const [expandAll, setExpandAll]     = useState(false);

  const daysInMonth = new Date(year,month,0).getDate();
  const todayDate   = today.getMonth()+1===month && today.getFullYear()===year ? today.getDate() : null;

  /* FETCH */
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({month,year});
      if(department)  p.append("department",department);
      if(shiftFilter) p.append("shift",shiftFilter);
      const res = await api.get(`/admin/monthly-shift-attendance?${p}`);
      setData(Array.isArray(res.data)?res.data:[]);
    } catch { setData([]); }
    finally { setLoading(false); }
  },[month,year,department,shiftFilter]);

  useEffect(()=>{ fetchReport(); },[fetchReport]);

  /* FILTERED + SORTED */
  const filtered = useMemo(()=>{
    let list = search.trim()
      ? data.filter(a=>
          a.name.toLowerCase().includes(search.toLowerCase())||
          a.department?.toLowerCase().includes(search.toLowerCase()))
      : [...data];
    if(sortBy==="rate")   list.sort((a,b)=>{ const ra=a.summary?.total>0?a.summary.present/a.summary.total:0; const rb=b.summary?.total>0?b.summary.present/b.summary.total:0; return rb-ra; });
    else if(sortBy==="absent") list.sort((a,b)=>(b.summary?.absent||0)-(a.summary?.absent||0));
    else list.sort((a,b)=>a.name.localeCompare(b.name));
    return list;
  },[data,search,sortBy]);

  /* OVERALL STATS */
  const stats = useMemo(()=>{
    let p=0,a=0,h=0,pl=0,t=0;
    data.forEach(x=>{ p+=x.summary?.present||0; a+=x.summary?.absent||0; h+=x.summary?.halfDay||0; pl+=x.summary?.paidLeave||0; t+=x.summary?.total||0; });
    return {present:p,absent:a,half:h,leave:pl,total:t,rate:t>0?Math.round((p/t)*100):0,analysts:data.length};
  },[data]);

  /* DEPT BREAKDOWN */
  const deptStats = useMemo(()=>{
    const m={};
    data.forEach(a=>{
      const d=a.department||"Other";
      if(!m[d]) m[d]={p:0,t:0,n:0};
      m[d].p+=a.summary?.present||0; m[d].t+=a.summary?.total||0; m[d].n++;
    });
    return m;
  },[data]);

  /* PER-SHIFT STATS */
  const shiftStats = useMemo(()=>{
    const m={};
    data.forEach(a=>{
      const s=a.shift||"GENERAL";
      if(!m[s]) m[s]={p:0,t:0,n:0};
      m[s].p+=a.summary?.present||0; m[s].t+=a.summary?.total||0; m[s].n++;
    });
    return m;
  },[data]);

  const hasFilters = department||shiftFilter||search;

  return (
    <Layout>
      <div className="min-w-0 w-full space-y-5">

        {/* =============================
            TOP HEADER
        ============================= */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600"/>
              Shift Attendance Report
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {MONTHS[month-1].l} {year}
              {department && <> · <span className="font-medium text-gray-600">{department}</span></>}
              {shiftFilter && <> · <span className="font-medium text-gray-600">{shiftFilter}</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={fetchReport}
              className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl transition-all shadow-sm">
              <FaSyncAlt size={11}/> Refresh
            </button>
            <button onClick={()=>doExport(filtered,month,year,daysInMonth)}
              disabled={!filtered.length}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm shadow-blue-200">
              <FaDownload size={11}/> Export CSV
            </button>
          </div>
        </div>

        {/* =============================
            OVERVIEW STAT CARDS
        ============================= */}
        {!loading && data.length>0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              {l:"Analysts",  v:stats.analysts,     bg:"bg-slate-50",   t:"text-slate-700",  icon:<FaUsers size={14}/>       },
              {l:"Present",   v:stats.present,      bg:"bg-green-50",   t:"text-green-700",  icon:<FaCheckCircle size={14}/> },
              {l:"Absent",    v:stats.absent,       bg:"bg-red-50",     t:"text-red-700",    icon:<FaTimesCircle size={14}/> },
              {l:"Half Day",  v:stats.half,         bg:"bg-amber-50",   t:"text-amber-700",  icon:<FaClock size={14}/>       },
              {l:"Paid Leave",v:stats.leave,        bg:"bg-blue-50",    t:"text-blue-700",   icon:<FaLeaf size={14}/>        },
              {l:"Total",     v:stats.total,        bg:"bg-gray-50",    t:"text-gray-600",   icon:<FaCalendarAlt size={14}/>},
              {l:"Rate",      v:`${stats.rate}%`,
                bg:stats.rate>=80?"bg-green-50":stats.rate>=60?"bg-amber-50":"bg-red-50",
                t:stats.rate>=80?"text-green-700":stats.rate>=60?"text-amber-700":"text-red-700",
                icon:<FaChartBar size={14}/>},
            ].map(s=>(
              <div key={s.l} className={`${s.bg} rounded-2xl p-4 flex flex-col items-center justify-center gap-1`}>
                <div className={s.t}>{s.icon}</div>
                <div className={`text-2xl font-black ${s.t}`}>{s.v}</div>
                <div className="text-[10px] text-gray-400 font-semibold">{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* =============================
            DEPT + SHIFT BREAKDOWN
        ============================= */}
        {!loading && data.length>0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* DEPT BREAKDOWN */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FaUsers size={10}/> By Department
              </h3>
              <div className="space-y-2.5">
                {Object.entries(deptStats).sort((a,b)=>b[1].n-a[1].n).map(([dept,s])=>{
                  const dc   = DEPT_CFG[dept]||{c:"#6b7280",bg:"#f3f4f6"};
                  const rate = s.t>0?Math.round((s.p/s.t)*100):0;
                  return (
                    <button key={dept}
                      onClick={()=>setDepartment(department===dept?"":dept)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border-2 ${
                        department===dept?"border-blue-400 bg-blue-50":"border-transparent hover:bg-gray-50"
                      }`}>
                      <span className="text-xs font-bold w-24 flex-shrink-0 truncate"
                        style={{color:dc.c}}>{dept}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{width:`${rate}%`,background:dc.c}}/>
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{color:dc.c}}>{rate}%</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{s.n} analysts</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SHIFT BREAKDOWN */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FaClock size={10}/> By Shift
              </h3>
              <div className="space-y-2.5">
                {Object.entries(shiftStats).map(([shift,s])=>{
                  const sc   = SHIFT_CFG[shift]||SHIFT_CFG.GENERAL;
                  const rate = s.t>0?Math.round((s.p/s.t)*100):0;
                  return (
                    <button key={shift}
                      onClick={()=>setShiftFilter(shiftFilter===shift?"":shift)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border-2 ${
                        shiftFilter===shift?"border-blue-400 bg-blue-50":"border-transparent hover:bg-gray-50"
                      }`}>
                      <span className="text-base flex-shrink-0">{sc.icon}</span>
                      <span className="text-xs font-bold w-20 flex-shrink-0"
                        style={{color:sc.color}}>{shift}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{width:`${rate}%`,background:sc.color}}/>
                      </div>
                      <span className="text-xs font-bold flex-shrink-0"
                        style={{color:sc.color}}>{rate}%</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{s.n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =============================
            TOOLBAR
        ============================= */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">

            {/* MONTH / YEAR */}
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium">
              {MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium">
              {[year-1,year,year+1].map(y=><option key={y}>{y}</option>)}
            </select>

            {/* SHIFT FILTER */}
            <select value={shiftFilter} onChange={e=>setShiftFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Shifts</option>
              {SHIFTS.map(s=><option key={s} value={s}>{SHIFT_CFG[s]?.icon} {s}</option>)}
            </select>

            {/* SEARCH */}
            <div className="relative flex-1 min-w-[160px]">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search analyst or dept..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>

            {hasFilters && (
              <button onClick={()=>{setDepartment("");setShiftFilter("");setSearch("");}}
                className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl transition-colors">
                <FaTimes size={10}/> Clear
              </button>
            )}

            {/* SORT */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {[["name","A–Z"],["rate","Rate↓"],["absent","Absent↓"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      sortBy===k?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"
                    }`}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =============================
            LEGEND
        ============================= */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Legend:</span>
          {Object.entries(ST).map(([k,v])=>(
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black"
                style={{background:v.bg,color:v.color,border:`1.5px solid ${v.border}`}}>{k}</div>
              <span className="text-xs text-gray-500">{v.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded" style={{background:"#eef2ff",border:"2px solid #818cf8"}}/>
            <span className="text-xs text-gray-500">Today</span>
          </div>
        </div>

        {/* =============================
            ANALYST CARDS
        ============================= */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading attendance data...</p>
          </div>

        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaCalendarAlt className="text-gray-300" size={28}/>
            </div>
            <p className="text-gray-500 font-semibold">No data found</p>
            <p className="text-gray-400 text-sm">{hasFilters?"Try clearing filters":"No attendance for this period"}</p>
          </div>

        ) : (
          <>
            {/* COUNT + EXPAND ALL */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">
                <span className="font-bold text-gray-700">{filtered.length}</span> analyst{filtered.length!==1?"s":""}
                {hasFilters&&<span className="text-gray-400"> (filtered from {data.length})</span>}
              </p>
              <button onClick={()=>setExpandAll(!expandAll)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors">
                {expandAll?<FaChevronUp size={9}/>:<FaChevronDown size={9}/>}
                {expandAll?"Collapse All":"Expand All"}
              </button>
            </div>

            {/* CARDS LIST */}
            <div className="space-y-2" key={`${expandAll}-${sortBy}`}>
              {filtered.map(a=>(
                <ExpandableCard
                  key={`${a.analystId}-${expandAll}`}
                  a={a}
                  month={month}
                  year={year}
                  daysInMonth={daysInMonth}
                  todayDate={todayDate}
                  forceOpen={expandAll}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </Layout>
  );
}

/* ============================================================
   EXPANDABLE CARD (controlled by forceOpen)
============================================================ */
function ExpandableCard({ a, month, year, daysInMonth, todayDate, forceOpen }) {
  const [open, setOpen] = useState(forceOpen);

  useEffect(()=>{ setOpen(forceOpen); },[forceOpen]);

  const s    = a.summary || {};
  const rate = s.total>0 ? Math.round(((s.present||0)/s.total)*100) : 0;
  const dc   = DEPT_CFG[a.department]  || {c:"#6b7280",bg:"#f3f4f6"};
  const sc   = SHIFT_CFG[a.shift]     || SHIFT_CFG.GENERAL;
  const rateColor = rate>=80?"#15803d":rate>=60?"#b45309":"#dc2626";
  const rateBg    = rate>=80?"#dcfce7":rate>=60?"#fef9c3":"#fee2e2";

  /* streak */
  const today = new Date();
  const isCM  = today.getMonth()+1===month && today.getFullYear()===year;
  const lim   = isCM ? today.getDate() : daysInMonth;
  let streak=0, cur=0;
  for(let d=1;d<=lim;d++){
    if(a.attendance?.[d]==="P"){ cur++; if(d===lim) streak=cur; }
    else { if(d===lim&&a.attendance?.[d]!=="P") streak=0; cur=0; }
  }

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      open?"border-blue-300 shadow-md shadow-blue-50":"border-gray-100 hover:border-gray-200 hover:shadow-sm"
    }`}>
      {/* HEADER ROW */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={()=>setOpen(!open)}>

        {/* AVATAR */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{background:dc.c}}>
          {a.name?.charAt(0)?.toUpperCase()}
        </div>

        {/* NAME + TAGS */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">{a.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{background:dc.bg,color:dc.c}}>{a.department}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{background:sc.bg,color:sc.color}}>{sc.icon} {sc.short}</span>
            {streak>=5 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-600 flex-shrink-0 flex items-center gap-1">
                <FaFire size={8}/>{streak}d streak
              </span>
            )}
          </div>
        </div>

        {/* STAT CHIPS */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {[["P",s.present||0,ST.P],["A",s.absent||0,ST.A],["H",s.halfDay||0,ST.H]].map(([k,v,cfg])=>(
            <div key={k} className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{background:cfg.bg}}>
              <span className="text-[10px] font-black" style={{color:cfg.color}}>{k}</span>
              <span className="text-[10px] font-bold" style={{color:cfg.color}}>{v}</span>
            </div>
          ))}
          <div className="px-2.5 py-1 rounded-lg text-[11px] font-black"
            style={{background:rateBg,color:rateColor}}>{rate}%</div>
        </div>

        <div className="text-gray-300 flex-shrink-0">
          {open?<FaChevronUp size={12}/>:<FaChevronDown size={12}/>}
        </div>
      </div>

      {/* EXPANDED BODY */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">

          {/* RATE BAR */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-24 flex-shrink-0">Attendance Rate</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{width:`${rate}%`,background:rateColor}}/>
            </div>
            <span className="text-xs font-black w-9 text-right" style={{color:rateColor}}>{rate}%</span>
          </div>

          {/* STAT GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {k:"Present",   v:s.present||0,   cfg:ST.P  },
              {k:"Absent",    v:s.absent||0,    cfg:ST.A  },
              {k:"Half Day",  v:s.halfDay||0,   cfg:ST.H  },
              {k:"Paid Leave",v:s.paidLeave||0, cfg:ST.PL },
            ].map(({k,v,cfg})=>(
              <div key={k} className="rounded-xl p-3 text-center"
                style={{background:cfg.bg, border:`1px solid ${cfg.border}`}}>
                <div className="text-2xl font-black" style={{color:cfg.color}}>{v}</div>
                <div className="text-[10px] font-semibold mt-0.5" style={{color:cfg.color+"cc"}}>{k}</div>
              </div>
            ))}
          </div>

          {/* HEATMAP */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Daily — {MONTHS[month-1].l} {year}
            </p>
            <MiniHeatmap
              attendance={a.attendance}
              daysInMonth={daysInMonth}
              year={year} month={month}
              todayDate={todayDate}
            />
            {/* Day number labels every 5 */}
            <div className="flex flex-wrap gap-[3px] mt-1">
              {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>(
                <div key={d} style={{width:14,flexShrink:0}}
                  className="text-center text-[7px] text-gray-300 font-semibold leading-none">
                  {d%5===0?d:""}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}