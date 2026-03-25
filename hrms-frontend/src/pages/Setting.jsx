import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaCog, FaUser, FaLock, FaBell, FaBuilding,
  FaCalendarAlt, FaCheckCircle, FaExclamationTriangle,
  FaSyncAlt, FaTrash, FaShieldAlt, FaSignOutAlt,
  FaEye, FaEyeSlash, FaChartBar, FaFileAlt,
  FaSave, FaEdit, FaInfoCircle,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const WEEK_DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const TIMEZONES = ["Asia/Kolkata","Asia/Dubai","UTC","America/New_York","Europe/London","Asia/Singapore"];
const DATE_FMTS = ["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"];
const CURRENCIES = ["INR","USD","EUR","GBP","AED"];
const WORK_DAYS_LIST = [
  {key:"MON",label:"Mon"},{key:"TUE",label:"Tue"},{key:"WED",label:"Wed"},
  {key:"THU",label:"Thu"},{key:"FRI",label:"Fri"},{key:"SAT",label:"Sat"},
  {key:"SUN",label:"Sun"},
];

const TABS_ADMIN = [
  { id:"profile",  label:"Profile"       },
  { id:"password", label:"Password"      },
  { id:"weekly",   label:"Weekly Off"    },
  { id:"system",   label:"System"        },
  { id:"notif",    label:"Notifications" },
  { id:"account",  label:"Account"       },
];

const TABS_EMP = [
  { id:"profile",  label:"Profile"       },
  { id:"password", label:"Password"      },
  { id:"weekly",   label:"Weekly Off"    },
  { id:"notif",    label:"Notifications" },
  { id:"account",  label:"Account"       },
];

/* icon per tab — rendered inside component so React context exists */
const TAB_ICONS = {
  profile:  <FaUser        size={13}/>,
  password: <FaLock        size={13}/>,
  weekly:   <FaCalendarAlt size={13}/>,
  system:   <FaBuilding    size={13}/>,
  notif:    <FaBell        size={13}/>,
  account:  <FaShieldAlt   size={13}/>,
};

