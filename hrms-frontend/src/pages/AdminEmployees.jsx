// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import api from "../api/axios";

// const shifts = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];

// const AdminEmployees = () => {
//   const [employees, setEmployees] = useState([]);
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     password: "",
//     shift: "GENERAL",
//   });

//   useEffect(() => {
//     loadEmployees();
//   }, []);

//   const loadEmployees = async () => {
//     const res = await api.get("/admin/employees");
//     setEmployees(res.data);
//   };

//   const addEmployee = async () => {
//     if (!form.name || !form.email || !form.password) {
//       alert("All fields required");
//       return;
//     }

//     await api.post("/admin/employees", {
//       ...form,
//       role: "EMPLOYEE",
//     });

//     setForm({ name: "", email: "", password: "", shift: "GENERAL" });
//     loadEmployees();
//   };

//   return (
//     <Layout>
//       <h1 className="text-2xl font-bold mb-6">Employee Master</h1>

//       {/* Add Employee */}
//       <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-5 gap-4">
//         <input
//           placeholder="Name"
//           className="border p-2"
//           value={form.name}
//           onChange={(e) => setForm({ ...form, name: e.target.value })}
//         />
//         <input
//           placeholder="Email"
//           className="border p-2"
//           value={form.email}
//           onChange={(e) => setForm({ ...form, email: e.target.value })}
//         />
//         <input
//           placeholder="Password"
//           className="border p-2"
//           value={form.password}
//           onChange={(e) => setForm({ ...form, password: e.target.value })}
//         />
//         <select
//           className="border p-2"
//           value={form.shift}
//           onChange={(e) => setForm({ ...form, shift: e.target.value })}
//         >
//           {shifts.map((s) => (
//             <option key={s}>{s}</option>
//           ))}
//         </select>
//         <button
//           onClick={addEmployee}
//           className="bg-blue-600 text-white rounded"
//         >
//           Add
//         </button>
//       </div>

//       {/* Employees Table */}
//       <table className="w-full border bg-white">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Name</th>
//             <th className="border p-2">Email</th>
//             <th className="border p-2">Shift</th>
//           </tr>
//         </thead>
//         <tbody>
//           {employees.map((e) => (
//             <tr key={e.id}>
//               <td className="border p-2">{e.name}</td>
//               <td className="border p-2">{e.email}</td>
//               <td className="border p-2">{e.shift}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </Layout>
//   );
// };

// export default AdminEmployees;
