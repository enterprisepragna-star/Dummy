import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const tok = localStorage.getItem("oncost_token");
  if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  return cfg;
});

export default api;

export const imageUrl = (filename) => (filename ? `${API}/images/${filename}` : null);

export const formatINR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹ ${Number(n).toLocaleString("en-IN")}`;
};

export const shareLink = (token) => `${window.location.origin}/q/${token}`;
