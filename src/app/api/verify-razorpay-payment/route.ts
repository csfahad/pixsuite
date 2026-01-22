import crypto from "crypto";
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

        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json(
                { error: "Missing payment details" },
                { status: 400 }
            );
        }

        // verify payment signature
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json(
                { error: "Invalid payment signature" },
                { status: 400 }
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

        // get plan from order notes
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const planType = order.notes?.plan || "Pro";

        // set usage limit based on plan
        const usageLimit = planType === "Lite" ? 1000 : 10000;

        // update user plan to Paid
        await prisma.users.update({
            where: { id: user.id },
            data: {
                plan: "Paid",
                usageLimit: usageLimit,
                razorpayCustomerId: razorpay_payment_id,
            },
        });

        // create or update subscription record
        const existingSubscription = await prisma.subscriptions.findFirst({
            where: { userId: user.id },
        });

        if (existingSubscription) {
            await prisma.subscriptions.update({
                where: { id: existingSubscription.id },
                data: {
                    razorpaySubscriptionId: razorpay_order_id,
                    razorpayCustomerId: razorpay_payment_id,
                    updatedAt: new Date(),
                },
            });
        } else {
            await prisma.subscriptions.create({
                data: {
                    userId: user.id,
                    razorpaySubscriptionId: razorpay_order_id,
                    razorpayCustomerId: razorpay_payment_id,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Payment verified and ${planType} Plan activated`,
        });
    } catch (err: any) {
        console.error("Payment verification error:", err);
        return NextResponse.json(
            { error: "Failed to verify payment", details: err.message },
            { status: 500 }
        );
    }
}
