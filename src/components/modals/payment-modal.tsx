import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { Check, Crown, LogIn, Rocket, X, Zap } from "lucide-react";
import { useNavigationFeedback } from "@/components/navigation-feedback";
import { LoadingState } from "@/components/loading-state";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getAnalyticsSessionId, trackEvent } from "@/lib/analytics";
import {
    getUpgradePriceDisplay,
    PLAN_CREDIT_LIMITS,
    PLAN_UPLOAD_LIMITS,
    type PlanType,
} from "@/lib/plans";

declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => {
            open: () => void;
            on: (
                event: "payment.failed",
                handler: (response: CheckoutFailure) => void,
            ) => void;
        };
    }
}

interface CheckoutResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface CheckoutFailure {
    error: {
        code?: string;
        description?: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: { order_id?: string; payment_id?: string };
    };
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
        {
            title: `${PLAN_CREDIT_LIMITS.Starter.toLocaleString()} AI Credits/mo`,
            description: "Use any AI tool — pay per feature",
        },
        {
            title: `${PLAN_UPLOAD_LIMITS.Starter.toLocaleString()} Uploads/mo`,
            description: "More than enough for casual use",
        },
        {
            title: "All Basic AI Features",
            description: "Background removal, upscale, retouch, and more",
        },
    ],
    Lite: [
        {
            title: `${PLAN_CREDIT_LIMITS.Lite.toLocaleString()} AI Credits/mo`,
            description: "Enough for frequent editing",
        },
        {
            title: `${PLAN_UPLOAD_LIMITS.Lite.toLocaleString()} Uploads/mo`,
            description: "Handle high-volume workloads",
        },
        {
            title: "All AI Features Unlocked",
            description: "Including Pro BG removal (e-removedotbg)",
        },
        {
            title: "Priority Processing",
            description: "Faster AI processing for your edits",
        },
    ],
    Pro: [
        {
            title: `${PLAN_CREDIT_LIMITS.Pro.toLocaleString()} AI Credits/mo`,
            description: "Maximum credits for power users",
        },
        {
            title: `${PLAN_UPLOAD_LIMITS.Pro.toLocaleString()} Uploads/mo`,
            description: "Handle enterprise volumes",
        },
        {
            title: "Fastest Processing",
            description: "Top priority in processing queue",
        },
        {
            title: "API Access + Priority Support",
            description: "For professional workflows",
        },
    ],
};

