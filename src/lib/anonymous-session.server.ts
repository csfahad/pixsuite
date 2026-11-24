import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { isDatabaseConflict } from "./transaction.server";
import { RequestError } from "./request-error.server";
import { forwardedClientIp } from "./forwarded-client-ip.server";

export const ANONYMOUS_COOKIE = "pixsuite-anon";

export function clientIp(request: NextRequest): string | null {
    return (
        forwardedClientIp(request) ??
        (process.env.NODE_ENV === "production" ? null : "127.0.0.1")
    );
}

export async function anonymousSession(request: NextRequest) {
    const ip = clientIp(request);
    const secret = process.env.NEXTAUTH_SECRET;
    if (!ip || !secret)
        throw new RequestError(503, "Free uploads are temporarily unavailable");
    const sessionId = createHmac("sha256", secret)
        .update(`pixsuite-trial:${ip}`)
        .digest("hex");
    const id = sessionId.slice(0, 24);
    let session = await prisma.anonymous_sessions.findUnique({ where: { id } });
    if (!session) {
        const legacy = await prisma.anonymous_sessions.findFirst({
            where: { ipAddress: ip },
            orderBy: { usageCount: "desc" },
        });
        try {
            session = await prisma.anonymous_sessions.create({
                data: {
                    id,
                    sessionId,
                    ipAddress: ip,
                    usageCount: legacy?.usageCount ?? 0,
                    usageLimit: 3,
                },
            });
        } catch (error) {
            if (!isDatabaseConflict(error)) throw error;
            session = await prisma.anonymous_sessions.findUnique({
                where: { id },
            });
            if (!session) throw error;
        }
    }
    return session;
}

export function anonymousUsage(session: {
    usageCount: number;
    usageLimit: number;
}) {
    return {
        uploadCount: session.usageCount,
        uploadLimit: session.usageLimit,
        canUpload: session.usageCount < session.usageLimit,
        creditsUsed: 0,
        creditLimit: 0,
        creditsRemaining: 0,
        plan: "Free",
    };
}

export function withAnonymousCookie(response: NextResponse, sessionId: string) {
    response.cookies.set(ANONYMOUS_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
    });
    return response;
}

export async function reserveAnonymousUpload(request: NextRequest) {
    const session = await anonymousSession(request);
    const reserved = await prisma.anonymous_sessions.updateMany({
        where: { id: session.id, usageCount: { lt: session.usageLimit } },
        data: { usageCount: { increment: 1 } },
    });
    const updated = await prisma.anonymous_sessions.findUnique({
        where: { id: session.id },
    });
    if (!updated)
        throw new RequestError(409, "Trial allowance changed. Please retry.");
    if (reserved.count !== 1)
        throw new RequestError(
            403,
            "Free upload limit reached",
            anonymousUsage(updated),
        );
    return updated;
}
