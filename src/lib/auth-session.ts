import { apiClient } from "./api-client";
export function safeDestination(value: string | null, fallback = "/profile") {
  if (!value || typeof window === "undefined") return fallback;
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin &&
      !url.pathname.startsWith("/login")
      ? url.pathname + url.search
      : fallback;
  } catch {
    return fallback;
  }
}
export async function signOut() {
  await apiClient.post("/auth/logout/", {});
}
