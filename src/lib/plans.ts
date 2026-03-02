export const CREDIT_COSTS: Record<string, number> = {
    "e-bgremove": 20,
    "e-dropshadow": 40,
    "e-upscale": 60,
    "e-retouch": 70,
    "e-changebg": 100,
    "e-edit": 120,
    "bg-genfill": 120,
    "e-genvar": 160,
    "e-removedotbg": 260,
    "e-crop-face": 0,
    "e-crop-smart": 0,
} as const;

export const MAX_CREDITS_PER_EDIT = 300;

export const FEATURE_MIN_PLAN: Record<string, PlanType> = {
    "e-removedotbg": "Lite",
};

export type PlanType = "Free" | "Starter" | "Lite" | "Pro";

const PLAN_RANK: Record<PlanType, number> = {
    Free: 0,
    Starter: 1,
    Lite: 2,
    Pro: 3,
};

export function isPlanAtLeast(userPlan: PlanType, requiredPlan: PlanType): boolean {
    return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export function isUpgrade(from: PlanType, to: PlanType): boolean {
    return PLAN_RANK[to] > PLAN_RANK[from];
}

export const PLAN_CREDIT_LIMITS: Record<PlanType, number> = {
    Free: 0,
    Starter: 3_000,
    Lite: 10_000,
    Pro: 25_000,
};

export const PLAN_UPLOAD_LIMITS: Record<PlanType, number> = {
    Free: 3,
    Starter: 500,
    Lite: 5_000,
    Pro: 20_000,
};

export const PLAN_PRICES_PAISE: Record<"Starter" | "Lite" | "Pro", number> = {
    Starter: 99900,  // ₹999
    Lite: 269900,    // ₹2,699
    Pro: 549900,     // ₹5,499
};

type PaidPlan = "Starter" | "Lite" | "Pro";


export function getUpgradeAmount(fromPlan: PlanType, toPlan: PaidPlan): number {
    const toPrice = PLAN_PRICES_PAISE[toPlan];

    if (fromPlan === "Free") return toPrice;

    // pro-rata: deduct what user already paid
    const fromPrice = PLAN_PRICES_PAISE[fromPlan as PaidPlan];
    return Math.max(0, toPrice - fromPrice);
}

export function getUpgradePriceDisplay(fromPlan: PlanType, toPlan: PaidPlan): string {
    const paise = getUpgradeAmount(fromPlan, toPlan);
    const rupees = Math.round(paise / 100);
    return rupees.toLocaleString("en-IN");
}

export function getUpgradePriceDisplayUSD(fromPlan: PlanType, toPlan: PaidPlan): string {
    const paise = getUpgradeAmount(fromPlan, toPlan);
    const rupees = paise / 100;
    // approximate conversion
    const INR_TO_USD = 1 / 85;
    const dollars = Math.round(rupees * INR_TO_USD);
    return dollars.toString();
}

export function getUpgradedUsage(
    _fromPlan: PlanType,
    toPlan: PaidPlan,
): { creditsUsed: number; creditLimit: number; uploadCount: number; uploadLimit: number } {
    return {
        creditsUsed: 0,
        creditLimit: PLAN_CREDIT_LIMITS[toPlan],
        uploadCount: 0,
        uploadLimit: PLAN_UPLOAD_LIMITS[toPlan],
    };
}

// get the credit cost for a feature, returns -1 if unknown
export function getFeatureCreditCost(featureId: string): number {
    const cost = CREDIT_COSTS[featureId];
    return cost !== undefined ? cost : -1;
}

// check if a feature is available for a given plan
export function isFeatureAvailable(featureId: string, userPlan: PlanType): boolean {
    const minPlan = FEATURE_MIN_PLAN[featureId];
    if (!minPlan) return true; // no restriction
    return isPlanAtLeast(userPlan, minPlan);
}
