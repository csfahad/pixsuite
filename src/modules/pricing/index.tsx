"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Check, Crown, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import PaymentModal from "@/components/modals/payment-modal";
import { getUpgradePriceDisplayUSD } from "@/lib/plans";

const plans = [
    {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Perfect for trying out PixSuite",
        features: [
            "3 edits on free plan",
            "Basic AI background removal",
            "Standard resolution output",
            "Community support",
        ],
        limitations: ["Limited usage"],
        cta: "Start Free",
        popular: false,
        icon: Star,
    },
    {
        name: "Lite",
        price: "$9",
        period: "per month",
        description: "For growing creators with higher needs",
        features: [
            "1000 edits(uploads)/month",
            "All AI features unlocked",
            "High resolution output",
            "Up to 20 GB bandwidth/month",
            "Email support",
        ],
        cta: "Go Lite",
        popular: true,
        icon: Zap,
    },
    {
        name: "Pro",
        price: "$29",
        period: "per month",
        description: "Unlimited power for professionals",
        features: [
            "Unlimited edits",
            "All AI features unlocked",
            "Up to 4K resolution",
            "Up to 100 GB bandwidth/month",
            "Priority support",
            "API access",
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
    const [selectedPlan, setSelectedPlan] = useState<"Lite" | "Pro">("Lite");
    const [usageData, setUsageData] = useState<{
        usageCount: number;
        usageLimit: number;
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
        if (currentPlan === "Pro" && planName === "Lite") {
            return;
        }
        if (
            (currentPlan === "Pro" || currentPlan === "Lite") &&
            planName === "Free"
        ) {
            return;
        }

        setSelectedPlan(planName as "Lite" | "Pro");
        setShowPaymentModal(true);
    };

    const isPlanActive = (planName: string) => {
        if (!usageData) return false;
        const currentPlan = usageData.plan;
        const isSubscriptionActive = usageData.subscriptionExpiresAt
            ? new Date(usageData.subscriptionExpiresAt) > new Date()
            : false;
        return currentPlan === planName && isSubscriptionActive;
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

        // prevent downgrades
        if (currentPlan === "Pro" && planName === "Lite") return false;
        if (
            (currentPlan === "Pro" || currentPlan === "Lite") &&
            planName === "Free"
        )
            return false;

        return true;
    };

    const handlePaymentModalClose = () => {
        setShowPaymentModal(false);
        checkUsage().catch(console.error);
    };

    const getProPlanPrice = () => {
        const currentPlan = (usageData?.plan as "Free" | "Lite" | "Pro") || "Free";
        if (currentPlan === "Lite") {
            return `$${getUpgradePriceDisplayUSD("Lite", "Pro")}`;
        }
        return "$29";
    };

    // check if Pro plan should show pro-rata pricing
    const isProPlanProRata = () => {
        const currentPlan = (usageData?.plan as "Free" | "Lite" | "Pro") || "Free";
        return currentPlan === "Lite";
    };

    return (
        <section id="pricing" className="py-24 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

            <div className="container mx-auto max-w-6xl px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center space-x-2 bg-gradient-glass rounded-xl px-6 py-3 mb-6 glass border border-card">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium">Simple Pricing</span>
                    </div>

                    <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                        <span className="text-foreground">Choose Your </span>
                        <span className="bg-primary bg-clip-text! text-transparent">
                            Magic Plan
                        </span>
                    </h2>
                    <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        Start free, upgrade when you need more. No hidden fees,
                        cancel anytime.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans?.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: index * 0.2 }}
                            whileHover={{ scale: 1.02, y: -5 }}
                            className={`relative group ${plan.popular ? "lg:-mt-8" : ""
                                }`}
                        >
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
                                        Popular
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
                                            {plan.name === "Pro" && isProPlanProRata()
                                                ? getProPlanPrice()
                                                : plan.price}
                                        </span>
                                        <span className="text-muted-foreground ml-2">
                                            /{plan.period}
                                        </span>
                                        {plan.name === "Pro" && isProPlanProRata() && (
                                            <div className="mt-2">
                                                <span className="text-xs text-primary font-medium">
                                                    Pro-rata upgrade from Lite
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-16">
                                    {plan?.features?.map((feature) => (
                                        <div
                                            key={index}
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
                        All plans include access to our core AI features.
                        Upgrade anytime for more power.
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
                usageCount={usageData?.usageCount || 0}
                usageLimit={usageData?.usageLimit || 3}
                plan={selectedPlan}
                currentPlan={(usageData?.plan as "Free" | "Lite" | "Pro") || "Free"}
                isAuthenticated={isAuthenticated}
            />
        </section>
    );
}
