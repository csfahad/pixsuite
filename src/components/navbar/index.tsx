"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Menu, WandSparkles, X } from "lucide-react";
import { Button } from "../ui/button";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { data: session } = useSession();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            setIsMobileMenuOpen(false);
        }
    };

    const handleSubmit = async () => {
        if (session?.user) {
            scrollToSection("editor");
        } else {
            await signIn("google");
        }
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 md:top-1 left-0 right-0 z-50 ${
                isScrolled
                    ? "fixed top-0 md:top-2 left-1/2 z-50 -translate-x-1/2 rounded-none md:rounded-lg w-full max-w-6xl glass border border-card-border backdrop-blur-glass"
                    : "bg-transparent"
            }`}
        >
            <div className="container mx-auto max-w-6xl px-4 py-4">
                <div className="flex items-center justify-between min-w-0">
                    {/* Logo */}
                    <motion.div
                        className="flex items-center space-x-2 cursor-pointer shrink-0"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => scrollToSection("hero")}
                    >
                        <div className="relative">
                            <WandSparkles
                                fill="transparent"
                                className="h-8 w-8 text-primary animate-glow-pulse"
                            />
                            <div className="absolute inset-0 h-8 w-8 text-secondary animate-glow-pulse opacity-50" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-primary">
                            PixSuite
                        </span>
                    </motion.div>

                    {/* Navigation */}
                    <div className="hidden md:flex items-center space-x-8 shrink-0">
                        <button
                            onClick={() => scrollToSection("features")}
                            className="text-foreground hover:text-primary transition-colors font-medium cursor-pointer"
                        >
                            Features
                        </button>
                        <button
                            onClick={() => scrollToSection("pricing")}
                            className="text-foreground hover:text-primary transition-colors font-medium cursor-pointer"
                        >
                            Pricing
                        </button>
                        <Button
                            variant="outline"
                            className="font-semibold cursor-pointer"
                            onClick={handleSubmit}
                        >
                            {session?.user ? "Launch App" : "Sign In"}
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-foreground shrink-0"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </button>
                </div>

                <motion.div
                    initial={false}
                    animate={{
                        height: isMobileMenuOpen ? "auto" : 0,
                        opacity: isMobileMenuOpen ? 1 : 0,
                    }}
                    className="md:hidden overflow-hidden inset-0 bg-linear-to-br from-background via-background to-background opacity-50 p-3 mt-3 rounded-lg"
                >
                    <div className="py-4 space-y-4">
                        <button
                            onClick={() => scrollToSection("features")}
                            className="block w-full text-left text-foreground hover:text-primary transition-colors font-medium"
                        >
                            Features
                        </button>
                        <button
                            onClick={() => scrollToSection("pricing")}
                            className="block w-full text-left text-foreground hover:text-primary transition-colors font-medium"
                        >
                            Pricing
                        </button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleSubmit}
                        >
                            {session?.user ? "Launch App" : "Sign In"}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </motion.nav>
    );
}
