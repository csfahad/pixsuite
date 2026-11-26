"use client";

import { useEffect } from "react";
import Footer from "@/modules/home/footer";
import Features from "@/modules/features";
import Hero from "@/modules/hero";
import Pricing from "@/modules/pricing";
import { toast } from "sonner";
import {
    isPaidPlan,
    PLAN_CREDIT_LIMITS,
    PLAN_UPLOAD_LIMITS,
} from "@/lib/plans";

const numberFormat = new Intl.NumberFormat("en-IN");

export default function Home() {
    // handle payment success/fail/cancel from URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const upgraded = urlParams.get("upgraded");
        const failed = urlParams.get("payment_failed");
        const cancelled = urlParams.get("payment_cancelled");
        const pending = urlParams.get("payment_pending");

        if (!upgraded && !failed && !cancelled && !pending) return;

        const controller = new AbortController();
        // Wait for the root Toaster before consuming the return state.
        const timer = setTimeout(async () => {
            const paymentFlag = sessionStorage.getItem("pixsuite_payment");
            sessionStorage.removeItem("pixsuite_payment");
            window.history.replaceState(window.history.state, "", "/");
            if (!paymentFlag) return;

            const showPending = () =>
                toast.info("Payment processing", {
                    description:
                        "Your plan will update when the payment is confirmed. Check your account for the current status.",
                    duration: 8000,
                });
            if (pending && paymentFlag === "pending") {
                showPending();
            } else if (isPaidPlan(upgraded) && paymentFlag === "upgraded") {
                const usage = await fetch("/api/usage", {
                    signal: controller.signal,
                })
                    .then(async (response) =>
                        response.ok ? response.json() : null,
                    )
                    .catch(() => null);
                if (controller.signal.aborted) return;
                if (usage?.plan !== upgraded) {
                    showPending();
                    return;
                }
                toast.success(`${upgraded} is now active`, {
                    description: `Your monthly allowance is ${numberFormat.format(PLAN_CREDIT_LIMITS[upgraded])} AI credits and ${numberFormat.format(PLAN_UPLOAD_LIMITS[upgraded])} uploads.`,
                    duration: 8000,
                });
            } else if (failed && paymentFlag === "failed") {
                toast.error("Payment verification failed", {
                    description:
                        "If you were charged, contact support with your payment reference.",
                    duration: 10000,
                });
            } else if (cancelled && paymentFlag === "cancelled") {
                toast.info("Checkout closed", {
                    description:
                        "You can return to pricing to start checkout again.",
                    duration: 5000,
                });
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, []);

    return (
        <>
            <main>
                <Hero />
                <Features />
                <Pricing />
            </main>
            <Footer />
        </>
    );
}
