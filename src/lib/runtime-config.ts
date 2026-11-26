const LOCAL_BACKEND_ORIGIN = "http://127.0.0.1:8000";

export function getApiOrigin(): string {
  const explicitOrigin = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, "");

  const explicitApiBase = process.env.NEXT_PUBLIC_API_URL;
  if (explicitApiBase) {
    try {
      return new URL(explicitApiBase).origin;
    } catch {
      // Ignore invalid env and continue fallback chain.
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return LOCAL_BACKEND_ORIGIN;
}

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return (process.env.API_SERVER_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
  }
  const explicitApiBase = process.env.NEXT_PUBLIC_API_URL;
  if (explicitApiBase) return explicitApiBase.replace(/\/$/, "");
  return `${getApiOrigin()}/api`;
}

export function getWsBaseUrl(): string {
  const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
  if (explicitWs) return explicitWs.replace(/\/$/, "");

  const origin = getApiOrigin();
  return origin.startsWith("https://")
    ? origin.replace("https://", "wss://")
    : origin.replace("http://", "ws://");
}

const INTERNAL_ORIGINS = ["http://127.0.0.1:8000", "http://localhost:8000"];

export function getMediaUrl(path?: string | null): string {
  if (!path) return "";
  const publicOrigin = process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
    : null;
  if (/^https?:\/\//i.test(path)) {
    if (publicOrigin) {
      for (const internal of INTERNAL_ORIGINS) {
        if (path.startsWith(internal)) {
          return publicOrigin + path.slice(internal.length);
        }
      }
    }
    return path;
  }
  return `${publicOrigin || getApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
