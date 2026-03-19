import { NextRequest, NextResponse } from "next/server";
import { applyAuthServiceHeaders } from "@/utils/authHeaders";

const AUTH_HOST = process.env.AUTH_HOST ?? process.env.NEXT_PUBLIC_AUTH_HOST;

if (!AUTH_HOST) {
  throw new Error("Missing AUTH_HOST (or NEXT_PUBLIC_AUTH_HOST) env var");
}

function copySetCookieHeaders(upstream: Response, response: NextResponse) {
  const getSetCookie = (
    upstream.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;

  if (typeof getSetCookie === "function") {
    for (const value of getSetCookie.call(upstream.headers)) {
      response.headers.append("set-cookie", value);
    }
    return;
  }

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }
}

export async function forwardAuthRequest(
  req: NextRequest,
  path: string
): Promise<NextResponse> {
  const contentType = req.headers.get("content-type");
  const cookie = req.headers.get("cookie");
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const upstreamHeaders = new Headers();
  if (contentType) {
    upstreamHeaders.set("content-type", contentType);
  }
  if (cookie) {
    upstreamHeaders.set("cookie", cookie);
  }

  applyAuthServiceHeaders(upstreamHeaders);

  const upstream = await fetch(`${AUTH_HOST}${path}`, {
    method: req.method,
    headers: upstreamHeaders,
    body,
    cache: "no-store",
  });

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
  });

  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    response.headers.set("content-type", upstreamContentType);
  }

  copySetCookieHeaders(upstream, response);
  return response;
}