import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { signIn } from "next-auth/react";
import { ArrowRight, CircleAlert, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { getAnalyticsSessionId, trackEvent } from "@/lib/analytics";
import home from "@/modules/home/home.module.css";
import {
    getUpgradePriceDisplay,
    PLAN_CREDIT_LIMITS,
    PLAN_UPLOAD_LIMITS,
    type PaidPlan,
    type PlanType,
} from "@/lib/plans";
import styles from "./payment-modal.module.css";

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
    onClose: (reason: "dismissed" | "checkout") => void;
    creditsRemaining: number;
    uploadCount: number;
    uploadLimit: number;
    plan?: PaidPlan;
    currentPlan?: PlanType;
    isAuthenticated?: boolean;
}

const numberFormat = new Intl.NumberFormat("en-IN");

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
    const [openingCheckout, setOpeningCheckout] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [sdkStatus, setSdkStatus] = useState<"loading" | "ready" | "error">(
        "loading",
    );
    const [sdkRetry, setSdkRetry] = useState(0);
    const [actionError, setActionError] = useState<string | null>(null);
    const [handingOff, setHandingOff] = useState(false);
    const viewedModal = useRef(false);
    const checkoutRequest = useRef<AbortController | null>(null);
    const checkoutOpened = useRef(false);
    const previousFocus = useRef<HTMLElement | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);

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
        if (!isOpen || !isAuthenticated) return;
        if (window.Razorpay) {
            const ready = window.setTimeout(() => setSdkStatus("ready"), 0);
            return () => window.clearTimeout(ready);
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        const settled = (ready: boolean) => {
            window.clearTimeout(timeout);
            script.onload = null;
            script.onerror = null;
            setSdkStatus(ready ? "ready" : "error");
            if (ready) trackEvent("checkout_sdk_loaded");
            else trackEvent("checkout_sdk_failed", { source: script.src });
        };
        const timeout = window.setTimeout(() => settled(false), 12000);
        script.onload = () => settled(typeof window.Razorpay === "function");
        script.onerror = () => settled(false);
        document.body.append(script);

        return () => {
            window.clearTimeout(timeout);
            script.onload = null;
            script.onerror = null;
            script.remove();
        };
    }, [isOpen, isAuthenticated, sdkRetry]);

    useEffect(() => () => checkoutRequest.current?.abort(), []);

    const handleClose = (reason: "dismissed" | "checkout") => {
        checkoutRequest.current?.abort();
        checkoutRequest.current = null;
        setOpeningCheckout(false);
        setSdkStatus("loading");
        setActionError(null);
        onClose(reason);
    };

    const handleUpgrade = async () => {
        if (checkoutRequest.current || sdkStatus !== "ready") return;
        const request = new AbortController();
        checkoutRequest.current = request;
        setOpeningCheckout(true);
        setActionError(null);
        trackEvent("checkout_started", {
            selected_plan: plan,
            current_plan: currentPlan,
        });
        let stage = "order_creation";
        try {
            // create razorpay order with plan type
            const response = await fetch("/api/create-razorpay-order", {
                method: "POST",
                signal: request.signal,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan: plan,
                    analyticsSessionId: getAnalyticsSessionId(),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create checkout order");
            }

            const { orderId, amount, currency, key } = await response.json();
            if (request.signal.aborted) return;

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
                throw new Error("Checkout SDK did not load");
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
                    }
                },
                theme: {
                    color: "#407475",
                },
                modal: {
                    ondismiss: function () {
                        trackEvent("checkout_cancelled", {
                            ...checkoutProperties,
                        });
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
            checkoutOpened.current = true;
            // Release the app dialog's focus trap before the provider takes focus.
            flushSync(() => setHandingOff(true));
            razorpay.open();
            handleClose("checkout");
            setHandingOff(false);
            trackEvent("checkout_opened", {
                ...checkoutProperties,
            });
        } catch (err) {
            if (request.signal.aborted) return;
            checkoutOpened.current = false;
            setHandingOff(false);
            trackEvent("checkout_failed", {
                selected_plan: plan,
                stage,
                error: err instanceof Error ? err.message : String(err),
            });
            console.error("Upgrade failed:", err);
            setActionError("Checkout couldn’t open. Please try again.");
        } finally {
            if (checkoutRequest.current === request) {
                checkoutRequest.current = null;
                setOpeningCheckout(false);
            }
        }
    };

    const handleSignIn = async () => {
        if (signingIn) return;
        setSigningIn(true);
        setActionError(null);
        trackEvent("sign_in_started", {
            provider: "google",
            source: "upgrade_modal",
            selected_plan: plan,
        });
        try {
            await signIn("google", {
                callbackUrl: `/editor?showUpgrade=${plan}`,
            });
        } catch {
            setActionError("Google sign-in couldn’t open. Please try again.");
        } finally {
            setSigningIn(false);
        }
    };

    const isPaidUpgrade = currentPlan !== "Free";
    const sdkError = isAuthenticated && sdkStatus === "error";
    const busy =
        signingIn ||
        openingCheckout ||
        (isAuthenticated && sdkStatus === "loading");
    const actionLabel = signingIn
        ? "Opening Google sign-in…"
        : !isAuthenticated
          ? "Sign in with Google"
          : openingCheckout
            ? "Opening checkout…"
            : sdkStatus === "loading"
              ? "Preparing checkout…"
              : sdkError
                ? "Retry checkout"
                : "Continue to Checkout";

    const handleAction = () => {
        if (busy) return;
        if (!isAuthenticated) return handleSignIn();
        if (sdkError) {
            setSdkStatus("loading");
            setSdkRetry((value) => value + 1);
            return;
        }
        return handleUpgrade();
    };

    return (
        <Dialog.Root
            open={isOpen && !handingOff}
            onOpenChange={(open) => {
                if (!open) handleClose("dismissed");
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content
                    ref={dialogRef}
                    className={`${home.surface} ${styles.dialog}`}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        if (
                            !previousFocus.current &&
                            document.activeElement instanceof HTMLElement
                        ) {
                            previousFocus.current = document.activeElement;
                        }
                        titleRef.current?.focus({ preventScroll: true });
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        if (dialogRef.current) return;
                        if (
                            !checkoutOpened.current &&
                            previousFocus.current?.isConnected
                        ) {
                            previousFocus.current.focus({
                                preventScroll: true,
                            });
                        }
                        checkoutOpened.current = false;
                        previousFocus.current = null;
                    }}
                >
                    <header className={styles.header}>
                        <Dialog.Title
                            ref={titleRef}
                            tabIndex={-1}
                            className={styles.title}
                        >
                            Upgrade to {plan}
                        </Dialog.Title>
                        <Dialog.Description className={styles.description}>
                            {isPaidUpgrade
                                ? `${numberFormat.format(creditsRemaining)} AI credits remaining on ${currentPlan}.`
                                : `You’ve used ${numberFormat.format(uploadCount)} of ${numberFormat.format(uploadLimit)} free uploads.`}
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className={styles.close}
                                aria-label="Close upgrade dialog"
                            >
                                <X size={18} aria-hidden />
                            </button>
                        </Dialog.Close>
                    </header>

                    <dl className={styles.allowances}>
                        <div>
                            <dt>Monthly AI credits</dt>
                            <dd>
                                {numberFormat.format(PLAN_CREDIT_LIMITS[plan])}
                            </dd>
                        </div>
                        <div>
                            <dt>Monthly uploads</dt>
                            <dd>
                                {numberFormat.format(PLAN_UPLOAD_LIMITS[plan])}
                            </dd>
                        </div>
                    </dl>
                    <p className={styles.tools}>
                        {plan === "Starter"
                            ? "Standard AI editing and crop tools included."
                            : "All AI editing and crop tools, including Pro background removal."}
                    </p>

                    <div className={styles.billing}>
                        <div>
                            <p className={styles.priceLabel}>
                                {isPaidUpgrade ? "Due today" : "Plan price"}
                            </p>
                            <p className={styles.priceContext}>
                                {isPaidUpgrade
                                    ? `Prorated upgrade from ${currentPlan}`
                                    : "One month of access"}
                            </p>
                        </div>
                        <p className={styles.price}>
                            ₹{getUpgradePriceDisplay(currentPlan, plan)}
                        </p>
                    </div>

                    {(sdkError || actionError) && (
                        <p className={styles.error} role="alert">
                            <CircleAlert size={16} aria-hidden />
                            {sdkError
                                ? "Checkout couldn’t load. Please try again."
                                : actionError}
                        </p>
                    )}

                    <Button
                        type="button"
                        className={styles.primary}
                        onClick={handleAction}
                        aria-busy={busy}
                        aria-disabled={busy}
                    >
                        {actionLabel}
                        {!busy && !sdkError && (
                            <ArrowRight size={16} aria-hidden />
                        )}
                    </Button>
                    <p className="sr-only" role="status">
                        {busy ? actionLabel : ""}
                    </p>
                    <p className={styles.legal}>
                        By upgrading, you agree to our{" "}
                        <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Privacy Policy
                        </a>
                        .
                    </p>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
