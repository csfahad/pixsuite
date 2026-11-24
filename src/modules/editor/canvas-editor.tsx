import { BrandMark } from "@/components/brand/logo";
import { useState } from "react";
import { Eye, EyeOff, Maximize2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface CanvasEditorProps {
    originalImage: string | null;
    processedImage: string | null;
    isProcessing: boolean;
    processingLabel?: string;
}

export default function CanvasEditor({
    originalImage,
    processedImage,
    isProcessing,
    processingLabel = "Applying edit…",
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
        trackEvent("editor_comparison_adjusted", {
            position_percent: percentage,
            input: "mouse",
            original_image_url: originalImage,
            processed_image_url: processedImage,
        });
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    if (!originalImage) {
        return (
            <div className="editor-panel aspect-4/3 flex items-center justify-center canvas-checkerboard">
                <div className="text-center px-8">
                    {/* Animated icon */}
                    <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/80 flex items-center justify-center border border-border">
                        <div>
                            <Maximize2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Ready for Magic
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                        Upload a photo from the sidebar to start editing with AI
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Canvas Container */}
            <div className="relative editor-panel overflow-hidden aspect-4/3">
                {/* Processing Overlay */}
                <>
                    {isProcessing && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-10 flex items-center justify-center">
                            <LoadingState label={processingLabel} />
                        </div>
                    )}
                </>

                {showComparison && processedImage ? (
                    /* Before/After Comparison */
                    <div
                        className="relative w-full h-full cursor-ew-resize select-none"
                        style={{ touchAction: "pan-y" }}
                        onMouseMove={handleSliderMove}
                        onClick={handleSliderClick}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() =>
                            trackEvent("editor_comparison_adjusted", {
                                position_percent: sliderPosition,
                                input: "touch",
                                original_image_url: originalImage,
                                processed_image_url: processedImage,
                            })
                        }
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
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground/80"
                            style={{
                                left: `${sliderPosition}%`,
                                transform: "translateX(-50%)",
                            }}
                        >
                            {/* Slider Handle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing">
                                <div className="flex items-center gap-0.5">
                                    <div className="w-0.5 h-4 bg-background rounded-full" />
                                    <div className="w-0.5 h-4 bg-background rounded-full" />
                                </div>
                            </div>
                        </div>

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
                    <>
                        <div
                            key={processedImage || originalImage}
                            className="w-full h-full"
                        >
                            <img
                                src={processedImage || originalImage}
                                alt={processedImage ? "Processed" : "Original"}
                                className="w-full h-full object-contain"
                                loading="eager"
                            />
                        </div>
                    </>
                )}

                {/* Overlay Controls */}
                <>
                    {processedImage && !isProcessing && (
                        <div className="absolute top-3 right-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    trackEvent("editor_comparison_toggled", {
                                        enabled: !showComparison,
                                        original_image_url: originalImage,
                                        processed_image_url: processedImage,
                                    });
                                    setShowComparison(!showComparison);
                                }}
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
                        </div>
                    )}
                </>
            </div>

            {/* Status Strip */}
            <div className="text-center py-1">
                <>
                    {isProcessing ? (
                        <p
                            key="processing"
                            className="text-xs text-primary font-medium flex items-center justify-center gap-1.5"
                        >
                            <BrandMark className="w-3 h-3 " />
                            Processing with AI...
                        </p>
                    ) : processedImage ? (
                        <p
                            key="done"
                            className="text-xs text-primary font-medium"
                        >
                            ✨ Magic applied! Compare or export your result
                        </p>
                    ) : (
                        <p key="idle" className="text-xs text-muted-foreground">
                            Select a tool below to start editing
                        </p>
                    )}
                </>
            </div>
        </div>
    );
}
