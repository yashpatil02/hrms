import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaTachometerAlt, FaUserCheck, FaUsers, FaCalendarAlt,
  FaClipboardList, FaChartBar, FaHistory, FaBars,
  FaFolderOpen, FaBell, FaUserSlash, FaUserPlus,
  FaSearch, FaTimes, FaChevronDown, FaChevronRight, FaCalendarCheck,
  FaShieldAlt, FaUserTie, FaCog, FaMoneyBillWave, FaMoneyCheckAlt,
  FaUserCircle, FaGlobe, FaPollH, FaBullseye, FaExclamationCircle, FaClipboardCheck,
} from "react-icons/fa";

/* ============================================================
   FULL MENU DEFINITION
============================================================ */
const FULL_MENU = [
  {
    id: "main",
    section: "MAIN",
    items: [
      { name: "Dashboard",    path: "/dashboard",    icon: <FaTachometerAlt />, roles: ["ADMIN", "HR", "EMPLOYEE"] },
      { name: "Dashboard",    path: "/admin/dashboard", icon: <FaTachometerAlt />, roles: ["MANAGER"] },
      { name: "Notifications",path: "/notifications",icon: <FaBell />,          roles: ["ADMIN", "HR", "EMPLOYEE", "MANAGER"] },
      { name: "My Profile",   path: "/profile",      icon: <FaUserCircle />,    roles: ["ADMIN", "HR", "EMPLOYEE", "MANAGER"] },
    ],
  },
  {
    id: "employee",
    section: "MY ATTENDANCE",
    roles: ["ADMIN", "HR", "EMPLOYEE", "MANAGER"],
    items: [
      { name: "Attendance", path: "/attendance", icon: <FaUserCheck /> },
      { name: "Leaves", path: "/leaves", icon: <FaCalendarAlt /> },
      { name: "Weekly Off", path: "/weekly-off", icon: <FaCalendarCheck /> },
    ],
  },
  {
    id: "documents",
    section: "DOCUMENTS",
    roles: ["ADMIN", "HR", "MANAGER"],
    items: [
      { name: "Employee Documents", path: "/admin/documents", icon: <FaFolderOpen /> },
    ],
  },
  {
    id: "my-documents",
    section: "DOCUMENTS",
    roles: ["EMPLOYEE"],
    items: [
      { name: "My Documents", path: "/my-documents", icon: <FaFolderOpen />, roles: ["EMPLOYEE"] },
    ],
  },
  {
    id: "users",
    section: "USER MANAGEMENT",
    roles: ["ADMIN"],
    items: [
      { name: "Users", path: "/users", icon: <FaUsers /> },
      { name: "Create User", path: "/admin/create-user", icon: <FaUserPlus /> },
      { name: "Analysts", path: "/analysts", icon: <FaUserTie /> },
      { name: "Terminated Employees", path: "/admin/terminated-analysts", icon: <FaUserSlash /> },
    ],
  },
  {
    id: "manager-users",
    section: "USER MANAGEMENT",
    roles: ["HR", "MANAGER"],
    items: [
      { name: "Employees",   path: "/users",             icon: <FaUsers />   },
      { name: "Create User", path: "/admin/create-user", icon: <FaUserPlus /> },
    ],
  },
  {
    id: "attendance",
    section: "ATTENDANCE",
    roles: ["ADMIN", "HR"],
    items: [
      { name: "Attendance Entry", path: "/admin/attendance-by-shift", icon: <FaUserCheck /> },
      { name: "Attendance Report", path: "/admin/attendance", icon: <FaClipboardList /> },
      { name: "Shift Attendance Report", path: "/admin/shift-attendance-report", icon: <FaChartBar /> },
      { name: "Audit Trail", path: "/admin/audit", icon: <FaHistory /> },
    ],
  },
  {
    id: "manager-attendance",
    section: "ATTENDANCE",
    roles: ["MANAGER"],
    items: [
      { name: "Attendance Entry",        path: "/admin/attendance-by-shift",     icon: <FaUserCheck />    },
      { name: "Attendance Report",       path: "/admin/attendance",              icon: <FaClipboardList /> },
      { name: "Shift Attendance Report", path: "/admin/shift-attendance-report", icon: <FaChartBar />     },
    ],
  },
  {
    id: "leaves",
    section: "LEAVES",
    roles: ["ADMIN", "HR", "MANAGER"],
    items: [
      { name: "Leave Approval", path: "/admin/leaves", icon: <FaCalendarAlt /> },
      { name: "Leave Management", path: "/admin/leaves-management", icon: <FaClipboardList /> },
    ],
  },
  {
    id: "holidays",
    section: "HOLIDAYS",
    items: [
      { name: "Holiday Calendar",   path: "/holidays",        icon: <FaGlobe />,       roles: ["ADMIN", "HR", "EMPLOYEE", "MANAGER"] },
      { name: "Holiday Management", path: "/admin/holidays",  icon: <FaCalendarAlt />, roles: ["ADMIN", "HR"] },
    ],
  },
  {
    id: "payroll",
    section: "PAYROLL",
    roles: ["ADMIN", "HR"],
    items: [
      { name: "Salary Structures",  path: "/admin/salary-structure", icon: <FaMoneyBillWave /> },
      { name: "Payroll Management", path: "/admin/payroll",           icon: <FaMoneyCheckAlt /> },
    ],
  },
  {
    id: "analytics",
    section: "REPORTS",
    roles: ["ADMIN", "HR"],
    items: [
      { name: "HR Analytics",       path: "/admin/analytics",        icon: <FaPollH /> },
      { name: "Management Audit",   path: "/admin/management-audit", icon: <FaShieldAlt /> },
    ],
  },
  {
    id: "productivity-admin",
    section: "PRODUCTIVITY",
    roles: ["ADMIN", "HR", "MANAGER"],
    items: [
      { name: "Team Targets",  path: "/admin/targets",     icon: <FaBullseye /> },
      { name: "QC Entry",      path: "/admin/qc/entry",    icon: <FaClipboardCheck /> },
      { name: "QC Reports",    path: "/admin/qc/errors",   icon: <FaExclamationCircle /> },
    ],
  },
  {
    id: "productivity-employee",
    section: "PRODUCTIVITY",
    roles: ["EMPLOYEE"],
    items: [
      { name: "My Target", path: "/my-target",   icon: <FaBullseye /> },
      { name: "My Errors", path: "/my-errors",   icon: <FaExclamationCircle /> },
    ],
  },
  {
    id: "my-payroll",
    section: "MY PAYROLL",
    roles: ["EMPLOYEE", "MANAGER"],
    items: [
      { name: "My Payslips", path: "/my-payslips", icon: <FaMoneyBillWave /> },
    ],
  },
  /* ── SETTINGS — visible to all roles ── */
  {
    id: "settings",
    section: "SETTINGS",
    items: [
      { name: "Settings", path: "/settings", icon: <FaCog />, roles: ["ADMIN", "HR", "EMPLOYEE", "MANAGER"] },
    ],
  },
];

