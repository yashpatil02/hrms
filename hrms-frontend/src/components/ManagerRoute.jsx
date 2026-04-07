import { Navigate } from "react-router-dom";

/**
 * ManagerRoute — allows ADMIN, HR, and MANAGER.
 * Used for pages that MANAGER can access (attendance report, leaves, documents, users).
 * Pages restricted to ADMIN+HR only (payroll, audit, analytics) still use AdminRoute.
 */
const ManagerRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!["ADMIN", "HR", "MANAGER"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ManagerRoute;
