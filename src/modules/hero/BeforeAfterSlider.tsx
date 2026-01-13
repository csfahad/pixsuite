import { useRef, useState } from "react";
import { motion } from "motion/react";

export default function BeforeAfterSlider() {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    // before/after images
    const beforeImage =
        "https://ik.imagekit.io/sjbr5usgh/pixora-uploads/Roadster_Hero_W0sp0doWK.webp";
    const afterImage =
        "https://ik.imagekit.io/sjbr5usgh/pixora-uploads/Roadster_Hero_W0sp0doWK.webp?tr=e-changebg-prompt-Change%20scene%20to%20snowy%20alpine%20road%2C%20cold%20blue%20tones%2C%20clean%20snowbanks%3B%20keep%20car%20untouched";

    return (
        <motion.div
            className="relative w-full max-w-lg mx-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            <div
                ref={containerRef}
                className="relative w-full max-w-6xl aspect-3/2 rounded-xl overflow-hidden shadow-glass glow-subtle cursor-ew-resize select-none"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Before Image */}
                <div className="absolute inset-0">
                    <img
                        src={beforeImage}
                        alt="Before - Original car on road"
                        className="w-full h-full object-cover select-none"
                    />
                </div>

                {/* After Image */}
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                    }}
                >
                    <img
                        src={afterImage}
                        alt="After - Car with snowy alpine background"
                        className="w-full h-full object-cover select-none"
                    />
                </div>

                {/* Slider Handle */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-secondary cursor-ew-resize group"
                    style={{
                        left: `${sliderPosition}%`,
                        transform: "translateX(-50%)",
                    }}
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-primary rounded-full shadow-glow-primary group-hover:scale-110 transition-transform flex items-center justify-center">
                        <div className="w-6 h-6 bg-background rounded-full flex items-center justify-center">
                            <div className="w-1 h-4 bg-gradient-primary rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Labels */}
                <div className="absolute bottom-4 left-4 text-xs font-medium text-primary">
                    AFTER
                </div>
                <div className="absolute bottom-4 right-4 text-xs font-medium text-secondary">
                    BEFORE
                </div>
            </div>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="text-center mt-4 text-sm text-muted-foreground"
            >
                Drag the slider to see the magic
            </motion.p>
        </motion.div>
    );
}
