import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import prisma from "./prisma";
import { PLAN_UPLOAD_LIMITS } from "./plans";
import { RequestError } from "./request-error.server";
import { anonymousSession, clientIp } from "./anonymous-session.server";
import { transaction } from "./transaction.server";

export const usageSelect = {
    id: true,
    plan: true,
    creditsUsed: true,
    creditLimit: true,
    uploadCount: true,
    uploadLimit: true,
    subscriptionExpiresAt: true,
} satisfies Prisma.usersSelect;
export type UserUsage = Prisma.usersGetPayload<{ select: typeof usageSelect }>;

export function usageVersion(user: UserUsage): Prisma.usersWhereInput {
    return {
        id: user.id,
        plan: user.plan,
        ...(user.subscriptionExpiresAt
            ? { subscriptionExpiresAt: user.subscriptionExpiresAt }
            : {
                  OR: [
                      { subscriptionExpiresAt: null },
                      { subscriptionExpiresAt: { isSet: false } },
                  ],
              }),
    };
}

export function usageResponse(user: UserUsage) {
    return {
        creditsUsed: user.creditsUsed,
        creditLimit: user.creditLimit,
        creditsRemaining: Math.max(0, user.creditLimit - user.creditsUsed),
        uploadCount: user.uploadCount,
        uploadLimit: user.uploadLimit,
        plan: user.plan,
        canUpload: user.uploadCount < user.uploadLimit,
        subscriptionExpiresAt:
            user.subscriptionExpiresAt?.toISOString() ?? null,
    };
}

export async function currentUserUsage(
    userId: string,
    db: Pick<Prisma.TransactionClient, "users"> = prisma,
): Promise<UserUsage> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const user = await db.users.findUnique({
            where: { id: userId },
            select: usageSelect,
        });
        if (!user) throw new RequestError(404, "User not found");
        if (
            user.plan === "Free" ||
            (user.subscriptionExpiresAt &&
                user.subscriptionExpiresAt > new Date())
        )
            return user;
        // A renewal must not be overwritten by a stale expiration read.
        await db.users.updateMany({
            where: usageVersion(user),
            data: {
                plan: "Free",
                creditLimit: 0,
                creditsUsed: 0,
                uploadLimit: PLAN_UPLOAD_LIMITS.Free,
                uploadCount: 0,
                usageCount: 0,
                usageLimit: PLAN_UPLOAD_LIMITS.Free,
                subscriptionExpiresAt: null,
            },
        });
    }
    throw new RequestError(409, "Your allowance changed. Please retry.");
}

export async function synchronizeFreeTrial(
    userId: string,
    trialId: string,
    reserveUpload = false,
) {
    return transaction(async (tx) => {
        const user = await currentUserUsage(userId, tx);
        // Paid allowances are independent: never merge trial limits or counters into them.
        if (user.plan !== "Free") return null;
        const trial = await tx.anonymous_sessions.findUnique({
            where: { id: trialId },
        });
        if (!trial)
            throw new RequestError(
                409,
                "Trial allowance changed. Please retry.",
            );
        const limit = PLAN_UPLOAD_LIMITS.Free;
        const used = Math.max(user.uploadCount, trial.usageCount);
        const reserved = reserveUpload && used < limit;
        const uploadCount = used + (reserved ? 1 : 0);
        if (
            !reserved &&
            user.uploadCount === uploadCount &&
            user.uploadLimit === limit &&
            trial.usageCount === uploadCount
        ) {
            return { usage: user, reserved: false };
        }
        const usage = await tx.users.update({
            where: { id: userId },
            data: {
                uploadCount,
                usageCount: uploadCount,
                uploadLimit: limit,
                usageLimit: limit,
            },
            select: usageSelect,
        });
        await tx.anonymous_sessions.update({
            where: { id: trial.id },
            data: { usageCount: uploadCount },
        });
        return { usage, reserved };
    });
}

export async function reserveUserUpload(
    userId: string,
    request?: NextRequest,
): Promise<UserUsage> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const user = await currentUserUsage(userId);
        if (user.plan === "Free" && request && clientIp(request)) {
            const trial = await anonymousSession(request);
            const result = await synchronizeFreeTrial(userId, trial.id, true);
            if (!result) continue; // A webhook upgraded the account while the trial was being read.
            if (!result.reserved)
                throw new RequestError(
                    403,
                    "Free upload limit reached",
                    usageResponse(result.usage),
                );
            return result.usage;
        }
        if (user.uploadCount >= user.uploadLimit)
            throw new RequestError(
                403,
                "Upload limit reached",
                usageResponse(user),
            );
        const reserved = await prisma.users.updateMany({
            where: {
                ...usageVersion(user),
                uploadLimit: user.uploadLimit,
                uploadCount: { lt: user.uploadLimit },
            },
            data: {
                uploadCount: { increment: 1 },
                usageCount: { increment: 1 },
            },
        });
        if (reserved.count === 1) return currentUserUsage(user.id);
    }
    throw new RequestError(409, "Your allowance changed. Please retry.");
}