export default function PaymentModal({
    isOpen,
    onClose,
    creditsRemaining,
    uploadCount,
    uploadLimit,
    plan = "Starter",
    currentPlan = "Free",
    isAuthenticated = true,
}: PaymentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [sdkReady, setSdkReady] = useState(false);
    const [sdkError, setSdkError] = useState(false);
    const [sdkRetry, setSdkRetry] = useState(0);
    const { beginAction, finish } = useNavigationFeedback();
    const [mounted, setMounted] = useState(false);
    const viewedModal = useRef(false);

    useEffect(() => {
        if (isOpen && !viewedModal.current) {
            trackEvent("upgrade_modal_viewed", {
                selected_plan: plan,
                current_plan: currentPlan,
                is_authenticated: isAuthenticated,
                credits_remaining: creditsRemaining,
                upload_count: uploadCount,
                upload_limit: uploadLimit,
            });
        }
        if (!isOpen && viewedModal.current)
            trackEvent("upgrade_modal_closed", { selected_plan: plan });
        viewedModal.current = isOpen;
    }, [
        isOpen,
        plan,
        currentPlan,
        isAuthenticated,
        creditsRemaining,
        uploadCount,
        uploadLimit,
    ]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // load razorpay checkout script
    useEffect(() => {
        if (!isOpen || !isAuthenticated) return;
        if (window.Razorpay) {
            setSdkReady(true);
            return;
        }
        setSdkError(false);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => {
            setSdkReady(true);
            trackEvent("checkout_sdk_loaded");
        };
        script.onerror = () => {
            setSdkError(true);
            trackEvent("checkout_sdk_failed", { source: script.src });
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [isOpen, isAuthenticated, sdkRetry]);

    const handleUpgrade = async () => {
        if (isLoading || !sdkReady) return;
        const token = beginAction("Opening checkout…");
        trackEvent("checkout_started", {
            selected_plan: plan,
            current_plan: currentPlan,
        });
        setIsLoading(true);
        let stage = "order_creation";
        try {
            // create razorpay order with plan type
            const response = await fetch("/api/create-razorpay-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan: plan,
                    analyticsSessionId: getAnalyticsSessionId(),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create Razorpay order");
            }

            const { orderId, amount, currency, key } = await response.json();

            if (!orderId || !key) {
                throw new Error("Invalid order details received");
            }
            const checkoutProperties = {
                selected_plan: plan,
                previous_plan: currentPlan,
                order_id: orderId,
                currency,
                amount_paise: amount,
            };
            trackEvent("checkout_order_created", checkoutProperties);

            if (!window.Razorpay) {
                throw new Error(
                    "Razorpay checkout not loaded. Please try again.",
                );
            }

            // open razorpay checkout
            stage = "checkout_initialization";
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "PixSuite",
                description: `${plan} Plan Subscription`,
                order_id: orderId,
                handler: async function (response: CheckoutResponse) {
                    trackEvent("checkout_submitted", {
                        ...checkoutProperties,
                        payment_id: response.razorpay_payment_id,
                        source: "checkout_callback",
                        payment_status: "awaiting_webhook",
                    });
                    // Production waits for the signed webhook. Checkout success grants no entitlement.
                    if (process.env.NODE_ENV !== "development") {
                        sessionStorage.setItem("pixsuite_payment", "pending");
                        window.location.href = "/?payment_pending=true";
                        return;
                    }
                    try {
                        // Local development may test capture through the development-only endpoint.
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

                        const result = await verifyResponse.json();
                        if (result.pending) {
                            sessionStorage.setItem(
                                "pixsuite_payment",
                                "pending",
                            );
                            window.location.href = "/?payment_pending=true";
                            return;
                        }
                        if (!verifyResponse.ok) {
                            throw new Error("Payment verification failed");
                        }

                        if (result.success) {
                            if (result.activated)
                                trackEvent("checkout_completed", {
                                    ...checkoutProperties,
                                    payment_id: response.razorpay_payment_id,
                                    source: "development",
                                });
                            sessionStorage.setItem(
                                "pixsuite_payment",
                                "upgraded",
                            );
                            window.location.href = `/?upgraded=${plan}`;
                        } else {
                            throw new Error("Payment verification failed");
                        }
                    } catch (err) {
                        trackEvent("checkout_failed", {
                            ...checkoutProperties,
                            payment_id: response.razorpay_payment_id,
                            error:
                                err instanceof Error
                                    ? err.message
                                    : String(err),
                            stage: "payment_verification",
                        });
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
                        trackEvent("checkout_cancelled", {
                            ...checkoutProperties,
                        });
                        setIsLoading(false);
                        sessionStorage.setItem("pixsuite_payment", "cancelled");
                        window.location.href = "/?payment_cancelled=true";
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            // This callback records an attempt; the signed webhook remains the
            // authority for both persisted failures and subscription activation.
            razorpay.on("payment.failed", (response) => {
                trackEvent("checkout_payment_failed", {
                    ...checkoutProperties,
                    payment_id: response.error.metadata?.payment_id,
                    failure_code: response.error.code,
                    error_description: response.error.description,
                    error_source: response.error.source,
                    error_step: response.error.step,
                    error_reason: response.error.reason,
                    source: "checkout_callback",
                });
            });
            onClose();
            razorpay.open();
            finish(token);
            trackEvent("checkout_opened", {
                ...checkoutProperties,
            });
        } catch (err) {
            trackEvent("checkout_failed", {
                selected_plan: plan,
                stage,
                error: err instanceof Error ? err.message : String(err),
            });
            finish(token);
            console.error("Upgrade failed:", err);
            alert(
                err instanceof Error
                    ? err.message
                    : "Failed to start checkout. Please try again.",
            );
            setIsLoading(false);
        }
    };

    const handleSignIn = async () => {
        if (signingIn) return;
        setSigningIn(true);
        trackEvent("sign_in_started", {
            provider: "google",
            source: "upgrade_modal",
            selected_plan: plan,
        });
        const token = beginAction("Opening Google sign-in…");
        try {
            await signIn("google", {
                callbackUrl: `/editor?showUpgrade=${plan}`,
            });
        } catch {
            finish(token);
            setSigningIn(false);
        }
    };

    const PlanIcon = planIcons[plan] || Zap;
    const features = planFeatures[plan] || [];

    if (!mounted) return null;

    return createPortal(
        <>
            {isOpen && isAuthenticated && !sdkReady && !sdkError && (
                <LoadingState label="Preparing checkout…" />
            )}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <div
                        className="relative w-full max-w-md glass rounded-xl p-6 border border-primary/20 dark:border-primary/20 shadow-glow-primary mt-12"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent  cursor-pointer"
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
                                <div
                                    key={i}
                                    className="flex items-center space-x-3"
                                >
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

                        {sdkError && (
                            <div
                                role="alert"
                                className="mb-4 text-sm text-destructive"
                            >
                                Checkout couldn’t load.{" "}
                                <button
                                    type="button"
                                    className="min-h-11 underline"
                                    onClick={() =>
                                        setSdkRetry((value) => value + 1)
                                    }
                                >
                                    Retry checkout
                                </button>
                            </div>
                        )}
                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {isAuthenticated ? (
                                <Button
                                    onClick={handleUpgrade}
                                    disabled={isLoading || !sdkReady}
                                    aria-busy={isLoading || !sdkReady}
                                    className="w-full bg-primary text-primary-foreground hover:shadow-glow-primary  cursor-pointer"
                                >
                                    {isLoading || !sdkReady ? (
                                        <>
                                            <BrandMark
                                                className="w-4 h-4 mr-2"
                                                aria-hidden="true"
                                            />
                                            {isLoading
                                                ? "Opening checkout…"
                                                : "Loading checkout…"}
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
                                    onClick={handleSignIn}
                                    disabled={signingIn}
                                    aria-busy={signingIn}
                                    className="w-full bg-primary text-primary-foreground hover:shadow-glow-primary  cursor-pointer"
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    {signingIn
                                        ? "Opening sign-in…"
                                        : "Sign in to Upgrade"}
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
                    </div>
                </div>
            )}
        </>,
        document.body,
    );
}
