import prisma from "@/lib/prisma";
import {
    getFeatureCreditCost,
    isFeatureAvailable,
    MAX_CREDITS_PER_EDIT,
    CREDIT_COSTS,
    FEATURE_MIN_PLAN,
    type PlanType,
} from "@/lib/plans";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const token = await getToken({ req: request });

        if (!token?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const featureId = body.featureId as string;

        if (!featureId) {
            return NextResponse.json(
                { error: "Missing featureId" },
                { status: 400 }
            );
        }

        const creditCost = getFeatureCreditCost(featureId);
        if (creditCost < 0) {
            return NextResponse.json(
                { error: `Unknown feature: ${featureId}` },
                { status: 400 }
            );
        }

        if (creditCost === 0) {
            return NextResponse.json({
                success: true,
                creditCost: 0,
                message: "Free feature — no credits deducted",
            });
        }

        if (creditCost > MAX_CREDITS_PER_EDIT) {
            return NextResponse.json(
                { error: `Feature exceeds max credits per edit (${MAX_CREDITS_PER_EDIT})` },
                { status: 400 }
            );
        }

        const user = await prisma.users.findUnique({
            where: { email: token.email as string },
            select: {
                id: true,
                plan: true,
                creditsUsed: true,
                creditLimit: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const userPlan = user.plan as PlanType;

        if (!isFeatureAvailable(featureId, userPlan)) {
            const minPlan = FEATURE_MIN_PLAN[featureId] || "Lite";
            return NextResponse.json(
                {
                    error: "Feature not available on your plan",
                    requiredPlan: minPlan,
                    currentPlan: userPlan,
                    featureId,
                },
                { status: 403 }
            );
        }

        const creditsRemaining = user.creditLimit - user.creditsUsed;
        if (creditsRemaining < creditCost) {
            return NextResponse.json(
                {
                    error: "Insufficient credits",
                    creditsRemaining,
                    creditCost,
                    creditsUsed: user.creditsUsed,
                    creditLimit: user.creditLimit,
                    plan: user.plan,
                },
                { status: 403 }
            );
        }

        const updatedUser = await prisma.users.update({
            where: { id: user.id },
            data: {
                creditsUsed: user.creditsUsed + creditCost,
            },
            select: {
                creditsUsed: true,
                creditLimit: true,
                plan: true,
            },
        });

        return NextResponse.json({
            success: true,
            creditCost,
            creditsUsed: updatedUser.creditsUsed,
            creditLimit: updatedUser.creditLimit,
            creditsRemaining: updatedUser.creditLimit - updatedUser.creditsUsed,
            plan: updatedUser.plan,
        });
    } catch (err: any) {
        console.error("Deduct credits error:", err);
        return NextResponse.json(
            { error: "Internal server error", details: err.message },
            { status: 500 }
        );
    }
}
