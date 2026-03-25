// import { useState } from "react";
// import Layout from "../components/Layout";
// import api from "../api/axios";

// const shifts = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];

// const ShiftAttendance = () => {
//   const [shift, setShift] = useState("");
//   const [date, setDate] = useState("");
//   const [records, setRecords] = useState([]);

//   const loadData = async () => {
//     const res = await api.get(
//       `/admin/shift-attendance?shift=${shift}&date=${date}`
//     );
//     setRecords(res.data);
//   };

//   return (
//     <Layout>
//       <h1 className="text-2xl font-bold mb-6">
//         Shift-wise Attendance
//       </h1>

//       <div className="flex gap-4 mb-4">
//         <input
//           type="date"
//           className="border p-2"
//           onChange={(e) => setDate(e.target.value)}
//         />
//         <select
//           className="border p-2"
//           onChange={(e) => setShift(e.target.value)}
//         >
//           <option value="">Shift</option>
//           {shifts.map((s) => (
//             <option key={s}>{s}</option>
//           ))}
//         </select>
//         <button
//           onClick={loadData}
//           className="bg-blue-600 text-white px-4 rounded"
//         >
//           View
//         </button>
//       </div>

//       <table className="w-full border bg-white">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Name</th>
//             <th className="border p-2">Shift</th>
//             <th className="border p-2">Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {records.map((r) => (
//             <tr key={r.id}>
//               <td className="border p-2">{r.user.name}</td>
//               <td className="border p-2">{r.user.shift}</td>
//               <td className="border p-2">{r.status}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </Layout>
//   );
// };

// export default ShiftAttendance;
