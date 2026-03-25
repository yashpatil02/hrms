import { useEffect, useState } from "react";
import api from "../api/axios";

const STATUS_STYLE = {
  FULL: "bg-green-200 text-green-800",
  HALF: "bg-yellow-200 text-yellow-800",
  ABSENT: "bg-red-200 text-red-800",
};

const AttendanceCalendar = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [records, setRecords] = useState({});

  useEffect(() => {
    loadAttendance();
  }, [month, year]);

  const loadAttendance = async () => {
    const res = await api.get(
      `/employee/attendance?month=${month}&year=${year}`
    );

    const map = {};
    res.data.forEach((r) => {
      const day = new Date(r.date).getDate();
      map[day] = r.dayType;
    });

    setRecords(map);
  };

  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4">
        Attendance Calendar
      </h2>

      {/* Month Selector */}
      <div className="flex gap-3 mb-4">
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 text-sm">
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const status = records[day];

          return (
            <div
              key={day}
              className={`h-16 rounded flex items-center justify-center font-semibold
              ${status ? STATUS_STYLE[status] : "bg-gray-100 text-gray-400"}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceCalendar;
