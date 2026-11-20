import prisma from "./prisma";
import {
    getFeatureCreditCost,
    isFeatureAvailable,
    MAX_CREDITS_PER_EDIT,
    FEATURE_MIN_PLAN,
} from "./plans";
import { currentUserUsage, usageResponse, usageVersion } from "./usage.server";
import { RequestError } from "./request-error.server";

export async function reserveCredits(userId: string, featureId: string) {
    const cost = getFeatureCreditCost(featureId);
    if (!Number.isInteger(cost) || cost < 0 || cost > MAX_CREDITS_PER_EDIT)
        throw new RequestError(400, "Unknown or invalid feature");
    for (let attempt = 0; attempt < 5; attempt++) {
        const user = await currentUserUsage(userId);
        if (!isFeatureAvailable(featureId, user.plan))
            throw new RequestError(403, "Feature not available on your plan", {
                requiredPlan: FEATURE_MIN_PLAN[featureId],
                currentPlan: user.plan,
                featureId,
            });
        if (user.creditLimit - user.creditsUsed < cost)
            throw new RequestError(403, "Insufficient credits", {
                ...usageResponse(user),
                creditCost: cost,
            });
        if (cost === 0)
            return { success: true, creditCost: 0, ...usageResponse(user) };
        const reserved = await prisma.users.updateMany({
            where: {
                ...usageVersion(user),
                creditLimit: user.creditLimit,
                creditsUsed: { lte: user.creditLimit - cost },
            },
            data: { creditsUsed: { increment: cost } },
        });
        if (reserved.count === 1) {
            const updated = await currentUserUsage(userId);
            return {
                success: true,
                creditCost: cost,
                ...usageResponse(updated),
            };
        }
    }
    throw new RequestError(409, "Your allowance changed. Please retry.");
}
