import { NextRequest, NextResponse } from "next/server";
import {
    anonymousSession,
    anonymousUsage,
    withAnonymousCookie,
} from "@/lib/anonymous-session.server";
import { requestErrorResponse } from "@/lib/request-error.server";

export async function GET(request: NextRequest) {
    try {
        const session = await anonymousSession(request);
        return withAnonymousCookie(
            NextResponse.json(anonymousUsage(session), {
                headers: { "Cache-Control": "no-store" },
            }),
            session.sessionId,
        );
    } catch (error) {
        return requestErrorResponse(error, "Anonymous usage check failed:");
    }
}
