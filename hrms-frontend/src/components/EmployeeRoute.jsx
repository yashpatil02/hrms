import { Navigate } from "react-router-dom";

const EmployeeRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) return <Navigate to="/login" />;

  if (user.role !== "EMPLOYEE") {
    return <Navigate to="/admin/dashboard" />;
  }

  return children;
};

export default EmployeeRoute;
