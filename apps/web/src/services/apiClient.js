import axios from "axios";
import { apiUnavailableError, normalizeApiError } from "./apiErrors";
import { env } from "./env";

const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  if (!env.apiUsable) {
    return Promise.reject(apiUnavailableError(env.apiUnavailableMessage));
  }

  const token = localStorage.getItem("ewms:token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use((response) => response, normalizeApiError);

export default apiClient;
