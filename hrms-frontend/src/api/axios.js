import axios from "axios";

/* =========================
   BASE URL
========================= */
const BASE_URL =
  import.meta.env.VITE_API_URL || // production (Vercel)
  "http://localhost:5000/api"; // local fallback

/* =========================
   AXIOS INSTANCE
========================= */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

/* =========================
   REQUEST INTERCEPTOR
========================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      const user = localStorage.getItem("user");

      if (!user) {
        return Promise.reject();
      }

      // OPTIONAL AUTO LOGOUT
      // localStorage.clear();
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;