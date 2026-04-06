import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import socket from "../socket";

const Layout = ({ children }) => {

  /*
  =====================
  SIDEBAR STATE
  =====================
  */
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("sidebarCollapsed") === "true"
  );

  /* mobile sidebar open/close (overlay mode) */
  const [mobileOpen, setMobileOpen] = useState(false);

  /*
  =====================
  SOCKET JOIN SAFE GUARD
  =====================
  */
  const joinedRef = useRef(false);


  /*
  =====================
  SOCKET JOIN ONLY ONCE
  =====================
  */
  useEffect(() => {

    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (!user?.id) return;

    if (joinedRef.current) return;

    socket.connect();

    socket.emit("join", {
      userId: user.id,
      role: user.role,
    });

    joinedRef.current = true;

    return () => {
      joinedRef.current = false;
      socket.off("join");
    };

  }, []);


  /*
  =====================
  SAVE SIDEBAR STATE
  =====================
  */
  useEffect(() => {

    localStorage.setItem(
      "sidebarCollapsed",
      collapsed.toString()
    );

  }, [collapsed]);

  /* close mobile sidebar on resize to desktop */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  /*
  =====================
  UI
  =====================
  */
  return (

    <div className="flex h-screen overflow-hidden">

      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR — fixed overlay on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* MAIN */}
      <div className="flex flex-col flex-1 bg-gray-100 min-w-0">

        {/* NAVBAR */}
        <Navbar onMobileMenuToggle={() => setMobileOpen(o => !o)} />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">

          {children}

        </main>

      </div>

    </div>

  );

};

export default Layout;
