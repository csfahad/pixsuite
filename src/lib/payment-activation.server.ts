import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
    getUpgradeAmount,
    getUpgradedUsage,
    isUpgrade,
    type PlanType,
} from "./plans";
import { currentUserUsage } from "./usage.server";
import { transaction } from "./transaction.server";
import { RequestError } from "./request-error.server";

export interface PaymentOrder {
    id: string;
    amount: number | string;
    currency: string;
    created_at: number;
    notes?: Record<string, unknown>;
}
const amountSchema = z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/),
]);
const orderSchema = z.object({
    id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
    amount: amountSchema,
    currency: z.string(),
    created_at: z.number().int().positive(),
    notes: z.record(z.string(), z.unknown()).optional(),
});
export const paymentSchema = z.object({
    id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
    order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
    amount: amountSchema,
    currency: z.string(),
    status: z.string(),
    amount_refunded: z.number().int().nonnegative().optional(),
});

export function validPaymentSignature(
    text: string,
    signature: string,
    secret: string,
): boolean {
    if (!/^[a-f\d]{64}$/i.test(signature)) return false;
    const expected = createHmac("sha256", secret).update(text).digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function developmentVerificationAllowed(): boolean {
    return (
        process.env.NODE_ENV === "development" &&
        process.env.VERCEL_ENV !== "production"
    );
}

export function validatePaymentOrder(
    orderInput: unknown,
    paymentInput: unknown,
    expectedUserId?: string,
) {
    const parsedOrder = orderSchema.safeParse(orderInput);
    const parsedPayment = paymentSchema.safeParse(paymentInput);
    if (!parsedOrder.success || !parsedPayment.success)
        throw new RequestError(400, "Invalid order or payment");
    const order = parsedOrder.data;
    const payment = parsedPayment.data;
    const userId = order.notes?.userId;
    const plan = order.notes?.plan;
    const fromPlan = order.notes?.fromPlan;
    if (typeof userId !== "string" || !/^[a-f\d]{24}$/i.test(userId))
        throw new RequestError(400, "Invalid order owner");
    if (expectedUserId && userId !== expectedUserId)
        throw new RequestError(403, "Order does not belong to this account");
    if (
        !["Starter", "Lite", "Pro"].includes(String(plan)) ||
        typeof plan !== "string" ||
        !["Free", "Starter", "Lite", "Pro"].includes(String(fromPlan)) ||
        typeof fromPlan !== "string"
    ) {
        throw new RequestError(400, "Invalid order plan");
    }
    const toPlan = plan as "Starter" | "Lite" | "Pro";
    const previousPlan = fromPlan as PlanType;
    if (!isUpgrade(previousPlan, toPlan))
        throw new RequestError(400, "Invalid order upgrade");
    if (order.id !== payment.order_id)
        throw new RequestError(400, "Payment does not match order");
    const expectedAmount = getUpgradeAmount(previousPlan, toPlan);
    if (
        order.currency !== "INR" ||
        payment.currency !== "INR" ||
        Number(order.amount) !== expectedAmount ||
        Number(payment.amount) !== expectedAmount ||
        (payment.amount_refunded ?? 0) !== 0
    ) {
        throw new RequestError(
            400,
            "Payment amount or currency does not match order",
        );
    }

    return { order, payment, userId, toPlan, previousPlan, expectedAmount };
}

export async function activatePayment(
    orderInput: unknown,
    paymentInput: unknown,
    options: { source: "webhook" | "development"; expectedUserId?: string },
) {
    if (options.source === "development" && !developmentVerificationAllowed())
        throw new RequestError(404, "Not found");
    if (options.source === "development" && !options.expectedUserId)
        throw new RequestError(401, "Unauthorized");
    const { order, payment, userId, toPlan, previousPlan, expectedAmount } =
        validatePaymentOrder(orderInput, paymentInput, options.expectedUserId);
    if (payment.status !== "captured")
        throw new RequestError(409, "Payment has not been captured", {
            pending: true,
        });

    return transaction(async (tx) => {
        const recorded = await tx.payment_activations.findUnique({
            where: { id: order.id },
        });
        if (recorded) {
            if (recorded.userId !== userId || recorded.paymentId !== payment.id)
                throw new RequestError(
                    409,
                    "Order was already processed with another payment",
                );
            return {
                activated: false,
                plan: recorded.plan,
                expiresAt: recorded.expiresAt,
            };
        }
        const legacy = await tx.subscriptions.findFirst({
            where: { razorpaySubscriptionId: order.id },
        });
        if (legacy) {
            if (
                legacy.userId !== userId ||
                legacy.razorpayCustomerId !== payment.id
            )
                throw new RequestError(
                    409,
                    "Order was already processed with another payment",
                );
            // Mark a known historical payment without replenishing its allowance.
            await tx.payment_activations.create({
                data: {
                    id: order.id,
                    paymentId: payment.id,
                    userId,
                    plan: legacy.plan,
                    amount: expectedAmount,
                    activatedAt: legacy.createdAt,
                    expiresAt: legacy.expiresAt,
                },
            });
            return {
                activated: false,
                plan: legacy.plan,
                expiresAt: legacy.expiresAt,
            };
        }
        const user = await currentUserUsage(userId, tx);
        const latest = await tx.subscriptions.findFirst({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });
        const previousOrderId = order.notes?.previousOrderId;
        if (typeof previousOrderId === "string") {
            if (previousOrderId !== (latest?.razorpaySubscriptionId ?? "none"))
                throw new RequestError(409, "Order is stale for this account");
        } else if (
            latest &&
            (!Number.isFinite(order.created_at) ||
                order.created_at <=
                    Math.floor(latest.updatedAt.getTime() / 1000))
        ) {
            // Before this ledger existed, only the latest payment was retained.
            throw new RequestError(
                409,
                "Historical order cannot be activated again",
            );
        }
        const expiredPendingUpgrade =
            user.plan === "Free" &&
            latest?.plan === previousPlan &&
            order.created_at * 1000 <= latest.expiresAt.getTime();
        if (user.plan !== previousPlan && !expiredPendingUpgrade)
            throw new RequestError(
                409,
                "Account plan changed after this order was created",
            );
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await tx.payment_activations.create({
            data: {
                id: order.id,
                paymentId: payment.id,
                userId,
                plan: toPlan,
                amount: expectedAmount,
                expiresAt,
            },
        });
        const usage = getUpgradedUsage(previousPlan, toPlan);
        await tx.users.update({
            where: { id: userId },
            data: {
                plan: toPlan,
                ...usage,
                usageCount: usage.uploadCount,
                usageLimit: usage.uploadLimit,
                razorpayCustomerId: payment.id,
                subscriptionExpiresAt: expiresAt,
            },
        });
        const data = {
            plan: toPlan,
            razorpaySubscriptionId: order.id,
            razorpayCustomerId: payment.id,
            expiresAt,
        };
        if (latest)
            await tx.subscriptions.update({ where: { id: latest.id }, data });
        else await tx.subscriptions.create({ data: { userId, ...data } });
        return { activated: true, plan: toPlan, expiresAt };
    });
}
