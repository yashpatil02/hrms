import { useEffect, useState } from "react";
import api from "../api/axios";
import { FaTimes, FaHistory } from "react-icons/fa";

const ShiftHistoryModal = ({ analyst, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (analyst) {
      loadHistory();
    }
    // eslint-disable-next-line
  }, [analyst]);

  const loadHistory = async () => {
    try {
      const res = await api.get(
        `/analysts/${analyst.id}/shift-history`
      );
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load shift history");
    } finally {
      setLoading(false);
    }
  };

  if (!analyst) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b px-4 py-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            Shift History – {analyst.name}
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black"
          >
            <FaTimes />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center">
              No shift history found
            </p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Month</th>
                  <th className="border p-2">Year</th>
                  <th className="border p-2">Shift</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="border p-2 text-center">
                      {new Date(0, h.month - 1).toLocaleString("en", {
                        month: "long",
                      })}
                    </td>
                    <td className="border p-2 text-center">
                      {h.year}
                    </td>
                    <td className="border p-2 text-center font-semibold">
                      {h.shift}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t px-4 py-3 text-right">
          <button
            onClick={onClose}
            className="bg-gray-200 px-4 py-1 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftHistoryModal;
