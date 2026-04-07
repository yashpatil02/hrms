import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { FaShieldAlt, FaEnvelope, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function ForgotPassword() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");
  const [touched,   setTouched]   = useState(false);

  const emailError = touched && !isValidEmail(email) ? "Enter a valid email address" : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValidEmail(email)) return;

    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: email.toLowerCase().trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.msg || "Something went wrong. Please try again.");
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

          {sent ? (
            /* ── SUCCESS STATE ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-500" size={28}/>
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-2">
                If <span className="font-semibold text-gray-700">{email}</span> is registered,
                you'll receive a password reset link shortly.
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 mb-6">
                ⏰ The link expires in <b>15 minutes</b>. Check your spam folder if you don't see it.
              </p>
              <Link to="/login"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold">
                <FaArrowLeft size={11}/> Back to Login
              </Link>
            </div>

          ) : (
            /* ── FORM STATE ── */
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Forgot Password?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your registered email — we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <FaEnvelope size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      onBlur={() => setTouched(true)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      autoFocus
                      className={`w-full pl-11 pr-4 py-3.5 border-2 rounded-2xl text-sm bg-white
                        focus:outline-none transition-all
                        ${emailError
                          ? "border-red-400 focus:border-red-500"
                          : touched && isValidEmail(email)
                          ? "border-green-400"
                          : "border-gray-200 focus:border-blue-500"
                        }`}
                    />
                    {touched && isValidEmail(email) && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">✓</div>
                    )}
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className={`w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all
                    ${loading || !isValidEmail(email)
                      ? "bg-gray-300 cursor-not-allowed text-gray-500"
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                    }`}>
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Sending...</>
                  ) : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
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
