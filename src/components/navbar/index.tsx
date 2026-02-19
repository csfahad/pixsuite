"use client";

import { AnimatePresence, motion } from "motion/react";
import {
    BadgeCheckIcon,
    BellIcon,
    CreditCardIcon,
    ImagePlus,
    LogOutIcon,
    Menu,
    WandSparkles,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useScroll } from 'motion/react'
import { cn } from '@/lib/utils'
import { signIn, signOut, useSession } from "next-auth/react";
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from "next/navigation";
import ModeToggle from "@/components/modeToggle/index";
import UserInfo from "./user-info";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
    const [menuState, setMenuState] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    const { scrollYProgress } = useScroll()
    const { data: session } = useSession();

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = scrollYProgress.on('change', (latest) => {
            setScrolled(latest > 0.05)
        })
        return () => unsubscribe()
    }, [scrollYProgress])

    const scrollToSection = (sectionId: string) => {
        if (pathname !== "/") {
            router.push(`/#${sectionId}`);
            return;
        }
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const handleNavClick = (sectionId: string) => {
        scrollToSection(sectionId);
        setMenuState(false);
    };

    const handleSubmit = async () => {
        router.push("/editor");
    };

    const profileImage = session?.user?.image || (session as any)?.user?.avatar || "";

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length >= 2
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    const handleSignOut = () => {
        signOut({ callbackUrl: "/" });
    };

    return (
        <header>
            <motion.nav
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-state={menuState && 'active'}
                className={cn('fixed z-20 w-full transition-colors duration-150', scrolled && 'border-b bg-background/50 backdrop-blur-3xl')}
            >
                <div className="mx-auto max-w-6xl px-6 transition-all duration-300">
                    <div className="relative flex flex-wrap items-center justify-between gap-4 py-3 lg:py-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="flex w-full items-center justify-between space-x-2 lg:w-auto">
                            <button
                                type="button"
                                onClick={() => scrollToSection("hero")}
                                className="flex items-center space-x-2 cursor-pointer"
                            >
                                <div className="relative">
                                    <Link href="/" aria-label="home">
                                        <WandSparkles
                                            fill="transparent"
                                            className="h-6 w-6 md:h-8 md:w-8 text-primary animate-glow-pulse"
                                        />
                                        <div className="absolute inset-0 h-8 w-8 text-secondary animate-glow-pulse opacity-50" />
                                    </Link>
                                </div>
                                <Link
                                    href="/"
                                    aria-label="home"
                                    className="hidden lg:flex text-2xl font-bold bg-gradient-primary bg-clip-text text-primary items-center">
                                    PixSuite
                                </Link>
                            </button>

                            <div className="flex items-center gap-2 lg:hidden">
                                <ModeToggle />
                                <button
                                    onClick={() => setMenuState(!menuState)}
                                    aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                    className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5">
                                    <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                    <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                                </button>
                            </div>
                        </motion.div>

                        <div className="hidden lg:flex items-center gap-3">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => scrollToSection("features")}
                                    className="text-muted-foreground hover:text-accent-foreground transition-colors cursor-pointer duration-150 whitespace-nowrap"
                                >
                                    Features
                                </button>
                                <button
                                    onClick={() => scrollToSection("pricing")}
                                    className="text-muted-foreground hover:text-accent-foreground transition-colors cursor-pointer duration-150 whitespace-nowrap"
                                >
                                    Pricing
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <ModeToggle />
                                {session?.user ? <UserInfo /> :
                                    <Button
                                        variant="default"
                                        className="cursor-pointer px-4 shrink-0"
                                        onClick={() => signIn("google")}
                                    >
                                        Sign In
                                    </Button>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile menu */}
            <AnimatePresence>
                {menuState && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 30 }}
                        className="fixed inset-0 z-999 lg:hidden"
                    >
                        <div className="absolute inset-0 bg-background" />

                        <div className="relative flex h-full flex-col px-6 pt-4 pb-6">
                            <div className="flex items-center justify-between pb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <Link href="/" aria-label="home">
                                            <WandSparkles
                                                fill="transparent"
                                                className="h-6 w-6 text-primary animate-glow-pulse"
                                            />
                                            <div className="absolute inset-0 h-6 w-6 text-secondary animate-glow-pulse opacity-50" />
                                        </Link>
                                    </div>
                                </div>
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
                                        onClick={() => handleNavClick("features")}
                                        className="block w-full rounded-xl px-1 py-2 text-left text-base font-medium text-foreground/90 hover:bg-muted/70"
                                    >
                                        Features
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleNavClick("pricing")}
                                        className="block w-full rounded-xl px-1 py-2 text-left text-base font-medium text-foreground/90 hover:bg-muted/70"
                                    >
                                        Pricing
                                    </button>
                                </div>

                                <div className="h-px w-full bg-border/70" />

                                {session?.user ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={profileImage}
                                                    alt={session?.user?.name || "User"}
                                                    referrerPolicy="no-referrer"
                                                />
                                                <AvatarFallback>
                                                    {getInitials(session?.user?.name)}
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
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/70"
                                            >
                                                <BadgeCheckIcon className="h-4 w-4" />
                                                <span>Account</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/70"
                                            >
                                                <CreditCardIcon className="h-4 w-4" />
                                                <span>Billing</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/70"
                                            >
                                                <BellIcon className="h-4 w-4" />
                                                <span>Notifications</span>
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
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-2">
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={() => {
                                                signIn("google");
                                                setMenuState(false);
                                            }}
                                        >
                                            Sign In
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}