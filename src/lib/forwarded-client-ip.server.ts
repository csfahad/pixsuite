import { isIP } from "node:net";

export function forwardedClientIp(
    request: Pick<Request, "headers">,
): string | null {
    const trusted =
        process.env.NODE_ENV !== "production" ||
        process.env.VERCEL === "1" ||
        process.env.TRUST_PROXY_HEADERS === "true";
    if (!trusted) return null;
    const value = (
        request.headers.get("x-vercel-forwarded-for") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip")
    )
        ?.split(",")[0]
        .trim();
    return value && isIP(value) ? value : null;
}
