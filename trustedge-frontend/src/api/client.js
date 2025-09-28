import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE,
});

// attach token if present
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("te_token");
  if (raw) config.headers.Authorization = `Bearer ${raw}`;
  return config;
});

export const handleError = (err) => {
  if (err.response) {
    const msg = typeof err.response.data === "string"
      ? err.response.data
      : err.response.data?.detail || JSON.stringify(err.response.data);
    throw new Error(msg);
  }
  throw new Error(err.message || "Network error");
};
