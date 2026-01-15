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

const FeaturesImage = ({ title }: FeaturesImageProps) => {
    const imageMap: Record<FeaturesImageProps["title"], string> = {
        "AI Background Removal":
            "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?fit=crop&w=320&q=80",
        "AI Generative Fill":
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?fit=crop&w=320&q=80",
        "AI Upscale & Enhance":
            "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?fit=crop&w=320&q=80",
        "Smart Crop & Face Focus":
            "https://images.unsplash.com/photo-1511367461989-f85a21fda167?fit=crop&w=320&q=80",
        "Watermark & Text Overlay":
            "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?fit=crop&w=320&q=80",
    };

    const imgSrc = imageMap[title];

    return (
        <div className="flex flex-col flex-1 w-full h-full min-h-24 rounded-xl bg-linear-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100">
            {imgSrc && (
                <div className="w-full aspect-video rounded-xl overflow-hidden">
                    <Image
                        src={imgSrc}
                        alt={title}
                        className="w-full h-full object-fill"
                        loading="lazy"
                        width={512}
                        height={288}
                        sizes="(max-width: 640px) 100vw, 100vw"
                        priority={false}
                        unoptimized={false}
                    />
                </div>
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

                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
                            // icon={item.icon}
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
