"use client";

import {
    CheckCircle,
    Clock,
    Crop,
    Download,
    Expand,
    Loader2,
    Lock,
    Scissors,
    Type,
    Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { CREDIT_COSTS, FEATURE_MIN_PLAN, type PlanType } from "@/lib/plans";
import UploadZone from "./upload-zone";
import CanvasEditor from "./canvas-editor";

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
        credits: CREDIT_COSTS["e-bgremove"],
    },
    {
        id: "e-removedotbg",
        name: "Remove BG (Pro)",
        icon: Scissors,
        color: "secondary",
        description: "High-quality background removal",
        credits: CREDIT_COSTS["e-removedotbg"],
        minPlan: FEATURE_MIN_PLAN["e-removedotbg"] as PlanType,
    },
    {
        id: "e-changebg",
        name: "Change Background",
        icon: Expand,
        color: "primary",
        description: "Replace background with AI",
        hasPrompt: true,
        credits: CREDIT_COSTS["e-changebg"],
    },
    {
        id: "e-edit",
        name: "AI Edit",
        icon: Type,
        color: "secondary",
        description: "Edit image with text prompts",
        hasPrompt: true,
        credits: CREDIT_COSTS["e-edit"],
    },
    {
        id: "bg-genfill",
        name: "Generative Fill",
        icon: Expand,
        color: "primary",
        description: "Fill empty areas with AI",
        hasPrompt: true,
        credits: CREDIT_COSTS["bg-genfill"],
    },
];

const secondaryTools = [
    {
        id: "e-dropshadow",
        name: "AI Drop Shadow",
        icon: Zap,
        color: "secondary",
        description: "Add realistic shadows",
        credits: CREDIT_COSTS["e-dropshadow"],
    },
    {
        id: "e-retouch",
        name: "AI Retouch",
        icon: Zap,
        color: "primary",
        description: "Enhance and retouch image",
        credits: CREDIT_COSTS["e-retouch"],
    },
    {
        id: "e-upscale",
        name: "AI Upscale 2x",
        icon: Zap,
        color: "secondary",
        description: "Upscale image quality",
        credits: CREDIT_COSTS["e-upscale"],
    },
    {
        id: "e-genvar",
        name: "Generate Variations",
        icon: Type,
        color: "primary",
        description: "Create image variations",
        hasPrompt: true,
        credits: CREDIT_COSTS["e-genvar"],
    },
    {
        id: "e-crop-face",
        name: "Face Crop",
        icon: Crop,
        color: "secondary",
        description: "Smart face-focused cropping",
        credits: CREDIT_COSTS["e-crop-face"],
    },
    {
        id: "e-crop-smart",
        name: "Smart Crop",
        icon: Crop,
        color: "primary",
        description: "AI-powered intelligent cropping",
        credits: CREDIT_COSTS["e-crop-smart"],
    },
];

const allTools = [...primaryTools, ...secondaryTools];

