import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  FaChartBar, FaUsers, FaCalendarCheck, FaExclamationCircle,
  FaMoneyCheckAlt, FaArrowUp, FaArrowDown, FaUserCheck,
  FaUserSlash, FaSpinner,
} from "react-icons/fa";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const StatCard = ({ icon, label, value, sub, trend, color = "blue" }) => {
  const colorMap = {
    blue:   "from-blue-500 to-indigo-600",
    green:  "from-emerald-500 to-teal-600",
    amber:  "from-amber-500 to-orange-500",
    red:    "from-red-500 to-rose-600",
    purple: "from-purple-500 to-violet-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold flex-shrink-0 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
          {trend >= 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
          {Math.abs(trend)}
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ title, sub }) => (
  <div className="mb-4">
    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const ChartCard = ({ title, children, height = 280 }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h3 className="font-bold text-gray-900 mb-4 text-sm">{title}</h3>
    <div style={{ height }}>{children}</div>
  </div>
);

export default function HRAnalytics() {
  const [overview,     setOverview]     = useState(null);
  const [deptStats,    setDeptStats]    = useState([]);
  const [attrTrend,    setAttrTrend]    = useState([]);
  const [leaveStats,   setLeaveStats]   = useState(null);
  const [payrollTrend, setPayrollTrend] = useState([]);
  const [headcount,    setHeadcount]    = useState([]);
  const [absentees,    setAbsentees]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, ds, at, ls, pt, hc, ab] = await Promise.all([
          api.get("/analytics/overview"),
          api.get("/analytics/department-stats"),
          api.get("/analytics/attendance-trend?months=6"),
          api.get("/analytics/leave-stats"),
          api.get("/analytics/payroll-trend?months=6"),
          api.get("/analytics/headcount-trend?months=6"),
          api.get("/analytics/top-absentees"),
        ]);
        setOverview(ov.data);
        setDeptStats(ds.data);
        setAttrTrend(at.data);
        setLeaveStats(ls.data);
        setPayrollTrend(pt.data);
        setHeadcount(hc.data);
        setAbsentees(ab.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load analytics. Please try again.");
      }
      setLoading(false);
    };
    loadAll();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
          <FaSpinner className="animate-spin" size={20} /> Loading analytics…
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
          <FaExclamationCircle size={32} />
          <p className="font-semibold">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">Retry</button>
        </div>
      </Layout>
    );
  }

  const headcountTrend = (overview?.newThisMonth || 0) - (overview?.newLastMonth || 0);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-7">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaChartBar className="text-blue-600" /> HR Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Workforce insights and key metrics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FaUsers size={18} />}
            label="Total Employees"
            value={overview?.totalEmployees || 0}
            sub={`+${overview?.newThisMonth || 0} this month`}
            trend={headcountTrend}
            color="blue"
          />
          <StatCard
            icon={<FaUserCheck size={18} />}
            label="Present Today"
            value={overview?.presentToday || 0}
            sub={`${overview?.absentToday || 0} absent`}
            color="green"
          />
          <StatCard
            icon={<FaExclamationCircle size={18} />}
            label="Pending Leaves"
            value={overview?.pendingLeaves || 0}
            sub={`${overview?.approvedLeavesThisMonth || 0} approved this month`}
            color="amber"
          />
          <StatCard
            icon={<FaMoneyCheckAlt size={18} />}
            label="Payroll This Month"
            value={`₹${fmt(overview?.totalPayrollThisMonth)}`}
            sub="Net payout"
            color="purple"
          />
        </div>

        {/* Attendance Trend + Department Distribution */}
        <div>
          <SectionTitle title="Workforce Overview" sub="Attendance trends and department breakdown" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <ChartCard title="Attendance Trend (Last 6 Months)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attrTrend} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="leave"   name="Leave"   fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Department Distribution">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptStats}
                    dataKey="count"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ department, count }) => `${department} (${count})`}
                    labelLine={false}
                  >
                    {deptStats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val, name]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Headcount + Leave Trend */}
        <div>
          <SectionTitle title="Growth & Leaves" sub="Headcount growth and monthly leave patterns" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <ChartCard title="Headcount Growth">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headcount}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Employees" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Leave Applications">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveStats?.monthly || []} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Applications" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Payroll Trend */}
        <div>
          <SectionTitle title="Payroll Overview" sub="Monthly salary disbursement trend" />
          <ChartCard title="Payroll Trend (Last 6 Months)" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollTrend} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₹${fmt(v)}`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="gross" name="Gross"      fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="net"   name="Net Pay"    fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="deductions" name="Deductions" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Leave Status Pie + Top Absentees */}
        <div>
          <SectionTitle title="Leave Status & Absentees" sub="Leave approval rates and frequent absentees this month" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <ChartCard title="Leave Applications by Status (This Year)">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveStats?.byStatus || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ status, count }) => `${status} (${count})`}
                  >
                    {(leaveStats?.byStatus || []).map((_, i) => (
                      <Cell key={i} fill={["#10b981","#3b82f6","#ef4444"][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">Top Absentees This Month</h3>
              {absentees.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  <FaUserCheck size={24} className="mr-2 opacity-30" /> No absences recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {absentees.map((emp, idx) => (
                    <div key={emp.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {emp.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.department || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1 text-red-600 font-bold text-sm flex-shrink-0">
                        <FaUserSlash size={11} /> {emp.absentDays}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
