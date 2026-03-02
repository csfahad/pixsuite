"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Check, Crown, Rocket, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import PaymentModal from "@/components/modals/payment-modal";
import { getUpgradePriceDisplayUSD, type PlanType } from "@/lib/plans";

const plans = [
    {
        name: "Free" as PlanType,
        price: "$0",
        period: "forever",
        description: "Try out PixSuite basics",
        features: [
            "3 uploads",
            "Smart crop & face crop (free)",
            "Basic transforms (resize, format, compress)",
            "Community support",
        ],
        limitations: ["No AI credits", "Limited uploads"],
        cta: "Start Free",
        popular: false,
        icon: Star,
    },
    {
        name: "Starter" as PlanType,
        price: "$9",
        period: "per month",
        description: "For casual creators getting started",
        features: [
            "3,000 AI Credits/month",
            "500 uploads/month",
            "All basic AI features",
            "Unlimited basic transforms",
            "Email support",
        ],
        limitations: ["No Pro BG removal (e-removedotbg)"],
        cta: "Go Starter",
        popular: false,
        icon: Zap,
    },
    {
        name: "Lite" as PlanType,
        price: "$29",
        period: "per month",
        description: "For growing creators with higher needs",
        features: [
            "10,000 AI Credits/month",
            "5,000 uploads/month",
            "All AI features unlocked",
            "Priority processing",
            "Pro BG removal included",
        ],
        cta: "Go Lite",
        popular: true,
        icon: Rocket,
    },
    {
        name: "Pro" as PlanType,
        price: "$59",
        period: "per month",
        description: "Maximum power for professionals",
        features: [
            "25,000 AI Credits/month",
            "20,000 uploads/month",
            "All AI features unlocked",
            "Fastest processing",
            "API access",
            "Priority support",
            "Early access to new features",
        ],
        cta: "Go Pro",
        popular: false,
        proPopular: true,
        icon: Crown,
    },
];

