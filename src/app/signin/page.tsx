"use client";

import { motion } from "motion/react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WandSparkles, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                    <WandSparkles className="h-8 w-8 text-primary" />
                </motion.div>
            </div>
        );
    }

    if (status === "authenticated") {
        return null;
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
            {/* Background gradient layer */}
            <div className="absolute inset-0 bg-linear-to-br from-accent via-background to-muted opacity-50" />

            {/* Floating orbs — same aesthetic as the Hero section */}
            <motion.div
                className="absolute top-16 -left-20 w-[420px] h-[420px] rounded-full blur-[100px] opacity-30"
                style={{ background: "oklch(0.65 0.25 265)" }}
                animate={{ y: [0, 30, 0], x: [0, 15, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute -bottom-10 right-0 w-[340px] h-[340px] rounded-full blur-[100px] opacity-25"
                style={{ background: "oklch(0.72 0.19 150)" }}
                animate={{ y: [0, -25, 0], x: [0, -20, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full blur-[80px] opacity-20"
                style={{ background: "oklch(0.75 0.15 30)" }}
                animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Main card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Glow behind card */}
                <div className="absolute -inset-1 rounded-3xl bg-linear-to-br from-primary/20 via-transparent to-primary/10 blur-xl opacity-60" />

                <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-2xl shadow-xl overflow-hidden">
                    {/* Shimmer line at top */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

                    <div className="px-8 pt-10 pb-8 sm:px-10">
                        {/* Logo */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="flex flex-col items-center mb-8"
                        >
                            <div className="relative mb-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20">
                                    <WandSparkles className="h-7 w-7 text-primary" />
                                </div>
                                <div className="absolute -inset-1 rounded-2xl bg-primary/10 blur-lg opacity-50 animate-pulse" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Welcome to PixSuite
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
                                Sign in to unlock AI-powered photo editing, background removal, and more.
                            </p>
                        </motion.div>

                        {/* Google Sign In Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            whileHover={loading ? undefined : { scale: 1.02 }}
                            whileTap={loading ? undefined : { scale: 0.98 }}
                            disabled={loading}
                            onClick={() => {
                                if (loading) return;
                                setLoading(true);
                                signIn("google", { callbackUrl: "/" });
                            }}
                            className="group relative w-full flex items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/60 hover:bg-background px-5 py-3.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                                <svg
                                    className="h-5 w-5 shrink-0"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            <span>{loading ? "Redirecting…" : "Continue with Google"}</span>
                            {!loading && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                            )}
                        </motion.button>

                        {/* Security note */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-6 text-center text-xs text-muted-foreground/70"
                        >
                            By continuing, you agree to our{" "}
                            <Link
                                href="/terms"
                                className="underline underline-offset-2 hover:text-foreground transition-colors"
                            >
                                Terms
                            </Link>{" "}
                            and{" "}
                            <Link
                                href="/privacy"
                                className="underline underline-offset-2 hover:text-foreground transition-colors"
                            >
                                Privacy Policy
                            </Link>
                        </motion.p>
                    </div>
                </div>

                {/* Back to home */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center"
                >
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                        Back to home
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
