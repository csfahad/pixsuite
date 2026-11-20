import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    activatePayment,
    developmentVerificationAllowed,
    validPaymentSignature,
} from "@/lib/payment-activation.server";
import { razorpayClient } from "@/lib/razorpay.server";
import { requestUserId } from "@/lib/request-user.server";
import { RequestError, requestErrorResponse } from "@/lib/request-error.server";

const detailsSchema = z.object({
    razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
    razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
    razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

export async function POST(request: NextRequest) {
    // No authentication, parsing, provider call, or database mutation in production.
    if (!developmentVerificationAllowed())
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
        const userId = await requestUserId(request);
        const details = detailsSchema.safeParse(
            await request.json().catch(() => null),
        );
        if (!details.success)
            throw new RequestError(400, "Invalid payment details");
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            details.data;
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret)
            throw new RequestError(503, "Payment testing is unavailable");
        if (
            !validPaymentSignature(
                `${razorpay_order_id}|${razorpay_payment_id}`,
                razorpay_signature,
                secret,
            )
        ) {
            throw new RequestError(400, "Invalid payment signature");
        }
        const client = razorpayClient();
        const [order, payment] = await Promise.all([
            client.orders.fetch(razorpay_order_id),
            client.payments.fetch(razorpay_payment_id),
        ]);
        const result = await activatePayment(order, payment, {
            source: "development",
            expectedUserId: userId,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return requestErrorResponse(
            error,
            "Development payment verification failed:",
        );
    }
}
