import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const COOKIE_NAME = "pixsuite-anon";

async function getClientIp(): Promise<string | null> {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return headerStore.get("x-real-ip") ?? null;
}

export async function POST(request: NextRequest) {
    try {
        const token = await getToken({ req: request });

        if (!token?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const cookieStore = await cookies();
        const sessionId = cookieStore.get(COOKIE_NAME)?.value;
        const clientIp = await getClientIp();

        // try cookie-based lookup first, then fall back to IP
        let anonSession = null;

        if (sessionId) {
            anonSession = await prisma.anonymous_sessions.findUnique({
                where: { sessionId },
            });
        }

        // if no cookie match, try IP-based lookup for exhausted sessions
        if (!anonSession && clientIp) {
            anonSession = await prisma.anonymous_sessions.findFirst({
                where: {
                    ipAddress: clientIp,
                    usageCount: { gte: 3 },
                },
                orderBy: { updatedAt: "desc" },
            });
        }

        if (!anonSession) {
            const response = NextResponse.json({
                transferred: false,
                message: "No anonymous session found",
            });
            return response;
        }

        const user = await prisma.users.findUnique({
            where: { email: token.email as string },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // transfer: use the higher of the two usage counts
        const newUsageCount = Math.max(user.usageCount, anonSession.usageCount);

        await prisma.users.update({
            where: { id: user.id },
            data: { usageCount: newUsageCount },
        });

        await prisma.anonymous_sessions.update({
            where: { id: anonSession.id },
            data: {
                usageCount: newUsageCount,
                ipAddress: clientIp ?? anonSession.ipAddress,
            },
        });

        const response = NextResponse.json({
            transferred: true,
            usageCount: newUsageCount,
        });

        return response;
    } catch (err) {
        console.error("Transfer usage error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

