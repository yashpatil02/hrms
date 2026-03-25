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


  /*
  =====================
  UI
  =====================
  */
  return (

    <div className="flex h-screen overflow-hidden">

      {/* SIDEBAR */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* MAIN */}
      <div className="flex flex-col flex-1 bg-gray-100">

        {/* NAVBAR */}
        <Navbar />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">

          {children}

        </main>

      </div>

    </div>

  );

};

export default Layout;
