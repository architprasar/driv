import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { publicOriginHeaders } from "@/lib/server-origin";

export const runtime = "nodejs";
const namespaces = new Set([
  "auth",
  "cars",
  "parts",
  "auctions",
  "cart",
  "orders",
  "payments",
  "vendors",
  "inspections",
  "valuations",
  "notifications",
  "saved-searches",
  "support",
  "dashboard",
  "core",
  "policies",
  "health",
]);
function session(
  response: NextResponse,
  request: NextRequest,
  tokens: { access?: string; refresh?: string } | null,
) {
  const secure =
    process.env.NODE_ENV === "production" ||
    request.nextUrl.protocol === "https:";
  const options = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  if (tokens) {
    if (tokens.access)
      response.cookies.set("access_token", tokens.access, {
        ...options,
        maxAge: 3600,
      });
    if (tokens.refresh)
      response.cookies.set("refresh_token", tokens.refresh, {
        ...options,
        maxAge: 604800,
      });
    response.cookies.set("session_present", "1", {
      ...options,
      httpOnly: false,
      maxAge: 604800,
    });
    response.cookies.set("session_version", randomUUID(), {
      ...options,
      httpOnly: false,
      maxAge: 604800,
    });
  } else {
    for (const name of [
      "access_token",
      "refresh_token",
      "session_present",
      "session_version",
    ])
      response.cookies.set(name, "", {
        ...options,
        httpOnly: name.endsWith("token"),
        maxAge: 0,
      });
  }
}
async function boundedBody(request: NextRequest): Promise<ArrayBuffer | null> {
  const reader = request.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12 * 1024 * 1024) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const reference = randomUUID();
  const { path } = await context.params;
  if (
    !namespaces.has(path[0]) ||
    path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))
  )
    return NextResponse.json(
      { detail: "This API route is not available." },
      { status: 404 },
    );
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (
    mutation &&
    request.headers.get("origin") !==
      new URL(process.env.FRONTEND_URL || request.nextUrl.origin).origin
  )
    return NextResponse.json(
      { detail: "This request must come from this website." },
      { status: 403 },
    );
  const endpoint = path.join("/");
  const logout = endpoint === "auth/logout";
  const refresh = endpoint === "auth/token/refresh";
  if (endpoint === "payments/webhook" || endpoint === "payments/cashfree/webhook")
    return NextResponse.json(
      { detail: "Payment webhooks use the provider endpoint." },
      { status: 404 },
    );
  if (Number(request.headers.get("content-length") || 0) > 12 * 1024 * 1024)
    return NextResponse.json(
      { detail: "This upload is too large. Choose an image up to 10 MB." },
      { status: 413 },
    );
  const headers = new Headers({
    Accept: "application/json",
    ...publicOriginHeaders(),
    "X-Forwarded-For": request.headers.get("x-real-ip") || "127.0.0.1",
    "X-Forwarded-Proto": publicOriginHeaders()["X-Forwarded-Proto"] || "http",
  });
  if (request.headers.get("content-type"))
    headers.set("Content-Type", request.headers.get("content-type")!);
  const access = request.cookies.get("access_token")?.value;
  if (
    access &&
    !refresh &&
    !logout &&
    !endpoint.match(
      /^auth\/(login|register|password\/forgot|password\/reset|email\/verify)$/,
    )
  )
    headers.set("Authorization", `Bearer ${access}`);
  let body: BodyInit | undefined;
  if (mutation) {
    if (refresh || logout) {
      const token = request.cookies.get("refresh_token")?.value;
      if (refresh && !token) {
        const response = NextResponse.json(
          { detail: "Your session has expired. Please sign in again." },
          { status: 401 },
        );
        session(response, request, null);
        return response;
      }
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(token ? { refresh: token } : {});
    } else {
      try {
        const bytes = await boundedBody(request);
        if (bytes === null)
          return NextResponse.json(
            {
              detail: "This upload is too large. Choose an image up to 10 MB.",
            },
            { status: 413 },
          );
        body = bytes;
      } catch {
        return NextResponse.json(
          {
            detail:
              "The upload was interrupted. Please choose the file and try again.",
          },
          { status: 400 },
        );
      }
    }
  }
  try {
    const target =
      (process.env.API_SERVER_URL || "http://127.0.0.1:8000/api").replace(
        /\/$/,
        "",
      ) +
      "/" +
      endpoint +
      "/" +
      request.nextUrl.search;
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      redirect: "error",
    });
    if (
      upstream.ok &&
      /^vendors\/documents\/\d+\/(business-license|representative-id)$/.test(
        endpoint,
      )
    ) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/octet-stream",
          "Content-Disposition":
            upstream.headers.get("Content-Disposition") || "attachment",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    let payload: Record<string, unknown> = {};
    if (upstream.status !== 204 && request.method !== "HEAD") {
      if (upstream.headers.get("content-type")?.includes("application/json"))
        payload = await upstream.json();
      else
        payload = {
          detail:
            "This service is temporarily unavailable. Check your saved orders before repeating a purchase.",
          request_id: reference,
        };
    }
    const tokens = payload.tokens as
      { access?: string; refresh?: string } | undefined;
    const rotated =
      refresh && typeof payload.access === "string"
        ? {
            access: payload.access,
            refresh: payload.refresh as string | undefined,
          }
        : tokens;
    delete payload.tokens;
    if (refresh) {
      delete payload.access;
      delete payload.refresh;
    }
    const response =
      upstream.status === 204 || request.method === "HEAD"
        ? new NextResponse(null, { status: upstream.status })
        : NextResponse.json(payload, { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set(
      "X-Request-ID",
      upstream.headers.get("X-Request-ID") || reference,
    );
    const retry = upstream.headers.get("Retry-After");
    if (retry) response.headers.set("Retry-After", retry);
    if (upstream.ok && rotated) session(response, request, rotated);
    if (logout || (refresh && [400, 401, 403].includes(upstream.status)))
      session(response, request, null);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        detail:
          "We couldn’t reach the marketplace service. Your saved orders are still available. Check them before repeating a purchase.",
        request_id: reference,
      },
      { status: 503 },
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-ID", reference);
    if (logout) session(response, request, null);
    return response;
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
  handle as HEAD,
  handle as OPTIONS,
};
