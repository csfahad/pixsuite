import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasEditorProps {
    originalImage: string | null;
    processedImage: string | null;
    isProcessing: boolean;
}

export default function CanvasEditor({
    originalImage,
    processedImage,
    isProcessing,
}: CanvasEditorProps) {
    const [showComparison, setShowComparison] = useState(false);
    const [sliderPosition, setSliderPosition] = useState(50);

    const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.buttons !== 1) return; // only respond to left-click drag
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    if (!originalImage) {
        return (
            <div className="editor-panel aspect-4/3 flex items-center justify-center canvas-checkerboard">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="text-center px-8"
                >
                    {/* Animated icon */}
                    <motion.div
                        animate={{
                            y: [0, -6, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/80 flex items-center justify-center border border-border"
                    >
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        >
                            <Maximize2 className="w-8 h-8 text-muted-foreground" />
                        </motion.div>
                    </motion.div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Ready for Magic
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                        Upload a photo from the sidebar to start editing with AI
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Canvas Container */}
            <motion.div
                layout
                className="relative editor-panel overflow-hidden aspect-4/3"
            >
                {/* Processing Overlay */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/60 backdrop-blur-md z-10 flex items-center justify-center"
                        >
                            <div className="text-center">
                                {/* Pulsing rings */}
                                <div className="relative w-16 h-16 mx-auto mb-4">
                                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                                    <div
                                        className="absolute inset-2 rounded-full border-2 border-primary/30 animate-ping"
                                        style={{ animationDelay: "0.3s" }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                    </div>
                                </div>
                                <motion.p
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-foreground font-medium"
                                >
                                    AI is working its magic...
                                </motion.p>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-sm text-muted-foreground mt-1"
                                >
                                    This usually takes a few seconds
                                </motion.p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {showComparison && processedImage ? (
                    /* Before/After Comparison */
                    <div
                        className="relative w-full h-full cursor-ew-resize select-none"
                        onMouseMove={handleSliderMove}
                        onClick={handleSliderClick}
                        onTouchMove={handleTouchMove}
                    >
                        {/* Original */}
                        <div className="absolute inset-0">
                            <img
                                src={originalImage}
                                alt="Original"
                                className="w-full h-full object-contain"
                                draggable={false}
                            />
                        </div>

                        {/* Processed */}
                        <div
                            className="absolute inset-0 overflow-hidden"
                            style={{
                                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                            }}
                        >
                            <img
                                src={processedImage}
                                alt="Processed"
                                className="w-full h-full object-contain"
                                draggable={false}
                            />
                        </div>

                        {/* Slider Line */}
                        <motion.div
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground/80"
                            style={{
                                left: `${sliderPosition}%`,
                                transform: "translateX(-50%)",
                            }}
                            animate={{ left: `${sliderPosition}%` }}
                            transition={{
                                type: "spring",
                                stiffness: 600,
                                damping: 40,
                            }}
                        >
                            {/* Slider Handle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing">
                                <div className="flex items-center gap-0.5">
                                    <div className="w-0.5 h-4 bg-background rounded-full" />
                                    <div className="w-0.5 h-4 bg-background rounded-full" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Labels */}
                        <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-md bg-foreground/80 text-background text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                            Before
                        </div>
                        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
                            After
                        </div>
                    </div>
                ) : (
                    /* Single Image View */
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={processedImage || originalImage}
                            initial={{ opacity: 0.8, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0.8, scale: 0.98 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                            }}
                            className="w-full h-full"
                        >
                            <img
                                src={processedImage || originalImage}
                                alt={
                                    processedImage ? "Processed" : "Original"
                                }
                                className="w-full h-full object-contain"
                                loading="eager"
                            />
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Overlay Controls */}
                <AnimatePresence>
                    {processedImage && !isProcessing && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-3 right-3"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setShowComparison(!showComparison)
                                }
                                className="glass bg-background/40 border-foreground/10 text-foreground hover:bg-background/60 backdrop-blur-xl gap-1.5 text-xs cursor-pointer"
                            >
                                {showComparison ? (
                                    <>
                                        <EyeOff className="h-3.5 w-3.5" />
                                        Hide Compare
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-3.5 w-3.5" />
                                        Compare
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Status Strip */}
            <motion.div
                layout
                className="text-center py-1"
            >
                <AnimatePresence mode="wait">
                    {isProcessing ? (
                        <motion.p
                            key="processing"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="text-xs text-primary font-medium flex items-center justify-center gap-1.5"
                        >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing with AI...
                        </motion.p>
                    ) : processedImage ? (
                        <motion.p
                            key="done"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="text-xs text-primary font-medium"
                        >
                            ✨ Magic applied! Compare or export your result
                        </motion.p>
                    ) : (
                        <motion.p
                            key="idle"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="text-xs text-muted-foreground"
                        >
                            Select a tool below to start editing
                        </motion.p>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