/* ============================================================
   HELPERS
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const s = { success:"bg-green-600", error:"bg-red-600", info:"bg-blue-600", warning:"bg-amber-500" };
  const icons = { success:<FaCheckCircle size={14}/>, error:<FaExclamationTriangle size={14}/> };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${s[toast.type]||s.info}`}>
      {icons[toast.type]} {toast.msg}
    </div>
  );
};

const SectionCard = ({ title, subtitle, icon, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><FaInfoCircle size={9}/> {hint}</p>}
  </div>
);

const Input = ({ ...props }) => (
  <input {...props}
    className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors ${props.disabled?"bg-gray-50 text-gray-400":""} ${props.className||""}`}/>
);

const Toggle = ({ checked, onChange, label, hint }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
    <button
      onClick={()=>onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked?"bg-blue-600":"bg-gray-300"}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked?"translate-x-5":"translate-x-0.5"}`}/>
    </button>
  </div>
);

const SaveBtn = ({ loading, onClick, disabled }) => (
  <button onClick={onClick} disabled={loading||disabled}
    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-200">
    {loading
      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</>
      : <><FaSave size={12}/>Save Changes</>}
  </button>
);

/* ============================================================
   MAIN
============================================================ */
export default function Settings() {
  const user    = JSON.parse(localStorage.getItem("user")||"{}");
  const isAdmin = user?.role === "ADMIN";
  const TABS    = isAdmin ? TABS_ADMIN : TABS_EMP;

  const [tab,   setTab]   = useState("profile");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(()=>setToast(null), 3500);
  }, []);

  /* ── PROFILE STATE ── */
  const [profile, setProfile] = useState({ name:"", email:"", phone:"", department:"", designation:"", joinDate:"" });
  const [profLoad, setProfLoad] = useState(false);
  const [profSaving, setProfSaving] = useState(false);

  /* ── PASSWORD STATE ── */
  const [pwd, setPwd]       = useState({ current:"", newPwd:"", confirm:"" });
  const [showPwd, setShowPwd] = useState({ c:false, n:false, cf:false });
  const [pwdSaving, setPwdSaving] = useState(false);

  /* ── WEEKLY OFF STATE ── */
  const [weeklyOff, setWeeklyOff]   = useState("");
  const [woSaving, setWoSaving]     = useState(false);

  /* ── SYSTEM SETTINGS STATE ── */
  const [sys, setSys]         = useState({});
  const [sysSaving, setSysSaving] = useState(false);
  const [sysLoad, setSysLoad] = useState(false);

  /* ── NOTIF PREFS (localStorage) ── */
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hrms_notif_prefs")||"{}"); }
    catch { return {}; }
  });
  const setNotif = (key, val) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    localStorage.setItem("hrms_notif_prefs", JSON.stringify(updated));
    showToast("success","Notification preference saved");
  };

  /* ── ACCOUNT STATS ── */
  const [stats, setStats]   = useState(null);
  const [adminStats, setAdminStats] = useState(null);

  /* ── LOAD ── */
  useEffect(() => {
    loadProfile();
    loadStats();
    if (isAdmin) { loadSystemSettings(); loadAdminStats(); }
  }, []);

  const loadProfile = async () => {
    setProfLoad(true);
    try {
      const res = await api.get("/settings/profile");
      const d   = res.data;
      setProfile({
        name:        d.name        || "",
        email:       d.email       || "",
        phone:       d.phone       || "",
        department:  d.department  || "",
        designation: d.designation || "",
        joinDate:    d.joinDate ? d.joinDate.split("T")[0] : "",
      });
      setWeeklyOff(d.weeklyOff || "");
    } catch { showToast("error","Failed to load profile"); }
    finally { setProfLoad(false); }
  };

  const loadSystemSettings = async () => {
    setSysLoad(true);
    try {
      const res = await api.get("/settings/system");
      setSys(res.data || {});
    } catch { showToast("error","Failed to load system settings"); }
    finally { setSysLoad(false); }
  };

  const loadStats    = async () => {
    try { const r = await api.get("/settings/account-stats"); setStats(r.data); } catch {}
  };
  const loadAdminStats = async () => {
    try { const r = await api.get("/settings/stats"); setAdminStats(r.data); } catch {}
  };

  /* ── SAVE PROFILE ── */
  const saveProfile = async () => {
    if (!profile.name.trim()) { showToast("error","Name is required"); return; }
    setProfSaving(true);
    try {
      const res = await api.put("/settings/profile", profile);
      showToast("success","Profile updated successfully");
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
    } catch(e) { showToast("error", e.response?.data?.msg||"Failed to update profile"); }
    finally { setProfSaving(false); }
  };

  /* ── CHANGE PASSWORD ── */
  const changePassword = async () => {
    if (!pwd.current||!pwd.newPwd||!pwd.confirm) { showToast("error","All fields required"); return; }
    if (pwd.newPwd.length < 6) { showToast("error","Password must be at least 6 characters"); return; }
    if (pwd.newPwd !== pwd.confirm) { showToast("error","Passwords do not match"); return; }
    setPwdSaving(true);
    try {
      await api.put("/settings/password", { currentPassword:pwd.current, newPassword:pwd.newPwd, confirmPassword:pwd.confirm });
      showToast("success","Password changed successfully");
      setPwd({ current:"", newPwd:"", confirm:"" });
    } catch(e) { showToast("error", e.response?.data?.msg||"Password change failed"); }
    finally { setPwdSaving(false); }
  };

  /* ── SAVE WEEKLY OFF ── */
  const saveWeeklyOff = async () => {
    if (!weeklyOff) { showToast("error","Please select a day"); return; }
    setWoSaving(true);
    try {
      await api.put("/settings/weekly-off", { weeklyOff });
      showToast("success","Weekly off updated");
    } catch(e) { showToast("error", e.response?.data?.msg||"Failed to update"); }
    finally { setWoSaving(false); }
  };

  /* ── SAVE SYSTEM ── */
  const saveSystemSettings = async () => {
    setSysSaving(true);
    try {
      await api.put("/settings/system", sys);
      showToast("success","System settings saved");
    } catch { showToast("error","Failed to save settings"); }
    finally { setSysSaving(false); }
  };

  /* ── CLEAR NOTIFICATIONS ── */
  const clearNotifs = async (all=false) => {
    const ep = all ? "/settings/notifications/clear-all" : "/settings/notifications/clear";
    try {
      await api.delete(ep);
      showToast("success", all ? "All notifications cleared" : "Your notifications cleared");
    } catch { showToast("error","Failed to clear notifications"); }
  };

  /* ── LOGOUT ── */
  const logout = () => {
    localStorage.clear();
    import("../socket").then(({ default:s})=>s.disconnect()).catch(()=>{});
    window.location.href = "/login";
  };

  /* ── WORK DAYS HELPERS ── */
  const sysWorkDays   = (sys.work_days||"MON,TUE,WED,THU,FRI").split(",");
  const toggleWorkDay = (key) => {
    const cur = sysWorkDays.includes(key) ? sysWorkDays.filter(d=>d!==key) : [...sysWorkDays, key];
    setSys(prev=>({ ...prev, work_days: cur.join(",") }));
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Layout>
      <Toast toast={toast}/>

      <div className="min-w-0 w-full">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaCog className="text-blue-600"/> Settings
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your account, preferences and system configuration</p>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">

          {/* ── SIDEBAR TABS ── */}
          <div className="lg:w-52 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 lg:sticky lg:top-0">
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 text-left ${
                    tab===t.id
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  }`}>
                  <span className="flex-shrink-0">{TAB_ICONS[t.id]}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="flex-1 min-w-0">

            {/* ============================
                TAB: PROFILE
            ============================ */}
            {tab==="profile" && (
              <>
                <SectionCard title="Personal Information" subtitle="Update your name, phone and designation"
                  icon={<FaUser size={14}/>}>
                  {profLoad ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Full Name *">
                          <Input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Your full name"/>
                        </Field>
                        <Field label="Email Address" hint="Email cannot be changed">
                          <Input value={profile.email} disabled placeholder="email@company.com"/>
                        </Field>
                        <Field label="Phone Number">
                          <Input value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+91 9876543210"/>
                        </Field>
                        <Field label="Department">
                          <Input value={profile.department} onChange={e=>setProfile({...profile,department:e.target.value})} placeholder="e.g. Engineering"/>
                        </Field>
                        <Field label="Designation">
                          <Input value={profile.designation} onChange={e=>setProfile({...profile,designation:e.target.value})} placeholder="e.g. Senior Analyst"/>
                        </Field>
                        <Field label="Join Date">
                          <Input type="date" value={profile.joinDate} onChange={e=>setProfile({...profile,joinDate:e.target.value})}/>
                        </Field>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <SaveBtn loading={profSaving} onClick={saveProfile}/>
                        <button onClick={loadProfile}
                          className="flex items-center gap-2 text-sm px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">
                          <FaSyncAlt size={11}/> Reset
                        </button>
                      </div>
                    </>
                  )}
                </SectionCard>

                {/* ROLE BADGE */}
                <SectionCard title="Account Role" subtitle="Your current access level"
                  icon={<FaShieldAlt size={14}/>}>
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
                      user.role==="ADMIN"?"bg-blue-100 text-blue-700":
                      user.role==="HR"   ?"bg-purple-100 text-purple-700":
                                          "bg-green-100 text-green-700"
                    }`}>{user.role}</div>
                    <p className="text-sm text-gray-500">
                      {user.role==="ADMIN"
                        ? "Full access to all features and settings"
                        : user.role==="HR"
                        ? "Access to people management and leave approval"
                        : "Access to personal attendance and leaves"}
                    </p>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ============================
                TAB: PASSWORD
            ============================ */}
            {tab==="password" && (
              <SectionCard title="Change Password" subtitle="Use a strong password with 6+ characters"
                icon={<FaLock size={14}/>}>
                <div className="max-w-md space-y-4">
                  {[
                    { key:"c",  label:"Current Password",  field:"current", show:showPwd.c,  toggleKey:"c"  },
                    { key:"n",  label:"New Password",      field:"newPwd",  show:showPwd.n,  toggleKey:"n"  },
                    { key:"cf", label:"Confirm Password",  field:"confirm", show:showPwd.cf, toggleKey:"cf" },
                  ].map(({key, label, field, show, toggleKey})=>(
                    <Field key={key} label={label}>
                      <div className="relative">
                        <Input
                          type={show?"text":"password"}
                          value={pwd[field]}
                          onChange={e=>setPwd({...pwd,[field]:e.target.value})}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={()=>setShowPwd(p=>({...p,[toggleKey]:!p[toggleKey]}))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {show?<FaEyeSlash size={14}/>:<FaEye size={14}/>}
                        </button>
                      </div>
                    </Field>
                  ))}

                  {/* STRENGTH INDICATOR */}
                  {pwd.newPwd && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Password strength</span>
                        <span className={`text-xs font-semibold ${
                          pwd.newPwd.length>=10 && /[A-Z]/.test(pwd.newPwd) && /[0-9]/.test(pwd.newPwd)
                            ? "text-green-600" : pwd.newPwd.length>=6 ? "text-amber-500" : "text-red-500"
                        }`}>
                          {pwd.newPwd.length>=10 && /[A-Z]/.test(pwd.newPwd) && /[0-9]/.test(pwd.newPwd)
                            ? "Strong" : pwd.newPwd.length>=6 ? "Medium" : "Weak"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          pwd.newPwd.length>=10 && /[A-Z]/.test(pwd.newPwd) && /[0-9]/.test(pwd.newPwd)
                            ? "w-full bg-green-500" : pwd.newPwd.length>=6 ? "w-2/3 bg-amber-400" : "w-1/3 bg-red-500"
                        }`}/>
                      </div>
                    </div>
                  )}

                  <SaveBtn loading={pwdSaving} onClick={changePassword}/>
                </div>
              </SectionCard>
            )}

            {/* ============================
                TAB: WEEKLY OFF
            ============================ */}
            {tab==="weekly" && (
              <SectionCard title="Weekly Off Day" subtitle="Select your weekly rest day"
                icon={<FaCalendarAlt size={14}/>}>
                <p className="text-sm text-gray-500 mb-4">
                  On your weekly off day, working will be marked as <strong>Weekoff + Present</strong> and adds to your comp-off balance.
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {WEEK_DAYS.map(d=>(
                    <button key={d} onClick={()=>setWeeklyOff(d)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        weeklyOff===d
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                          : "border-gray-200 text-gray-600 hover:border-blue-300 bg-white"
                      }`}>
                      {d.slice(0,3)}
                    </button>
                  ))}
                </div>
                {weeklyOff && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                    <FaCalendarAlt className="text-blue-500 flex-shrink-0" size={13}/>
                    <p className="text-sm text-blue-700">
                      Your weekly off is set to <strong>{weeklyOff}</strong>
                    </p>
                  </div>
                )}
                <SaveBtn loading={woSaving} onClick={saveWeeklyOff} disabled={!weeklyOff}/>
              </SectionCard>
            )}

            {/* ============================
                TAB: SYSTEM (ADMIN only)
            ============================ */}
            {tab==="system" && isAdmin && (
              <>
                {/* COMPANY */}
                <SectionCard title="Company Information" subtitle="Basic company details shown across the app"
                  icon={<FaBuilding size={14}/>}>
                  {sysLoad ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Company Name">
                        <Input value={sys.company_name||""} onChange={e=>setSys({...sys,company_name:e.target.value})} placeholder="HRMS Company"/>
                      </Field>
                      <Field label="Company Email">
                        <Input type="email" value={sys.company_email||""} onChange={e=>setSys({...sys,company_email:e.target.value})} placeholder="hr@company.com"/>
                      </Field>
                      <Field label="Company Phone">
                        <Input value={sys.company_phone||""} onChange={e=>setSys({...sys,company_phone:e.target.value})} placeholder="+91 9876543210"/>
                      </Field>
                      <Field label="Company Address">
                        <Input value={sys.company_address||""} onChange={e=>setSys({...sys,company_address:e.target.value})} placeholder="City, State"/>
                      </Field>
                      <Field label="Timezone">
                        <select value={sys.timezone||"Asia/Kolkata"} onChange={e=>setSys({...sys,timezone:e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                          {TIMEZONES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="Currency">
                        <select value={sys.currency||"INR"} onChange={e=>setSys({...sys,currency:e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                          {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                        </select>
                      </Field>
                    </div>
                  )}
                </SectionCard>

                {/* ATTENDANCE RULES */}
                <SectionCard title="Attendance Rules" subtitle="Configure working hours and thresholds"
                  icon={<FaCalendarAlt size={14}/>}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Work Start Time">
                      <Input type="time" value={sys.work_start_time||"09:00"} onChange={e=>setSys({...sys,work_start_time:e.target.value})}/>
                    </Field>
                    <Field label="Work End Time">
                      <Input type="time" value={sys.work_end_time||"18:00"} onChange={e=>setSys({...sys,work_end_time:e.target.value})}/>
                    </Field>
                    <Field label="Half Day Threshold (hours)" hint="Less than this = absent">
                      <Input type="number" min="1" max="12" value={sys.half_day_threshold||"4"} onChange={e=>setSys({...sys,half_day_threshold:e.target.value})}/>
                    </Field>
                    <Field label="Full Day Threshold (hours)" hint="More than this = present">
                      <Input type="number" min="1" max="24" value={sys.full_day_threshold||"7"} onChange={e=>setSys({...sys,full_day_threshold:e.target.value})}/>
                    </Field>
                  </div>

                  {/* WORK DAYS */}
                  <Field label="Work Days">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {WORK_DAYS_LIST.map(({key,label})=>(
                        <button key={key} onClick={()=>toggleWorkDay(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            sysWorkDays.includes(key)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-200 text-gray-500 hover:border-blue-300"
                          }`}>{label}</button>
                      ))}
                    </div>
                  </Field>
                </SectionCard>

                {/* LEAVE RULES */}
                <SectionCard title="Leave Policy" subtitle="Configure leave allowances and rules"
                  icon={<FaFileAlt size={14}/>}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <Field label="Max Leaves Per Year">
                      <Input type="number" min="0" max="365" value={sys.leave_max_per_year||"24"} onChange={e=>setSys({...sys,leave_max_per_year:e.target.value})}/>
                    </Field>
                    <Field label="Max Advance Days" hint="How many days in advance leave can be applied">
                      <Input type="number" min="0" value={sys.max_leave_advance||"30"} onChange={e=>setSys({...sys,max_leave_advance:e.target.value})}/>
                    </Field>
                    <Field label="Min Advance Notice (days)" hint="Minimum days notice required">
                      <Input type="number" min="0" value={sys.min_leave_advance||"1"} onChange={e=>setSys({...sys,min_leave_advance:e.target.value})}/>
                    </Field>
                  </div>
                  <Toggle
                    label="Auto-Approve Leaves"
                    hint="Leaves will be approved automatically without admin action"
                    checked={sys.auto_approve_leave==="true"}
                    onChange={v=>setSys({...sys,auto_approve_leave:String(v)})}
                  />
                  <Toggle
                    label="Notify Admin on Leave Request"
                    hint="Admin gets notified when employee applies for leave"
                    checked={sys.notify_leave_req!=="false"}
                    onChange={v=>setSys({...sys,notify_leave_req:String(v)})}
                  />
                  <Toggle
                    label="Notify Employee on Approval/Rejection"
                    hint="Employee gets notified when leave is approved/rejected"
                    checked={sys.notify_leave_app!=="false"}
                    onChange={v=>setSys({...sys,notify_leave_app:String(v)})}
                  />
                </SectionCard>

                {/* SYSTEM STATS */}
                {adminStats && (
                  <SectionCard title="System Overview" subtitle="Current data counts"
                    icon={<FaChartBar size={14}/>}>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { l:"Users",         v:adminStats.users,         bg:"bg-blue-50",   t:"text-blue-700"   },
                        { l:"Analysts",      v:adminStats.analysts,      bg:"bg-indigo-50", t:"text-indigo-700" },
                        { l:"Documents",     v:adminStats.documents,     bg:"bg-green-50",  t:"text-green-700"  },
                        { l:"Unread Notifs", v:adminStats.notifications, bg:"bg-amber-50",  t:"text-amber-700"  },
                        { l:"Open Invites",  v:adminStats.invites,       bg:"bg-purple-50", t:"text-purple-700" },
                      ].map(s=>(
                        <div key={s.l} className={`${s.bg} rounded-xl p-3 text-center`}>
                          <div className={`text-xl font-black ${s.t}`}>{s.v}</div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                <SaveBtn loading={sysSaving} onClick={saveSystemSettings}/>
              </>
            )}

            {/* ============================
                TAB: NOTIFICATIONS
            ============================ */}
            {tab==="notif" && (
              <>
                <SectionCard title="Notification Preferences" subtitle="Choose which notifications you receive"
                  icon={<FaBell size={14}/>}>
                  <Toggle label="Leave Status Updates"
                    hint="When your leave is approved or rejected"
                    checked={notifPrefs.leave_status!==false}
                    onChange={v=>setNotif("leave_status",v)}/>
                  <Toggle label="New Leave Requests"
                    hint="When employees submit leave requests (Admin/HR)"
                    checked={notifPrefs.leave_new!==false}
                    onChange={v=>setNotif("leave_new",v)}/>
                  <Toggle label="Attendance Reminders"
                    hint="Remind to mark attendance"
                    checked={notifPrefs.attendance_reminder===true}
                    onChange={v=>setNotif("attendance_reminder",v)}/>
                  <Toggle label="Document Uploads"
                    hint="When a document is uploaded for you"
                    checked={notifPrefs.document_upload!==false}
                    onChange={v=>setNotif("document_upload",v)}/>
                  <Toggle label="System Alerts"
                    hint="Important system notifications"
                    checked={notifPrefs.system_alerts!==false}
                    onChange={v=>setNotif("system_alerts",v)}/>
                </SectionCard>

                <SectionCard title="Clear Notifications" subtitle="Remove notifications from database"
                  icon={<FaTrash size={14}/>}>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={()=>clearNotifs(false)}
                      className="flex items-center gap-2 text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 px-5 py-2.5 rounded-xl font-medium border border-amber-200 transition-all">
                      <FaTrash size={11}/> Clear My Notifications
                    </button>
                    {isAdmin && (
                      <button onClick={()=>clearNotifs(true)}
                        className="flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl font-medium border border-red-200 transition-all">
                        <FaTrash size={11}/> Clear All Notifications
                      </button>
                    )}
                  </div>
                </SectionCard>
              </>
            )}

            {/* ============================
                TAB: ACCOUNT
            ============================ */}
            {tab==="account" && (
              <>
                {/* MY STATS */}
                {stats && (
                  <SectionCard title="My Activity Stats" subtitle={`Your stats for ${new Date().getFullYear()}`}
                    icon={<FaChartBar size={14}/>}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { l:"Total Attendance", v:stats.totalAtt,     bg:"bg-blue-50",   t:"text-blue-700"   },
                        { l:"This Month",        v:stats.thisMonth,    bg:"bg-indigo-50", t:"text-indigo-700" },
                        { l:"Attendance Rate",   v:`${stats.rate}%`,  bg:stats.rate>=80?"bg-green-50":stats.rate>=60?"bg-amber-50":"bg-red-50",
                          t:stats.rate>=80?"text-green-700":stats.rate>=60?"text-amber-700":"text-red-700" },
                        { l:"Total Leaves",      v:stats.totalLeaves, bg:"bg-purple-50", t:"text-purple-700" },
                        { l:"Pending Leaves",    v:stats.pendingLeaves,bg:"bg-amber-50", t:"text-amber-700"  },
                        { l:"Documents",         v:stats.totalDocs,   bg:"bg-gray-50",   t:"text-gray-700"   },
                      ].map(s=>(
                        <div key={s.l} className={`${s.bg} rounded-xl p-3.5 text-center`}>
                          <div className={`text-2xl font-black ${s.t}`}>{s.v}</div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* SESSION */}
                <SectionCard title="Session & Security" subtitle="Manage your current session"
                  icon={<FaShieldAlt size={14}/>}>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Current Session</p>
                      <p className="text-xs text-gray-400 mt-0.5">Logged in as <span className="font-medium">{user.email}</span></p>
                      <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        user.role==="ADMIN"?"bg-blue-100 text-blue-700":
                        user.role==="HR"   ?"bg-purple-100 text-purple-700":
                                            "bg-green-100 text-green-700"
                      }`}>{user.role}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                  <button onClick={logout}
                    className="flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl font-semibold border border-red-200 transition-all">
                    <FaSignOutAlt size={12}/> Sign Out from All Devices
                  </button>
                </SectionCard>

                {/* DANGER ZONE — admin only */}
                {isAdmin && (
                  <SectionCard title="Danger Zone" subtitle="Irreversible administrative actions"
                    icon={<FaExclamationTriangle size={14}/>}>
                    <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50">
                      <p className="text-sm font-semibold text-red-700 mb-1">Reset System Data</p>
                      <p className="text-xs text-red-500 mb-3">
                        These actions are permanent. Make sure you have a backup before proceeding.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={()=>clearNotifs(true)}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-all">
                          Clear All Notifications
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}