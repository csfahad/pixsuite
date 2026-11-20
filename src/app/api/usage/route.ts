import { NextRequest, NextResponse } from "next/server";
import { currentUserUsage, usageResponse } from "@/lib/usage.server";
import { requestUserId } from "@/lib/request-user.server";
import { requestErrorResponse } from "@/lib/request-error.server";

export async function GET(request: NextRequest) {
    try {
        const userId = await requestUserId(request);
        return NextResponse.json(
            usageResponse(await currentUserUsage(userId)),
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return requestErrorResponse(error, "Usage check failed:");
    }
}
