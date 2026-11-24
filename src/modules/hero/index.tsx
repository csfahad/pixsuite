"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, ArrowRight } from "lucide-react";
import BeforeAfterSlider from "./BeforeAfterSlider";
import Link from "@/components/navigation-link";
import styles from "./hero.module.css";
import HeroBackdrop from "./hero-backdrop";

interface UsageData {
    usageCount: number;
    usageLimit: number;
    plan: string;
    canUpload: boolean;
    subscriptionExpiresAt?: string | null;
}

export default function Hero() {
    const [usageData, setUsageData] = useState<UsageData | null>(null);

    useEffect(() => {
        const checkUsage = async () => {
            try {
                const response = await fetch("/api/usage");
                if (response.ok) {
                    const data = await response.json();
                    setUsageData(data);
                }
            } catch (err) {
                console.error("Failed to check usage:", err);
            }
        };
        checkUsage();
    }, []);

    const currentPlan = usageData?.plan || "Free";
    const isFreePlan = currentPlan === "Free";
    const isStarterPlan = currentPlan === "Starter";
    const isLitePlan = currentPlan === "Lite";
    const isProPlan = currentPlan === "Pro";
    const isFreeAndLimitReached =
        isFreePlan && usageData && !usageData.canUpload;

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: "instant",
            });
        }
    };

    return (
        <section id="hero" className={styles.hero}>
            <div className={styles.heroInner}>
                <div className={styles.intro}>
                    <h1 className={styles.title}>AI Photo editing tool</h1>
                    <p className={styles.subtitle}>
                        Upload a photo. Pick an edit.
                    </p>
                    <p className={styles.description}>
                        Remove backgrounds, refine details, and change the
                        scene. Start with your image.
                    </p>
                    <div className={styles.actions}>
                        {isFreePlan && (
                            <>
                                {isFreeAndLimitReached ? (
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        disabled
                                        className="group text-secondary-foreground cursor-not-allowed opacity-60"
                                    >
                                        <ImagePlus className="h-4 w-4 mr-2" />
                                        Free Limit Reached
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        variant="secondary"
                                        size="lg"
                                        className="group text-secondary-foreground cursor-pointer w-full"
                                    >
                                        <Link href="/editor">
                                            <ImagePlus className="h-4 w-4 mr-2" />
                                            Try Free Now
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    variant="default"
                                    size="lg"
                                    onClick={() => scrollToSection("pricing")}
                                    className="group cursor-pointer"
                                >
                                    Start Plan
                                    <ArrowRight className="h-5 w-5 ml-2 " />
                                </Button>
                            </>
                        )}

                        {isStarterPlan && (
                            <>
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => scrollToSection("pricing")}
                                    className="group cursor-pointer"
                                >
                                    Upgrade Plan
                                    <ArrowRight className="h-5 w-5 ml-2 " />
                                </Button>
                                <Button
                                    asChild
                                    variant="default"
                                    size="lg"
                                    className="group text-primary-foreground cursor-pointer w-full"
                                >
                                    <Link href="/editor">
                                        <ImagePlus className="h-4 w-4 mr-2" />
                                        Start Editing
                                    </Link>
                                </Button>
                            </>
                        )}

                        {isLitePlan && (
                            <>
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => scrollToSection("pricing")}
                                    className="group cursor-pointer"
                                >
                                    Switch to Pro
                                    <ArrowRight className="h-5 w-5 ml-2 " />
                                </Button>
                                <Button
                                    asChild
                                    variant="default"
                                    size="lg"
                                    className="group text-primary-foreground cursor-pointer w-full"
                                >
                                    <Link href="/editor">
                                        <ImagePlus className="h-4 w-4 mr-2" />
                                        Start Editing
                                    </Link>
                                </Button>
                            </>
                        )}

                        {isProPlan && (
                            <Button
                                asChild
                                variant="default"
                                size="lg"
                                className="group text-primary-foreground cursor-pointer w-full"
                            >
                                <Link href="/editor">
                                    Start Editing
                                    <ArrowRight className="h-5 w-5 ml-2 " />
                                </Link>
                            </Button>
                        )}
                    </div>
                    {isFreePlan && (
                        <p className={styles.trialNote}>
                            3 free uploads <span aria-hidden="true" /> No card
                            needed
                        </p>
                    )}
                </div>
                <HeroBackdrop>
                    <BeforeAfterSlider />
                </HeroBackdrop>
            </div>
        </section>
    );
}
