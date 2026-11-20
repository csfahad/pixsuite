import { NextRequest, NextResponse } from "next/server";
import { reserveCredits } from "@/lib/credits.server";
import { requestUserId } from "@/lib/request-user.server";
import { RequestError, requestErrorResponse } from "@/lib/request-error.server";

export async function POST(request: NextRequest) {
    try {
        const userId = await requestUserId(request);
        const body = await request.json().catch(() => null);
        if (typeof body?.featureId !== "string" || body.featureId.length > 100)
            throw new RequestError(400, "Invalid featureId");
        return NextResponse.json(await reserveCredits(userId, body.featureId));
    } catch (error) {
        return requestErrorResponse(error, "Credit deduction failed:");
    }
}
