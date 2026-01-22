import crypto from "crypto";
import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-razorpay-signature");

        if (!signature) {
            return NextResponse.json(
                { error: "Missing signature" },
                { status: 400 }
            );
        }

        // verify webhook signature
        const expectedSignature = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(body)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("Webhook signature verification failed");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 400 }
            );
        }

        const event = JSON.parse(body);

        // handle payment.captured event
        if (event.event === "payment.captured") {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            // get order details from razorpay notes (already stored userId there)
            try {
                const order = await razorpay.orders.fetch(orderId);
                const userId = order.notes?.userId;
                const planType = order.notes?.plan || "Lite";

                if (!userId) {
                    console.error("User ID not found in order notes");
                    return NextResponse.json(
                        { error: "User ID not found" },
                        { status: 400 }
                    );
                }

                const userIdString = String(userId);

                const user = await prisma.users.findUnique({
                    where: { id: userIdString },
                });

                if (!user) {
                    console.error("User not found:", userIdString);
                    return NextResponse.json(
                        { error: "User not found" },
                        { status: 404 }
                    );
                }

                // set usage limit based on plan
                const usageLimit = planType === "Lite" ? 1000 : 10000;

                // update user plan to Paid
                await prisma.users.update({
                    where: { id: user.id },
                    data: {
                        plan: "Paid",
                        usageLimit: usageLimit,
                        razorpayCustomerId: paymentId,
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
                            razorpaySubscriptionId: orderId,
                            razorpayCustomerId: paymentId,
                            updatedAt: new Date(),
                        },
                    });
                } else {
                    await prisma.subscriptions.create({
                        data: {
                            userId: user.id,
                            razorpaySubscriptionId: orderId,
                            razorpayCustomerId: paymentId,
                        },
                    });
                }

                console.log(`Payment captured and ${planType} Plan activated for user: ${userIdString}`);
                return NextResponse.json({ success: true });
            } catch (err: any) {
                console.error("Error processing payment.captured event:", err);
                return NextResponse.json(
                    { error: "Error processing webhook", details: err.message },
                    { status: 500 }
                );
            }
        }

        // handle payment.failed event
        if (event.event === "payment.failed") {
            try {
                const paymentEntity = event.payload?.payment?.entity;
                if (!paymentEntity) {
                    return NextResponse.json(
                        { error: "Invalid payment.failed payload" },
                        { status: 400 }
                    );
                }

                const orderId = paymentEntity.order_id;
                const paymentId = paymentEntity.id;

                // attempt to find the associated subscription and user
                const subscription = await prisma.subscriptions.findFirst({
                    where: { razorpaySubscriptionId: orderId },
                });

                let user = null;
                if (subscription) {
                    user = await prisma.users.findUnique({
                        where: { id: subscription.userId },
                    });
                }

                if (subscription && user) {
                    await prisma.subscriptions.update({
                        where: { id: subscription.id },
                        data: {
                            updatedAt: new Date(),
                        },
                    });

                    await prisma.users.update({
                        where: { id: user.id },
                        data: {
                            plan: "Free",
                            usageLimit: 3,
                        },
                    });

                    console.log(
                        `Payment failed for user ${user.id}, order ${orderId}, payment ${paymentId}`
                    );
                } else {
                    console.warn(
                        `No subscription/user found for failed payment. order: ${orderId}, payment: ${paymentId}`
                    );
                }

                return NextResponse.json({ success: true });
            } catch (err: any) {
                console.error("Error processing payment.failed event:", err);
                return NextResponse.json(
                    { error: "Error handling payment.failed event", details: err.message },
                    { status: 500 }
                );
            }
        }

        console.log(`Received webhook event: ${event.event}`);
        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("Webhook error:", err);
        return NextResponse.json(
            { error: "Webhook processing failed", details: err.message },
            { status: 500 }
        );
    }
}

// webhooks GET requests (for ping from razorpay)
export async function GET() {
    return NextResponse.json({ status: "Webhook endpoint is active" });
}
