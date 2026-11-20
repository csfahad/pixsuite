import { NextRequest, NextResponse } from "next/server";
import { requestUserId } from "@/lib/request-user.server";
import { anonymousSession } from "@/lib/anonymous-session.server";
import { currentUserUsage, synchronizeFreeTrial } from "@/lib/usage.server";
import { requestErrorResponse } from "@/lib/request-error.server";

export async function POST(request: NextRequest) {
    try {
        const userId = await requestUserId(request);
        const user = await currentUserUsage(userId);
        // Keep the anonymous budget when a paid user signs in or out.
        if (user.plan !== "Free")
            return NextResponse.json({ transferred: false });
        const session = await anonymousSession(request);
        const result = await synchronizeFreeTrial(userId, session.id);
        return NextResponse.json(
            result
                ? { transferred: true, uploadCount: result.usage.uploadCount }
                : { transferred: false },
        );
    } catch (error) {
        return requestErrorResponse(error, "Usage transfer failed:");
    }
}
