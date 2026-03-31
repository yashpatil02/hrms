import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

if (user.role !== "ADMIN" && user.role !== "HR") {
  return <Navigate to="/dashboard" />;
}

  return children;
};

export default AdminRoute;
