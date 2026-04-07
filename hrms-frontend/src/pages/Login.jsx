import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import {
  FaEye, FaEyeSlash, FaShieldAlt, FaEnvelope,
  FaLock, FaSignInAlt, FaExclamationCircle,
  FaUsers, FaCalendarAlt, FaChartBar,
} from "react-icons/fa";

/* ============================================================
   FEATURES LIST — left panel
============================================================ */
const FEATURES = [
  { icon: <FaUsers size={18}/>,       title:"Employee Management",    desc:"Manage analysts, users and roles efficiently" },
  { icon: <FaCalendarAlt size={18}/>, title:"Attendance Tracking",    desc:"Real-time clock-in/out with IST time capture"  },
  { icon: <FaShieldAlt size={18}/>,   title:"Leave Management",       desc:"Apply, approve and track leaves seamlessly"   },
  { icon: <FaChartBar size={18}/>,    title:"Analytics & Reports",    desc:"Monthly summaries and shift-wise reports"     },
];

/* ============================================================
   EMAIL VALIDATION
============================================================ */
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* ============================================================
   LOGIN
============================================================ */
const Login = () => {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [remember, setRemember] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [touched,  setTouched]  = useState({ email:false, password:false });

  const emailRef = useRef(null);
  const navigate = useNavigate();

  /* ── pre-fill from localStorage if remember was checked ── */
  useEffect(() => {
    const saved = localStorage.getItem("hrms_saved_email");
    if (saved) { setEmail(saved); setRemember(true); }
    emailRef.current?.focus();

    /* if already logged in, redirect */
    const token = localStorage.getItem("token");
    const user  = localStorage.getItem("user");
    if (token && user) {
      const u = JSON.parse(user);
      navigate(u.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard", { replace:true });
    }
  }, []);

  /* ── field errors ── */
  const emailError = touched.email && !email
    ? "Email is required"
    : touched.email && !isValidEmail(email)
    ? "Enter a valid email address"
    : "";

  const pwdError = touched.password && !password
    ? "Password is required"
    : touched.password && password.length < 6
    ? "Password must be at least 6 characters"
    : "";

  const isFormValid = isValidEmail(email) && password.length >= 6;

  /* ── SUBMIT ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email:true, password:true });
    if (!isFormValid) return;

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user",  JSON.stringify(user));

      if (remember) {
        localStorage.setItem("hrms_saved_email", email);
      } else {
        localStorage.removeItem("hrms_saved_email");
      }

      navigate(
        user.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
        { replace: true }
      );
    } catch (err) {
      setError(err.response?.data?.msg || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  /* ── ENTER KEY ── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isFormValid && !loading) handleSubmit(e);
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="min-h-screen flex">

      {/* ============================
          LEFT PANEL — branding
      ============================ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1a56db 50%, #1e3a8a 100%)",
        }}>

        {/* BG CIRCLES */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full"/>
          <div className="absolute top-1/3 -right-16 w-64 h-64 bg-white/5 rounded-full"/>
          <div className="absolute -bottom-16 left-1/4 w-72 h-72 bg-white/5 rounded-full"/>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full"/>
        </div>

        {/* LOGO */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <FaShieldAlt className="text-white" size={20}/>
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight leading-none">HRMS</p>
              <p className="text-blue-200 text-xs leading-none mt-0.5">Human Resource Management</p>
            </div>
          </div>
        </div>

        {/* HEADLINE */}
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Manage Your<br/>
            <span className="text-blue-300">Workforce</span><br/>
            Smarter
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            A complete HR solution for attendance, leaves, documents and analytics — all in one place.
          </p>

          {/* FEATURE LIST */}
          <div className="mt-8 space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center text-blue-200 flex-shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="text-blue-300 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="relative z-10">
          <p className="text-blue-400 text-xs">
            © {new Date().getFullYear()} HRMS v2.0 · All rights reserved
          </p>
        </div>
      </div>

      {/* ============================
          RIGHT PANEL — form
      ============================ */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">

          {/* MOBILE LOGO */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <FaShieldAlt className="text-white" size={16}/>
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 leading-none">HRMS</p>
              <p className="text-gray-400 text-[10px]">Management System</p>
            </div>
          </div>

          {/* HEADING */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Welcome back 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your HRMS account</p>
          </div>

          {/* ERROR BANNER */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3.5 mb-6">
              <FaExclamationCircle size={16} className="flex-shrink-0 text-red-500"/>
              <p className="text-sm font-medium">{error}</p>
              <button onClick={()=>setError("")}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                ✕
              </button>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} noValidate>

            {/* EMAIL */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e=>{ setEmail(e.target.value); if(touched.email) setError(""); }}
                  onBlur={()=>setTouched(p=>({...p, email:true}))}
                  onKeyDown={handleKeyDown}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3.5 border-2 rounded-2xl text-sm bg-white
                    focus:outline-none transition-all
                    ${emailError
                      ? "border-red-400 focus:border-red-500 bg-red-50/30"
                      : touched.email && isValidEmail(email)
                      ? "border-green-400 focus:border-green-500"
                      : "border-gray-200 focus:border-blue-500 hover:border-gray-300"
                    }`}
                />
                {touched.email && isValidEmail(email) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">✓</div>
                )}
              </div>
              {emailError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <FaExclamationCircle size={10}/> {emailError}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Password
                </label>
                <Link to="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FaLock
                  size={13}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e=>{ setPassword(e.target.value); if(touched.password) setError(""); }}
                  onBlur={()=>setTouched(p=>({...p, password:true}))}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-11 pr-12 py-3.5 border-2 rounded-2xl text-sm bg-white
                    focus:outline-none transition-all
                    ${pwdError
                      ? "border-red-400 focus:border-red-500 bg-red-50/30"
                      : touched.password && password.length >= 6
                      ? "border-green-400 focus:border-green-500"
                      : "border-gray-200 focus:border-blue-500 hover:border-gray-300"
                    }`}
                />
                <button
                  type="button"
                  onClick={()=>setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                  tabIndex={-1}>
                  {showPwd ? <FaEyeSlash size={15}/> : <FaEye size={15}/>}
                </button>
              </div>
              {pwdError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <FaExclamationCircle size={10}/> {pwdError}
                </p>
              )}
            </div>

            {/* REMEMBER ME */}
            <div className="flex items-center justify-between mb-7">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={()=>setRemember(!remember)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    remember
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300 bg-white group-hover:border-blue-400"
                  }`}>
                  {remember && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-600 select-none">Remember my email</span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-3.5 rounded-2xl text-white text-sm font-bold
                flex items-center justify-center gap-2.5
                transition-all duration-200 shadow-sm
                ${loading
                  ? "bg-blue-400 cursor-not-allowed shadow-none"
                  : !isFormValid
                  ? "bg-gray-300 cursor-not-allowed text-gray-500 shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-200 shadow-lg hover:shadow-blue-300"
                }
              `}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Signing in...
                </>
              ) : (
                <>
                  <FaSignInAlt size={14}/>
                  Sign In
                </>
              )}
            </button>

          </form>

          {/* DIVIDER + INFO */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-400">
              Don't have an account?{" "}
              <span className="text-blue-600 font-semibold">
                Contact your administrator to get invited.
              </span>
            </p>
          </div>

          {/* ROLE HINTS */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { role:"Admin",    color:"bg-blue-100   text-blue-700",   icon:"🛡️" },
              { role:"HR",       color:"bg-purple-100 text-purple-700", icon:"👥" },
              { role:"Employee", color:"bg-green-100  text-green-700",  icon:"👤" },
            ].map(r=>(
              <div key={r.role}
                className={`${r.color} rounded-xl px-3 py-2 text-center`}>
                <div className="text-base mb-0.5">{r.icon}</div>
                <p className="text-[11px] font-bold">{r.role}</p>
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <p className="text-center text-[11px] text-gray-400 mt-6">
            HRMS v2.0 · Secure Login
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;