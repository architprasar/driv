/** Trusted deployment origin for server-to-server requests through the TLS gateway. */
export function publicOriginHeaders(): Record<string, string> {
  if (process.env.NODE_ENV !== "production") return {};
  const configured =
    process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_ORIGIN;
  if (!configured) return { "X-Forwarded-Proto": "https" };
  const origin = new URL(configured);
  return {
    "X-Forwarded-Host": origin.host,
    "X-Forwarded-Proto": origin.protocol.replace(":", ""),
  };
}
