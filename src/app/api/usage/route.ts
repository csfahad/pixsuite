import prisma from "@/lib/prisma";
import { PLAN_UPLOAD_LIMITS } from "@/lib/plans";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const token = await getToken({ req: request });

        if (!token?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await prisma.users.findUnique({
            where: { email: token.email as string },
            select: {
                id: true,
                plan: true,
                creditsUsed: true,
                creditLimit: true,
                uploadCount: true,
                uploadLimit: true,
                subscriptionExpiresAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // check if subscription has expired
        const isSubscriptionActive = user.subscriptionExpiresAt
            ? new Date(user.subscriptionExpiresAt) > new Date()
            : false;

        // if subscription expired, reset to Free plan
        if (
            (user.plan === "Starter" || user.plan === "Lite" || user.plan === "Pro") &&
            !isSubscriptionActive
        ) {
            await prisma.users.update({
                where: { id: user.id },
                data: {
                    plan: "Free",
                    creditLimit: 0,
                    creditsUsed: 0,
                    uploadLimit: PLAN_UPLOAD_LIMITS.Free,
                    uploadCount: 0,
                    usageLimit: PLAN_UPLOAD_LIMITS.Free,
                    subscriptionExpiresAt: null,
                },
            });
            return NextResponse.json({
                creditsUsed: 0,
                creditLimit: 0,
                creditsRemaining: 0,
                uploadCount: 0,
                uploadLimit: PLAN_UPLOAD_LIMITS.Free,
                plan: "Free",
                canUpload: true,
                subscriptionExpiresAt: null,
            });
        }

        const creditsRemaining = Math.max(0, user.creditLimit - user.creditsUsed);

        return NextResponse.json({
            creditsUsed: user.creditsUsed,
            creditLimit: user.creditLimit,
            creditsRemaining,
            uploadCount: user.uploadCount,
            uploadLimit: user.uploadLimit,
            plan: user.plan,
            canUpload: user.uploadCount < user.uploadLimit,
            subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
        });
    } catch (err) {
        console.error("Usage check error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const token = await getToken({ req: request });

    if (!token?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
        where: { email: token.email as string },
        select: {
            id: true,
            plan: true,
            creditsUsed: true,
            creditLimit: true,
            uploadCount: true,
            uploadLimit: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // check if user can upload
    if (user.uploadCount >= user.uploadLimit) {
        return NextResponse.json(
            {
                error: "Upload limit reached",
                creditsUsed: user.creditsUsed,
                creditLimit: user.creditLimit,
                creditsRemaining: Math.max(0, user.creditLimit - user.creditsUsed),
                uploadCount: user.uploadCount,
                uploadLimit: user.uploadLimit,
                plan: user.plan,
                canUpload: false,
            },
            { status: 403 }
        );
    }

    // increment upload count
    const updatedUser = await prisma.users.update({
        where: { id: user.id },
        data: {
            uploadCount: user.uploadCount + 1,
            usageCount: user.uploadCount + 1,
        },
        select: {
            creditsUsed: true,
            creditLimit: true,
            uploadCount: true,
            uploadLimit: true,
            plan: true,
        },
    });

    return NextResponse.json({
        creditsUsed: updatedUser.creditsUsed,
        creditLimit: updatedUser.creditLimit,
        creditsRemaining: Math.max(0, updatedUser.creditLimit - updatedUser.creditsUsed),
        uploadCount: updatedUser.uploadCount,
        uploadLimit: updatedUser.uploadLimit,
        plan: updatedUser.plan,
        canUpload: updatedUser.uploadCount < updatedUser.uploadLimit,
    });
}
