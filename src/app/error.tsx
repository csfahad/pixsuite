"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useTransition } from "react";
import { useNavigationFeedback } from "@/components/navigation-feedback";
import { PageLoading } from "@/components/loading-state";
export default function ErrorPage({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { complete } = useNavigationFeedback();
    const [retrying, startRetry] = useTransition();
    useEffect(() => complete(), [complete]);
    if (retrying) return <PageLoading label="Loading your page…" />;
    return (
        <main className="min-h-screen px-6 pt-28">
            <div role="alert" className="mx-auto max-w-6xl space-y-4">
                <h1 className="text-2xl font-semibold">
                    This page couldn’t load.
                </h1>
                <p className="text-muted-foreground">Try loading it again.</p>
                <Button
                    onClick={() => startRetry(reset)}
                    disabled={retrying}
                    aria-busy={retrying}
                >
                    {retrying ? "Retrying…" : "Try again"}
                </Button>
            </div>
        </main>
    );
}
