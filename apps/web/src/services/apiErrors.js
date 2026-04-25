import axios from "axios";

export function apiUnavailableError(message) {
  const error = new Error(message);
  error.code = "EWMS_API_UNAVAILABLE";
  error.isApiUnavailable = true;
  return error;
}

export function getApiErrorMessage(error, fallback = "Request failed") {
  return error?.response?.data?.message || error?.message || fallback;
}

export function normalizeApiError(error) {
  if (axios.isCancel(error)) return Promise.reject(error);

  if (error?.isApiUnavailable) {
    return Promise.reject(error);
  }

  if (!error?.response) {
    return Promise.reject(
      apiUnavailableError(
        "Cannot reach the backend API right now. If this frontend is deployed before the backend, public pages still work and API features will become available after VITE_API_URL points to the deployed backend.",
      ),
    );
  }

  return Promise.reject(error);
}
