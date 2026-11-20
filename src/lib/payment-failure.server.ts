import { z } from "zod";
import {
    paymentSchema,
    validatePaymentOrder,
} from "./payment-activation.server";
import { RequestError } from "./request-error.server";
import { transaction } from "./transaction.server";

export const failedPaymentSchema = paymentSchema.extend({
    status: z.literal("failed"),
    error_code: z.string().max(128).nullish(),
    error_description: z.string().max(512).nullish(),
    error_source: z.string().max(128).nullish(),
    error_step: z.string().max(128).nullish(),
    error_reason: z.string().max(128).nullish(),
});

// Called only after the webhook's raw body has passed signature verification.
export async function recordPaymentFailure(
    orderInput: unknown,
    paymentInput: unknown,
) {
    const parsed = failedPaymentSchema.safeParse(paymentInput);
    if (!parsed.success) throw new RequestError(400, "Invalid failed payment");
    const failure = parsed.data;
    const { order, userId, toPlan, expectedAmount } = validatePaymentOrder(
        orderInput,
        failure,
    );
    const data = {
        id: failure.id,
        orderId: order.id,
        userId,
        plan: toPlan,
        amount: expectedAmount,
        currency: failure.currency,
        errorCode: failure.error_code ?? null,
        errorDescription: failure.error_description ?? null,
        errorSource: failure.error_source ?? null,
        errorStep: failure.error_step ?? null,
        errorReason: failure.error_reason ?? null,
    };
    return transaction(async (tx) => {
        const existing = await tx.payment_failures.findUnique({
            where: { id: failure.id },
        });
        if (existing) {
            if (
                existing.orderId !== order.id ||
                existing.userId !== userId ||
                existing.plan !== toPlan ||
                existing.amount !== expectedAmount ||
                existing.currency !== failure.currency
            ) {
                throw new RequestError(
                    409,
                    "Payment failure was already recorded for another order",
                );
            }
            return { recorded: false };
        }
        const user = await tx.users.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) throw new RequestError(404, "User not found");
        // Record the historical attempt even if its order subsequently succeeded.
        // Do not normalize expiry, downgrade, reset counters, or modify subscriptions.
        await tx.payment_failures.create({ data });
        return { recorded: true };
    });
}
