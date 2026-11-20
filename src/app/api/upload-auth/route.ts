import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUploadAuthParams } from "@imagekit/next/server";
import { reserveUserUpload, usageResponse } from "@/lib/usage.server";
import {
    anonymousUsage,
    reserveAnonymousUpload,
    withAnonymousCookie,
} from "@/lib/anonymous-session.server";
import { requestUserId } from "@/lib/request-user.server";
import { RequestError, requestErrorResponse } from "@/lib/request-error.server";

export async function POST(request: NextRequest) {
    try {
        const userId = await requestUserId(request, true);
        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
        if (!privateKey || !publicKey)
            throw new RequestError(503, "Uploads are temporarily unavailable");
        // ImageKit expires are Unix timestamps and tokens can be used for one upload.
        const auth = getUploadAuthParams({
            privateKey,
            publicKey,
            token: randomUUID(),
            expire: Math.floor(Date.now() / 1000) + 300,
        });
        // Never return credentials until the allowance is atomically reserved.
        if (userId) {
            const usage = usageResponse(
                await reserveUserUpload(userId, request),
            );
            return NextResponse.json(
                { ...auth, publicKey, usage },
                { headers: { "Cache-Control": "no-store" } },
            );
        }
        const session = await reserveAnonymousUpload(request);
        return withAnonymousCookie(
            NextResponse.json(
                { ...auth, publicKey, usage: anonymousUsage(session) },
                {
                    headers: { "Cache-Control": "no-store" },
                },
            ),
            session.sessionId,
        );
    } catch (error) {
        const response = requestErrorResponse(
            error,
            "Upload authorization failed:",
        );
        response.headers.set("Cache-Control", "no-store");
        return response;
    }
}
