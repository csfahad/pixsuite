"use client";
import { useState, useEffect } from "react";
import {
    useAppRouter as useRouter,
    useNavigationFeedback,
} from "@/components/navigation-feedback";
import { toast } from "sonner";
import { signIn, useSession } from "next-auth/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentModal from "@/components/modals/payment-modal";
import {
    PLAN_CREDIT_LIMITS,
    PLAN_UPLOAD_LIMITS,
    getUpgradePriceDisplayUSD,
    type PlanType,
} from "@/lib/plans";
import styles from "@/modules/home/home.module.css";
import { setAnalyticsPlan, trackEvent } from "@/lib/analytics";

const plans = [
    {
        name: "Free" as PlanType,
        price: "$0",
        description: "Cropping only",
        features: [
            "Smart crop and face crop",
            "Compare with the original",
            "Download the result",
        ],
        cta: "Try for free",
        featured: false,
    },
    {
        name: "Starter" as PlanType,
        price: "$9",
        description: "Standard AI tools",
        features: [
            "Background and prompt edits",
            "Retouch, upscale, and variations",
            "Crop tools included",
        ],
        cta: "Choose Starter",
        featured: false,
    },
    {
        name: "Lite" as PlanType,
        price: "$29",
        description: "All AI tools",
        features: [
            "Standard AI tools included",
            "Pro background removal",
            "Crop tools included",
        ],
        cta: "Choose Lite",
        featured: true,
    },
    {
        name: "Pro" as PlanType,
        price: "$59",
        description: "All AI tools",
        features: [
            "Standard AI tools included",
            "Pro background removal",
            "Crop tools included",
        ],
        cta: "Choose Pro",
        featured: false,
    },
];

