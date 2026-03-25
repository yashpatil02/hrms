import { useEffect, useState } from "react";
import api from "../api/axios";

const MonthlyAttendanceSummary = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadSummary();
  }, [month, year]);

  const loadSummary = async () => {
    const res = await api.get(
      `/employee/attendance-summary?month=${month}&year=${year}`
    );
    setSummary(res.data);
  };

  if (!summary) return null;

  const percentage = Math.round(
    (summary.present / summary.total) * 100
  );

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4">
        Monthly Attendance Summary
      </h2>

      {/* Selector */}
      <div className="flex gap-3 mb-6">
        <select
          className="border p-2 rounded"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("en", {
                month: "long",
              })}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Present" value={summary.present} color="green" />
        <Stat label="Absent" value={summary.absent} color="red" />
        <Stat label="Half Day" value={summary.half} color="yellow" />
        <Stat label="Attendance %" value={`${percentage}%`} color="blue" />
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div className={`bg-${color}-100 text-${color}-700 rounded p-4`}>
    <p className="text-sm">{label}</p>
    <h3 className="text-xl font-bold">{value}</h3>
  </div>
);

export default MonthlyAttendanceSummary;
