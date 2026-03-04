import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Crown, LogIn, Rocket, Star, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    getUpgradePriceDisplay,
    PLAN_CREDIT_LIMITS,
    PLAN_UPLOAD_LIMITS,
    type PlanType,
} from "@/lib/plans";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    creditsRemaining: number;
    creditLimit: number;
    uploadCount: number;
    uploadLimit: number;
    plan?: "Starter" | "Lite" | "Pro";
    currentPlan?: PlanType;
    isAuthenticated?: boolean;
}

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    Starter: Zap,
    Lite: Rocket,
    Pro: Crown,
};

const planFeatures: Record<string, { title: string; description: string }[]> = {
    Starter: [
        { title: `${PLAN_CREDIT_LIMITS.Starter.toLocaleString()} AI Credits/mo`, description: "Use any AI tool — pay per feature" },
        { title: `${PLAN_UPLOAD_LIMITS.Starter.toLocaleString()} Uploads/mo`, description: "More than enough for casual use" },
        { title: "All Basic AI Features", description: "Background removal, upscale, retouch, and more" },
    ],
    Lite: [
        { title: `${PLAN_CREDIT_LIMITS.Lite.toLocaleString()} AI Credits/mo`, description: "Enough for frequent editing" },
        { title: `${PLAN_UPLOAD_LIMITS.Lite.toLocaleString()} Uploads/mo`, description: "Handle high-volume workloads" },
        { title: "All AI Features Unlocked", description: "Including Pro BG removal (e-removedotbg)" },
        { title: "Priority Processing", description: "Faster AI processing for your edits" },
    ],
    Pro: [
        { title: `${PLAN_CREDIT_LIMITS.Pro.toLocaleString()} AI Credits/mo`, description: "Maximum credits for power users" },
        { title: `${PLAN_UPLOAD_LIMITS.Pro.toLocaleString()} Uploads/mo`, description: "Handle enterprise volumes" },
        { title: "Fastest Processing", description: "Top priority in processing queue" },
        { title: "API Access + Priority Support", description: "For professional workflows" },
    ],
};

export default function PaymentModal({
    isOpen,
    onClose,
    onUpgrade,
    creditsRemaining,
    creditLimit,
    uploadCount,
    uploadLimit,
    plan = "Starter",
    currentPlan = "Free",
    isAuthenticated = true,
}: PaymentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // load razorpay checkout script
    useEffect(() => {
        if (!isOpen) return;

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [isOpen]);

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            // create razorpay order with plan type
            const response = await fetch("/api/create-razorpay-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan: plan,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create Razorpay order");
            }

            const { orderId, amount, currency, key } = await response.json();

            if (!orderId || !key) {
                throw new Error("Invalid order details received");
            }

            if (!window.Razorpay) {
                throw new Error(
                    "Razorpay checkout not loaded. Please try again.",
                );
            }

            // open razorpay checkout
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "PixSuite",
                description: `${plan} Plan Subscription`,
                order_id: orderId,
                handler: async function (response: any) {
                    try {
                        // verify payment on server
                        const verifyResponse = await fetch(
                            "/api/verify-razorpay-payment",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    razorpay_order_id:
                                        response.razorpay_order_id,
                                    razorpay_payment_id:
                                        response.razorpay_payment_id,
                                    razorpay_signature:
                                        response.razorpay_signature,
                                }),
                            },
                        );

                        if (!verifyResponse.ok) {
                            throw new Error("Payment verification failed");
                        }

                        const result = await verifyResponse.json();

                        if (result.success) {
                            sessionStorage.setItem("pixsuite_payment", "upgraded");
                            window.location.href = `/?upgraded=${plan}`;
                        } else {
                            throw new Error("Payment verification failed");
                        }
                    } catch (err) {
                        sessionStorage.setItem("pixsuite_payment", "failed");
                        window.location.href = "/?payment_failed=true";
                        console.error("Payment verification error:", err);
                    } finally {
                        setIsLoading(false);
                    }
                },
                theme: {
                    color: "oklch(0 0 0)",
                },
                modal: {
                    ondismiss: function () {
                        setIsLoading(false);
                        sessionStorage.setItem("pixsuite_payment", "cancelled");
                        window.location.href = "/?payment_cancelled=true";
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            onClose();
            razorpay.open();
        } catch (err: any) {
            console.error("Upgrade failed:", err);
            alert(err.message || "Failed to start checkout. Please try again.");
            setIsLoading(false);
        }
    };

    const PlanIcon = planIcons[plan] || Zap;
    const features = planFeatures[plan] || [];

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative w-full max-w-md glass rounded-xl p-6 border border-primary/20 dark:border-primary/20 shadow-glow-primary mt-12"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors cursor-pointer"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
                                <PlanIcon className="h-8 w-8 text-primary-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                Upgrade to {plan}
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                {currentPlan === "Free"
                                    ? `You've used ${uploadCount}/${uploadLimit} free uploads`
                                    : `${creditsRemaining.toLocaleString()} credits remaining on ${currentPlan}`}
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4 mb-6">
                            {features.map((feature, i) => (
                                <div key={i} className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                                        <Check className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">
                                            {feature.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pricing */}
                        <div className="bg-accent/80 rounded-xl p-4 mb-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">
                                    {plan} Plan
                                </p>
                                <div className="flex items-center justify-center space-x-2">
                                    <span className="text-3xl font-bold text-foreground">
                                        {`₹${getUpgradePriceDisplay(currentPlan, plan)}`}
                                    </span>
                                    <span className="text-muted-foreground">
                                        /month
                                    </span>
                                </div>
                                {currentPlan !== "Free" && (
                                    <span className="text-xs text-primary font-medium">
                                        (Pro-rata upgrade from {currentPlan})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {isAuthenticated ? (
                                <Button
                                    onClick={handleUpgrade}
                                    disabled={isLoading}
                                    className="w-full bg-primary text-primary-foreground hover:shadow-glow-primary transition-all cursor-pointer"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <PlanIcon className="h-4 w-4 mr-2" />
                                            Start {plan} Plan
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => signIn("google", { callbackUrl: `/editor?showUpgrade=${plan}` })}
                                    className="w-full bg-primary text-primary-foreground hover:shadow-glow-primary transition-all cursor-pointer"
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Sign in to Upgrade
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="w-full border-card-border cursor-pointer"
                            >
                                Maybe Later
                            </Button>
                        </div>

                        {/* Footer */}
                        <p className="text-xs text-muted-foreground text-center mt-4 tracking-wide">
                            By upgrading, you agree to our{" "}
                            <a
                                href="/terms"
                                className="text-primary/90 underline hover:text-muted-foreground"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Terms of Service
                            </a>
                            <span className="flex items-center justify-center">
                                and&nbsp;
                                <a
                                    href="/privacy"
                                    className="text-primary/90 underline hover:text-muted-foreground"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Privacy Policy
                                </a>
                            </span>
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
