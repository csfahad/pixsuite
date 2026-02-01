'use client'

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Footer from "@/components/footer";
import Editor from "@/modules/editor";
import Features from "@/modules/features";
import Hero from "@/modules/hero";
import Pricing from "@/modules/pricing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, InfoIcon, OctagonX, X } from "lucide-react";

export default function Home() {

    const [paymentStatus, setPaymentStatus] = useState<"upgraded" | "failed" | "cancelled" | null>(null);
    const [plan, setPlan] = useState<string>("Pro");

    // handle payment success/fail/cancel toast from URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const upgraded = urlParams.get("upgraded");
        const failed = urlParams.get("payment_failed");
        const cancelled = urlParams.get("payment_cancelled");

        if (upgraded) {
            setPaymentStatus("upgraded");
            setPlan(upgraded === "Lite" ? "Lite" : "Pro");
            window.history.replaceState({}, "", "/");
        } else if (failed) {
            setPaymentStatus("failed");
            window.history.replaceState({}, "", "/");
        } else if (cancelled) {
            setPaymentStatus("cancelled");
            window.history.replaceState({}, "", "/");
        } else {
            setPaymentStatus(null);
            window.history.replaceState({}, "", "/");
        }
    }, []);


    return (
        <div>
            <AnimatePresence>
                {paymentStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed bottom-8 right-4 z-50 p-0 rounded-lg`}
                    >
                        <div className="grid w-full max-w-md items-start gap-4">

                            {
                                paymentStatus === "upgraded" ? (
                                    <>
                                        <div className="flex items-center bg-card">
                                            <Alert>
                                                <CheckCircle2Icon />
                                                <AlertTitle>Payment successful</AlertTitle>
                                                <AlertDescription>
                                                    {plan === "Lite"
                                                        ? "🎉 Welcome to Lite! You now have 1000 uploads/month."
                                                        : "🎉 Welcome to Pro! You now have unlimited uploads."
                                                    }
                                                </AlertDescription>
                                            </Alert>
                                            <button
                                                onClick={() => setPaymentStatus(null)}
                                                className="mr-4 hover:opacity-70 cursor-pointer"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                    </>
                                ) : paymentStatus === "failed" ? (
                                    <>
                                        <div className="flex items-center bg-card">
                                            <Alert>
                                                <OctagonX />
                                                <AlertTitle>Payment verification failed</AlertTitle>
                                                <AlertDescription>
                                                    Please contact support!
                                                </AlertDescription>
                                            </Alert>
                                            <button
                                                onClick={() => setPaymentStatus(null)}
                                                className="mr-4 hover:opacity-70 cursor-pointer"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : paymentStatus === "cancelled" ? (
                                    <>
                                        <div className="flex items-center bg-card">
                                            <Alert>
                                                <InfoIcon />
                                                <AlertTitle>Payment cancelled</AlertTitle>
                                                <AlertDescription>
                                                    You can upgrade anytime!
                                                </AlertDescription>
                                            </Alert>
                                            <button
                                                onClick={() => setPaymentStatus(null)}
                                                className="mr-4 hover:opacity-70 cursor-pointer"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : null
                            }
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Hero />
            <Features />
            <Pricing />
            <Footer />
        </div >
    );
}
