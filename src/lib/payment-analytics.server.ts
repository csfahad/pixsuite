import type { PaymentOrder } from "./payment-activation.server";

export async function trackPaymentOutcome(
    order: PaymentOrder,
    outcome: "captured" | "failed",
    failureCode?: string | null,
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
    const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST!;
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
                    selected_plan: order.notes?.plan,
                    previous_plan: order.notes?.fromPlan,
                    currency: order.currency,
                    amount_paise: Number(order.amount),
                    source: "webhook",
                    ...(outcome === "failed"
                        ? {
                              stage: "payment_failure",
                              failure_code:
                                  failureCode &&
                                  [
                                      "BAD_REQUEST_ERROR",
                                      "GATEWAY_ERROR",
                                      "SERVER_ERROR",
                                  ].includes(failureCode)
                                      ? failureCode
                                      : "unknown",
                          }
                        : {}),
                    app: "pixsuite",
                    environment: process.env.NODE_ENV,
                },
            }),
            signal: AbortSignal.timeout(3000),
        });
    } catch {
        // Analytics delivery must never affect subscription activation or webhook retries.
    }
}
