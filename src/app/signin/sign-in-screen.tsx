"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { PageLoading } from "@/components/loading-state";
import { useAppRouter } from "@/components/navigation-feedback";
import Link from "@/components/navigation-link";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import styles from "./sign-in.module.css";

type SignInAttempt = "idle" | "opening" | "failed";

function getProviderError(code: string | null) {
    if (!code || code === "SessionRequired") return null;
    if (code === "OAuthAccountNotLinked") {
        return "Use the Google account you originally signed in with.";
    }
    return "Google sign-in couldn’t complete. Try again.";
}

export default function SignInScreen() {
    const { status } = useSession();
    const router = useAppRouter();
    const providerError = getProviderError(useSearchParams().get("error"));
    const [attempt, setAttempt] = useState<SignInAttempt>("idle");
    const opening = useRef(false);

    useEffect(() => {
        if (status === "authenticated") router.replace("/");
    }, [router, status]);

    useEffect(() => {
        const restore = (event: PageTransitionEvent) => {
            if (!event.persisted) return;
            opening.current = false;
            setAttempt("idle");
        };
        window.addEventListener("pageshow", restore);
        return () => window.removeEventListener("pageshow", restore);
    }, []);

    if (status === "authenticated") {
        return <PageLoading label="Opening PixSuite…" />;
    }

    const checking = status === "loading";
    const busy = checking || attempt === "opening";
    const actionLabel = checking
        ? "Checking your session…"
        : attempt === "opening"
          ? "Opening Google sign-in…"
          : "Continue with Google";
    const error = busy
        ? null
        : attempt === "failed"
          ? "Google sign-in couldn’t open. Try again."
          : providerError;

    const handleSignIn = async () => {
        if (checking || opening.current) return;

        opening.current = true;
        setAttempt("opening");
        trackEvent("sign_in_started", {
            provider: "google",
            source: "signin_page",
        });
        try {
            await signIn("google", { callbackUrl: "/" });
        } catch {
            opening.current = false;
            setAttempt("failed");
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.layout} aria-labelledby="sign-in-title">
                <Link
                    href="/"
                    className={styles.brand}
                    aria-label="PixSuite home"
                >
                    <BrandMark className={styles.mark} aria-hidden />
                </Link>
                <h1 id="sign-in-title" className={styles.title}>
                    Sign in to PixSuite
                </h1>
                <Button
                    type="button"
                    variant="secondary"
                    className={styles.googleButton}
                    aria-disabled={busy}
                    aria-busy={busy}
                    onClick={handleSignIn}
                >
                    {busy ? (
                        <LoaderCircle className={styles.spinner} aria-hidden />
                    ) : (
                        <GoogleMark />
                    )}
                    {actionLabel}
                </Button>
                <p className="sr-only" role="status">
                    {busy ? actionLabel : ""}
                </p>
                {error && (
                    <p className={styles.error} role="alert">
                        <CircleAlert size={16} aria-hidden />
                        {error}
                    </p>
                )}
                <p className={styles.legal}>
                    By continuing, you agree to our{" "}
                    <Link href="/terms">Terms of Service</Link> and{" "}
                    <Link href="/privacy">Privacy Policy</Link>.
                </p>
            </section>
        </main>
    );
}

function GoogleMark() {
    return (
        <svg
            className={styles.googleIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
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
    );
}
