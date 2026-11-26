import axios from "axios";
import { publicOriginHeaders } from "./server-origin";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/runtime-config";

const API_URL = getApiBaseUrl();

/**
 * Server-side API client that utilizes Next.js cookies().
 * Use this only in Server Components or Server Actions.
 */
export async function getApiServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const instance = axios.create({
    baseURL: API_URL,
    timeout: 12000,
    headers: {
      "Content-Type": "application/json",
      ...publicOriginHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return instance;
}

// Helper fetch wrapper alternative if you prefer native fetch in RSCs
export async function serverFetch(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const headers = new Headers(options.headers || {});
  for (const [name, value] of Object.entries(publicOriginHeaders()))
    headers.set(name, value);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const optionsWithTimeout = {
    ...options,
    signal: options.signal || AbortSignal.timeout(12000),
  };
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...optionsWithTimeout,
    headers,
  });

  if (
    response.status === 401 &&
    token &&
    (!options.method || options.method === "GET") &&
    /^\/(cars|parts|auctions)\//.test(endpoint)
  ) {
    headers.delete("Authorization");
    response = await fetch(`${API_URL}${endpoint}`, {
      ...optionsWithTimeout,
      headers,
    });
  }

  return response;
}
