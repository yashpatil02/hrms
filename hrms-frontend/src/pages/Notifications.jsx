import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useNotifications } from "../context/NotificationContext";
import {
  FaBell, FaCheckDouble, FaLeaf, FaUserCheck, FaUsers,
  FaInfoCircle, FaExclamationCircle, FaSearch,
  FaCheckCircle, FaTrashAlt, FaFilter, FaUserTie,
  FaFolderOpen, FaCog, FaStar,
} from "react-icons/fa";

/* ================================
   HELPERS
================================ */
const TYPE_CONFIG = {
  LEAVE:      { icon: <FaLeaf size={13} />,             bg: "bg-blue-100",   text: "text-blue-600",   label: "Leave",      dot: "bg-blue-500"    },
  ATTENDANCE: { icon: <FaUserCheck size={13} />,        bg: "bg-green-100",  text: "text-green-600",  label: "Attendance", dot: "bg-green-500"   },
  ANALYST:    { icon: <FaUserTie size={13} />,          bg: "bg-purple-100", text: "text-purple-600", label: "Analyst",    dot: "bg-purple-500"  },
  USER:       { icon: <FaUsers size={13} />,            bg: "bg-teal-100",   text: "text-teal-600",   label: "User",       dot: "bg-teal-500"    },
  DOCUMENT:   { icon: <FaFolderOpen size={13} />,       bg: "bg-orange-100", text: "text-orange-600", label: "Document",   dot: "bg-orange-500"  },
  SYSTEM:     { icon: <FaCog size={13} />,              bg: "bg-gray-100",   text: "text-gray-600",   label: "System",     dot: "bg-gray-400"    },
  SUCCESS:    { icon: <FaCheckCircle size={13} />,      bg: "bg-green-100",  text: "text-green-600",  label: "Success",    dot: "bg-green-500"   },
  ERROR:      { icon: <FaExclamationCircle size={13} />,bg: "bg-red-100",    text: "text-red-600",    label: "Alert",      dot: "bg-red-500"     },
  INFO:       { icon: <FaInfoCircle size={13} />,       bg: "bg-indigo-100", text: "text-indigo-600", label: "Info",       dot: "bg-indigo-500"  },
};

const getStyle = (n) =>
  TYPE_CONFIG[n.entity] || TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO;

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
};

const fullDate = (date) =>
  new Date(date).toLocaleString("en-IN", {
    weekday:"short", day:"numeric", month:"short",
    year:"numeric", hour:"2-digit", minute:"2-digit",
  });

