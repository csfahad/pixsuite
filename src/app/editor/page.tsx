"use client";

import {
    CheckCircle,
    Clock,
    Crop,
    Download,
    Expand,
    Loader2,
    Scissors,
    Type,
    Zap,
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import UploadZone from "../../modules/editor/upload-zone";
import CanvasEditor from "../../modules/editor/canvas-editor";
import Footer from "@/components/footer";

type JobStatus = "idle" | "queued" | "processing" | "completed" | "error";

interface ProcessingJob {
    id: string;
    type: string;
    status: JobStatus;
    progress: number;
    result?: string;
}

const primaryTools = [
    {
        id: "e-bgremove",
        name: "Remove Background",
        icon: Scissors,
        color: "primary",
        description: "Remove background with AI",
    },
    {
        id: "e-removedotbg",
        name: "Remove Background (Pro)",
        icon: Scissors,
        color: "secondary",
        description: "High-quality background removal",
    },
    {
        id: "e-changebg",
        name: "Change Background",
        icon: Expand,
        color: "primary",
        description: "Replace background with AI",
        hasPrompt: true,
    },
    {
        id: "e-edit",
        name: "AI Edit",
        icon: Type,
        color: "secondary",
        description: "Edit image with text prompts",
        hasPrompt: true,
    },
    {
        id: "bg-genfill",
        name: "Generative Fill",
        icon: Expand,
        color: "primary",
        description: "Fill empty areas with AI",
        hasPrompt: true,
    },
];

const secondaryTools = [
    {
        id: "e-dropshadow",
        name: "AI Drop Shadow",
        icon: Zap,
        color: "secondary",
        description: "Add realistic shadows",
    },
    {
        id: "e-retouch",
        name: "AI Retouch",
        icon: Zap,
        color: "primary",
        description: "Enhance and retouch image",
    },
    {
        id: "e-upscale",
        name: "AI Upscale 2x",
        icon: Zap,
        color: "secondary",
        description: "Upscale image quality",
    },
    {
        id: "e-genvar",
        name: "Generate Variations",
        icon: Type,
        color: "primary",
        description: "Create image variations",
        hasPrompt: true,
    },
    {
        id: "e-crop-face",
        name: "Face Crop",
        icon: Crop,
        color: "secondary",
        description: "Smart face-focused cropping",
    },
    {
        id: "e-crop-smart",
        name: "Smart Crop",
        icon: Crop,
        color: "primary",
        description: "AI-powered intelligent cropping",
    },
];

const allTools = [...primaryTools, ...secondaryTools];

export default function Editor() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
    const [editHistory, setEditHistory] = useState<ProcessingJob[]>([]);
    const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
    const [promptText, setPromptText] = useState<string>("");
    const [showPromptInput, setShowPromptInput] = useState<boolean>(false);

    const handleImageUpload = (imageUrl: string) => {
        setUploadedImage(imageUrl);
        setProcessedImage(null);
        setCurrentJob(null);
    };

    const handlePromptSubmit = async () => {
        if (!promptText.trim()) return;

        // find the tool that was clicked
        const tool = allTools.find(
            (t) => t.hasPrompt && !activeEffects.has(t.id)
        );
        if (!tool) return;

        await applyEffect(tool.id, promptText);
        setShowPromptInput(false);
        setPromptText("");
    };

    const getImageKitTransform = (toolId: string, prompt?: string): string => {
        const transforms: Record<string, string> = {
            "e-bgremove": "e-bgremove",
            "e-removedotbg": "e-removedotbg",
            "e-changebg": prompt
                ? `e-changebg-prompt-${encodeURIComponent(prompt)}`
                : "e-changebg",
            "e-edit": prompt
                ? `e-edit:${encodeURIComponent(prompt)}`
                : "e-edit",
            "bg-genfill": prompt
                ? `bg-genfill:${encodeURIComponent(prompt)}`
                : "bg-genfill",
            "e-dropshadow": "e-dropshadow",
            "e-retouch": "e-retouch",
            "e-upscale": "e-upscale",
            "e-genvar": prompt
                ? `e-genvar:${encodeURIComponent(prompt)}`
                : "e-genvar",
            "e-crop-face": "e-crop-face",
            "e-crop-smart": "e-crop-smart",
        };

        return transforms[toolId] || "";
    };

    const handleToolClick = async (toolId: string) => {
        if (!uploadedImage) return;

        const tool = allTools.find((t) => t.id === toolId);

        if (!tool) return;

        // toggle effect on/off
        const newActiveEffects = new Set(activeEffects);
        if (newActiveEffects.has(toolId)) {
            newActiveEffects.delete(toolId);
            setActiveEffects(newActiveEffects);

            // remove effect from image
            const remainingEffects = Array.from(newActiveEffects);

            const newImageUrl =
                remainingEffects.length > 0
                    ? `${uploadedImage}?tr=${remainingEffects
                        .map((effect) => getImageKitTransform(effect))
                        .join(",")}`
                    : uploadedImage;
            setProcessedImage(newImageUrl);
            return;
        }

        // check if tool requires prompt
        if (tool.hasPrompt) {
            setShowPromptInput(true);
            setPromptText("");
            return;
        }

        // apply effect immediately
        await applyEffect(toolId);
    };

    const applyEffect = async (toolId: string, prompt?: string) => {
        if (!uploadedImage) return;

        const newJob: ProcessingJob = {
            id: Date.now().toString(),
            type: toolId,
            status: "queued",
            progress: 0,
        };

        setCurrentJob(newJob);

        // Apply effect to active effects
        const newActiveEffects = new Set(activeEffects);
        newActiveEffects.add(toolId);
        setActiveEffects(newActiveEffects);

        // generate the imagekit transformation URL
        const allEffects = Array.from(newActiveEffects);
        const transforms = allEffects.map((effect) =>
            getImageKitTransform(effect, effect === toolId ? prompt : undefined)
        );
        const newImageUrl = `${uploadedImage}?tr=${transforms.join(",")}`;

        try {
            // start polling the AI transformation URL to check when it's complete
            setCurrentJob((prev) =>
                prev ? { ...prev, status: "processing", progress: 10 } : null
            );

            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max (5s intervals)
            const pollInterval = 5000; // 5seconds / 5k ms

            const pollImageKit = async (): Promise<boolean> => {
                attempts++;

                try {
                    const response = await fetch(newImageUrl, {
                        method: "HEAD", // only check headers, don't download image
                        cache: "no-cache", // don't use cached version
                    });

                    if (response.ok) {
                        // AI transformation is complete
                        setProcessedImage(newImageUrl);
                        setCurrentJob((prev) =>
                            prev
                                ? {
                                    ...prev,
                                    progress: 100,
                                    status: "completed",
                                }
                                : null
                        );

                        const completedJob = {
                            ...newJob,
                            status: "completed" as JobStatus,
                            progress: 100,
                            result: newImageUrl,
                        };
                        setEditHistory((prev) => [
                            completedJob,
                            ...prev.slice(0, 2),
                        ]);
                        return true;
                    }
                } catch (err) {
                    console.log(
                        `Poll attempt ${attempts}: AI still processing...`
                    );
                }

                // update progress based on attempts
                const progress = Math.min(10 + attempts * 1.5, 90); // 10% to 90%
                setCurrentJob((prev) => (prev ? { ...prev, progress } : null));

                if (attempts >= maxAttempts) {
                    // Timeout - mark as completed anyway
                    setProcessedImage(newImageUrl);
                    setCurrentJob((prev) =>
                        prev
                            ? { ...prev, progress: 100, status: "completed" }
                            : null
                    );

                    const completedJob = {
                        ...newJob,
                        status: "completed" as JobStatus,
                        progress: 100,
                        result: newImageUrl,
                    };
                    setEditHistory((prev) => [
                        completedJob,
                        ...prev.slice(0, 2),
                    ]);
                    return true;
                }

                // continue polling
                await new Promise((resolve) =>
                    setTimeout(resolve, pollInterval)
                );
                return pollImageKit();
            };

            // starting polling
            await pollImageKit();
        } catch (err) {
            console.error("Error applying effect:", err);
            setCurrentJob((prev) =>
                prev ? { ...prev, status: "error" } : null
            );
        }
    };

    const handleExport = (format: string) => {
        if (!processedImage) return;

        saveAs(processedImage, `PixSuite-${Date.now()}.${format}`);
    };

    return (
        <>
            <section id="editor" className="pt-24 pb-18 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

                <div className="container mx-auto max-w-6xl px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                            <span className="bg-primary bg-clip-text! text-transparent">
                                Magic
                            </span>
                            <span className="text-foreground"> Studio</span>
                        </h2>
                        <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Upload your photo and transform it with AI-powered
                            tools. See the magic happen in real-time.
                        </p>
                    </motion.div>

                    <div className="grid lg:grid-cols-4 gap-8">
                        {/* upload area */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-1"
                        >
                            <UploadZone onImageUpload={handleImageUpload} />

                            {/* Toolbar */}
                            <div className="mt-6 space-y-3">
                                <h3 className="text-lg font-semibold text-foreground mb-4">
                                    AI Tools
                                </h3>

                                {/* Prompt Input */}
                                {showPromptInput && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3 p-4 glass rounded-lg border border-card-border"
                                    >
                                        <textarea
                                            value={promptText}
                                            onChange={(e) =>
                                                setPromptText(e.target.value)
                                            }
                                            placeholder="Describe what you want to change..."
                                            className="w-full p-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none"
                                            rows={3}
                                        />

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handlePromptSubmit}
                                                disabled={!promptText.trim()}
                                                className="flex-1"
                                            >
                                                Apply
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setShowPromptInput(false)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {primaryTools.map((tool) => {
                                    const isActive = activeEffects.has(tool.id);
                                    const isProcessing =
                                        currentJob?.type === tool.id &&
                                        currentJob.status === "processing";
                                    const isQueued =
                                        currentJob?.type === tool.id &&
                                        currentJob.status === "processing";
                                    const isDisabled =
                                        !uploadedImage ||
                                        currentJob?.status === "processing";

                                    return (
                                        <Button
                                            key={tool.id}
                                            variant={
                                                isActive ? "default" : "outline"
                                            }
                                            className={`w-full justify-start shadow-glass py-6 transition-all ${isActive
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "border-gray-600 hover:border-primary/30"
                                                }`}
                                            onClick={() => handleToolClick(tool.id)}
                                            disabled={isDisabled}
                                            title={tool.description}
                                        >
                                            <tool.icon
                                                className={`h-4 w-4 mr-2 ${isProcessing
                                                    ? "animate-pulse"
                                                    : ""
                                                    }`}
                                            />
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">
                                                    {tool.name}
                                                </div>
                                                {tool?.hasPrompt && (
                                                    <div className="text-xs opacity-70">
                                                        Requires Prompt
                                                    </div>
                                                )}
                                            </div>
                                            {isActive && !isProcessing && (
                                                <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                                            )}
                                            {isQueued && (
                                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                                            )}
                                            {isProcessing && (
                                                <Loader2 className="h-4 w-4 ml-auto animate-spin" />
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Main Canvas */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-2"
                        >
                            <CanvasEditor
                                originalImage={uploadedImage}
                                processedImage={processedImage}
                                isProcessing={currentJob?.status === "processing"}
                            />

                            {/* Secondery Tools */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6"
                            >
                                <h4 className="text-md font-semibold text-foreground mb-3">
                                    Additional Tools
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {secondaryTools.map((tool) => {
                                        const isActive = activeEffects.has(tool.id);
                                        const isProcessing =
                                            currentJob?.type === tool.id &&
                                            currentJob.status === "processing";
                                        const isQueued =
                                            currentJob?.type === tool.id &&
                                            currentJob.status === "queued";
                                        const isDisabled =
                                            !uploadedImage ||
                                            currentJob?.status === "processing";

                                        return (
                                            <Button
                                                key={tool.id}
                                                variant={
                                                    isActive ? "default" : "outline"
                                                }
                                                size="sm"
                                                className={`justify-start shadow-glass py-6 transition-all ${isActive
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "border-gray-600 hover:border-primary/30"
                                                    }`}
                                                onClick={() =>
                                                    handleToolClick(tool.id)
                                                }
                                                disabled={isDisabled}
                                                title={tool.description}
                                            >
                                                <tool.icon
                                                    className={`h-3 w-3 mr-2 ${isProcessing
                                                        ? "animate-pulse"
                                                        : ""
                                                        }`}
                                                />
                                                <span className="text-xs md:text-sm">
                                                    {tool.name}
                                                </span>
                                                {isActive && !isProcessing && (
                                                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full ml-auto" />
                                                )}
                                                {isProcessing && (
                                                    <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                                                )}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Right Panel - Job Status */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-1"
                        >
                            <div className="shadow-glass rounded-lg p-6 border border-primary/80">
                                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-center">
                                    Job Status
                                </h3>

                                {currentJob ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            {currentJob.status === "processing" ? (
                                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                            ) : currentJob.status ===
                                                "completed" ? (
                                                <CheckCircle className="h-5 w-5 text-primary" />
                                            ) : currentJob.status === "queued" ? (
                                                <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                                            ) : (
                                                <Clock className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <div>
                                                <p className="font-medium text-foreground capitalize">
                                                    {allTools.find(
                                                        (t) =>
                                                            t.id === currentJob.type
                                                    )?.name ||
                                                        currentJob.type.replace(
                                                            "-",
                                                            " "
                                                        )}
                                                </p>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                    {currentJob.status ===
                                                        "queued" &&
                                                        "Preparing AI transformation..."}
                                                    {currentJob.status ===
                                                        "processing" &&
                                                        `Processing with AI... (${currentJob.progress}%)`}
                                                    {currentJob.status ===
                                                        "completed" &&
                                                        "AI transformation completed!"}
                                                    {currentJob.status ===
                                                        "error" &&
                                                        "Processing failed"}
                                                </p>
                                            </div>
                                        </div>

                                        {(currentJob.status === "processing" ||
                                            currentJob.status === "queued") && (
                                                <div className="w-full bg-muted rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-300 ${currentJob.status ===
                                                            "queued"
                                                            ? "bg-muted-foreground animate-pulse"
                                                            : "bg-gradient-primary"
                                                            }`}
                                                        style={{
                                                            width:
                                                                currentJob.status ===
                                                                    "queued"
                                                                    ? "100%"
                                                                    : `${currentJob.progress}%`,
                                                        }}
                                                    />
                                                    <div className="text-xs text-muted-foreground mt-1 text-center">
                                                        {currentJob.status === "queued" &&
                                                            "Initializing..."}
                                                        {currentJob.status === "processing" &&
                                                            "Waiting for AI to complete transformation..."}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                ) : (
                                    <p className="flex items-center justify-center text-muted-foreground text-sm">
                                        Upload an image and select a tool to start
                                    </p>
                                )}

                                {/* Edit History */}
                                {editHistory?.length > 0 && (
                                    <div className="mt-8">
                                        <h4 className="text-sm font-semibold text-foreground mb-3">
                                            Recent Edits
                                        </h4>
                                        <div className="space-y-2">
                                            {editHistory?.map((job) => (
                                                <div
                                                    key={job.id}
                                                    className="flex items-center space-x-2 text-sm"
                                                >
                                                    <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                                    <span className="text-muted-foreground capitalize">
                                                        {job?.type?.replace(
                                                            "-",
                                                            " "
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Download Button */}
                                {processedImage && (
                                    <div className="mt-6">
                                        <Button
                                            variant="default"
                                            onClick={() => handleExport("jpg")}
                                            className="w-full"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
            <Footer />
        </>
    );
}