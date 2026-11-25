"use client";

import { useEffect } from "react";
import Footer from "@/modules/home/footer";
import Features from "@/modules/features";
import Hero from "@/modules/hero";
import Pricing from "@/modules/pricing";
import { toast } from "sonner";
import { CheckCircle2Icon, OctagonXIcon, InfoIcon } from "lucide-react";

const PLAN_BENEFITS: Record<
    string,
    { credits: string; uploads: string; highlight: string }
> = {
    Starter: {
        credits: "3,000",
        uploads: "500",
        highlight: "Standard AI editing tools",
    },
    Lite: {
        credits: "10,000",
        uploads: "5,000",
        highlight: "Pro background removal & all AI tools",
    },
    Pro: {
        credits: "25,000",
        uploads: "20,000",
        highlight: "Higher monthly allowances",
    },
};

export default function Home() {
    // handle payment success/fail/cancel from URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const upgraded = urlParams.get("upgraded");
        const failed = urlParams.get("payment_failed");
        const cancelled = urlParams.get("payment_cancelled");
        const pending = urlParams.get("payment_pending");

        if (!upgraded && !failed && !cancelled && !pending) return;

        const paymentFlag = sessionStorage.getItem("pixsuite_payment");
        sessionStorage.removeItem("pixsuite_payment");

        // clean URL immediately
        window.history.replaceState({}, "", "/");

        if (!paymentFlag) return;

        // delay toast to ensure <Toaster> is mounted after page reload
        const timer = setTimeout(async () => {
            const showPending = () =>
                toast("Your payment is processing", {
                    description:
                        "Your plan will update after confirmation. Check your account for its current status.",
                    duration: 8000,
                    icon: <InfoIcon className="size-4" />,
                });
            if (pending) {
                showPending();
            } else if (upgraded) {
                const usage = await fetch("/api/usage")
                    .then(async (response) =>
                        response.ok ? response.json() : null,
                    )
                    .catch(() => null);
                if (usage?.plan !== upgraded) {
                    showPending();
                    return;
                }
                const benefits = PLAN_BENEFITS[upgraded];
                if (benefits) {
                    toast.success(`Welcome to ${upgraded}!`, {
                        description: `You now have ${benefits.credits} credits and ${benefits.uploads} uploads/month. ${benefits.highlight}.`,
                        duration: 8000,
                        icon: <CheckCircle2Icon className="size-4" />,
                    });
                } else {
                    toast.success("Payment successful!", {
                        description:
                            "Your plan has been upgraded. Enjoy your new features!",
                        duration: 6000,
                        icon: <CheckCircle2Icon className="size-4" />,
                    });
                }
            } else if (failed) {
                toast.error("Payment verification failed", {
                    description:
                        "Your payment could not be verified. If you were charged, please contact support and we'll resolve it immediately.",
                    duration: 10000,
                    icon: <OctagonXIcon className="size-4" />,
                });
            } else if (cancelled) {
                toast("Payment cancelled", {
                    description: "No worries! You can upgrade anytime.",
                    duration: 5000,
                    icon: <InfoIcon className="size-4" />,
                });
            }
        }, 100);

        return () => clearTimeout(timer);
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
