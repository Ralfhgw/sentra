import { NextRequest, NextResponse } from "next/server";

const MANIFEST_CONTENT_TYPES = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl",
];

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const rewriteUriAttribute = (line: string, baseUrl: URL, origin: string) => {
  return line.replace(/URI="([^"]+)"/g, (_, uriValue: string) => {
    try {
      const resolved = new URL(uriValue, baseUrl).toString();
      const proxied = `${origin}/api/stream-proxy?url=${encodeURIComponent(resolved)}`;
      return `URI="${proxied}"`;
    } catch {
      return `URI="${uriValue}"`;
    }
  });
};

const rewriteManifest = (manifest: string, baseUrl: URL, origin: string) => {
  return manifest
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (trimmed.startsWith("#")) {
        if (trimmed.includes('URI="')) {
          return rewriteUriAttribute(line, baseUrl, origin);
        }
        return line;
      }

      try {
        const resolved = new URL(trimmed, baseUrl).toString();
        return `${origin}/api/stream-proxy?url=${encodeURIComponent(resolved)}`;
      } catch {
        return line;
      }
    })
    .join("\n");
};

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");

  if (!target || !ABSOLUTE_URL_PATTERN.test(target)) {
    return NextResponse.json({ error: "Missing or invalid url parameter" }, { status: 400 });
  }

  const targetUrl = new URL(target);

  const forwardedHeaders = new Headers();
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    forwardedHeaders.set("range", rangeHeader);
  }

  const upstream = await fetch(targetUrl, {
    headers: forwardedHeaders,
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream request failed with status ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const isManifest = MANIFEST_CONTENT_TYPES.some((type) => contentType.includes(type));

  const responseHeaders = new Headers();
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Cache-Control", "no-store");

  if (isManifest) {
    const manifest = await upstream.text();
    const rewrittenManifest = rewriteManifest(
      manifest,
      targetUrl,
      request.nextUrl.origin
    );

    responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
    return new NextResponse(rewrittenManifest, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  if (contentType) {
    responseHeaders.set("Content-Type", contentType);
  }

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    responseHeaders.set("Content-Length", contentLength);
  }

  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) {
    responseHeaders.set("Accept-Ranges", acceptRanges);
  }

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) {
    responseHeaders.set("Content-Range", contentRange);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}