import {
  createContext, useContext, useEffect,
  useState, useMemo, useCallback,
} from "react";
import api from "../api/axios";
import socket from "../socket"; // ✅ shared singleton — no new io()

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================================
     LOAD FROM API
  ================================ */
  const loadNotifications = useCallback(async () => {
    const user = localStorage.getItem("user");
    if (!user) { setLoading(false); return; }
    try {
      const res  = await api.get("/notifications", { params: { page: 1, limit: 50 } });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      setAlerts(data);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  /* ================================
     REAL-TIME — ALL EVENTS
  ================================ */
  useEffect(() => {
    const events = [
      "leave:new", "leave:approved", "leave:rejected",
      "attendance:marked",
      "analyst:added", "analyst:terminated", "analyst:restored", "analyst:shift_updated",
      "user:registered",
      "notification:new",
    ];

    const handler = (notification) => {
      if (!notification?.id) return;
      setAlerts((prev) => {
        if (prev.find((n) => n.id === notification.id)) return prev;
        return [{ ...notification, isRead: false }, ...prev];
      });
    };

    events.forEach((e) => socket.on(e, handler));
    return () => events.forEach((e) => socket.off(e, handler));
  }, []);

  /* ================================
     MARK SINGLE READ
  ================================ */
  const markAsRead = useCallback(async (id) => {
    setAlerts((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      setAlerts((prev) => prev.map((n) => n.id === id ? { ...n, isRead: false } : n));
    }
  }, []);

  /* ================================
     MARK ALL READ
  ================================ */
  const markAllRead = useCallback(async () => {
    setAlerts((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.put("/notifications/read-all");
    } catch {
      loadNotifications();
    }
  }, [loadNotifications]);

  /* ================================
     DELETE SINGLE  ✅ — calls backend
  ================================ */
  const deleteNotification = useCallback(async (id) => {
    // optimistic remove
    setAlerts((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      // revert — reload to restore
      loadNotifications();
    }
  }, [loadNotifications]);

  /* ================================
     DELETE ALL  ✅ — calls backend
  ================================ */
  const deleteAllNotifications = useCallback(async () => {
    setAlerts([]);
    try {
      await api.delete("/notifications");
    } catch {
      loadNotifications();
    }
  }, [loadNotifications]);

  /* ================================
     UNREAD COUNT
  ================================ */
  const unreadCount = useMemo(
    () => alerts.filter((n) => !n.isRead).length,
    [alerts]
  );

  return (
    <NotificationContext.Provider value={{
      alerts,
      loading,
      unreadCount,
      markAsRead,
      markAllRead,
      deleteNotification,
      deleteAllNotifications,
      reload: loadNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);