/* ============================================================
   TOOLTIP — only shown when collapsed
============================================================ */
const Tooltip = ({ label, children }) => (
  <div className="relative group/tip">
    {children}
    <div className="
      pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50
      bg-gray-900 border border-gray-700 text-white text-xs font-semibold
      px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl
      opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
    ">
      {label}
      {/* arrow */}
      <div className="absolute right-full top-1/2 -translate-y-1/2
        border-4 border-transparent border-r-gray-900"/>
    </div>
  </div>
);

/* ============================================================
   SIDEBAR
============================================================ */
const Sidebar = ({ collapsed, setCollapsed, onMobileClose }) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || "EMPLOYEE";

  /* filter menu by role */
  const menu = FULL_MENU
    .filter(s => !s.roles || s.roles.includes(role))
    .map(s => ({
      ...s,
      items: s.items.filter(i => !i.roles || i.roles.includes(role)),
    }))
    .filter(s => s.items.length > 0);

  /* collapsible sections — all open by default */
  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    FULL_MENU.forEach(s => { init[s.id] = true; });
    return init;
  });

  /* search */
  const [search, setSearch] = useState("");

  /* auto-open section of current active route */
  useEffect(() => {
    menu.forEach(section => {
      if (section.items.some(i => i.path === location.pathname)) {
        setOpenSections(prev => ({ ...prev, [section.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleSection = (id) =>
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  /* search results */
  const searchResults = search.trim()
    ? menu.flatMap(s =>
      s.items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase())
      )
    )
    : [];

  return (
    <div
      className={`
        bg-gray-900 text-white h-screen flex flex-col
        transition-all duration-300 flex-shrink-0
        ${collapsed ? "w-16" : "w-64"}
      `}
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >

      {/* =====================
          HEADER — LOGO + TOGGLE
      ===================== */}
      <div className="flex items-center justify-between p-4 flex-shrink-0 border-b border-gray-700">

        {/* LOGO */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaShieldAlt size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-white tracking-tight leading-none">HRMS</p>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">v2.0</p>
            </div>
          </div>
        )}

        {/* TOGGLE BUTTON */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <FaBars size={16} />
        </button>

      </div>

      {/* =====================
          USER CARD (expanded only)
      ===================== */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-lg flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            {/* avatar */}
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-none">{user?.name || "User"}</p>
              <p className="text-[10px] text-gray-500 truncate mt-0.5 leading-none">{user?.email}</p>
            </div>
            {/* role badge */}
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
              role === "ADMIN"   ? "bg-blue-500/20   text-blue-300"   :
              role === "HR"      ? "bg-purple-500/20 text-purple-300" :
              role === "MANAGER" ? "bg-amber-500/20  text-amber-300"  :
                                   "bg-green-500/20  text-green-300"
            }`}>
              {role === "ADMIN" ? "Admin" : role === "HR" ? "HR" : role === "MANAGER" ? "Mgr" : "Emp"}
            </span>
          </div>
        </div>
      )}

      {/* collapsed avatar */}
      {collapsed && (
        <div className="flex justify-center mt-3 mb-1 flex-shrink-0">
          <Tooltip label={user?.name || "User"}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-default">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </Tooltip>
        </div>
      )}

      {/* =====================
          SEARCH (expanded only)
      ===================== */}
      {!collapsed && (
        <div className="px-3 mb-2 flex-shrink-0">
          <div className="relative">
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={11} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="
                w-full pl-7 pr-7 py-2
                bg-gray-800 border border-gray-700 rounded-lg
                text-xs text-gray-300 placeholder-gray-600
                focus:outline-none focus:border-blue-500/60
                transition-colors
              "
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <FaTimes size={9} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================
          SCROLLABLE NAV
      ===================== */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-2 py-1">

        {/* SEARCH RESULTS MODE */}
        {!collapsed && search.trim() && (
          <div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider px-3 py-1.5">
              Results ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-600 px-3 py-2 italic">No pages found</p>
            ) : (
              searchResults.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => { setSearch(""); onMobileClose?.(); }}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                    transition-all mb-0.5
                    ${isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }
                  `}
                >
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </NavLink>
              ))
            )}
          </div>
        )}

        {/* NORMAL MENU MODE */}
        {(!search.trim() || collapsed) && menu.map(section => (
          <div key={section.id} className="mb-3">

            {/* SECTION LABEL — expanded mode */}
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="
                  w-full flex items-center justify-between
                  text-xs text-gray-400 px-3 py-1.5
                  uppercase tracking-wider font-semibold
                  hover:text-gray-200 transition-colors rounded
                  group
                "
              >
                <span>{section.section}</span>
                <span className="text-gray-600 group-hover:text-gray-400 transition-colors">
                  {openSections[section.id]
                    ? <FaChevronDown size={8} />
                    : <FaChevronRight size={8} />
                  }
                </span>
              </button>
            )}

            {/* COLLAPSED: thin separator between sections */}
            {collapsed && (
              <div className="mx-2 my-1.5 h-px bg-gray-700/60" />
            )}

            {/* NAV ITEMS */}
            {(collapsed || openSections[section.id]) && (
              section.items.map(item => {
                const isActive = location.pathname === item.path;
                return collapsed ? (
                  /* COLLAPSED ICON WITH TOOLTIP */
                  <Tooltip key={item.path} label={item.name}>
                    <NavLink
                      to={item.path}
                      onClick={() => onMobileClose?.()}
                      className={`
                        flex items-center justify-center
                        w-10 h-10 rounded-lg mx-auto mb-1
                        transition-all
                        ${isActive
                          ? "bg-blue-600 text-white shadow"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        }
                      `}
                    >
                      <span className="text-base">{item.icon}</span>
                    </NavLink>
                  </Tooltip>
                ) : (
                  /* EXPANDED FULL NAV LINK */
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onMobileClose?.()}
                    className={({ isActive: a }) => `
                      group flex items-center gap-3
                      px-3 py-2.5 rounded-lg transition-all mb-0.5
                      ${a
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }
                    `}
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="text-sm font-medium truncate flex-1">{item.name}</span>
                    {/* active dot */}
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                    )}
                  </NavLink>
                );
              })
            )}

          </div>
        ))}

      </nav>

    </div>
  );
};

export default Sidebar;