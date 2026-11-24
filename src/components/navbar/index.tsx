"use client";
import {
    BadgeCheckIcon,
    CreditCardIcon,
    ImagePlus,
    LogOutIcon,
    Menu,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import Link from "@/components/navigation-link";
import { useNavigationFeedback } from "@/components/navigation-feedback";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppRouter as useRouter } from "@/components/navigation-feedback";
import { usePathname } from "next/navigation";
import ModeToggle from "@/components/modeToggle/index";
import UserInfo from "./user-info";
import { BrandLogo } from "@/components/brand/logo";
import { trackEvent, trackSignOut } from "@/lib/analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
    const [menuState, setMenuState] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const { data: session, status: sessionStatus } = useSession();
    const [signingOut, setSigningOut] = useState(false);
    const { beginAction, finish } = useNavigationFeedback();

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const updateHeader = () => setScrolled(window.scrollY > 24);
        updateHeader();
        window.addEventListener("scroll", updateHeader, { passive: true });
        return () => window.removeEventListener("scroll", updateHeader);
    }, []);

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

    const handleSubmit = async () => {
        trackEvent("navigation_selected", {
            destination: "/editor",
            source: "navbar",
        });
        router.push("/editor");
    };

    const profileImage = session?.user?.image || session?.user?.avatar || "";

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length >= 2
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    const handleSignOut = async () => {
        if (signingOut) return;
        setSigningOut(true);
        trackSignOut();
        const token = beginAction("Signing out…");
        try {
            await signOut({ callbackUrl: "/" });
        } catch {
            finish(token);
            setSigningOut(false);
            toast.error("Couldn’t sign out. Try again.");
        }
    };

    return (
        <header>
            <nav
                data-state={menuState && "active"}
                className={cn(
                    "fixed z-20 w-full  ",
                    scrolled && "border-b bg-background/50 backdrop-blur-3xl",
                )}
            >
                <div className="mx-auto max-w-7xl px-6 lg:px-16  ">
                    <div className="relative flex flex-wrap items-center justify-between gap-4 py-3 lg:py-4">
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

                            <div className="flex items-center gap-2 lg:hidden">
                                <ModeToggle />
                                <button
                                    onClick={() => {
                                        trackEvent("navigation_menu_toggled", {
                                            open: !menuState,
                                        });
                                        setMenuState(!menuState);
                                    }}
                                    aria-label={
                                        menuState == true
                                            ? "Close Menu"
                                            : "Open Menu"
                                    }
                                    aria-expanded={menuState}
                                    aria-controls="mobile-navigation"
                                    className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5"
                                >
                                    {menuState ? (
                                        <X className="m-auto size-6" />
                                    ) : (
                                        <Menu className="m-auto size-6" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-3">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => scrollToSection("features")}
                                    className="text-muted-foreground hover:text-accent-foreground  cursor-pointer  whitespace-nowrap"
                                >
                                    Features
                                </button>
                                <button
                                    onClick={() => scrollToSection("pricing")}
                                    className="text-muted-foreground hover:text-accent-foreground  cursor-pointer  whitespace-nowrap"
                                >
                                    Pricing
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <ModeToggle />
                                {sessionStatus ===
                                "loading" ? null : session?.user ? (
                                    <UserInfo />
                                ) : (
                                    <Button
                                        variant="default"
                                        className="cursor-pointer px-4 shrink-0"
                                        onClick={() => router.push("/signin")}
                                    >
                                        Sign In
                                    </Button>
                                )}
                            </div>
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

                        <div className="relative flex h-full flex-col px-6 pt-4 pb-6">
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
                                </div>

                                <div className="h-px w-full bg-border/70" />

                                {sessionStatus ===
                                "loading" ? null : session?.user ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={profileImage}
                                                    alt={
                                                        session?.user?.name ||
                                                        "User"
                                                    }
                                                    referrerPolicy="no-referrer"
                                                />
                                                <AvatarFallback>
                                                    {getInitials(
                                                        session?.user?.name,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {session?.user?.name}
                                                </span>
                                                {session?.user?.email && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {session.user.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1 text-sm font-medium text-foreground/90">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleSubmit();
                                                    setMenuState(false);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/70"
                                            >
                                                <ImagePlus className="h-4 w-4" />
                                                <span>Launch Editor</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    trackEvent(
                                                        "navigation_selected",
                                                        {
                                                            destination:
                                                                "/account",
                                                            source: "mobile_menu",
                                                        },
                                                    );
                                                    router.push("/account");
                                                    setMenuState(false);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/70"
                                            >
                                                <BadgeCheckIcon className="h-4 w-4" />
                                                <span>Account</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    trackEvent(
                                                        "navigation_selected",
                                                        {
                                                            destination:
                                                                "/account?tab=plan",
                                                            source: "mobile_menu",
                                                        },
                                                    );
                                                    router.push(
                                                        "/account?tab=plan",
                                                    );
                                                    setMenuState(false);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/70"
                                            >
                                                <CreditCardIcon className="h-4 w-4" />
                                                <span>Billing</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleSignOut();
                                                    setMenuState(false);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                                            >
                                                <LogOutIcon className="h-4 w-4" />
                                                <span>
                                                    {signingOut
                                                        ? "Signing out…"
                                                        : "Sign Out"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-2">
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
