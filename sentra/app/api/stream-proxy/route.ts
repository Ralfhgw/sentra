import { NextRequest, NextResponse } from "next/server";

const MANIFEST_CONTENT_TYPES = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl",
];

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const MEDIA_SEGMENT_PATH_PATTERN = /\.(ts|m4s|mp4|aac|mp3|vtt)$/i;
const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504]);
const SEGMENT_FETCH_ATTEMPTS = 2;
const SEGMENT_RETRY_DELAY_MS = 150;

const buildProxyPath = (resolvedUrl: string) => `/api/stream-proxy?url=${encodeURIComponent(resolvedUrl)}`;

const isMediaSegmentRequest = (targetUrl: URL) =>
  MEDIA_SEGMENT_PATH_PATTERN.test(targetUrl.pathname);

const isAbortLikeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name === "aborterror" ||
    message.includes("responseaborted") ||
    message.includes("aborted")
  );
};

const waitForRetry = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
      return;
    }

    const timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
      const error = new Error("Aborted");
     error.name = "AbortError";
      reject(error);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });

const rewriteUriAttribute = (line: string, baseUrl: URL) => {
  return line.replace(/URI="([^"]+)"/g, (_, uriValue: string) => {
    try {
      const resolved = new URL(uriValue, baseUrl).toString();
      return `URI="${buildProxyPath(resolved)}"`;
    } catch {
      return `URI="${uriValue}"`;
    }
  });
};

const rewriteManifest = (manifest: string, baseUrl: URL) => {
  return manifest
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (trimmed.startsWith("#")) {
        if (trimmed.includes('URI="')) {
          return rewriteUriAttribute(line, baseUrl);
        }
        return line;
      }

      try {
        const resolved = new URL(trimmed, baseUrl).toString();
        return buildProxyPath(resolved);
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

  const shouldRetrySegmentFetch = isMediaSegmentRequest(targetUrl);
  const maxAttempts = shouldRetrySegmentFetch ? SEGMENT_FETCH_ATTEMPTS : 1;
  let upstream: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      upstream = await fetch(targetUrl, {
        headers: forwardedHeaders,
        cache: "no-store",
        signal: request.signal,
      });
    } catch (error) {
      if (request.signal.aborted || isAbortLikeError(error)) {
        return new NextResponse(null, { status: 499 });
      }

      if (attempt < maxAttempts) {
       await waitForRetry(SEGMENT_RETRY_DELAY_MS, request.signal);
        continue;
      }

     console.error("stream-proxy upstream fetch failed:", error);
      return NextResponse.json(
        { error: "Upstream request failed before headers were received" },
        { status: 502 }
      );
    }

    if (!RETRYABLE_UPSTREAM_STATUSES.has(upstream.status) || attempt === maxAttempts) {
      break;
    }

    upstream.body?.cancel().catch(() => {});
    await waitForRetry(SEGMENT_RETRY_DELAY_MS, request.signal);
  }

  if (!upstream) {
    return NextResponse.json(
      { error: "Upstream request could not be completed" },
      { status: 502 }
    );
 }

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
    let manifest: string;

    try {
      manifest = await upstream.text();
    } catch (error) {
      if (request.signal.aborted || isAbortLikeError(error)) {
        return new NextResponse(null, { status: 499, headers: responseHeaders });
      }

      console.error("stream-proxy manifest read failed:", error);
      return NextResponse.json(
       { error: "Upstream manifest could not be read" },
        { status: 502 }
      );
    }

    const rewrittenManifest = rewriteManifest(manifest, targetUrl);

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