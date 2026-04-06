import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Users from "./pages/Users";
import AdminAttendance from "./pages/AdminAttendance";
import AdminMonthlyAttendance from "./pages/AdminMonthlyAttendance";
import Analysts from "./pages/Analysts";
import AdminAttendanceByShift from "./pages/AdminAttendanceByShift";
import AdminShiftAttendanceReport from "./pages/AdminShiftAttendanceReport";
import AdminAttendanceAudit from "./pages/AdminAttendanceAudit";
import TerminatedAnalysts from "./pages/TerminatedAnalysts";
import Register from "./pages/Register";
import AdminRoute from "./components/AdminRoute";
import CreateUser from "./pages/CreateUser";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeRoute from "./components/EmployeeRoute";
import InviteRegister from "./pages/InviteRegister";
// import WeeklyOffSettings from "./pages/WeeklyOffSettings";
import AdminLeaveApproval from "./pages/admin/AdminLeaveApproval";
import AdminLeaveManagement from "./pages/admin/AdminLeaveManagement";
import Notifications from "./pages/Notifications";
import Documents from "./pages/admin/Documents";
import EmployeeDocuments from "./pages/admin/EmployeeDocuments";
import Settings from "./pages/Setting";
import WeeklyOffSettings from "./pages/WeeklyOffSettings";
import SalaryStructure from "./pages/SalaryStructure";
import PayrollManagement from "./pages/PayrollManagement";
import MyPayslips from "./pages/employee/MyPayslips";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ===========================
            PUBLIC ROUTES
        =========================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite/:token" element={<InviteRegister />} />

        {/* ===========================
            DASHBOARD
        =========================== */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* ===========================
            ADMIN DASHBOARD
        =========================== */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* ===========================
            EMPLOYEE DASHBOARD
        =========================== */}
        <Route
          path="/employee/dashboard"
          element={
            <EmployeeRoute>
              <EmployeeDashboard />
            </EmployeeRoute>
          }
        />

        {/* ===========================
            EMPLOYEE ROUTES
        =========================== */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaves"
          element={
            <ProtectedRoute>
              <Leaves />
            </ProtectedRoute>
          }
        />

        {/* ✅ FIX #6 — WeeklyOffSettings ab protected hai */}
       <Route
  path="/weekly-off"
  element={
    <ProtectedRoute>
      <WeeklyOffSettings />
    </ProtectedRoute>
  }
/>

        {/* setting page  */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />


        {/* ===========================
            ADMIN ROUTES
        =========================== */}

        {/* ✅ FIX #3 — Users: ProtectedRoute → AdminRoute */}
        <Route
          path="/users"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #3 — AdminAttendance: ProtectedRoute → AdminRoute */}
        <Route
          path="/admin/attendance"
          element={
            <AdminRoute>
              <AdminAttendance />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #3 — AdminMonthlyAttendance: ProtectedRoute → AdminRoute */}
        <Route
          path="/admin/monthly-attendance"
          element={
            <AdminRoute>
              <AdminMonthlyAttendance />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #3 — Analysts: ProtectedRoute → AdminRoute */}
        <Route
          path="/analysts"
          element={
            <AdminRoute>
              <Analysts />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #3 — AdminAttendanceByShift: ProtectedRoute → AdminRoute */}
        <Route
          path="/admin/attendance-by-shift"
          element={
            <AdminRoute>
              <AdminAttendanceByShift />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #3 — AdminShiftAttendanceReport: ProtectedRoute → AdminRoute */}
        <Route
          path="/admin/shift-attendance-report"
          element={
            <AdminRoute>
              <AdminShiftAttendanceReport />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #3 — AdminAttendanceAudit: ProtectedRoute → AdminRoute */}
        <Route
          path="/admin/audit"
          element={
            <AdminRoute>
              <AdminAttendanceAudit />
            </AdminRoute>
          }
        />

        {/* ✅ FIX #6 — TerminatedAnalysts ab AdminRoute mein */}
        <Route
          path="/admin/terminated-analysts"
          element={
            <AdminRoute>
              <TerminatedAnalysts />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/create-user"
          element={
            <AdminRoute>
              <CreateUser />
            </AdminRoute>
          }
        />

        {/* ✅ Admin Leave Approval */}
        <Route
          path="/admin/leaves"
          element={
            <AdminRoute>
              <AdminLeaveApproval />
            </AdminRoute>
          }
        />

        {/* ✅ Admin Leave Management */}
        <Route
          path="/admin/leaves-management"
          element={
            <AdminRoute>
              <AdminLeaveManagement />
            </AdminRoute>
          }
        />

        {/* ✅ Admin Documents */}
        <Route
          path="/admin/documents"
          element={
            <AdminRoute>
              <Documents />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/documents/:employeeId"
          element={
            <AdminRoute>
              <EmployeeDocuments />
            </AdminRoute>
          }
        />

        {/* ===========================
            PAYROLL ROUTES
        =========================== */}
        <Route
          path="/admin/salary-structure"
          element={
            <AdminRoute>
              <SalaryStructure />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payroll"
          element={
            <AdminRoute>
              <PayrollManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/my-payslips"
          element={
            <ProtectedRoute>
              <MyPayslips />
            </ProtectedRoute>
          }
        />

        {/* ===========================
            FALLBACK
        =========================== */}
        <Route path="*" element={<Login />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;