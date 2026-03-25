import { useState, useEffect, useRef } from "react";
import {
  FaBell, FaSignOutAlt, FaUser, FaCheckDouble,
  FaCalendarAlt, FaUserCheck, FaClipboardList,
  FaHistory, FaUsers, FaFolderOpen, FaTachometerAlt,
  FaChartBar, FaCog,
} from "react-icons/fa";
import { useNotifications } from "../context/NotificationContext";
import { Link, useNavigate, useLocation } from "react-router-dom";

/* ============================================================
   PAGE TITLE MAP — same routes as App.js
============================================================ */
const PAGE_MAP = {
  "/dashboard":                     "Dashboard",
  "/notifications":                 "Notifications",
  "/attendance":                    "My Attendance",
  "/leaves":                        "My Leaves",
  "/users":                         "Users Management",
  "/analysts":                      "Analyst Master",
  "/admin/dashboard":               "Admin Dashboard",
  "/admin/create-user":             "Create User",
  "/admin/attendance-by-shift":     "Attendance Entry",
  "/admin/attendance":              "Attendance Report",
  "/admin/shift-attendance-report": "Shift Attendance Report",
  "/admin/monthly-attendance":      "Monthly Summary",
  "/admin/audit":                   "Audit Trail",
  "/admin/leaves":                  "Leave Approval",
  "/admin/leaves-management":       "Leave Management",
  "/admin/documents":               "Employee Documents",
  "/admin/terminated-analysts":     "Terminated Employees",
  "/employee/dashboard":            "My Dashboard",
  "/settings":                      "Settings",
  "/weekly-off":                    "Weekly Off Settings",
};

/* ============================================================
   TIME AGO
============================================================ */
const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* notification dot color by type */
const N_DOT = {
  SUCCESS: "bg-green-500",
  ERROR:   "bg-red-500",
  INFO:    "bg-blue-500",
  WARNING: "bg-amber-400",
};

/* ============================================================
   NAVBAR
============================================================ */
const Navbar = () => {
  const { alerts = [], unreadCount = 0, markAsRead, markAllRead } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const notifRef  = useRef(null);
  const userRef   = useRef(null);

  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  /* ✅ FIX: ensure pageTitle is always a plain string */
  const rawTitle = PAGE_MAP[location.pathname];
  const pageTitle = typeof rawTitle === "string" ? rawTitle : "HRMS";

  /* ── close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── notification click: mark read + navigate ── */
  const handleNotifClick = (n) => {
    markAsRead(n.id);
    setNotifOpen(false);
    if (n.entity === "LEAVE") {
      navigate(user?.role === "EMPLOYEE" ? "/leaves" : "/admin/leaves");
    } else if (n.entity === "ATTENDANCE") {
      navigate(user?.role === "EMPLOYEE" ? "/attendance" : "/admin/attendance-by-shift");
    } else {
      navigate("/notifications");
    }
  };

  /* ── logout ── */
  const handleLogout = () => {
    localStorage.clear();
    import("../socket")
      .then(({ default: socket }) => socket.disconnect())
      .catch(() => {});
    window.location.href = "/login";
  };

  const roleLabel = { ADMIN:"Admin", HR:"HR", EMPLOYEE:"Employee" }[user?.role] || user?.role;
  const roleCls   = {
    ADMIN:    "bg-blue-100 text-blue-700",
    HR:       "bg-purple-100 text-purple-700",
    EMPLOYEE: "bg-green-100 text-green-700",
  }[user?.role] || "bg-gray-100 text-gray-600";

  return (
    <div className="bg-white shadow px-6 py-0 h-14 flex items-center justify-between flex-shrink-0 z-40">

      {/* ── LEFT: DYNAMIC PAGE TITLE ── */}
      <h1 className="font-semibold text-lg text-gray-800 truncate">{pageTitle}</h1>

      {/* ── RIGHT: ACTIONS ── */}
      <div className="flex items-center gap-3 flex-shrink-0">

        {/* ── NOTIFICATION BELL ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              notifOpen ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            <FaBell size={18}/>
            {unreadCount > 0 && (
              <span className="
                absolute -top-0.5 -right-0.5
                min-w-[17px] h-[17px] px-1
                bg-red-600 text-white text-[10px] font-black
                rounded-full flex items-center justify-center leading-none
              ">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION DROPDOWN */}
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white shadow-xl rounded-xl z-50 border border-gray-100 overflow-hidden">

              {/* HEADER */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                  >
                    <FaCheckDouble size={9}/> Mark all read
                  </button>
                )}
              </div>

              {/* LIST */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <FaBell size={22} className="text-gray-200"/>
                    <p className="text-sm text-gray-400 font-medium">No notifications</p>
                  </div>
                ) : (
                  alerts.slice(0, 8).map(n => {
                    const dot = N_DOT[n.type] || N_DOT.INFO;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`
                          flex items-start gap-3 px-4 py-3 cursor-pointer
                          hover:bg-gray-50 transition-colors
                          ${!n.isRead ? "bg-blue-50" : "bg-white"}
                        `}
                      >
                        {/* dot */}
                        <div className="flex-shrink-0 mt-1.5">
                          <div className={`w-2 h-2 rounded-full ${n.isRead ? "bg-gray-300" : dot}`}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${n.isRead ? "text-gray-600" : "text-gray-900"}`}>
                            {n.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* FOOTER */}
              <div className="text-center px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="w-px h-6 bg-gray-200"/>

        {/* ── USER MENU ── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
              userOpen ? "bg-gray-100" : "hover:bg-gray-100"
            }`}
          >
            {/* avatar */}
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {/* name + role — hidden on very small screens */}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-none max-w-[100px] truncate">{user?.name}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${roleCls}`}>{roleLabel}</span>
            </div>
            {/* chevron */}
            <svg
              className={`w-3 h-3 text-gray-400 hidden sm:block transition-transform ${userOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {/* USER DROPDOWN */}
          {userOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white shadow-xl rounded-xl z-50 border border-gray-100 overflow-hidden">

              {/* USER INFO */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* MENU */}
              <div className="py-1">
                <button
                  onClick={() => { setUserOpen(false); navigate("/notifications"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FaBell size={13} className="text-gray-400 flex-shrink-0"/>
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setUserOpen(false); navigate("/dashboard"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FaUser size={13} className="text-gray-400 flex-shrink-0"/>
                  <span>My Dashboard</span>
                </button>
              </div>

              <div className="h-px bg-gray-100 mx-3"/>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <FaSignOutAlt size={13} className="flex-shrink-0"/>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Navbar;