import { after, NextRequest, NextResponse } from "next/server";
import {
    activatePayment,
    paymentSchema,
    validPaymentSignature,
} from "@/lib/payment-activation.server";
import { razorpayClient } from "@/lib/razorpay.server";
import { RequestError, requestErrorResponse } from "@/lib/request-error.server";
import { trackPaymentOutcome } from "@/lib/payment-analytics.server";
import {
    failedPaymentSchema,
    recordPaymentFailure,
} from "@/lib/payment-failure.server";

export async function POST(request: NextRequest) {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) throw new RequestError(503, "Webhook is unavailable");
        const body = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        if (!signature || !validPaymentSignature(body, signature, secret))
            throw new RequestError(400, "Invalid signature");
        let event;
        try {
            event = JSON.parse(body);
        } catch {
            throw new RequestError(400, "Invalid webhook payload");
        }
        if (!event || typeof event.event !== "string")
            throw new RequestError(400, "Invalid webhook event");
        if (event.event === "payment.failed") {
            const parsed = failedPaymentSchema.safeParse(
                event.payload?.payment?.entity,
            );
            if (!parsed.success)
                throw new RequestError(400, "Invalid failed payment");
            const payment = parsed.data;
            const order = await razorpayClient().orders.fetch(payment.order_id);
            const result = await recordPaymentFailure(order, payment);
            if (result.recorded)
                after(() =>
                    trackPaymentOutcome(
                        order,
                        "failed",
                        event.payload.payment.entity,
                    ),
                );
            return NextResponse.json({ success: true });
        }
        if (event.event !== "payment.captured")
            return NextResponse.json({ received: true });
        const parsed = paymentSchema.safeParse(event.payload?.payment?.entity);
        if (!parsed.success)
            throw new RequestError(400, "Invalid captured payment");
        const payment = parsed.data;
        const order = await razorpayClient().orders.fetch(payment.order_id);
        // The signed webhook is the capture authority; this fetch supplies order metadata only.
        const result = await activatePayment(order, payment, {
            source: "webhook",
        });
        if (result.activated)
            after(() =>
                trackPaymentOutcome(
                    order,
                    "captured",
                    event.payload.payment.entity,
                ),
            );
        return NextResponse.json({ success: true });
    } catch (error) {
        // Provider/database failures remain non-2xx so Razorpay retries delivery.
        return requestErrorResponse(
            error,
            "Razorpay webhook processing failed:",
        );
    }
}

export async function GET() {
    return NextResponse.json({ status: "Webhook endpoint is active" });
}