export default function Editor() {
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
    const [editHistory, setEditHistory] = useState<ProcessingJob[]>([]);
    const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
    const [promptText, setPromptText] = useState<string>("");
    const [showPromptInput, setShowPromptInput] = useState<boolean>(false);
    const [pendingPromptTool, setPendingPromptTool] = useState<string | null>(null);
    const [userPlan, setUserPlan] = useState<PlanType>("Free");
    const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
    const [creditError, setCreditError] = useState<string | null>(null);

    // fetch user plan and credits
    useEffect(() => {
        if (isAuthenticated) {
            fetch("/api/usage")
                .then((res) => res.json())
                .then((data) => {
                    setUserPlan((data.plan || "Free") as PlanType);
                    setCreditsRemaining(data.creditsRemaining ?? 0);
                })
                .catch(console.error);
        }
    }, [isAuthenticated]);

    const handleImageUpload = (imageUrl: string) => {
        setUploadedImage(imageUrl);
        setProcessedImage(null);
        setCurrentJob(null);
    };

    const refreshCredits = async () => {
        try {
            const res = await fetch("/api/usage");
            if (res.ok) {
                const data = await res.json();
                setUserPlan((data.plan || "Free") as PlanType);
                setCreditsRemaining(data.creditsRemaining ?? 0);
            }
        } catch (e) {
            console.error("Failed to refresh credits:", e);
        }
    };

    const handlePromptSubmit = async () => {
        if (!promptText.trim() || !pendingPromptTool) return;
        await applyEffect(pendingPromptTool, promptText);
        setShowPromptInput(false);
        setPromptText("");
        setPendingPromptTool(null);
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

    const isToolLocked = (tool: typeof allTools[0]): boolean => {
        if (!("minPlan" in tool) || !tool.minPlan) return false;
        const planRank: Record<string, number> = { Free: 0, Starter: 1, Lite: 2, Pro: 3 };
        return (planRank[userPlan] || 0) < (planRank[tool.minPlan as string] || 0);
    };

    const handleToolClick = async (toolId: string) => {
        if (!uploadedImage) return;

        const tool = allTools.find((t) => t.id === toolId);
        if (!tool) return;

        if (isToolLocked(tool)) {
            setCreditError(`This feature requires ${(tool as any).minPlan || "Lite"} plan or higher`);
            setTimeout(() => setCreditError(null), 3000);
            return;
        }

        // toggle effect on/off
        const newActiveEffects = new Set(activeEffects);
        if (newActiveEffects.has(toolId)) {
            newActiveEffects.delete(toolId);
            setActiveEffects(newActiveEffects);

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
            setPendingPromptTool(toolId);
            return;
        }

        await applyEffect(toolId);
    };

    const deductCredits = async (featureId: string): Promise<boolean> => {
        const creditCost = CREDIT_COSTS[featureId];

        if (creditCost === 0) return true;

        if (!isAuthenticated) {
            setCreditError("Sign in and upgrade to use AI features");
            setTimeout(() => setCreditError(null), 3000);
            return false;
        }

        try {
            const res = await fetch("/api/deduct-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ featureId }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.requiredPlan) {
                    setCreditError(`Requires ${data.requiredPlan} plan or higher`);
                } else if (data.creditsRemaining !== undefined) {
                    setCreditError(`Not enough credits (need ${creditCost}, have ${data.creditsRemaining})`);
                } else {
                    setCreditError(data.error || "Failed to deduct credits");
                }
                setTimeout(() => setCreditError(null), 4000);
                return false;
            }

            setCreditsRemaining(data.creditsRemaining ?? 0);
            return true;
        } catch (err) {
            console.error("Credit deduction error:", err);
            setCreditError("Failed to validate credits");
            setTimeout(() => setCreditError(null), 3000);
            return false;
        }
    };

    const applyEffect = async (toolId: string, prompt?: string) => {
        if (!uploadedImage) return;

        // deduct credits before applying
        const allowed = await deductCredits(toolId);
        if (!allowed) return;

        const newJob: ProcessingJob = {
            id: Date.now().toString(),
            type: toolId,
            status: "queued",
            progress: 0,
        };

        setCurrentJob(newJob);

        // apply effect to active effects
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
            const maxAttempts = 60;
            const pollInterval = 5000;

            const pollImageKit = async (): Promise<boolean> => {
                attempts++;

                try {
                    const response = await fetch(newImageUrl, {
                        method: "HEAD",
                        cache: "no-cache",
                    });

                    if (response.ok) {
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

                        await refreshCredits();
                        return true;
                    }
                } catch (err) {
                    console.log(
                        `Poll attempt ${attempts}: AI still processing...`
                    );
                }

                const progress = Math.min(10 + attempts * 1.5, 90);
                setCurrentJob((prev) => (prev ? { ...prev, progress } : null));

                if (attempts >= maxAttempts) {
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

                await new Promise((resolve) =>
                    setTimeout(resolve, pollInterval)
                );
                return pollImageKit();
            };

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

    const getCreditBadge = (credits: number) => {
        if (credits === 0) return "FREE";
        return `${credits} credits`;
    };

    return (
        <section id="editor" className="py-12 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

            <div className="w-full px-4 sm:px-8 lg:px-12 relative z-10">
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

                {/* Credit error toast */}
                {creditError && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg text-sm font-medium"
                    >
                        {creditError}
                    </motion.div>
                )}

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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-foreground">
                                    AI Tools
                                </h3>
                                {isAuthenticated && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                        {creditsRemaining.toLocaleString()} cr
                                    </span>
                                )}
                            </div>

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
                                            onClick={() => {
                                                setShowPromptInput(false);
                                                setPendingPromptTool(null);
                                            }}
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
                                const locked = isToolLocked(tool);

                                return (
                                    <Button
                                        key={tool.id}
                                        variant={
                                            isActive ? "default" : "outline"
                                        }
                                        className={`w-full justify-start shadow-glass py-5 transition-all whitespace-nowrap ${locked
                                            ? "opacity-50 border-border/50"
                                            : isActive
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "border-gray-600 hover:border-primary/30"
                                            }`}
                                        onClick={() => handleToolClick(tool.id)}
                                        disabled={isDisabled || locked}
                                        title={locked ? `Requires ${(tool as any).minPlan} plan` : tool.description}
                                    >
                                        {locked ? (
                                            <Lock className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                        ) : (
                                            <tool.icon
                                                className={`h-4 w-4 mr-2 shrink-0 ${isProcessing
                                                    ? "animate-pulse"
                                                    : ""
                                                    }`}
                                            />
                                        )}
                                        <span className="text-sm font-medium">
                                            {tool.name}
                                        </span>
                                        <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${tool.credits === 0
                                            ? "bg-emerald-500/15 text-emerald-400"
                                            : isActive
                                                ? "bg-primary-foreground/15 text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                            }`}>
                                            {getCreditBadge(tool.credits)}
                                        </span>
                                        {isActive && !isProcessing && (
                                            <div className="w-2 h-2 bg-primary-foreground rounded-full shrink-0" />
                                        )}
                                        {isProcessing && (
                                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
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

                        {/* Secondary Tools */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6"
                        >
                            <h4 className="text-md font-semibold text-foreground mb-3">
                                Additional Tools
                            </h4>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {secondaryTools.map((tool) => {
                                    const isActive = activeEffects.has(tool.id);
                                    const isProcessing =
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
                                            size="sm"
                                            className={`justify-start shadow-glass py-2.5 px-3 transition-all whitespace-nowrap ${isActive
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
                                                className={`h-3.5 w-3.5 shrink-0 ${isProcessing
                                                    ? "animate-pulse"
                                                    : ""
                                                    }`}
                                            />
                                            <span className="text-xs md:text-sm">
                                                {tool.name}
                                            </span>
                                            <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${tool.credits === 0
                                                ? "bg-emerald-500/15 text-emerald-400"
                                                : isActive
                                                    ? "bg-primary-foreground/15 text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                                }`}>
                                                {getCreditBadge(tool.credits)}
                                            </span>
                                            {isActive && !isProcessing && (
                                                <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full shrink-0" />
                                            )}
                                            {isProcessing && (
                                                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
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
                                                <span className="text-[10px] text-primary ml-auto">
                                                    -{CREDIT_COSTS[job.type] || 0} cr
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
    );
}
