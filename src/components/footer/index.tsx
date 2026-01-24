"use client";
import { motion } from "motion/react";
import { Heart, WandSparkles } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="py-12 border-t border-primary/20 relative overflow-hidden">
            {/*  Background Effect */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

            <div className="container mx-auto max-w-6xl px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    {/* Logo */}
                    <div className="flex items-center justify-center space-x-2 mb-6">
                        <div className="relative">
                            <WandSparkles className="h-6 w-6 md:h-8 md:w-8 text-primary animate-glow-pulse" />
                            <div className="absolute inset-0 h-8 w-8 text-secondary animate-glow-pulse opacity-50" />
                        </div>
                        <span className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text! text-transparent">
                            PixSuite
                        </span>
                    </div>

                    <p className="text-muted-foreground mb-8 max-w-2xl mx-auto text-sm md:text-base">
                        Unleash the magic of AI to effortlessly elevate your photos. Instantly remove backgrounds, sharpen every detail, and create breathtaking images
                        <span className="flex items-center justify-center">—&nbsp;just a click away.</span>
                    </p>

                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                        <span>Made with</span>
                        <Heart className="h-4 w-4 text-destructive animate-pulse" />
                        <span>for creators everywhere</span>
                    </div>

                    <div className="mt-8 pt-8 text-center relative">
                        <div
                            aria-hidden="true"
                            className="absolute left-0 top-0 w-full h-px overflow-visible"
                        >
                            <div className="relative w-full h-px">
                                <div className="absolute left-1/2 transform -translate-x-1/2 h-px w-full max-w-2xl">
                                    <div
                                        className="h-px"
                                        style={{
                                            background: "linear-gradient(90deg, transparent 0%, #A3A3A3 20%, #A3A3A3 80%, transparent 100%)",
                                            opacity: 0.35,
                                            filter: "blur(1.5px)",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center space-x-4 mt-2 text-sm text-muted-foreground relative z-10">
                            <p className="text-sm text-muted-foreground text-center relative z-10">
                                © {new Date().getFullYear()} PixSuite. All rights reserved.
                            </p>
                            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                            <span>•</span>
                            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}
