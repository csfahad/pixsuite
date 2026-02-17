import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const COOKIE_NAME = "pixsuite-anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function getOrCreateSession() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(COOKIE_NAME)?.value;

    if (sessionId) {
        const session = await prisma.anonymous_sessions.findUnique({
            where: { sessionId },
        });
        if (session) {
            return { session, isNew: false };
        }
    }

    const newSessionId = randomUUID();
    const session = await prisma.anonymous_sessions.create({
        data: {
            sessionId: newSessionId,
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
            usageCount: session.usageCount,
            usageLimit: session.usageLimit,
            canUpload: session.usageCount < session.usageLimit,
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
                    error: "Free usage limit reached",
                    usageCount: session.usageCount,
                    usageLimit: session.usageLimit,
                    canUpload: false,
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
            usageCount: updated.usageCount,
            usageLimit: updated.usageLimit,
            canUpload: updated.usageCount < updated.usageLimit,
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
