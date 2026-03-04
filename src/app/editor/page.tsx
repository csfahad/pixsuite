"use client";

import {
    CheckCircle,
    ChevronDown,
    Clock,
    Crop,
    Download,
    Expand,
    Layers,
    Loader2,
    Lock,
    Scissors,
    Sparkles,
    Type,
    Wand2,
    X,
    Zap,
} from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import UploadZone from "../../modules/editor/upload-zone";
import CanvasEditor from "../../modules/editor/canvas-editor";
import Footer from "@/components/footer";
import { CREDIT_COSTS, FEATURE_MIN_PLAN, type PlanType } from "@/lib/plans";

type JobStatus = "idle" | "queued" | "processing" | "completed" | "error";

interface ProcessingJob {
    id: string;
    type: string;
    status: JobStatus;
    progress: number;
    result?: string;
}

interface ToolItem {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    hasPrompt?: boolean;
    credits: number;
    minPlan?: PlanType;
}

interface ToolCategory {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tools: ToolItem[];
}

const toolCategories: ToolCategory[] = [
    {
        label: "AI Transform",
        icon: Wand2,
        tools: [
            {
                id: "e-bgremove",
                name: "Remove Background",
                icon: Scissors,
                description: "Remove background with AI",
                credits: CREDIT_COSTS["e-bgremove"],
            },
            {
                id: "e-removedotbg",
                name: "Remove BG (Pro)",
                icon: Scissors,
                description: "High-quality background removal",
                credits: CREDIT_COSTS["e-removedotbg"],
                minPlan: FEATURE_MIN_PLAN["e-removedotbg"] as PlanType,
            },
            {
                id: "e-changebg",
                name: "Change Background",
                icon: Expand,
                description: "Replace background with AI",
                hasPrompt: true,
                credits: CREDIT_COSTS["e-changebg"],
            },
            {
                id: "e-edit",
                name: "AI Edit",
                icon: Type,
                description: "Edit image with text prompts",
                hasPrompt: true,
                credits: CREDIT_COSTS["e-edit"],
            },
            {
                id: "bg-genfill",
                name: "Generative Fill",
                icon: Expand,
                description: "Fill empty areas with AI",
                hasPrompt: true,
                credits: CREDIT_COSTS["bg-genfill"],
            },
        ],
    },
    {
        label: "Enhance",
        icon: Sparkles,
        tools: [
            {
                id: "e-dropshadow",
                name: "AI Drop Shadow",
                icon: Zap,
                description: "Add realistic shadows",
                credits: CREDIT_COSTS["e-dropshadow"],
            },
            {
                id: "e-retouch",
                name: "AI Retouch",
                icon: Zap,
                description: "Enhance and retouch image",
                credits: CREDIT_COSTS["e-retouch"],
            },
            {
                id: "e-upscale",
                name: "AI Upscale 2x",
                icon: Zap,
                description: "Upscale image quality",
                credits: CREDIT_COSTS["e-upscale"],
            },
            {
                id: "e-genvar",
                name: "Generate Variations",
                icon: Type,
                description: "Create image variations",
                hasPrompt: true,
                credits: CREDIT_COSTS["e-genvar"],
            },
        ],
    },
    {
        label: "Crop & Resize",
        icon: Crop,
        tools: [
            {
                id: "e-crop-face",
                name: "Face Crop",
                icon: Crop,
                description: "Smart face-focused cropping",
                credits: CREDIT_COSTS["e-crop-face"],
            },
            {
                id: "e-crop-smart",
                name: "Smart Crop",
                icon: Crop,
                description: "AI-powered intelligent cropping",
                credits: CREDIT_COSTS["e-crop-smart"],
            },
        ],
    },
];

const allTools = toolCategories.flatMap((cat) => cat.tools);

