import type { PaymentOrder } from "./payment-activation.server";
import { z } from "zod";

const paymentAnalyticsSchema = z.object({
    id: z.string(),
    method: z.string().nullish(),
    bank: z.string().nullish(),
    wallet: z.string().nullish(),
    vpa: z.string().nullish(),
    email: z.string().nullish(),
    contact: z.string().nullish(),
    fee: z.number().nullish(),
    tax: z.number().nullish(),
    international: z.boolean().optional(),
    created_at: z.number().optional(),
    error_code: z.string().nullish(),
    error_description: z.string().nullish(),
    error_source: z.string().nullish(),
    error_step: z.string().nullish(),
    error_reason: z.string().nullish(),
});

export async function trackPaymentOutcome(
    order: PaymentOrder,
    outcome: "captured" | "failed",
    paymentEntity?: unknown,
) {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const distinctId = order.notes?.analyticsDistinctId;
    if (
        !token ||
        typeof distinctId !== "string" ||
        !distinctId ||
        process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "false"
    )
        return;
    const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST!.replace(
        /\/$/,
        "",
    );
    const parsed = paymentAnalyticsSchema.safeParse(paymentEntity);
    const payment = parsed.success ? parsed.data : undefined;
    try {
        await fetch(`${configuredHost}/capture/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: token,
                event:
                    outcome === "captured"
                        ? "checkout_completed"
                        : "checkout_failed",
                properties: {
                    distinct_id: distinctId,
                    // Webhooks originate from a server, without a visitor IP.
                    $geoip_disable: true,
                    ...(typeof order.notes?.analyticsSessionId === "string" &&
                    order.notes.analyticsSessionId
                        ? { $session_id: order.notes.analyticsSessionId }
                        : {}),
                    $insert_id: `razorpay:${outcome}:${payment?.id ?? order.id}`,
                    order_id: order.id,
                    payment_id: payment?.id,
                    user_id: order.notes?.userId,
                    email: payment?.email || order.notes?.userEmail,
                    contact: payment?.contact,
                    payment_method: payment?.method,
                    bank: payment?.bank,
                    wallet: payment?.wallet,
                    vpa: payment?.vpa,
                    fee_paise: payment?.fee,
                    tax_paise: payment?.tax,
                    international: payment?.international,
                    payment_created_at: payment?.created_at,
                    payment_status: outcome,
                    selected_plan: order.notes?.plan,
                    previous_plan: order.notes?.fromPlan,
                    currency: order.currency,
                    amount_paise: Number(order.amount),
                    source: "webhook",
                    ...(outcome === "failed"
                        ? {
                              stage: "payment_failure",
                              failure_code: payment?.error_code ?? "unknown",
                              error_description: payment?.error_description,
                              error_source: payment?.error_source,
                              error_step: payment?.error_step,
                              error_reason: payment?.error_reason,
                          }
                        : {}),
                    app: "pixsuite",
                },
            }),
            signal: AbortSignal.timeout(3000),
        });
    } catch {
        // Analytics delivery must never affect subscription activation or webhook retries.
    }
}
