"use client";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "@/components/navigation-link";
import { Button } from "@/components/ui/button";
import { useAppRouter as useRouter } from "@/components/navigation-feedback";
import { usePathname } from "next/navigation";
import UserInfo from "./user-info";
import { BrandLogo } from "@/components/brand/logo";
import { trackEvent } from "@/lib/analytics";

export default function Navbar() {
    const [menuState, setMenuState] = useState(false);

    const { data: session, status: sessionStatus } = useSession();

    const router = useRouter();
    const pathname = usePathname();

    const scrollToSection = (sectionId: string) => {
        trackEvent("navigation_selected", {
            destination: `/#${sectionId}`,
            source: "navbar",
        });
        if (pathname !== "/") {
            router.push(`/#${sectionId}`);
            return;
        }
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "instant" });
        }
    };

    const handleNavClick = (sectionId: string) => {
        scrollToSection(sectionId);
        setMenuState(false);
    };

    const handlePageNavClick = (destination: string) => {
        trackEvent("navigation_selected", {
            destination,
            source: "navbar",
        });
        setMenuState(false);
    };

    return (
        <header>
            <nav
                data-state={menuState && "active"}
                className="fixed z-20 w-full bg-background"
            >
                <div className="mx-auto max-w-7xl px-6 lg:px-16">
                    <div className="relative flex items-center justify-between gap-4 py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-4">
                        <div className="flex w-full items-center justify-between space-x-2 lg:w-auto">
                            <Link
                                href="/"
                                aria-label="PixSuite home"
                                className="brand-home-link inline-flex min-h-11 shrink-0 items-center rounded-sm text-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                <BrandLogo
                                    className="h-8 w-auto"
                                    aria-hidden="true"
                                />
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    trackEvent("navigation_menu_toggled", {
                                        open: true,
                                    });
                                    setMenuState(true);
                                }}
                                aria-label="Open Menu"
                                aria-expanded={menuState}
                                aria-controls={
                                    menuState ? "mobile-navigation" : undefined
                                }
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer rounded-lg p-2.5 focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
                            >
                                <Menu className="m-auto size-6" aria-hidden />
                            </button>
                        </div>

                        <div className="hidden items-center justify-center gap-6 lg:flex">
                            <button
                                onClick={() => scrollToSection("features")}
                                className="inline-flex min-h-11 items-center rounded-sm whitespace-nowrap text-muted-foreground hover:text-accent-foreground cursor-pointer outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection("pricing")}
                                className="inline-flex min-h-11 items-center rounded-sm whitespace-nowrap text-muted-foreground hover:text-accent-foreground cursor-pointer outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                Pricing
                            </button>
                            <Link
                                href="/terms"
                                onClick={() => handlePageNavClick("/terms")}
                                className="inline-flex min-h-11 items-center rounded-sm whitespace-nowrap text-muted-foreground hover:text-accent-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                Terms
                            </Link>
                            <Link
                                href="/privacy"
                                onClick={() => handlePageNavClick("/privacy")}
                                className="inline-flex min-h-11 items-center rounded-sm whitespace-nowrap text-muted-foreground hover:text-accent-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                Privacy Policy
                            </Link>
                        </div>
                        <div className="hidden items-center justify-end gap-3 lg:flex">
                            {sessionStatus ===
                            "loading" ? null : session?.user ? (
                                <UserInfo />
                            ) : (
                                <Button
                                    variant="default"
                                    className="shrink-0 cursor-pointer px-4"
                                    onClick={() => router.push("/signin")}
                                >
                                    Sign In
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile menu */}
            <>
                {menuState && (
                    <div
                        id="mobile-navigation"
                        className="fixed inset-0 z-999 lg:hidden"
                    >
                        <div className="absolute inset-0 bg-background" />

                        <div className="relative flex h-full flex-col overflow-y-auto px-6 pt-4 pb-6">
                            <div className="flex items-center justify-between pb-4">
                                <Link
                                    href="/"
                                    aria-label="PixSuite home"
                                    onClick={() => setMenuState(false)}
                                    className="brand-home-link inline-flex min-h-11 items-center rounded-sm text-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    <BrandLogo
                                        className="h-8 w-auto"
                                        aria-hidden="true"
                                    />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setMenuState(false)}
                                    aria-label="Close Menu"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mt-4 space-y-4">
                                {sessionStatus !== "loading" &&
                                    session?.user && (
                                        <UserInfo
                                            onMobileNavigate={() =>
                                                setMenuState(false)
                                            }
                                        />
                                    )}

                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleNavClick("features")
                                        }
                                        className="block w-full rounded-xl px-1 py-2 text-left text-base font-medium text-foreground/90 hover:bg-muted/70"
                                    >
                                        Features
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleNavClick("pricing")
                                        }
                                        className="block w-full rounded-xl px-1 py-2 text-left text-base font-medium text-foreground/90 hover:bg-muted/70"
                                    >
                                        Pricing
                                    </button>
                                    <Link
                                        href="/terms"
                                        onClick={() =>
                                            handlePageNavClick("/terms")
                                        }
                                        className="block w-full rounded-xl px-1 py-2 text-left text-base font-medium text-foreground/90 hover:bg-muted/70"
                                    >
                                        Terms
                                    </Link>
                                    <Link
                                        href="/privacy"
                                        onClick={() =>
                                            handlePageNavClick("/privacy")
                                        }
                                        className="block w-full rounded-xl px-1 py-2 text-left text-base font-medium text-foreground/90 hover:bg-muted/70"
                                    >
                                        Privacy Policy
                                    </Link>
                                </div>

                                {sessionStatus !== "loading" &&
                                    !session?.user && (
                                        <div className="border-t border-border/70 pt-5">
                                            <Button
                                                variant="default"
                                                className="w-full"
                                                onClick={() => {
                                                    router.push("/signin");
                                                    setMenuState(false);
                                                }}
                                            >
                                                Sign In
                                            </Button>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        </header>
    );
}
