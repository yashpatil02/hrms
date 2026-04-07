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
import ManagerRoute from "./components/ManagerRoute";
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
import EmployeeProfile from "./pages/EmployeeProfile";
import HolidayManagement from "./pages/HolidayManagement";
import HolidayCalendar from "./pages/HolidayCalendar";
import HRAnalytics from "./pages/HRAnalytics";
import MyDocuments from "./pages/employee/MyDocuments";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ===========================
            DASHBOARD
        =========================== */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* ===========================
            ADMIN DASHBOARD (MANAGER allowed)
        =========================== */}
        <Route
          path="/admin/dashboard"
          element={
            <ManagerRoute>
              <AdminDashboard />
            </ManagerRoute>
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

        {/* Users: MANAGER allowed (dept-filtered) */}
        <Route
          path="/users"
          element={
            <ManagerRoute>
              <Users />
            </ManagerRoute>
          }
        />

        {/* Attendance report: MANAGER allowed (dept-filtered) */}
        <Route
          path="/admin/attendance"
          element={
            <ManagerRoute>
              <AdminAttendance />
            </ManagerRoute>
          }
        />

        <Route
          path="/admin/monthly-attendance"
          element={
            <ManagerRoute>
              <AdminMonthlyAttendance />
            </ManagerRoute>
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

        {/* Leave Approval — MANAGER allowed (dept-filtered) */}
        <Route
          path="/admin/leaves"
          element={
            <ManagerRoute>
              <AdminLeaveApproval />
            </ManagerRoute>
          }
        />

        {/* Leave Management — MANAGER allowed (dept-filtered) */}
        <Route
          path="/admin/leaves-management"
          element={
            <ManagerRoute>
              <AdminLeaveManagement />
            </ManagerRoute>
          }
        />

        {/* Documents — MANAGER allowed (dept-filtered) */}
        <Route
          path="/admin/documents"
          element={
            <ManagerRoute>
              <Documents />
            </ManagerRoute>
          }
        />

        <Route
          path="/admin/documents/:employeeId"
          element={
            <ManagerRoute>
              <EmployeeDocuments />
            </ManagerRoute>
          }
        />

        {/* ===========================
            PROFILE
        =========================== */}
        <Route
          path="/profile"
          element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>}
        />

        {/* ===========================
            HOLIDAYS
        =========================== */}
        <Route
          path="/holidays"
          element={<ProtectedRoute><HolidayCalendar /></ProtectedRoute>}
        />
        <Route
          path="/admin/holidays"
          element={<ManagerRoute><HolidayManagement /></ManagerRoute>}
        />

        {/* ===========================
            HR ANALYTICS
        =========================== */}
        <Route
          path="/admin/analytics"
          element={<AdminRoute><HRAnalytics /></AdminRoute>}
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
            MY DOCUMENTS (Employee)
        =========================== */}
        <Route
          path="/my-documents"
          element={
            <ProtectedRoute>
              <MyDocuments />
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