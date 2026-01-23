import Razorpay from "razorpay";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
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
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // get plan from request body
        const body = await request.json().catch(() => ({}));
        const planType = body.plan || "Lite";
        
        // check if user already has an active subscription for this plan
        const isSubscriptionActive = user.subscriptionExpiresAt 
            ? new Date(user.subscriptionExpiresAt) > new Date()
            : false;

        if (user.plan === planType && isSubscriptionActive) {
            return NextResponse.json(
                { error: `You already have an active ${planType} Plan subscription` },
                { status: 400 }
            );
        }

        // prevent downgrades
        if (user.plan === "Pro" && planType === "Lite") {
            return NextResponse.json(
                { error: "Pro users cannot downgrade to Lite plan" },
                { status: 400 }
            );
        }
        if ((user.plan === "Pro" || user.plan === "Lite") && planType === "Free") {
            return NextResponse.json(
                { error: "Paid users cannot downgrade to Free plan" },
                { status: 400 }
            );
        }

        const amount = planType === "Lite" ? 99900 : 290000;

        const receipt = `rcpt_${user.id.slice(-10)}_${Date.now().toString().slice(-8)}`;

        // create razorpay order
        const options = {
            amount: amount,
            currency: "INR",
            receipt: receipt,
            notes: {
                userId: user.id,
                userEmail: user.email,
                plan: planType,
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID!,
        });
    } catch (err: any) {
        console.error("Razorpay order creation error:", err);
        return NextResponse.json(
            { error: "Failed to create order", details: err.message },
            { status: 500 }
        );
    }
}
