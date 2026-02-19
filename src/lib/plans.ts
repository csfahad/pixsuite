export const PLAN_LIMITS = {
    Free: 3,
    Lite: 1000,
    Pro: 10000,
} as const;

export const PLAN_PRICES_PAISE = {
    Lite: 99900, // ₹999
    Pro: 290000, // ₹2900
} as const;

export type PlanType = "Free" | "Lite" | "Pro";

/* get display price in INR for upgrade (exp: "1,901" for pro-rata Lite→Pro) */
export function getUpgradePriceDisplay(
    fromPlan: PlanType,
    toPlan: "Lite" | "Pro",
): string {
    const paise = getUpgradeAmount(fromPlan, toPlan);
    const rupees = Math.round(paise / 100);
    return rupees.toLocaleString("en-IN");
}

/* INR to USD: ₹1,901 ≈ $20.86 ~ $21 */
const INR_TO_USD = 20.86 / 1901;

/* get display price in USD for upgrade (exp: "21" for pro-rata Lite→Pro) */
export function getUpgradePriceDisplayUSD(
    fromPlan: PlanType,
    toPlan: "Lite" | "Pro",
): string {
    const paise = getUpgradeAmount(fromPlan, toPlan);
    const rupees = paise / 100;
    const dollars = Math.round(rupees * INR_TO_USD);
    return dollars.toString();
}

/*
 * computes the chargeable amount for upgrading to a target plan.
 * - Free → Lite: full ₹999
 * - Free → Pro: full ₹2900
 * - Lite → Pro: pro-rata (₹2900 - ₹999) = ₹1901
 */
export function getUpgradeAmount(
    fromPlan: PlanType,
    toPlan: "Lite" | "Pro",
): number {
    if (toPlan === "Lite") {
        // only Free can upgrade to Lite
        return PLAN_PRICES_PAISE.Lite;
    }
    // toPlan === "Pro"
    if (fromPlan === "Lite") {
        return PLAN_PRICES_PAISE.Pro - PLAN_PRICES_PAISE.Lite; // 190100 paise
    }
    return PLAN_PRICES_PAISE.Pro;
}

/*
 * computes the new usageLimit and usageCount after upgrade.
 * - Free → Lite/Pro: usageCount = 0, usageLimit = plan limit
 * - Lite → Pro: usageCount = 0, usageLimit = remaining Lite quota + Pro quota
 */
export function getUpgradedUsage(
    fromPlan: PlanType,
    toPlan: "Lite" | "Pro",
    currentUsageCount: number,
): { usageCount: number; usageLimit: number } {
    if (fromPlan === "Free") {
        return {
            usageCount: 0,
            usageLimit: toPlan === "Lite" ? PLAN_LIMITS.Lite : PLAN_LIMITS.Pro,
        };
    }
    // Lite → Pro
    const remainingLite = Math.max(0, PLAN_LIMITS.Lite - currentUsageCount);
    return {
        usageCount: 0,
        usageLimit: remainingLite + PLAN_LIMITS.Pro,
    };
}
