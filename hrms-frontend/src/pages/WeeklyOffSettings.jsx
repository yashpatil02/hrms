import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaCalendarCheck, FaCalendarTimes, FaExchangeAlt,
  FaGift, FaCheckCircle, FaTimesCircle, FaInfoCircle,
  FaHistory, FaUsers, FaEdit, FaSave, FaTimes,
  FaChevronDown, FaChevronUp, FaFireAlt, FaMedal,
  FaBolt, FaRegCalendarAlt, FaRegClock,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const DAYS = [
  { key:"MONDAY",    short:"Mon", day:"M"  },
  { key:"TUESDAY",   short:"Tue", day:"T"  },
  { key:"WEDNESDAY", short:"Wed", day:"W"  },
  { key:"THURSDAY",  short:"Thu", day:"Th" },
  { key:"FRIDAY",    short:"Fri", day:"F"  },
  { key:"SATURDAY",  short:"Sat", day:"Sa" },
  { key:"SUNDAY",    short:"Sun", day:"Su" },
];

const TYPE_CFG = {
  WEEKOFF:         { label:"Week Off",     bg:"bg-slate-100",  text:"text-slate-600",  dot:"#94a3b8", emoji:"😴" },
  WEEKOFF_PRESENT: { label:"WO + Present", bg:"bg-teal-100",   text:"text-teal-700",   dot:"#0d9488", emoji:"💪" },
  PENDING_WEEKOFF: { label:"Comp-Off Used",bg:"bg-orange-100", text:"text-orange-700", dot:"#f97316", emoji:"🔄" },
};

const getISTDateStr = () => {
  const now   = new Date();
  const istMs = now.getTime() + (5*60+30)*60*1000;
  return new Date(istMs).toISOString().split("T")[0];
};

const fmtDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
    day:"numeric", month:"short", year:"numeric", weekday:"short",
  });

/* ============================================================
   TOAST
============================================================ */
const Toast = ({ t }) => {
  if (!t) return null;
  const colors = { success:"bg-emerald-600", error:"bg-red-600", info:"bg-blue-600" };
  const icons  = { success:<FaCheckCircle size={13}/>, error:<FaTimesCircle size={13}/>, info:<FaInfoCircle size={13}/> };
  return (
    <div className={`fixed top-5 right-5 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${colors[t.type]||colors.info}`}>
      {icons[t.type]||icons.info} {t.msg}
    </div>
  );
};

/* ============================================================
   STAT CARD
============================================================ */
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className={`${color} rounded-2xl p-5 flex items-center gap-4`}>
    <div className="text-3xl flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-gray-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ============================================================
   DAY PICKER