const groupByDate = (list) => {
  const groups = {};
  list.forEach(n => {
    const d   = new Date(n.createdAt);
    const now = new Date(); now.setHours(0,0,0,0);
    const yest= new Date(now); yest.setDate(now.getDate()-1);
    const nd  = new Date(d);   nd.setHours(0,0,0,0);
    const key = nd.getTime()===now.getTime()  ? "Today"
              : nd.getTime()===yest.getTime() ? "Yesterday"
              : d.toLocaleDateString("en-IN",{ day:"numeric", month:"long", year:"numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
};

/* ================================
   MAIN
================================ */
const Notifications = () => {
  const {
    alerts, loading, unreadCount,
    markAsRead, markAllRead,
    deleteNotification, deleteAllNotifications,
    reload,
  } = useNotifications();

  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");

  const [tab, setTab]         = useState("all");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  /* ---- FILTER ---- */
  const filtered = useMemo(() => {
    let list = [...alerts];
    if (tab === "unread") list = list.filter(n => !n.isRead);
    if (tab === "read")   list = list.filter(n =>  n.isRead);
    if (entityFilter !== "ALL") list = list.filter(n => n.entity === entityFilter || n.type === entityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q));
    }
    return list;
  }, [alerts, tab, entityFilter, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  /* ---- HANDLERS ---- */
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const getNavPath = (n) => {
    switch (n.entity) {
      case "LEAVE":      return isAdmin ? "/admin/leaves"     : "/leaves";
      case "ATTENDANCE": return isAdmin ? "/admin/attendance" : "/attendance";
      case "ANALYST":    return isAdmin ? "/analysts"         : null;
      case "USER":       return isAdmin ? "/users"            : null;
      case "DOCUMENT":   return isAdmin ? "/admin/documents"  : null;
      default:           return null;
    }
  };

  const handleClick = async (n) => {
    if (!n.isRead) await markAsRead(n.id);
    const path = getNavPath(n);
    if (path) navigate(path);
  };

  const toggleSelect = (id) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectAll = () =>
    setSelected(filtered.length === selected.size ? new Set() : new Set(filtered.map(n => n.id)));

  const markSelectedRead = async () => {
    for (const id of selected) await markAsRead(id);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    for (const id of selected) await deleteNotification(id);
    setSelected(new Set());
  };

  /* ---- ENTITY FILTER OPTIONS ---- */
  const entityCounts = useMemo(() => {
    const counts = {};
    alerts.forEach(n => {
      const k = n.entity || n.type || "INFO";
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [alerts]);

  const filterOptions = [
    { key: "ALL",        label: "All" },
    { key: "LEAVE",      label: "Leave" },
    { key: "ATTENDANCE", label: "Attendance" },
    { key: "ANALYST",    label: "Analyst" },
    { key: "USER",       label: "User" },
    { key: "SYSTEM",     label: "System" },
    { key: "SUCCESS",    label: "Success" },
    { key: "ERROR",      label: "Alert" },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">

        {/* ============================
            HEADER
        ============================ */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaBell className="text-blue-500" size={18} />
              Notifications
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {unreadCount > 0
                ? <span className="text-blue-600 font-medium">{unreadCount} unread</span>
                : "All caught up"
              }
              <span className="text-gray-300 mx-2">·</span>
              {alerts.length} total
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-2 rounded-lg transition-colors">
                <FaCheckDouble size={10} /> Mark all read
              </button>
            )}
            {alerts.length > 0 && (
              <button onClick={() => setConfirmDeleteAll(true)}
                className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-500 font-medium px-3 py-2 rounded-lg transition-colors">
                <FaTrashAlt size={10} /> Clear all
              </button>
            )}
            <button onClick={reload}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors">
              Refresh
            </button>
          </div>
        </div>

        {/* CONFIRM DELETE ALL */}
        {confirmDeleteAll && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-red-700 font-medium">Delete all {alerts.length} notifications permanently?</p>
            <div className="flex gap-2">
              <button onClick={() => { deleteAllNotifications(); setConfirmDeleteAll(false); }}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                Yes, delete all
              </button>
              <button onClick={() => setConfirmDeleteAll(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ============================
            SEARCH
        ============================ */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>

        {/* ============================
            TABS + FILTER
        ============================ */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { key:"all",    label:`All (${alerts.length})` },
              { key:"unread", label:`Unread (${unreadCount})` },
              { key:"read",   label:"Read" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab===t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <FaFilter size={10} className="text-gray-400" />
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none cursor-pointer">
              {filterOptions.map(o => (
                <option key={o.key} value={o.key}>
                  {o.label}{o.key !== "ALL" && entityCounts[o.key] ? ` (${entityCounts[o.key]})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ============================
            BULK ACTIONS
        ============================ */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.size === filtered.length} onChange={selectAll}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" />
              <span className="text-sm text-blue-700 font-medium">{selected.size} selected</span>
            </div>
            <div className="flex gap-2">
              <button onClick={markSelectedRead}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1">
                <FaCheckDouble size={10} /> Mark read
              </button>
              <button onClick={deleteSelected}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 flex items-center gap-1">
                <FaTrashAlt size={10} /> Delete
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2">Cancel</button>
            </div>
          </div>
        )}

        {/* ============================
            LIST
        ============================ */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaBell className="text-gray-300" size={28} />
            </div>
            <p className="text-gray-500 font-medium">No notifications found</p>
            <p className="text-gray-400 text-sm">{search ? "Try a different search" : "You're all caught up!"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{date}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                  {items.map(n => {
                    const style     = getStyle(n);
                    const isChecked = selected.has(n.id);

                    return (
                      <div key={n.id}
                        className={`flex items-start gap-3 px-4 py-4 transition-colors group
                          ${!n.isRead ? "bg-blue-50/30" : ""}
                          ${isChecked ? "bg-blue-50" : "hover:bg-gray-50/80"}`}
                      >
                        {/* CHECKBOX */}
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(n.id)}
                          onClick={e => e.stopPropagation()}
                          className="mt-1.5 w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0" />

                        {/* ICON */}
                        <div onClick={() => handleClick(n)}
                          className={`w-9 h-9 rounded-xl ${style.bg} ${style.text} flex items-center justify-center flex-shrink-0 cursor-pointer mt-0.5`}>
                          {style.icon}
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(n)}>
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-800" : "font-medium text-gray-700"}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!n.isRead && <span className={`w-2 h-2 ${style.dot} rounded-full`} />}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                          <p className="text-[11px] text-gray-400 mt-1.5" title={fullDate(n.createdAt)}>
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>

                        {/* HOVER ACTIONS */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {!n.isRead && (
                            <button onClick={e => { e.stopPropagation(); markAsRead(n.id); }}
                              className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center transition-colors"
                              title="Mark as read">
                              <FaCheckCircle size={12} />
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                            className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-400 rounded-lg flex items-center justify-center transition-colors"
                            title="Delete">
                            <FaTrashAlt size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Notifications;