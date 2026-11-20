import type { NextRequest } from "next/server";

type Context = { params: Promise<{ path: string[] }> };
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const intakeEndpoints = new Set([
    "e",
    "s",
    "flags",
    "decide",
    "i/v0/e",
    "i/v0/s",
]);

async function readBody(request: NextRequest): Promise<ArrayBuffer | null> {
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
        return null;
    const reader = request.body?.getReader();
    if (!reader) return new ArrayBuffer(0);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return body.buffer;
}

async function proxy(
    request: NextRequest,
    context: Context,
): Promise<Response> {
    const { path } = await context.params;
    if (path.some((segment) => segment === "." || segment === "..")) {
        return new Response(null, { status: 400 });
    }
    const endpoint = path.join("/");
    const isAsset =
        (path[0] === "static" && path.length > 1) ||
        /^array\/[^/]+\/config(?:\.js)?$/.test(endpoint);
    if (
        !intakeEndpoints.has(endpoint) &&
        !(request.method === "GET" && isAsset)
    ) {
        return new Response(null, { status: 404 });
    }
    const ingestionHost = (
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
    ).replace(/\/$/, "");
    const host =
        path[0] === "static" || path[0] === "array"
            ? ingestionHost.replace(".i.posthog.com", "-assets.i.posthog.com")
            : ingestionHost;
    const suffix = request.nextUrl.pathname.endsWith("/") ? "/" : "";
    const target = `${host}/${path.map(encodeURIComponent).join("/")}${suffix}${request.nextUrl.search}`;
    const headers = new Headers();
    // Forward ingestion metadata, never application credentials or cookies.
    for (const name of ["content-type", "content-encoding", "user-agent"]) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }
    try {
        const body =
            request.method === "POST" ? await readBody(request) : undefined;
        if (body === null) return new Response(null, { status: 413 });
        const response = await fetch(target, {
            method: request.method,
            headers,
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
        });
        const responseHeaders = new Headers();
        for (const name of ["content-type", "cache-control", "etag"]) {
            const value = response.headers.get(name);
            if (value) responseHeaders.set(name, value);
        }
        // fetch may decompress the body; omit encoding/length and upstream cookies.
        return new Response(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch {
        return new Response(null, { status: 502 });
    }
}

export const GET = proxy;
export const POST = proxy;
