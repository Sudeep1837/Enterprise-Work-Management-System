const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

export function isLocalBackendUrl(value) {
  if (!value) return false;

  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function isLocalFrontendRuntime() {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function buildApiBaseUrl(rawUrl) {
  const baseUrl = normalizeBaseUrl(rawUrl);
  if (!baseUrl) return "";
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

const rawApiUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
const rawSocketUrl = normalizeBaseUrl(import.meta.env.VITE_SOCKET_URL);
const hasApiUrl = Boolean(rawApiUrl);
const hasSocketUrl = Boolean(rawSocketUrl);
const apiUsesLocalBackend = isLocalBackendUrl(rawApiUrl);
const socketUsesLocalBackend = isLocalBackendUrl(rawSocketUrl);
const localFrontendRuntime = isLocalFrontendRuntime();

export const env = {
  apiUrl: rawApiUrl,
  socketUrl: rawSocketUrl,
  apiBaseUrl: buildApiBaseUrl(rawApiUrl),
  socketBaseUrl: rawSocketUrl,
  hasApiUrl,
  hasSocketUrl,
  apiUsable: hasApiUrl && (!apiUsesLocalBackend || localFrontendRuntime),
  socketUsable: hasSocketUrl && (!socketUsesLocalBackend || localFrontendRuntime),
  apiUnavailableMessage: !hasApiUrl
    ? "Backend API URL is not configured. Set VITE_API_URL to enable API features."
    : "This deployed frontend is configured to use a local backend URL. Set VITE_API_URL to a deployed backend before using API features here.",
  socketUnavailableMessage: !hasSocketUrl
    ? "Socket URL is not configured. Set VITE_SOCKET_URL to enable realtime updates."
    : "Realtime updates are configured for a local backend and are disabled in this deployed frontend.",
};
