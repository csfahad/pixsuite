import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const COOKIE_NAME = "pixsuite-anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function getClientIp(): Promise<string | null> {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return headerStore.get("x-real-ip") ?? null;
}

async function getOrCreateSession() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(COOKIE_NAME)?.value;
    const clientIp = await getClientIp();

    // 1. try cookie-based lookup
    if (sessionId) {
        const session = await prisma.anonymous_sessions.findUnique({
            where: { sessionId },
        });
        if (session) {
            // keep ipAddress up-to-date
            if (clientIp && session.ipAddress !== clientIp) {
                await prisma.anonymous_sessions.update({
                    where: { id: session.id },
                    data: { ipAddress: clientIp },
                });
            }
            return { session, isNew: false };
        }
    }

    // 2. cookie missing or stale — fall back to IP lookup for exhausted sessions
    if (clientIp) {
        const exhaustedSession = await prisma.anonymous_sessions.findFirst({
            where: {
                ipAddress: clientIp,
                usageCount: { gte: 3 },
            },
            orderBy: { updatedAt: "desc" },
        });

        if (exhaustedSession) {
            return {
                session: exhaustedSession,
                isNew: true,
                newSessionId: exhaustedSession.sessionId,
            };
        }
    }

    // 3. truly new visitor — create a fresh session
    const newSessionId = randomUUID();
    const session = await prisma.anonymous_sessions.create({
        data: {
            sessionId: newSessionId,
            ipAddress: clientIp,
            usageCount: 0,
            usageLimit: 3,
        },
    });

    return { session, isNew: true, newSessionId };
}

function setCookieIfNew(
    response: NextResponse,
    isNew: boolean,
    newSessionId?: string
) {
    if (isNew && newSessionId) {
        response.cookies.set(COOKIE_NAME, newSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: COOKIE_MAX_AGE,
            path: "/",
        });
    }
    return response;
}

export async function GET() {
    try {
        const { session, isNew, newSessionId } = await getOrCreateSession();

        const response = NextResponse.json({
            uploadCount: session.usageCount,
            uploadLimit: session.usageLimit,
            canUpload: session.usageCount < session.usageLimit,
            creditsUsed: 0,
            creditLimit: 0,
            creditsRemaining: 0,
            plan: "Free",
        });

        return setCookieIfNew(response, isNew, newSessionId);
    } catch (err) {
        console.error("Free usage check error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        const { session, isNew, newSessionId } = await getOrCreateSession();

        if (session.usageCount >= session.usageLimit) {
            const response = NextResponse.json(
                {
                    error: "Free upload limit reached",
                    uploadCount: session.usageCount,
                    uploadLimit: session.usageLimit,
                    canUpload: false,
                    creditsUsed: 0,
                    creditLimit: 0,
                    creditsRemaining: 0,
                    plan: "Free",
                },
                { status: 403 }
            );
            return setCookieIfNew(response, isNew, newSessionId);
        }

        const updated = await prisma.anonymous_sessions.update({
            where: { id: session.id },
            data: { usageCount: session.usageCount + 1 },
        });

        const response = NextResponse.json({
            uploadCount: updated.usageCount,
            uploadLimit: updated.usageLimit,
            canUpload: updated.usageCount < updated.usageLimit,
            creditsUsed: 0,
            creditLimit: 0,
            creditsRemaining: 0,
            plan: "Free",
        });

        return setCookieIfNew(response, isNew, newSessionId);
    } catch (err) {
        console.error("Free usage increment error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