============================================================ */
const DayPicker = ({ selected, onChange, disabled=false }) => (
  <div className="flex flex-wrap gap-2">
    {DAYS.map(d => {
      const isSelected = selected === d.key;
      return (
        <button key={d.key}
          onClick={() => !disabled && onChange(d.key)}
          disabled={disabled}
          className={`
            relative flex flex-col items-center justify-center
            w-14 h-14 rounded-2xl border-2 font-bold text-sm
            transition-all duration-200
            ${isSelected
              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105"
              : disabled
              ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
              : "border-gray-200 text-gray-600 bg-white hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
            }
          `}>
          <span className="text-xs font-black">{d.short.slice(0,1)}</span>
          <span className="text-[10px] font-semibold">{d.short.slice(1)}</span>
          {isSelected && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
              <FaCheckCircle className="text-blue-600" size={10}/>
            </div>
          )}
        </button>
      );
    })}
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function WeeklyOffSettings() {
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin  = user?.role === "ADMIN" || user?.role === "HR";

  /* state */
  const [info,        setInfo]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [activeTab,   setActiveTab]   = useState("my");  // my | admin

  /* my weekoff */
  const [selectedDay, setSelectedDay] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [editing,     setEditing]     = useState(false);

  /* comp-off */
  const [compOffDate, setCompOffDate] = useState("");
  const [compSaving,  setCompSaving]  = useState(false);
  const [showCompOff, setShowCompOff] = useState(false);

  /* admin */
  const [adminData,   setAdminData]   = useState(null);
  const [adminLoad,   setAdminLoad]   = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editDay,     setEditDay]     = useState("");
  const [editBal,     setEditBal]     = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  /* ── helpers ── */
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── load my info ── */
  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/weekoff/me");
      setInfo(res.data);
      setSelectedDay(res.data.weeklyOff || "");
    } catch {
      showToast("error", "Failed to load weekoff info");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── load admin data ── */
  const loadAdminData = useCallback(async () => {
    setAdminLoad(true);
    try {
      const res = await api.get("/weekoff/admin/all");
      setAdminData(res.data);
    } catch {
      showToast("error", "Failed to load admin data");
    } finally {
      setAdminLoad(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
    if (isAdmin) loadAdminData();
  }, []);

  /* ── save my weekoff day ── */
  const saveDay = async () => {
    if (!selectedDay) { showToast("error", "Please select a day"); return; }
    setSaving(true);
    try {
      const res = await api.put("/weekoff/day", { weeklyOff: selectedDay });
      showToast("success", res.data.msg);
      setEditing(false);
      await loadInfo();
    } catch (e) {
      showToast("error", e.response?.data?.msg || "Failed to save");
    } finally { setSaving(false); }
  };

  /* ── use comp-off ── */
  const applyCompOff = async () => {
    if (!compOffDate) { showToast("error", "Select a date"); return; }
    setCompSaving(true);
    try {
      const res = await api.post("/weekoff/use-compoff", { date: compOffDate });
      showToast("success", res.data.msg);
      setCompOffDate("");
      setShowCompOff(false);
      await loadInfo();
    } catch (e) {
      showToast("error", e.response?.data?.msg || "Failed to apply comp-off");
    } finally { setCompSaving(false); }
  };

  /* ── admin save user ── */
  const adminSaveUser = async () => {
    if (!editingUser) return;
    setAdminSaving(true);
    try {
      await api.put(`/weekoff/admin/${editingUser.id}`, {
        weeklyOff:     editDay || null,
        weekoffBalance: Number(editBal),
      });
      showToast("success", `${editingUser.name} updated`);
      setEditingUser(null);
      await loadAdminData();
    } catch (e) {
      showToast("error", e.response?.data?.msg || "Update failed");
    } finally { setAdminSaving(false); }
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Layout>
      <Toast t={toast}/>

      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <FaCalendarCheck className="text-white" size={16}/>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800">Weekly Off Settings</h1>
            <p className="text-xs text-gray-400">Manage your rest day, comp-off balance and history</p>
          </div>
        </div>
      </div>

      {/* TABS — admin only */}
      {isAdmin && (
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1 mb-6">
          {[
            { id:"my",    label:"My Settings",    icon:<FaCalendarCheck size={11}/> },
            { id:"admin", label:"All Employees",  icon:<FaUsers size={11}/> },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ============================
          MY SETTINGS TAB
      ============================ */}
      {activeTab === "my" && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            </div>
          ) : (
            <>
              {/* STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                  icon="🗓️"
                  label="Weekly Off Day"
                  value={info?.weeklyOff
                    ? DAYS.find(d=>d.key===info.weeklyOff)?.short || info.weeklyOff
                    : "Not Set"}
                  sub={info?.weeklyOff ? "Your rest day" : "Tap below to set"}
                  color="bg-blue-50"
                />
                <StatCard
                  icon="💰"
                  label="Comp-Off Balance"
                  value={info?.weekoffBalance ?? 0}
                  sub={`${info?.weekoffBalance || 0} day${info?.weekoffBalance !== 1 ? "s" : ""} available`}
                  color="bg-emerald-50"
                />
                <StatCard
                  icon="💪"
                  label="Total WO + Present"
                  value={info?.totalEarned ?? 0}
                  sub="Worked on off days"
                  color="bg-teal-50"
                />
              </div>

              {/* HOW IT WORKS */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-6">
                <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                  <FaInfoCircle size={13}/> How Weekoff System Works
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="font-bold text-gray-700 mb-1">😴 Rest Day</p>
                    <p className="text-gray-500">Your selected weekoff day is automatically counted as rest. No action needed.</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="font-bold text-teal-700 mb-1">💪 Work on Off Day → +1 Balance</p>
                    <p className="text-gray-500">Mark attendance as <b>WO + Present</b> when you work on your weekly off. Earns +1 comp-off.</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="font-bold text-orange-700 mb-1">🔄 Use Comp-Off</p>
                    <p className="text-gray-500">Apply your earned balance to take an extra day off. Balance gets deducted by 1.</p>
                  </div>
                </div>
              </div>

              {/* SET / CHANGE WEEKOFF DAY */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <FaCalendarCheck className="text-blue-500" size={15}/>
                      Weekly Off Day
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">The day you don't work every week</p>
                  </div>
                  {info?.weeklyOff && !editing && (
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold transition-all">
                      <FaEdit size={10}/> Change
                    </button>
                  )}
                </div>

                {/* CURRENT DAY DISPLAY */}
                {info?.weeklyOff && !editing ? (
                  <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-200">
                      <span className="text-xs font-black leading-none">
                        {DAYS.find(d=>d.key===info.weeklyOff)?.short.slice(0,1)}
                      </span>
                      <span className="text-[10px] font-semibold leading-none mt-0.5">
                        {DAYS.find(d=>d.key===info.weeklyOff)?.short.slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xl font-black text-blue-800">
                        {info.weeklyOff.charAt(0) + info.weeklyOff.slice(1).toLowerCase()}
                      </p>
                      <p className="text-xs text-blue-500 mt-0.5">
                        Every {info.weeklyOff.charAt(0) + info.weeklyOff.slice(1).toLowerCase()} is your rest day
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">Active</span>
                    </div>
                  </div>
                ) : (
                  /* DAY PICKER */
                  <div>
                    {editing && (
                      <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                        <FaInfoCircle className="text-amber-500 flex-shrink-0" size={12}/>
                        <p className="text-xs text-amber-700">
                          Changing your weekoff day will affect future attendance. Past records remain unchanged.
                        </p>
                      </div>
                    )}
                    <DayPicker selected={selectedDay} onChange={setSelectedDay}/>
                    <div className="flex gap-3 mt-5">
                      <button onClick={saveDay} disabled={saving || !selectedDay}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                        {saving
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</>
                          : <><FaSave size={12}/> {info?.weeklyOff ? "Update Day" : "Set Weekly Off"}</>
                        }
                      </button>
                      {editing && (
                        <button onClick={() => { setEditing(false); setSelectedDay(info?.weeklyOff || ""); }}
                          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* COMP-OFF BALANCE */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <FaGift className="text-emerald-500" size={15}/>
                      Comp-Off Balance
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Use your earned comp-off days as paid leave</p>
                  </div>
                  {(info?.weekoffBalance || 0) > 0 && !showCompOff && (
                    <button onClick={() => setShowCompOff(true)}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold transition-all">
                      <FaBolt size={10}/> Use Comp-Off
                    </button>
                  )}
                </div>

                {/* BALANCE DISPLAY */}
                <div className="flex items-center gap-5 mb-4">
                  <div className="flex items-center gap-3">
                    {Array.from({ length: Math.min(info?.weekoffBalance || 0, 10) }).map((_, i) => (
                      <div key={i}
                        className="w-9 h-9 rounded-xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 font-bold text-xs shadow-sm">
                        {i + 1}
                      </div>
                    ))}
                    {(info?.weekoffBalance || 0) === 0 && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <FaCalendarTimes size={16}/>
                        <span>No balance available</span>
                      </div>
                    )}
                    {(info?.weekoffBalance || 0) > 10 && (
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-700 font-black text-xs">
                        +{(info.weekoffBalance) - 10}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-emerald-700">{info?.weekoffBalance ?? 0}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Available</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-teal-700">{info?.totalEarned ?? 0}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Total Earned</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-orange-700">{info?.compOffUsed ?? 0}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Total Used</p>
                  </div>
                </div>

                {/* USE COMP-OFF FORM */}
                {showCompOff && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-orange-700 text-sm flex items-center gap-2">
                        <FaBolt size={12}/> Apply Comp-Off Leave
                      </p>
                      <button onClick={() => { setShowCompOff(false); setCompOffDate(""); }}
                        className="text-gray-400 hover:text-gray-600">
                        <FaTimes size={12}/>
                      </button>
                    </div>
                    <p className="text-xs text-orange-600 mb-3">
                      Select the date you want to take as comp-off. Balance: <b>{info?.weekoffBalance} day{info?.weekoffBalance !== 1 ? "s" : ""}</b> available.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <input type="date" value={compOffDate}
                        onChange={e => setCompOffDate(e.target.value)}
                        className="border-2 border-orange-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-white"/>
                      <button onClick={applyCompOff} disabled={compSaving || !compOffDate}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
                        {compSaving
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Applying...</>
                          : <><FaCheckCircle size={12}/> Apply (-1 balance)</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* WEEKOFF HISTORY */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <FaHistory className="text-purple-500" size={14}/>
                    Weekoff History
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                      Last 3 months
                    </span>
                  </h2>
                </div>

                {!info?.weekoffHistory?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <FaRegCalendarAlt className="text-gray-200" size={30}/>
                    <p className="text-gray-400 text-sm">No weekoff records yet</p>
                    <p className="text-gray-300 text-xs">Work on a weekoff day to earn comp-off balance</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {info.weekoffHistory.map(h => {
                      const cfg = TYPE_CFG[h.dayType] || TYPE_CFG.WEEKOFF;
                      return (
                        <div key={h.id} className="flex items-center gap-4 px-6 py-3.5">
                          <div className="text-xl flex-shrink-0">{cfg.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-700">{fmtDate(h.date)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {h.checkIn && (
                                <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                                  <FaRegClock size={8}/> In: {h.checkIn}
                                </span>
                              )}
                              {h.checkOut && (
                                <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                                  <FaRegClock size={8}/> Out: {h.checkOut}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                            {cfg.label}
                          </span>
                          {h.dayType === "WEEKOFF_PRESENT" && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold flex-shrink-0">
                              +1 balance
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ============================
          ADMIN TAB
      ============================ */}
      {activeTab === "admin" && isAdmin && (
        <div>
          {adminLoad ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            </div>
          ) : adminData ? (
            <>
              {/* SUMMARY PILLS */}
              <div className="flex flex-wrap gap-2 mb-5">
                {DAYS.map(d => {
                  const count = adminData.grouped?.[d.key]?.length || 0;
                  if (!count) return null;
                  return (
                    <div key={d.key}
                      className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                        {d.short.slice(0,2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{d.short}</p>
                        <p className="text-[10px] text-gray-400">{count} employee{count!==1?"s":""}</p>
                      </div>
                    </div>
                  );
                })}
                {(adminData.grouped?.["UNSET"]?.length || 0) > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                    <FaCalendarTimes className="text-red-400" size={14}/>
                    <div>
                      <p className="text-xs font-bold text-red-700">Not Set</p>
                      <p className="text-[10px] text-red-400">{adminData.grouped["UNSET"].length} employee{adminData.grouped["UNSET"].length!==1?"s":""}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* USER TABLE */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <FaUsers className="text-blue-500" size={14}/>
                    All Employees — Weekoff Overview
                  </h2>
                  <span className="text-xs text-gray-400">{adminData.users?.length || 0} total</span>
                </div>

                <div className="divide-y divide-gray-50">
                  {adminData.users?.map(u => (
                    <div key={u.id}>
                      <div className="flex items-center gap-4 px-6 py-3.5">
                        {/* AVATAR */}
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>

                        {/* INFO */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                        </div>

                        {/* WEEKOFF DAY */}
                        <div className="flex-shrink-0 text-center hidden sm:block">
                          {u.weeklyOff ? (
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl">
                              {DAYS.find(d=>d.key===u.weeklyOff)?.short || u.weeklyOff}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 bg-gray-100 px-3 py-1.5 rounded-xl">Not set</span>
                          )}
                        </div>

                        {/* BALANCE */}
                        <div className="flex-shrink-0 hidden md:block">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                            u.weekoffBalance > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-400"
                          }`}>
                            💰 {u.weekoffBalance} bal
                          </span>
                        </div>

                        {/* EDIT BTN */}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditDay(u.weeklyOff || "");
                            setEditBal(String(u.weekoffBalance));
                          }}
                          className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-all">
                          <FaEdit size={12}/>
                        </button>
                      </div>

                      {/* INLINE EDIT ROW */}
                      {editingUser?.id === u.id && (
                        <div className="bg-blue-50 border-t border-blue-100 px-6 py-4">
                          <p className="text-xs font-bold text-blue-700 mb-3">
                            Editing: {u.name}
                          </p>
                          <div className="flex flex-wrap items-end gap-4">
                            {/* DAY PICKER */}
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Weekly Off Day
                              </label>
                              <DayPicker selected={editDay} onChange={setEditDay}/>
                            </div>

                            {/* BALANCE */}
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Comp-Off Balance
                              </label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setEditBal(b => String(Math.max(0, Number(b)-1)))}
                                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 flex items-center justify-center text-gray-600 font-bold text-lg transition-all">
                                  −
                                </button>
                                <input type="number" min="0" value={editBal}
                                  onChange={e => setEditBal(e.target.value)}
                                  className="w-16 text-center border-2 border-gray-200 rounded-xl py-2 text-sm font-bold focus:outline-none focus:border-blue-400"/>
                                <button onClick={() => setEditBal(b => String(Number(b)+1))}
                                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 flex items-center justify-center text-gray-600 font-bold text-lg transition-all">
                                  +
                                </button>
                              </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex gap-2">
                              <button onClick={adminSaveUser} disabled={adminSaving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
                                {adminSaving
                                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                  : <><FaSave size={11}/> Save</>
                                }
                              </button>
                              <button onClick={() => setEditingUser(null)}
                                className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

    </Layout>
  );
}