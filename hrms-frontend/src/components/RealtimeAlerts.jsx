import { useEffect } from "react";
import socket from "../socket";
import { useNotifications } from "../context/NotificationContext";

const RealtimeAlerts = () => {
  const { alerts, addAlert } = useNotifications();

  useEffect(() => {
    socket.on("leave:new", (data) => {
      addAlert({
        message: data.msg || "New leave request received",
        type: "info",
      });
    });

    socket.on("leave:approved", (data) => {
      addAlert({
        message: data.msg || "Leave approved",
        type: "success",
      });
    });

    socket.on("leave:rejected", (data) => {
      addAlert({
        message: `${data.msg} - ${data.reason}`,
        type: "error",
      });
    });

    return () => {
      socket.off("leave:new");
      socket.off("leave:approved");
      socket.off("leave:rejected");
    };
  }, [addAlert]);

  /* 🔔 TOAST UI */
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {alerts.slice(0, 3).map((a) => (
        <div
          key={a.id}
          className={`shadow-lg rounded p-3 w-72 text-sm border-l-4 ${
            a.type === "success"
              ? "bg-green-50 border-green-500"
              : a.type === "error"
              ? "bg-red-50 border-red-500"
              : "bg-blue-50 border-blue-500"
          }`}
        >
          🔔 {a.message}
        </div>
      ))}
    </div>
  );
};

export default RealtimeAlerts;
