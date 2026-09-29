import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://project-attendace-production.up.railway.app",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor untuk menyisipkan token otomatis
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`; //[cite: 1]
  }
  return config;
});

// Interceptor untuk handle 401 Unauthorized[cite: 1]
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token"); //[cite: 1]
      localStorage.removeItem("user");
      window.location.href = "/login"; //[cite: 1]
    }
    return Promise.reject(error);
  }
);

export default api;
