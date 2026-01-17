import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    if (!originalImage) {
        return (
            <div className="shadow-glass rounded-lg border border-primary/50 aspect-4/3 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-xl flex items-center justify-center">
                        <span className="text-2xl">🎨</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Ready for Magic
                    </h3>
                    <p className="text-muted-foreground">
                        Upload a photo to start editing
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Canvas */}

            <motion.div
                layout
                className="relative glass rounded-xl border border-card! overflow-hidden aspect-4/3"
            >
                {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
                            <p className="text-foreground font-medium">
                                AI is working its magic...
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This usually takes a few seconds
                            </p>
                        </div>
                    </div>
                )}

                {showComparison && processedImage ? (
                    // Before/After comparison
                    <div
                        className="relative w-full h-full cursor-ew-resize"
                        onMouseMove={handleSliderMove}
                    >
                        {/* Original Image */}
                        <div className="absolute inset-0">
                            <img
                                src={originalImage}
                                alt="Original"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Processed Image */}
                        <div
                            className="absolute inset-0 overflow-hidden"
                            style={{
                                clipPath: `inset(0 ${
                                    100 - sliderPosition
                                }% 0 0)`,
                            }}
                        >
                            <img
                                src={processedImage}
                                alt="Processed"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Slider */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-gradient-primary"
                            style={{
                                left: `${sliderPosition}%`,
                                transform: "translateX(-50%)",
                            }}
                        >
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full shadow-glow-primary flex items-center justify-center">
                                <div className="w-6 h-6 bg-background rounded-full flex items-center justify-center">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute bottom-4 left-4 text-xs font-medium text-background bg-foreground/80 px-2 py-1 rounded">
                            BEFORE
                        </div>
                        <div className="absolute bottom-4 right-4 text-xs font-medium text-background bg-primary px-2 py-1 rounded">
                            AFTER
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full">
                        <img
                            src={processedImage || originalImage}
                            alt={processedImage ? "Processed" : "Original"}
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}

                {/* Overlay controls */}
                {processedImage && !isProcessing && (
                    <div className="absolute top-4 right-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowComparison(!showComparison)}
                            className="glass bg-background/20 border-foreground/20 text-foreground hover:bg-background/40"
                        >
                            {showComparison ? (
                                <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Hide Compare
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Compare
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </motion.div>

            {/* Status */}
            <div className="text-center">
                {isProcessing ? (
                    <p className="text-sm text-primary">
                        Processing with AI...
                    </p>
                ) : processedImage ? (
                    <p className="text-sm text-primary">
                        ✨ Magic applied! Compare or export your result
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Select a tool to start editing
                    </p>
                )}
            </div>
        </div>
    );
}
