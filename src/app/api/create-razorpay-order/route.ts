import { razorpayClient } from "@/lib/razorpay.server";
import { currentUserUsage } from "@/lib/usage.server";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUpgradeAmount, isUpgrade, type PlanType } from "@/lib/plans";

export async function POST(request: NextRequest) {
    try {
        const token = await getToken({ req: request });

        if (!token?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const user = await prisma.users.findUnique({
            where: { email: token.email as string },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        // get plan from request body
        const body = await request.json().catch(() => ({}));
        const planType = (body.plan || "Starter") as "Starter" | "Lite" | "Pro";
        const analyticsSessionId =
            typeof body.analyticsSessionId === "string" &&
            /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
                body.analyticsSessionId,
            )
                ? body.analyticsSessionId
                : "";

        // validate plan type
        if (!["Starter", "Lite", "Pro"].includes(planType)) {
            return NextResponse.json(
                { error: "Invalid plan type" },
                { status: 400 },
            );
        }

        const current = await currentUserUsage(user.id);
        const fromPlan = current.plan as PlanType;

        // check if user already has an active subscription for this plan
        const isSubscriptionActive = current.subscriptionExpiresAt
            ? new Date(current.subscriptionExpiresAt) > new Date()
            : false;

        if (fromPlan === planType && isSubscriptionActive) {
            return NextResponse.json(
                {
                    error: `You already have an active ${planType} Plan subscription`,
                },
                { status: 400 },
            );
        }

        // prevent downgrades
        if (!isUpgrade(fromPlan, planType)) {
            return NextResponse.json(
                { error: `Cannot downgrade from ${fromPlan} to ${planType}` },
                { status: 400 },
            );
        }

        const amount = getUpgradeAmount(fromPlan, planType);

        const receipt = `rcpt_${user.id.slice(-10)}_${Date.now().toString().slice(-8)}`;
        const previousSubscription = await prisma.subscriptions.findFirst({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
        });

        // create razorpay order
        const options = {
            amount: amount,
            currency: "INR",
            receipt: receipt,
            notes: {
                userId: user.id,
                userEmail: user.email,
                plan: planType,
                fromPlan: fromPlan,
                previousOrderId:
                    previousSubscription?.razorpaySubscriptionId ?? "none",
                analyticsDistinctId: token.sub ?? "",
                ...(analyticsSessionId ? { analyticsSessionId } : {}),
            },
        };

        const order = await razorpayClient().orders.create(options);

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID!,
        });
    } catch (err) {
        console.error("Razorpay order creation error:", err);
        return NextResponse.json(
            { error: "Failed to create order" },
            { status: 500 },
        );
    }
}