export default function Pricing() {
    const router = useRouter();
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;
    const { beginAction, finish } = useNavigationFeedback();
    const [signingInPlan, setSigningInPlan] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<
        "Starter" | "Lite" | "Pro"
    >("Starter");
    const [usageData, setUsageData] = useState<{
        creditsUsed: number;
        creditLimit: number;
        creditsRemaining: number;
        uploadCount: number;
        uploadLimit: number;
        plan: string;
        canUpload: boolean;
        subscriptionExpiresAt?: string | null;
    } | null>(null);

    const [usageRevision, setUsageRevision] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/usage")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (data && !cancelled) {
                    setUsageData(data);
                    setAnalyticsPlan(data.plan as PlanType);
                }
            })
            .catch((error) => console.error("Failed to check usage:", error));
        return () => {
            cancelled = true;
        };
    }, [usageRevision]);

    const navigateToEditor = () => {
        router.push("/editor");
    };

    const handlePlanClick = (planName: string) => {
        if (signingInPlan) return;
        trackEvent("plan_selected", {
            selected_plan: planName,
            current_plan: usageData?.plan || "Free",
            is_authenticated: isAuthenticated,
        });
        if (planName === "Free") {
            navigateToEditor();
            return;
        }

        if (!isAuthenticated) {
            trackEvent("sign_in_started", {
                provider: "google",
                source: "pricing",
                selected_plan: planName,
            });
            setSigningInPlan(planName);
            const feedbackToken = beginAction("Opening Google sign-in…");
            signIn("google", {
                callbackUrl: `/editor?showUpgrade=${planName}`,
            }).catch(() => {
                setSigningInPlan(null);
                finish(feedbackToken);
                toast.error("Google sign-in couldn’t open", {
                    description: "Try choosing the plan again.",
                });
            });
            return;
        }

        const currentPlan = usageData?.plan || "Free";
        const isSubscriptionActive = usageData?.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;

        // prevent duplicate subscriptions
        if (currentPlan === planName && isSubscriptionActive) {
            return;
        }

        // prevent downgrades
        if (!canUpgradeToPlan(planName)) {
            return;
        }

        setSelectedPlan(planName as "Starter" | "Lite" | "Pro");
        setShowPaymentModal(true);
    };

    const isPlanActive = (planName: string) => {
        if (!usageData) return false;
        const currentPlan = usageData.plan;
        const isSubscriptionActive = usageData.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;
        return (
            currentPlan === planName &&
            (planName === "Free" || isSubscriptionActive)
        );
    };

    const canUpgradeToPlan = (planName: string) => {
        if (!usageData) return true;
        const currentPlan = usageData.plan;
        const isSubscriptionActive = usageData.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;

        if (currentPlan === planName && isSubscriptionActive) {
            return false;
        }

        // plan hierarchy
        const planRank: Record<string, number> = {
            Free: 0,
            Starter: 1,
            Lite: 2,
            Pro: 3,
        };
        if (
            (planRank[currentPlan] || 0) >= (planRank[planName] || 0) &&
            isSubscriptionActive
        ) {
            return false;
        }

        return true;
    };

    const handlePaymentModalClose = (reason: "dismissed" | "checkout") => {
        setShowPaymentModal(false);
        if (reason === "dismissed")
            setUsageRevision((revision) => revision + 1);
    };

    const getDisplayPrice = (plan: (typeof plans)[0]) => {
        if (plan.name === "Free") return plan.price;

        const currentPlan = (usageData?.plan as PlanType) || "Free";
        const isSubscriptionActive = usageData?.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;

        // show pro-rata price if upgrading from a paid plan
        if (
            isSubscriptionActive &&
            currentPlan !== "Free" &&
            currentPlan !== plan.name
        ) {
            const planRank: Record<string, number> = {
                Free: 0,
                Starter: 1,
                Lite: 2,
                Pro: 3,
            };
            if ((planRank[plan.name] || 0) > (planRank[currentPlan] || 0)) {
                return `$${getUpgradePriceDisplayUSD(currentPlan, plan.name as "Starter" | "Lite" | "Pro")}`;
            }
        }

        return plan.price;
    };

    const isProRata = (planName: string) => {
        const currentPlan = (usageData?.plan as PlanType) || "Free";
        const isSubscriptionActive = usageData?.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;

        if (!isSubscriptionActive || currentPlan === "Free") return false;

        const planRank: Record<string, number> = {
            Free: 0,
            Starter: 1,
            Lite: 2,
            Pro: 3,
        };
        return (planRank[planName] || 0) > (planRank[currentPlan] || 0);
    };

    return (
        <section id="pricing" className={styles.pricingSection}>
            <div className={styles.container}>
                <div className={styles.pricingHeader}>
                    <h2>Plans for how often you edit.</h2>
                    <p>
                        Start with three free uploads. Paid plans add AI credits
                        and a monthly upload allowance.
                    </p>
                </div>
                <div className={styles.plans}>
                    {plans.map((plan) => {
                        const active = isPlanActive(plan.name);
                        const canUpgrade = canUpgradeToPlan(plan.name);
                        const exhausted =
                            plan.name === "Free" &&
                            usageData?.plan === "Free" &&
                            usageData.canUpload === false;
                        let actionLabel = plan.cta;
                        if (signingInPlan === plan.name)
                            actionLabel = "Opening sign-in…";
                        else if (exhausted)
                            actionLabel = "Upload limit reached";
                        else if (active && plan.name !== "Free")
                            actionLabel = "Current plan";
                        else if (!canUpgrade) actionLabel = "Included";
                        else if (active) actionLabel = "Open editor";

                        return (
                            <article
                                key={plan.name}
                                className={`${styles.plan} ${plan.featured ? styles.featuredPlan : ""}`}
                            >
                                <div className={styles.planHeading}>
                                    <h3>{plan.name}</h3>
                                    {active && (
                                        <span className={styles.activePlan}>
                                            Your plan
                                        </span>
                                    )}
                                </div>
                                <div className={styles.planPrice}>
                                    <span>{getDisplayPrice(plan)}</span>
                                    <span>
                                        {plan.name === "Free"
                                            ? "trial"
                                            : isProRata(plan.name)
                                              ? "upgrade"
                                              : "/ month"}
                                    </span>
                                </div>
                                <p className={styles.priceContext}>
                                    {isProRata(plan.name)
                                        ? "Upgrade charge today"
                                        : plan.description}
                                </p>
                                <dl className={styles.allowances}>
                                    <div>
                                        <dt>AI credits</dt>
                                        <dd>
                                            {PLAN_CREDIT_LIMITS[
                                                plan.name
                                            ].toLocaleString("en-US")}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>
                                            {plan.name === "Free"
                                                ? "Trial uploads"
                                                : "Uploads / month"}
                                        </dt>
                                        <dd>
                                            {PLAN_UPLOAD_LIMITS[
                                                plan.name
                                            ].toLocaleString("en-US")}
                                        </dd>
                                    </div>
                                </dl>
                                <ul className={styles.planFeatures}>
                                    {plan.features.map((feature) => (
                                        <li key={feature}>
                                            <Check size={13} aria-hidden />{" "}
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    variant={
                                        plan.featured ? "default" : "outline"
                                    }
                                    className={styles.planAction}
                                    onClick={() => handlePlanClick(plan.name)}
                                    aria-busy={signingInPlan === plan.name}
                                    disabled={
                                        signingInPlan !== null ||
                                        exhausted ||
                                        !canUpgrade
                                    }
                                >
                                    {actionLabel}
                                </Button>
                            </article>
                        );
                    })}
                </div>
            </div>
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={handlePaymentModalClose}
                creditsRemaining={usageData?.creditsRemaining ?? 0}
                uploadCount={usageData?.uploadCount ?? 0}
                uploadLimit={usageData?.uploadLimit ?? 3}
                plan={selectedPlan}
                currentPlan={(usageData?.plan as PlanType) || "Free"}
                isAuthenticated={isAuthenticated}
            />
        </section>
    );
}
