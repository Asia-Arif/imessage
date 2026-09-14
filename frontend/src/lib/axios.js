import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let getClerkToken = async () => null;

export function setClerkGetToken(getToken) {
  getClerkToken = getToken || (async () => null);
}

export const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
