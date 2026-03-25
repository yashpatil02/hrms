import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash,
  FaUserShield, FaUserTie, FaUsers, FaLock, FaEnvelope,
  FaArrowRight, FaTimesCircle,
} from "react-icons/fa";

const ROLE_INFO = {
  ADMIN:    { label:"Admin",    icon:<FaUserShield size={14}/>, color:"text-purple-600", bg:"bg-purple-100" },
  HR:       { label:"HR Staff", icon:<FaUserTie   size={14}/>, color:"text-blue-600",   bg:"bg-blue-100"   },
  EMPLOYEE: { label:"Employee", icon:<FaUsers     size={14}/>, color:"text-green-600",  bg:"bg-green-100"  },
};

const PasswordStrength = ({ password }) => {
  const checks = [
    { label:"At least 6 characters", pass: password.length >= 6 },
    { label:"Contains a number",     pass: /\d/.test(password) },
    { label:"Contains uppercase",    pass: /[A-Z]/.test(password) },
    { label:"Contains lowercase",    pass: /[a-z]/.test(password) },
  ];
  const score   = checks.filter(c => c.pass).length;
  const colors  = ["bg-red-400","bg-orange-400","bg-amber-400","bg-green-400","bg-green-500"];
  const labels  = ["","Weak","Fair","Good","Strong"];

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score] : "bg-gray-200"}`}/>
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${score>=3?"text-green-600":score>=2?"text-amber-600":"text-red-500"}`}>
          {labels[score]} password
        </p>
      )}
      <div className="grid grid-cols-2 gap-1 mt-1">
        {checks.map((c,i) => (
          <div key={i} className={`flex items-center gap-1.5 text-xs ${c.pass?"text-green-600":"text-gray-400"}`}>
            {c.pass ? <FaCheckCircle size={10}/> : <div className="w-2.5 h-2.5 rounded-full border border-current"/>}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InviteRegister() {
  const { token }   = useParams();
  const navigate    = useNavigate();

  const [invite, setInvite]       = useState(null);
  const [status, setStatus]       = useState("loading"); // loading | valid | invalid | success
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.get(`/auth/invite/${token}`)
      .then(res => { setInvite(res.data); setStatus("valid"); })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const submit = async () => {
    setError("");
    if (!password)           return setError("Password is required");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");

    try {
      setLoading(true);
      const res = await api.post("/auth/complete-invite", { token, password });

      /* auto-login */
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user",  JSON.stringify(res.data.user));
      }

      setStatus("success");
    } catch (e) {
      setError(e.response?.data?.msg || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") submit(); };

  /* ---- LOADING ---- */
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
          <p className="text-gray-500 text-sm">Validating your invite...</p>
        </div>
      </div>
    );
  }

  /* ---- INVALID ---- */
  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaTimesCircle className="text-red-500" size={28}/>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invite Invalid or Expired</h2>
          <p className="text-gray-500 text-sm mb-6">
            This invitation link is no longer valid. It may have expired or already been used.
            Please contact your admin to request a new invite.
          </p>
          <button onClick={() => navigate("/login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---- SUCCESS ---- */
  if (status === "success") {
    const role = ROLE_INFO[invite?.role] || ROLE_INFO.EMPLOYEE;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-500" size={28}/>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Account Created! 🎉</h2>
          <p className="text-gray-500 text-sm mb-6">
            Welcome to HRMS, <strong>{invite?.name}</strong>! Your account is ready to use.
          </p>
          <button onClick={() => navigate("/dashboard")}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            Go to Dashboard <FaArrowRight size={12}/>
          </button>
        </div>
      </div>
    );
  }

  /* ---- VALID — REGISTRATION FORM ---- */
  const role = ROLE_INFO[invite?.role] || ROLE_INFO.EMPLOYEE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* CARD */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold">{invite?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <h1 className="text-xl font-bold">Welcome, {invite?.name}!</h1>
            <p className="text-blue-200 text-sm mt-1">Complete your registration below</p>
          </div>

          {/* INVITE INFO */}
          <div className="px-8 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaEnvelope size={13} className="text-gray-400"/>
                <span className="truncate">{invite?.email}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${role.bg} ${role.color}`}>
                {role.icon} {role.label}
              </span>
            </div>
            {invite?.department && (
              <p className="text-xs text-gray-400 mt-1.5">Department: <span className="font-medium text-gray-600">{invite.department}</span></p>
            )}
          </div>

          {/* FORM */}
          <div className="px-8 py-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Set Password *
              </label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13}/>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Create a strong password"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <FaEyeSlash size={14}/> : <FaEye size={14}/>}
                </button>
              </div>
              <PasswordStrength password={password}/>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13}/>
                <input
                  type={showCf ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Re-enter your password"
                  className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    confirm && password !== confirm
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-400"
                      : confirm && password === confirm
                      ? "border-green-300 focus:ring-green-500/20 focus:border-green-400"
                      : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-400"
                  }`}
                />
                <button type="button" onClick={() => setShowCf(!showCf)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCf ? <FaEyeSlash size={14}/> : <FaEye size={14}/>}
                </button>
                {confirm && password === confirm && (
                  <FaCheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500" size={14}/>
                )}
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <FaExclamationCircle size={10}/> Passwords do not match
                </p>
              )}
            </div>

            {/* ERROR */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-sm">
                <FaExclamationCircle className="flex-shrink-0" size={13}/> {error}
              </div>
            )}

            {/* SUBMIT */}
            <button
              onClick={submit}
              disabled={loading || !password || !confirm}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all mt-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creating Account...</>
              ) : (
                <>Create My Account <FaArrowRight size={12}/></>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-blue-600 hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        </div>

        <p className="text-xs text-center text-gray-400 mt-4">
          🔒 Secured by HRMS · This link expires in 24 hours
        </p>
      </div>
    </div>
  );
}