"use client";
import { Crop, Expand, Scissors, Type, Zap } from "lucide-react";
import { motion } from "motion/react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import Image from "next/image";

type FeaturesImageProps = {
    title:
    | "AI Background Removal"
    | "AI Generative Fill"
    | "AI Upscale & Enhance"
    | "Smart Crop & Face Focus"
    | "Watermark & Text Overlay";
};

const UpscaleSimulation = ({ title }: { title: string }) => {
    const upscaleImg = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80";

    return (
        <div className="group relative flex flex-col flex-1 w-full h-full min-h-24 rounded-xl overflow-hidden">
            <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full absolute inset-0 flex bg-neutral-900"
            >
                {/* Left Side: Blurry (Before) */}
                <div className="w-1/2 h-full relative overflow-hidden z-10">
                    <img src={upscaleImg} alt={title} className="absolute inset-0 w-[200%] max-w-none h-full object-cover object-center blur-sm scale-[1.12]" />
                </div>

                {/* Right Side: Enhanced (After) */}
                <div className="w-1/2 h-full relative overflow-hidden">
                    <img
                        src={upscaleImg}
                        alt={title}
                        className="absolute inset-0 w-[200%] max-w-none h-full object-cover object-center -left-full"
                    />
                </div>
            </motion.div>
            <div className="absolute inset-0 bg-linear-to-tr from-black/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20" />
        </div>
    );
};

const WatermarkSimulation = ({ title }: { title: string }) => {
    const watermarkImg = "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80";

    return (
        <div className="group relative flex flex-col flex-1 w-full h-full min-h-24 rounded-xl overflow-hidden">
            <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full absolute inset-0 flex bg-neutral-900"
            >
                {/* Left Side: Original Image */}
                <div className="w-1/2 h-full relative overflow-hidden border-r-2 border-primary z-10">
                    <img src={watermarkImg} alt={title} className="absolute inset-0 w-[200%] max-w-none h-full object-cover object-center" />
                </div>

                {/* Right Side: Watermarked Image */}
                <div className="w-1/2 h-full relative overflow-hidden">
                    <img src={watermarkImg} alt={title} className="absolute inset-0 w-[200%] max-w-none h-full object-cover object-center -left-full" />

                    {/* High-end Watermark UI Overlay */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Subtle repeated pattern */}
                        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><text x='10' y='60' fill='white' font-family='sans-serif' font-size='14' font-weight='800' letter-spacing='2' transform='rotate(-30 60 60)'>CREATOR</text></svg>")`
                        }}></div>

                        {/* Bold central watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-90 drop-shadow-2xl mix-blend-overlay">
                            <div className="border-4 border-white text-white font-black tracking-[0.2em] text-2xl sm:text-3xl px-6 py-2 uppercase -rotate-12 backdrop-blur-sm bg-white/10">
                                PROOF
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            <div className="absolute inset-0 bg-linear-to-tr from-black/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20" />
        </div>
    );
};

const BgRemovalSimulation = ({ title }: { title: string }) => {
    const bgRemovalImg = "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=640&q=80";

    return (
        <div className="group relative flex flex-col flex-1 w-full h-full min-h-24 rounded-xl overflow-hidden">
            <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full absolute inset-0 flex bg-white"
            >
                {/* Left Side: Original Image */}
                <div className="w-1/2 h-full relative overflow-hidden border-r-2 border-primary z-10">
                    <img src={bgRemovalImg} alt={title} className="absolute inset-0 w-[200%] max-w-none h-full object-cover object-center" />
                </div>

                {/* Right Side: Simulated Background Removal via CSS mixed blending magic */}
                <div className="w-1/2 h-full relative overflow-hidden bg-neutral-100" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23d4d4d8' d='M0 0h8v8H0zM8 8h8v8H8z'/%3E%3Cpath fill='%23e4e4e7' d='M8 0h8v8H8zM0 8h8v8H0z'/%3E%3C/svg%3E")`
                }}>
                    <img
                        src={bgRemovalImg}
                        alt={title}
                        className="absolute inset-0 w-[200%] max-w-none h-full object-cover object-center -left-full mix-blend-multiply opacity-95 contrast-125"
                    />
                </div>
            </motion.div>
            <div className="absolute inset-0 bg-linear-to-tr from-black/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20" />
        </div>
    );
};

