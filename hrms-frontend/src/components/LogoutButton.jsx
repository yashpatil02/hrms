import { useEffect, useRef, useState, createContext, useContext } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import socket from "../socket";

/* ============================================================
   DARK MODE CONTEXT  —  shared between Layout / Navbar / Sidebar
============================================================ */
export const ThemeContext = createContext({
  dark: false,
  toggleDark: () => {},
});

export const useTheme = () => useContext(ThemeContext);

/* ============================================================
   LAYOUT
============================================================ */
const Layout = ({ children }) => {

  /* ── Sidebar collapsed (desktop) ── */
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  /* ── Mobile sidebar open ── */
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Dark mode ── */
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("hrms_dark");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const toggleDark = () => setDark(d => !d);

  /* Apply dark class on <html> */
  useEffect(() => {
    localStorage.setItem("hrms_dark", String(dark));
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* ── Socket join ── */
  const joinedRef = useRef(false);
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?.id || joinedRef.current) return;
    socket.connect();
    socket.emit("join", { userId: user.id, role: user.role });
    joinedRef.current = true;
    return () => { joinedRef.current = false; socket.off("join"); };
  }, []);

  /* Persist sidebar state */
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  /* Close mobile sidebar on desktop resize */
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors duration-200">

        {/* ── Mobile backdrop ── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Sidebar ──
            Desktop: always in flow, width transitions
            Mobile: fixed overlay, slide in/out           */}
        <div className={`
          flex-shrink-0
          fixed md:relative inset-y-0 left-0
          z-50 md:z-auto
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          <Sidebar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        {/* ── Main area ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Navbar */}
          <Navbar onMobileMenuOpen={() => setMobileOpen(true)} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>

        </div>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;