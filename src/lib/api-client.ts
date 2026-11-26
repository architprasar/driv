import axios from "axios";
import Cookies from "js-cookie";

export const apiClient = axios.create({
  baseURL: "/api/marketplace",
  timeout: 25000,
  headers: { "Content-Type": "application/json" },
});
apiClient.interceptors.request.use((config) => {
  if (config.url) config.url = config.url.replace(/\/(?=\?|$)/, "");
  return config;
});
let refreshInFlight: Promise<void> | null = null;
async function refreshSession() {
  const version = Cookies.get("session_version");
  const update = async () => {
    if (version !== Cookies.get("session_version")) return;
    await axios.post(
      "/api/marketplace/auth/token/refresh",
      {},
      { timeout: 20000 },
    );
  };
  if (typeof navigator !== "undefined" && navigator.locks)
    await navigator.locks.request("drivio-session-refresh", update);
  else await update();
}
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      /^\/auth\/(login|register|logout|token|password\/|email\/verify)/.test(
        original.url || "",
      )
    )
      return Promise.reject(error);
    original._retry = true;
    try {
      if (!refreshInFlight)
        refreshInFlight = refreshSession().finally(() => {
          refreshInFlight = null;
        });
      await refreshInFlight;
      return apiClient(original);
    } catch (refreshError) {
      if (
        axios.isAxiosError(refreshError) &&
        (!refreshError.response ||
          ![400, 401, 403].includes(refreshError.response.status))
      )
        return Promise.reject(refreshError);
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      )
        window.location.assign(
          new URL(
            `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
            window.location.origin,
          ).href,
        );
      return Promise.reject(refreshError);
    }
  },
);
