import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import {
  FaShieldAlt, FaLock, FaEye, FaEyeSlash,
  FaCheckCircle, FaTimesCircle, FaArrowLeft,
} from "react-icons/fa";

/* password strength rules */
const RULES = [
  { id: "len",   label: "At least 8 characters",        test: (p) => p.length >= 8         },
  { id: "upper", label: "One uppercase letter (A-Z)",   test: (p) => /[A-Z]/.test(p)       },
  { id: "lower", label: "One lowercase letter (a-z)",   test: (p) => /[a-z]/.test(p)       },
  { id: "num",   label: "One number (0-9)",             test: (p) => /[0-9]/.test(p)       },
];

const strength = (p) => {
  if (!p) return { score: 0, label: "", color: "" };
  const passed = RULES.filter(r => r.test(p)).length;
  if (passed <= 1) return { score: 1, label: "Weak",   color: "bg-red-500"    };
  if (passed === 2) return { score: 2, label: "Fair",   color: "bg-amber-500"  };
  if (passed === 3) return { score: 3, label: "Good",   color: "bg-blue-500"   };
  return              { score: 4, label: "Strong", color: "bg-green-500"  };
};

export default function ResetPassword() {
  const { token }   = useParams();
  const navigate    = useNavigate();

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");

  const str       = strength(password);
  const allPassed = RULES.every(r => r.test(password));
  const matched   = password && confirm && password === confirm;
  const canSubmit = allPassed && matched && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <FaShieldAlt className="text-white" size={16}/>
          </div>
          <div>
            <p className="text-xl font-black text-gray-900 leading-none">HRMS</p>
            <p className="text-gray-400 text-[10px]">Human Resource Management</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">

          {done ? (
            /* ── SUCCESS ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-500" size={28}/>
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-500 text-sm mb-4">
                Your password has been updated successfully.
              </p>
              <p className="text-xs text-blue-600 font-medium">Redirecting to login...</p>
            </div>

          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Set New Password</h2>
                <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-sm font-medium flex items-center gap-2">
                  <FaTimesCircle size={14} className="flex-shrink-0"/>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* PASSWORD */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <FaLock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      autoFocus
                      className="w-full pl-11 pr-12 py-3.5 border-2 border-gray-200 focus:border-blue-500 rounded-2xl text-sm bg-white focus:outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {showPwd ? <FaEyeSlash size={15}/> : <FaEye size={15}/>}
                    </button>
                  </div>

                  {/* STRENGTH BAR */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                            i <= str.score ? str.color : "bg-gray-200"
                          }`}/>
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${
                        str.score <= 1 ? "text-red-500" : str.score === 2 ? "text-amber-500" :
                        str.score === 3 ? "text-blue-500" : "text-green-500"
                      }`}>{str.label}</p>
                    </div>
                  )}

                  {/* RULES CHECKLIST */}
                  {password && (
                    <div className="mt-3 space-y-1.5">
                      {RULES.map(r => (
                        <div key={r.id} className="flex items-center gap-2">
                          {r.test(password)
                            ? <FaCheckCircle size={11} className="text-green-500 flex-shrink-0"/>
                            : <FaTimesCircle size={11} className="text-gray-300 flex-shrink-0"/>
                          }
                          <span className={`text-xs ${r.test(password) ? "text-green-600" : "text-gray-400"}`}>
                            {r.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CONFIRM */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <FaLock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input
                      type={showConf ? "text" : "password"}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-12 py-3.5 border-2 rounded-2xl text-sm bg-white focus:outline-none transition-all ${
                        confirm
                          ? matched ? "border-green-400" : "border-red-400"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConf(!showConf)} tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {showConf ? <FaEyeSlash size={15}/> : <FaEye size={15}/>}
                    </button>
                  </div>
                  {confirm && !matched && (
                    <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                  )}
                  {matched && (
                    <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                      <FaCheckCircle size={10}/> Passwords match
                    </p>
                  )}
                </div>

                <button type="submit" disabled={!canSubmit}
                  className={`w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all
                    ${!canSubmit
                      ? "bg-gray-300 cursor-not-allowed text-gray-500"
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    }`}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Resetting...</>
                    : "Reset Password"
                  }
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                  <FaArrowLeft size={11}/> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">HRMS v2.0 · Secure Login</p>
      </div>
    </div>
  );
}
