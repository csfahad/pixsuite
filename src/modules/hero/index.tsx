"use client";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, WandSparkles } from "lucide-react";
import BeforeAfterSlider from "./BeforeAfterSlider";

export default function Hero() {
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div>
            <section
                id="hero"
                className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
            >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-linear-to-br from-accent via-background to-muted opacity-50" />

                {/* Floating orbs */}
                <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: "-1s" }}
                />

                <div className="container mx-auto max-w-6xl px-4 grid gap-12 items-center justify-center relative z-10">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center space-x-2 rounded-lg px-4 py-2 mb-6 glass border border-card-border"
                        >
                            <WandSparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Powered by AI Magic
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-5xl lg:text-8xl font-bold leading-tight"
                        >
                            <span className="bg-primary bg-clip-text! text-transparent tracking-wide">
                                PixSuite
                            </span>
                        </motion.h1>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl lg:text-6xl font-bold leading-tight mb-3"
                        >
                            <span className="text-foreground">
                                Instantly edit images{" "}
                                <span className="flex items-center justify-center">
                                    —`just upload & go!`
                                </span>
                            </span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl"
                        >
                            Enhance photos with smart AI editing. Remove
                            backgrounds, boost quality, or add magic in one
                            click. Just drop your image—{" "}
                            <span className="font-bold">Pixsuite</span> handles
                            the rest!
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <Button
                                variant="default"
                                size="lg"
                                onClick={() => scrollToSection("editor")}
                                className="group text-white"
                            >
                                <Play className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                                Try Free Now
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => scrollToSection("editor")}
                                className="group"
                            >
                                Launch App
                                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="mt-8 flex items-center justify-center space-x-6 text-sm text-muted-foreground"
                        >
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                <span>Unlimited uploads on Pro</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                                <span>Unlimited edits</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Content - Before/After Slider */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex justify-center"
                    >
                        <BeforeAfterSlider />
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