export default function Pricing() {
    const router = useRouter();
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<"Starter" | "Lite" | "Pro">("Starter");
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

    useEffect(() => {
        checkUsage().catch(console.error);
    }, []);

    const checkUsage = async () => {
        try {
            const response = await fetch("/api/usage");
            if (response.status === 401) {
                return null;
            }
            if (response.ok) {
                const data = await response.json();
                setUsageData(data);
                return data;
            }
        } catch (err) {
            console.error("Failed to check usage:", err);
        }
    };

    const navigateToEditor = () => {
        router.push("/editor");
    };

    const handlePlanClick = (planName: string) => {
        if (planName === "Free") {
            navigateToEditor();
            return;
        }

        if (!isAuthenticated) {
            signIn("google", { callbackUrl: `/editor?showUpgrade=${planName}` });
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
        return currentPlan === planName && (planName === "Free" || isSubscriptionActive);
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
        const planRank: Record<string, number> = { Free: 0, Starter: 1, Lite: 2, Pro: 3 };
        if ((planRank[currentPlan] || 0) >= (planRank[planName] || 0) && isSubscriptionActive) {
            return false;
        }

        return true;
    };

    const handlePaymentModalClose = () => {
        setShowPaymentModal(false);
        checkUsage().catch(console.error);
    };

    const getDisplayPrice = (plan: typeof plans[0]) => {
        if (plan.name === "Free") return plan.price;

        const currentPlan = (usageData?.plan as PlanType) || "Free";
        const isSubscriptionActive = usageData?.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;

        // show pro-rata price if upgrading from a paid plan
        if (isSubscriptionActive && currentPlan !== "Free" && currentPlan !== plan.name) {
            const planRank: Record<string, number> = { Free: 0, Starter: 1, Lite: 2, Pro: 3 };
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

        const planRank: Record<string, number> = { Free: 0, Starter: 1, Lite: 2, Pro: 3 };
        return (planRank[planName] || 0) > (planRank[currentPlan] || 0);
    };

    return (
        <section id="pricing" className="py-24 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

            <div className="w-full px-6 sm:px-10 lg:px-16 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center space-x-2 bg-gradient-glass rounded-xl px-6 py-3 mb-6 glass border border-card">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium">Credit-Based Pricing</span>
                    </div>

                    <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                        <span className="text-foreground">Pay for What </span>
                        <span className="bg-primary bg-clip-text! text-transparent">
                            You Use
                        </span>
                    </h2>
                    <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        Each AI feature has a credit cost. Light users pay less,
                        power users get more. No surprises.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-4 gap-6">
                    {plans?.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: index * 0.15 }}
                            whileHover={{ scale: 1.02, y: -5 }}
                            className={`relative group rounded-xl ${plan.popular ? "lg:-mt-8" : ""
                                }`}
                        >
                            <GlowingEffect
                                blur={0}
                                borderWidth={3}
                                spread={80}
                                glow={true}
                                disabled={false}
                                proximity={64}
                                inactiveZone={0.01}
                                alwaysActive={plan.popular}
                            />
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                                    <div className="bg-primary/80 px-6 py-2 rounded-lg text-sm font-bold text-background">
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            {plan.proPopular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                                    <div className="bg-primary/80 px-6 py-2 rounded-lg text-sm font-bold text-background">
                                        Best Value
                                    </div>
                                </div>
                            )}

                            <div
                                className={`h-full glass rounded-xl p-8 border dark:border-muted-foreground/30 transition-all duration-300 ${plan.popular
                                    ? "border-primary/50 shadow-glow-primary"
                                    : "hover:border-primary/30 shadow-glow-subtle hover:shadow-glow-primary"
                                    }`}
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 bg-primary group-hover:animate-glow-pulse">
                                        <plan.icon className="w-8 h-8 text-background" />
                                    </div>

                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <h3 className="text-2xl font-bold text-foreground">
                                            {plan.name}
                                        </h3>
                                        {isPlanActive(plan.name) && (
                                            <span className="px-2 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground mb-4">
                                        {plan.description}
                                    </p>

                                    <div className="mb-6">
                                        <span className="text-5xl font-bold text-foreground">
                                            {getDisplayPrice(plan)}
                                        </span>
                                        <span className="text-muted-foreground ml-2">
                                            /{plan.period}
                                        </span>
                                        {isProRata(plan.name) && (
                                            <div className="mt-2">
                                                <span className="text-xs text-primary font-medium">
                                                    Pro-rata upgrade
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-16">
                                    {plan?.features?.map((feature, fi) => (
                                        <div
                                            key={fi}
                                            className={
                                                "flex items-center space-x-3"
                                            }
                                        >
                                            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            <span className="text-muted-foreground">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}

                                    {plan?.limitations?.map((limitation) => (
                                        <div
                                            key={limitation}
                                            className="flex items-center space-x-3"
                                        >
                                            <div className="shrink-0 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center">
                                                <div className="w-3 h-0.5 bg-primary-foreground" />
                                            </div>
                                            <span className="text-muted-foreground">
                                                {limitation}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant={
                                        plan.popular ? "default" : "outline"
                                    }
                                    className="w-[90%] font-semibold cursor-pointer absolute left-1/2 -translate-x-1/2 bottom-4 rounded-lg mb-2"
                                    onClick={() => handlePlanClick(plan.name)}
                                    disabled={
                                        (plan.name === "Free" &&
                                            usageData !== null &&
                                            usageData.plan === "Free" &&
                                            usageData.canUpload === false) ||
                                        !canUpgradeToPlan(plan.name)
                                    }
                                >
                                    {isPlanActive(plan.name)
                                        ? "Current Plan"
                                        : plan.name === "Free" &&
                                            usageData !== null &&
                                            usageData.plan === "Free" &&
                                            usageData.canUpload === false
                                            ? "Limit Reached"
                                            : plan.cta}
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <p className="text-muted-foreground">
                        Each AI tool costs credits. Free tools (crop, resize) always remain free.
                        Upgrade anytime for more credits.
                    </p>
                </motion.div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={handlePaymentModalClose}
                onUpgrade={() => {
                    handlePaymentModalClose();
                    checkUsage().catch(console.error);
                }}
                creditsRemaining={usageData?.creditsRemaining ?? 0}
                creditLimit={usageData?.creditLimit ?? 0}
                uploadCount={usageData?.uploadCount ?? 0}
                uploadLimit={usageData?.uploadLimit ?? 3}
                plan={selectedPlan}
                currentPlan={(usageData?.plan as PlanType) || "Free"}
                isAuthenticated={isAuthenticated}
            />
        </section>
    );
}