export default function Editor() {
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [processedImageHQ, setProcessedImageHQ] = useState<string | null>(null);
    const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
    const [editHistory, setEditHistory] = useState<ProcessingJob[]>([]);
    const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
    const [effectPrompts, setEffectPrompts] = useState<Record<string, string>>({});
    const [promptText, setPromptText] = useState<string>("");
    const [showPromptInput, setShowPromptInput] = useState<boolean>(false);
    const [promptToolId, setPromptToolId] = useState<string | null>(null);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
        new Set()
    );
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

    const handleImageUpload = (imageUrl: string) => {
        setUploadedImage(imageUrl);
        setProcessedImage(null);
        setProcessedImageHQ(null);
        setCurrentJob(null);
        setActiveEffects(new Set());
        setEffectPrompts({});
    };

    const handlePromptSubmit = async () => {
        if (!promptText.trim() || !promptToolId) return;
        await applyEffect(promptToolId, promptText);
        setShowPromptInput(false);
        setPromptText("");
        setPromptToolId(null);
    };

    const getImageKitTransform = (toolId: string, prompt?: string): string => {
        const transforms: Record<string, string> = {
            "e-bgremove": "e-bgremove",
            "e-removedotbg": "e-removedotbg",
            "e-changebg": prompt
                ? `e-changebg-prompt-${encodeURIComponent(prompt)}`
                : "e-changebg",
            "e-edit": prompt
                ? `e-edit-prompt-${encodeURIComponent(prompt)}`
                : "e-edit",
            "bg-genfill": prompt
                ? `bg-genfill-prompt-${encodeURIComponent(prompt)},w-1000,h-1000,cm-pad_resize`
                : "bg-genfill,w-1000,h-1000,cm-pad_resize",
            "e-dropshadow": "e-dropshadow",
            "e-retouch": "e-retouch",
            "e-upscale": "e-upscale",
            "e-genvar": "e-genvar",
            "e-crop-face": "w-200,h-200,fo-face",
            "e-crop-smart": "w-400,h-400,fo-auto",
        };

        return transforms[toolId] || "";
    };

    const isToolLocked = (tool: ToolItem): boolean => {
        if (!tool.minPlan) return false;
        const planRank: Record<string, number> = { Free: 0, Starter: 1, Lite: 2, Pro: 3 };
        return (planRank[userPlan] || 0) < (planRank[tool.minPlan] || 0);
    };

    const getCreditBadge = (credits: number) => {
        if (credits === 0) return "FREE";
        return `${credits} credits`;
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

    const handleToolClick = async (toolId: string) => {
        if (!uploadedImage) return;

        const tool = allTools.find((t) => t.id === toolId);
        if (!tool) return;

        // check if tool is locked by plan
        if (isToolLocked(tool)) {
            setCreditError(`This feature requires ${tool.minPlan || "Lite"} plan or higher`);
            setTimeout(() => setCreditError(null), 3000);
            return;
        }

        // toggle effect on/off
        const newActiveEffects = new Set(activeEffects);
        if (newActiveEffects.has(toolId)) {
            newActiveEffects.delete(toolId);
            setActiveEffects(newActiveEffects);

            // remove stored prompt for this effect
            const newPrompts = { ...effectPrompts };
            delete newPrompts[toolId];
            setEffectPrompts(newPrompts);

            const remainingEffects = Array.from(newActiveEffects);
            const newImageUrl =
                remainingEffects.length > 0
                    ? `${uploadedImage}?tr=${remainingEffects
                        .map((effect) => getImageKitTransform(effect, newPrompts[effect]))
                        .join(":")}`
                    : uploadedImage;
            setProcessedImage(newImageUrl);
            setProcessedImageHQ(remainingEffects.length > 0 ? newImageUrl : null);
            return;
        }

        // check if tool requires prompt
        if (tool.hasPrompt) {
            setShowPromptInput(true);
            setPromptText("");
            setPromptToolId(toolId);
            return;
        }

        // apply effect immediately
        await applyEffect(toolId);
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

        const newActiveEffects = new Set(activeEffects);
        newActiveEffects.add(toolId);
        setActiveEffects(newActiveEffects);

        // store the prompt for this effect so it's preserved when chaining
        const newPrompts = { ...effectPrompts };
        if (prompt) {
            newPrompts[toolId] = prompt;
        }
        setEffectPrompts(newPrompts);

        // build transforms using stored prompts for ALL effects
        const allEffects = Array.from(newActiveEffects);
        const transforms = allEffects.map((effect) =>
            getImageKitTransform(effect, effect === toolId ? prompt : newPrompts[effect])
        );
        const newImageUrl = `${uploadedImage}?tr=${transforms.join(":")}`;

        // low-quality preview URL for instant display
        const previewUrl = `${uploadedImage}?tr=${transforms.join(":")},q-40`;

        try {
            setCurrentJob((prev) =>
                prev ? { ...prev, status: "processing", progress: 10 } : null
            );

            let attempts = 0;
            const maxAttempts = 30;
            const pollInterval = 2000;

            // use Image() for preloading — avoids CORS issues with HEAD fetch
            // and pre-caches the image for instant display
            const preloadImage = (url: string): Promise<boolean> => {
                return new Promise((resolve) => {
                    const img = new window.Image();
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                    img.src = url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
                });
            };

            const pollImageKit = async (): Promise<boolean> => {
                attempts++;

                // first try low-quality preview for fast display
                if (attempts === 1) {
                    const previewLoaded = await preloadImage(previewUrl);
                    if (previewLoaded) {
                        setProcessedImage(previewUrl);
                    }
                }

                const loaded = await preloadImage(newImageUrl);

                if (loaded) {
                    // swap to full quality
                    setProcessedImage(newImageUrl);
                    setProcessedImageHQ(newImageUrl);
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
                        ...prev.slice(0, 4),
                    ]);

                    await refreshCredits();
                    return true;
                }

                const progress = Math.min(10 + attempts * 3, 90);
                setCurrentJob((prev) => (prev ? { ...prev, progress } : null));

                if (attempts >= maxAttempts) {
                    setProcessedImage(newImageUrl);
                    setProcessedImageHQ(newImageUrl);
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
                        ...prev.slice(0, 4),
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
            toast.error("Failed to apply transformation. Please try again.");
            setCurrentJob((prev) =>
                prev ? { ...prev, status: "error" } : null
            );
        }
    };

    const handleExport = async (format: string) => {
        // always download full quality image
        const downloadUrl = processedImageHQ || processedImage;
        if (!downloadUrl) return;
        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                // try to read error message from imagekit
                const contentType = response.headers.get("content-type") || "";
                if (contentType.includes("text")) {
                    const errorText = await response.text();
                    toast.error(errorText || "Transformation failed. Please try again.");
                } else {
                    toast.error("Download failed. The transformation may have encountered an error.");
                }
                return;
            }
            // verify we got an actual image, not an error page
            const contentType = response.headers.get("content-type") || "";
            if (!contentType.startsWith("image/")) {
                const errorText = await response.text();
                toast.error(errorText || "Transformation failed. Please try again.");
                return;
            }
            const blob = await response.blob();
            saveAs(blob, `PixSuite-${Date.now()}.${format}`);
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to download. Please check your connection and try again.");
        }
    };

    const toggleCategory = (label: string) => {
        const updated = new Set(collapsedCategories);
        if (updated.has(label)) {
            updated.delete(label);
        } else {
            updated.add(label);
        }
        setCollapsedCategories(updated);
    };

    const isProcessing = currentJob?.status === "processing";

    const getStatusSteps = () => {
        if (!currentJob) return [];
        const steps = [
            { label: "Queued", done: true },
            {
                label: "Processing",
                done:
                    currentJob.status === "processing" ||
                    currentJob.status === "completed",
                active: currentJob.status === "processing",
            },
            {
                label: "Completed",
                done: currentJob.status === "completed",
            },
        ];
        return steps;
    };

    return (
        <>
            <section
                id="editor"
                className="pt-24 pb-18 relative overflow-hidden"
            >
                {/* Ambient background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
                </div>

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

                <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10">

                    {/* Active Effects & Export Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex items-center justify-between mb-6"
                    >
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Credit balance indicator */}
                            {isAuthenticated && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                    <Zap className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-semibold text-primary">
                                        {creditsRemaining.toLocaleString()} credits
                                    </span>
                                </div>
                            )}

                            {/* Active effects badges */}
                            <AnimatePresence mode="popLayout">
                                {Array.from(activeEffects).map((effectId) => {
                                    const tool = allTools.find(
                                        (t) => t.id === effectId
                                    );
                                    return (
                                        <motion.div
                                            key={effectId}
                                            initial={{
                                                opacity: 0,
                                                scale: 0.8,
                                                x: -10,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                scale: 1,
                                                x: 0,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.8,
                                                x: -10,
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 25,
                                            }}
                                        >
                                            <Badge
                                                variant="secondary"
                                                className="gap-1.5 py-1 px-2.5 cursor-pointer hover:bg-destructive/20 transition-colors"
                                                onClick={() =>
                                                    handleToolClick(effectId)
                                                }
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                {tool?.name}
                                                <span className="text-[9px] opacity-70">-{tool?.credits || 0}cr</span>
                                                <X className="w-3 h-3 opacity-60" />
                                            </Badge>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Main 3-Panel Layout */}
                    <div className="grid lg:grid-cols-4 gap-8">
                        {/* ======= LEFT PANEL — Upload ======= */}
                        <motion.aside
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-1"
                        >
                            {/* Upload Zone */}
                            <div className="mb-4">
                                <Suspense fallback={null}>
                                    <UploadZone
                                        onImageUpload={handleImageUpload}
                                        updatedCreditsRemaining={creditsRemaining}
                                    />
                                </Suspense>
                            </div>
                        </motion.aside>

                        {/* ======= CENTER — Canvas + Tools ======= */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-2"
                        >
                            <CanvasEditor
                                originalImage={uploadedImage}
                                processedImage={processedImage}
                                isProcessing={isProcessing ?? false}
                            />

                            {/* Prompt Input */}
                            <AnimatePresence>
                                {showPromptInput && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="overflow-hidden mt-4"
                                    >
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Describe your edit</span>
                                            </div>
                                            <textarea
                                                value={promptText}
                                                onChange={(e) => setPromptText(e.target.value)}
                                                placeholder="e.g., Replace background with a sunset beach..."
                                                className="w-full p-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                                                rows={3}
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={handlePromptSubmit}
                                                    disabled={!promptText.trim()}
                                                    className="flex-1 gap-1.5 cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    Apply
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowPromptInput(false);
                                                        setPromptToolId(null);
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* AI Tools — Categorized Grid Below Canvas */}
                            <div className="mt-6 space-y-5">
                                <TooltipProvider delayDuration={300}>
                                    {toolCategories.map((category, catIdx) => {
                                        const isCollapsed = collapsedCategories.has(category.label);
                                        return (
                                            <motion.div
                                                key={category.label}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: catIdx * 0.08 }}
                                            >
                                                {/* Category Header */}
                                                <button
                                                    onClick={() => toggleCategory(category.label)}
                                                    className="flex items-center gap-2 w-full mb-3 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                                                >
                                                    <category.icon className="w-4 h-4" />
                                                    <span className="flex-1 text-left">{category.label}</span>
                                                    <ChevronDown
                                                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                                                    />
                                                </button>

                                                {/* Tools Grid */}
                                                <AnimatePresence initial={false}>
                                                    {!isCollapsed && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                {category.tools.map((tool, toolIdx) => {
                                                                    const isActive = activeEffects.has(tool.id);
                                                                    const isToolProcessing =
                                                                        currentJob?.type === tool.id &&
                                                                        currentJob.status === "processing";
                                                                    const isDisabled = !uploadedImage || isProcessing;
                                                                    const locked = isToolLocked(tool);

                                                                    return (
                                                                        <Tooltip key={tool.id}>
                                                                            <TooltipTrigger asChild>
                                                                                <motion.button
                                                                                    initial={{ opacity: 0, y: 8 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    transition={{ duration: 0.2, delay: toolIdx * 0.04 }}
                                                                                    onClick={() => handleToolClick(tool.id)}
                                                                                    disabled={isDisabled || locked}
                                                                                    className={`tool-card flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border transition-all group ${isActive
                                                                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                                                                        : locked
                                                                                            ? "border-border/50 opacity-50"
                                                                                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                                                                                        }`}
                                                                                >
                                                                                    {/* Icon */}
                                                                                    <div
                                                                                        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive
                                                                                            ? "bg-primary-foreground/20"
                                                                                            : locked
                                                                                                ? "bg-muted/50"
                                                                                                : "bg-muted group-hover:bg-primary/10"
                                                                                            }`}
                                                                                    >
                                                                                        {isToolProcessing ? (
                                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                        ) : locked ? (
                                                                                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                                                                        ) : (
                                                                                            <tool.icon className="w-3.5 h-3.5" />
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Name */}
                                                                                    <span className="text-[13px] font-medium whitespace-nowrap">
                                                                                        {tool.name}
                                                                                    </span>

                                                                                    {/* Credit badge — pushed to far right */}
                                                                                    <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${tool.credits === 0
                                                                                        ? "bg-emerald-500/15 text-emerald-400"
                                                                                        : isActive
                                                                                            ? "bg-primary-foreground/15 text-primary-foreground"
                                                                                            : "bg-muted text-muted-foreground"
                                                                                        }`}>
                                                                                        {getCreditBadge(tool.credits)}
                                                                                    </span>

                                                                                    {/* Locked label */}
                                                                                    {locked && (
                                                                                        <span className="text-[9px] text-destructive font-medium shrink-0">
                                                                                            {tool.minPlan}+
                                                                                        </span>
                                                                                    )}
                                                                                </motion.button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="bottom" className="max-w-[220px] py-1.5 px-2.5">
                                                                                <p className="font-medium text-[13px]">{tool.name}</p>
                                                                                <p className="text-xs opacity-80">{tool.description}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </TooltipProvider>
                            </div>
                        </motion.div>

                        {/* ======= RIGHT PANEL — Status & History ======= */}
                        <motion.aside
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="editor-panel p-5 lg:sticky lg:top-20 space-y-6"
                        >
                            {/* Processing Status */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Processing
                                    </h3>
                                </div>

                                {currentJob ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        {/* Job Info */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${currentJob.status ===
                                                    "completed"
                                                    ? "bg-primary/10"
                                                    : currentJob.status ===
                                                        "error"
                                                        ? "bg-destructive/10"
                                                        : "bg-muted"
                                                    }`}
                                            >
                                                {currentJob.status ===
                                                    "completed" ? (
                                                    <CheckCircle className="w-5 h-5 text-primary" />
                                                ) : currentJob.status ===
                                                    "error" ? (
                                                    <X className="w-5 h-5 text-destructive" />
                                                ) : (
                                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                )}
                                                {currentJob.status ===
                                                    "processing" && (
                                                        <div className="absolute inset-0 rounded-xl border-2 border-primary/30 animate-ping" />
                                                    )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {allTools.find(
                                                        (t) =>
                                                            t.id ===
                                                            currentJob.type
                                                    )?.name ||
                                                        currentJob.type.replace(
                                                            "-",
                                                            " "
                                                        )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {currentJob.status ===
                                                        "queued" &&
                                                        "Initializing..."}
                                                    {currentJob.status ===
                                                        "processing" &&
                                                        `AI processing... ${Math.round(currentJob.progress)}%`}
                                                    {currentJob.status ===
                                                        "completed" &&
                                                        "Transformation complete ✨"}
                                                    {currentJob.status ===
                                                        "error" &&
                                                        "Processing failed"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {(currentJob.status === "processing" ||
                                            currentJob.status ===
                                            "queued") && (
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <Progress
                                                            value={
                                                                currentJob.status ===
                                                                    "queued"
                                                                    ? undefined
                                                                    : currentJob.progress
                                                            }
                                                            className="h-1.5"
                                                        />
                                                        {currentJob.status ===
                                                            "queued" && (
                                                                <div className="absolute inset-0 h-1.5 rounded-full overflow-hidden">
                                                                    <div className="w-full h-full shimmer" />
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            )}

                                        {/* Status Steps */}
                                        <div className="flex items-center justify-center gap-1">
                                            {getStatusSteps().map(
                                                (step, i) => (
                                                    <div
                                                        key={step.label}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <div
                                                            className={`flex items-center gap-1 px-1 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap ${step.done
                                                                ? "bg-primary/10 text-primary"
                                                                : step.active
                                                                    ? "bg-muted text-foreground"
                                                                    : "text-muted-foreground"
                                                                }`}
                                                        >
                                                            {step.done &&
                                                                !step.active ? (
                                                                <CheckCircle className="w-2.5 h-2.5" />
                                                            ) : step.active ? (
                                                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                            ) : (
                                                                <Clock className="w-2.5 h-2.5" />
                                                            )}
                                                            {step.label}
                                                        </div>
                                                        {i < 2 && (
                                                            <div className="w-1.5 h-px bg-border" />
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                                            <Sparkles className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Upload an image and pick a tool
                                            <br />
                                            to start editing
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-border" />

                            {/* Edit History */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-foreground">
                                        History
                                    </h4>
                                    {editHistory.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {editHistory.length}
                                        </Badge>
                                    )}
                                </div>

                                {editHistory.length > 0 ? (
                                    <div className="space-y-2">
                                        <AnimatePresence mode="popLayout">
                                            {editHistory.map((job, idx) => (
                                                <motion.div
                                                    key={job.id}
                                                    initial={{
                                                        opacity: 0,
                                                        y: -8,
                                                        scale: 0.95,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                        scale: 1,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        scale: 0.95,
                                                    }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 400,
                                                        damping: 25,
                                                    }}
                                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-default"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    <span className="text-xs text-foreground truncate flex-1">
                                                        {allTools.find(
                                                            (t) =>
                                                                t.id ===
                                                                job.type
                                                        )?.name ||
                                                            job.type.replace(
                                                                "-",
                                                                " "
                                                            )}
                                                    </span>
                                                    <span className="text-[10px] text-primary shrink-0">
                                                        -{CREDIT_COSTS[job.type] || 0} cr
                                                    </span>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        No edits yet
                                    </p>
                                )}
                            </div>

                            {/* Download Section */}
                            <AnimatePresence>
                                {processedImage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                        }}
                                    >
                                        <div className="h-px bg-border mb-6" />
                                        <div className="space-y-2">
                                            <Button
                                                variant="default"
                                                onClick={() =>
                                                    handleExport("png")
                                                }
                                                className="w-full gap-2 cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download PNG
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    handleExport("jpg")
                                                }
                                                className="w-full gap-2 cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download JPG
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.aside>
                    </div>
                </div>
            </section>
            <Footer />
        </>
    );
}