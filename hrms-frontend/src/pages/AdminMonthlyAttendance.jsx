import { useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

const AdminMonthlyAttendance = () => {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    if (!month || !year) {
      alert("Select month and year");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(
        `/admin/monthly-summary?month=${month}&year=${year}`
      );
      setData(res.data);
    } catch {
      alert("Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Monthly Attendance Summary
      </h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Month</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border p-2 rounded w-28"
        />

        <button
          onClick={fetchSummary}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          View
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Analyst</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Present</th>
              <th className="border p-2">Full Days</th>
              <th className="border p-2">Half Days</th>
              <th className="border p-2">Absent</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-4">
                  No data
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.userId}>
                  <td className="border p-2">{row.name}</td>
                  <td className="border p-2">{row.email}</td>
                  <td className="border p-2">{row.presentDays}</td>
                  <td className="border p-2">{row.fullDays}</td>
                  <td className="border p-2">{row.halfDays}</td>
                  <td className="border p-2">{row.absentDays}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default AdminMonthlyAttendance;
