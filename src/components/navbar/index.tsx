"use client";

import { motion } from "motion/react";
import { Menu, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useScroll } from 'motion/react'
import { cn } from '@/lib/utils'
import { signIn, useSession } from "next-auth/react";
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter } from "next/navigation";
import ModeToggle from "@/components/modeToggle/index";
import UserInfo from "./user-info";

export default function Navbar() {
    const [menuState, setMenuState] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    const { scrollYProgress } = useScroll()
    const { data: session } = useSession();

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = scrollYProgress.on('change', (latest) => {
            setScrolled(latest > 0.05)
        })
        return () => unsubscribe()
    }, [scrollYProgress])

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const handleSubmit = async () => {
        router.push("/editor");
    };

    return (
        <header>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                data-state={menuState && 'active'}
                className={cn('fixed z-20 w-full transition-colors duration-150', scrolled && 'border-b bg-background/50 backdrop-blur-3xl')}>
                <div className="mx-auto max-w-6xl px-6 transition-all duration-300">
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:py-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            onClick={() => scrollToSection("hero")}
                            className="flex w-full items-center justify-between space-x-2 cursor-pointer lg:w-auto">
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

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </motion.div>

                        {/* <div className="hidden lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:block space-x-8 text-normal mt-1">
                            <button
                                onClick={() => scrollToSection("features")}
                                className="text-muted-foreground hover:text-accent-foreground transition-colors cursor-pointer duration-150"
                            >
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection("pricing")}
                                className="text-muted-foreground hover:text-accent-foreground transition-colors cursor-pointer duration-150"
                            >
                                Pricing
                            </button>
                        </div> */}

                        <motion.div
                            initial={false}
                            animate={{
                                height: menuState ? "auto" : 0,
                                opacity: menuState ? 1 : 0,
                            }}
                            className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-lg border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="lg:hidden py-2 space-y-4">
                                <div className="flex items-center">
                                    <button
                                        onClick={() => scrollToSection("features")}
                                        className="block w-full text-left text-foreground hover:text-primary transition-colors font-medium"
                                    >
                                        Features
                                    </button>
                                    <ModeToggle />
                                </div>
                                <button
                                    onClick={() => scrollToSection("pricing")}
                                    className="block w-full text-left text-foreground hover:text-primary transition-colors font-medium"
                                >
                                    Pricing
                                </button>
                                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleSubmit}
                                    >
                                        {session?.user ? "Launch App" : "Get Started"}
                                    </Button>
                                    {!session?.user && (
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={() => signIn("google")}
                                        >
                                            Sign In
                                        </Button>
                                    )}
                                </div>
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
        </header>
    )
}