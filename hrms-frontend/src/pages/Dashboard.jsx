import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role === "ADMIN" || user.role === "HR") {
    return <Navigate to="/admin/dashboard" />;
  }

  return <Navigate to="/employee/dashboard" />;
};

export default Dashboard;