const CustomFeatureMedia = ({
    src,
    type,
    title,
}: {
    src: string;
    type: "video" | "image";
    title: string;
}) => {
    return (
        <div className="group relative flex flex-col flex-1 w-full h-full min-h-24 rounded-xl overflow-hidden">
            <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800"
            >
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {type === "video" ? (
                        <video
                            src={src}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover scale-[1.35] lg:scale-[1.4] origin-bottom"
                        />
                    ) : (
                        <img
                            src={src}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            </motion.div>
            <div className="absolute inset-0 bg-linear-to-tr from-black/40 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>
    );
};

const FeaturesImage = ({ title }: FeaturesImageProps) => {
    if (title === "AI Background Removal") {
        return <BgRemovalSimulation title={title} />;
    }
    if (title === "AI Upscale & Enhance") {
        return <UpscaleSimulation title={title} />;
    }
    if (title === "Watermark & Text Overlay") {
        return <WatermarkSimulation title={title} />;
    }
    if (title === "AI Generative Fill") {
        return <CustomFeatureMedia src="/features/gen-fill.webm" type="video" title={title} />;
    }
    if (title === "Smart Crop & Face Focus") {
        return <CustomFeatureMedia src="/features/smart-crop.webm" type="video" title={title} />;
    }

    const imageMap: Record<FeaturesImageProps["title"], string> = {
        "AI Background Removal":
            "https://images.unsplash.com/photo-1746050887217-8869b0145b9b?fit=crop&w=640&q=80",
        "AI Generative Fill":
            "https://plus.unsplash.com/premium_photo-1754489932772-c820e2055cb2?fit=crop&w=640&q=80",
        "AI Upscale & Enhance":
            "https://images.unsplash.com/photo-1755274556511-246bd7476606?fit=crop&w=640&q=80",
        "Smart Crop & Face Focus":
            "https://images.unsplash.com/photo-1584086938198-3e3d7a8253a0?fit=crop&w=640&q=80",
        "Watermark & Text Overlay":
            "https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?fit=crop&w=640&q=80",
    };

    const imgSrc = imageMap[title];

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-24 rounded-xl bg-linear-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 overflow-hidden group">
            {imgSrc && (
                <motion.div
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full aspect-video rounded-xl overflow-hidden relative"
                >
                    <Image
                        src={imgSrc}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width={512}
                        height={288}
                        sizes="(max-width: 640px) 100vw, 100vw"
                        priority={false}
                        unoptimized={false}
                    />
                    <div className="absolute inset-0 bg-linear-to-tr from-black/40 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                </motion.div>
            )}
        </div>
    );
};

const features = [
    {
        icon: <Scissors className="h-6 w-6 text-neutral-500" />,
        title: "AI Background Removal",
        description:
            "1-click clean photos with precision AI. Remove any background instantly and get professional results.",
        header: <FeaturesImage title="AI Background Removal" />,
        delay: 0.1,
    },
    {
        icon: <Crop className="h-6 w-6 text-neutral-500" />,
        title: "Smart Crop & Face Focus",
        description:
            "Perfect thumbnails automatically. AI detects faces and important content for optimal cropping.",
        header: <FeaturesImage title="Smart Crop & Face Focus" />,
        delay: 0.4,
    },
    {
        icon: <Zap className="h-6 w-6 text-neutral-500" />,
        title: "AI Upscale & Enhance",
        description:
            "Boost resolution up to 4x while fixing details. Transform low-res into stunning high-quality images.",
        header: <FeaturesImage title="AI Upscale & Enhance" />,
        delay: 0.3,
    },
    {
        icon: <Expand className="h-6 w-6 text-neutral-500" />,
        title: "AI Generative Fill",
        description:
            "Expand your canvas and auto-fill edges seamlessly. Create perfect aspect ratios effortlessly.",
        header: <FeaturesImage title="AI Generative Fill" />,
        delay: 0.2,
    },

    {
        icon: <Type className="h-6 w-6 text-neutral-500" />,
        title: "Watermark & Text Overlay",
        description:
            "Brand your content professionally. Add custom watermarks and text with perfect positioning.",
        header: <FeaturesImage title="Watermark & Text Overlay" />,
        delay: 0.5,
    },
];

export default function Features() {
    return (
        <section id="features" className="py-24 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

            <div className="container mx-auto max-w-6xl px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                        <span className="text-foreground">Magical </span>
                        <span className="bg-primary bg-clip-text! text-transparent">
                            Features
                        </span>
                    </h2>

                    <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        Transform your photos with cutting-edge AI technology.
                        Each feature is designed to give you professional
                        results in seconds, not hours.
                    </p>
                </motion.div>

                <BentoGrid className="max-w-4xl mx-auto text-lg ">
                    {features.map((item, i) => (
                        <BentoGridItem
                            key={i}
                            title={item.title}
                            description={item.description}
                            header={item.header}
                            className={
                                i === 3 || i === 6 ? "md:col-span-2" : ""
                            }
                        />
                    ))}
                </BentoGrid>
            </div>
        </section>
    );
}
