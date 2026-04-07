import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (["ADMIN", "HR", "MANAGER"].includes(user.role)) {
    return <Navigate to="/admin/dashboard" />;
  }

  return <Navigate to="/employee/dashboard" />;
};

export default Dashboard;
