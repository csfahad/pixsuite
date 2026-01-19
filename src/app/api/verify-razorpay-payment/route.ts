import crypto from "crypto";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

        // update user plan to Paid
        await prisma.users.update({
            where: { id: user.id },
            data: {
                plan: "Paid",
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
            message: "Payment verified and Pro Plan activated",
        });
    } catch (err: any) {
        console.error("Payment verification error:", err);
        return NextResponse.json(
            { error: "Failed to verify payment", details: err.message },
            { status: 500 }
        );
    }
}
