import { BrandMark } from "@/components/brand/logo";
import { LoadingState } from "@/components/loading-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppRouter as useRouter } from "@/components/navigation-feedback";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Crown, ImageIcon, Upload, X, Zap } from "lucide-react";
import {
    ImageKitInvalidRequestError,
    ImageKitServerError,
    ImageKitUploadNetworkError,
    upload,
} from "@imagekit/next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaymentModal from "@/components/modals/payment-modal";
import type { PlanType } from "@/lib/plans";
import { setAnalyticsPlan, trackEvent } from "@/lib/analytics";

interface UploadZoneProps {
    onImageUpload: (imageUrl: string) => void;
    updatedCreditsRemaining?: number;
    busy?: boolean;
}

interface UsageData {
    creditsUsed: number;
    creditLimit: number;
    creditsRemaining: number;
    uploadCount: number;
    uploadLimit: number;
    plan: string;
    canUpload: boolean;
    subscriptionExpiresAt?: string | null;
}

interface UploadAuthData {
    token: string;
    expire: number;
    signature: string;
    publicKey: string;
    usage: UsageData;
}

export default function UploadZone({
    onImageUpload,
    updatedCreditsRemaining,
    busy = false,
}: UploadZoneProps) {
    const { data: session, status } = useSession();
    const isAuthenticated = !!session?.user;
    const hasTransferred = useRef<string | null>(null);
    const uploadInFlight = useRef(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<
        "Starter" | "Lite" | "Pro"
    >("Starter");

    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [checkingUsage, setCheckingUsage] = useState(true);
    const [usageError, setUsageError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [usageData, setUsageData] = useState<UsageData | null>(null);

    const checkUsage = useCallback(async () => {
        setCheckingUsage(true);
        setUsageError(null);
        try {
            const response = await fetch("/api/usage");
            if (!response.ok) {
                throw new Error("Failed to check usage");
            }
            const data = await response.json();
            setUsageData(data);
            setAnalyticsPlan(data.plan as PlanType);
            return data;
        } catch (error) {
            setUsageError("Access check failed. You can try again.");
            throw error;
        } finally {
            setCheckingUsage(false);
        }
    }, []);

    const checkFreeUsage = useCallback(async () => {
        setCheckingUsage(true);
        setUsageError(null);
        try {
            const response = await fetch("/api/free-usage");
            if (!response.ok) {
                throw new Error("Failed to check free usage");
            }
            const data = await response.json();
            setUsageData(data);
            setAnalyticsPlan("Free");
            return data;
        } catch (error) {
            setUsageError("Access check failed. You can try again.");
            throw error;
        } finally {
            setCheckingUsage(false);
        }
    }, []);

    useEffect(() => {
        if (status === "loading") return;
        if (isAuthenticated) {
            if (hasTransferred.current !== session?.user?.id) {
                hasTransferred.current = session?.user?.id ?? null;
                fetch("/api/transfer-usage", { method: "POST" })
                    .then(() => checkUsage())
                    .catch(console.error);
            } else {
                checkUsage()?.catch(console.error);
            }
        } else {
            hasTransferred.current = null;
            checkFreeUsage().catch(console.error);
        }
    }, [
        isAuthenticated,
        status,
        session?.user?.id,
        checkUsage,
        checkFreeUsage,
    ]);

    useEffect(() => {
        const upgradePlan = searchParams.get("showUpgrade");
        if (upgradePlan && isAuthenticated) {
            router.replace("/editor", { scroll: false });

            fetch("/api/usage")
                .then((res) => res.json())
                .then((data) => {
                    setUsageData(data);
                    const currentPlan = data?.plan || "Free";
                    if (currentPlan === "Free") {
                        setSelectedPlan(
                            upgradePlan as "Starter" | "Lite" | "Pro",
                        );
                        setShowPaymentModal(true);
                    }
                })
                .catch(console.error);
        }
    }, [searchParams, isAuthenticated, router]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files, "drag_drop");
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        handleFiles(files, "file_picker");
    };

    const getUploadAuthParams = async (): Promise<UploadAuthData | null> => {
        const response = await fetch("/api/upload-auth", { method: "POST" });
        const data = await response.json();
        if (response.status === 403) {
            trackEvent("image_upload_blocked", {
                reason: isAuthenticated ? "upload_limit" : "free_upload_limit",
                plan: data.plan || "Free",
            });
            setUsageData(data);
            setShowPaymentModal(true);
            return null;
        }
        if (!response.ok) throw new Error("Failed to authorize upload");
        setUsageData(data.usage);
        setAnalyticsPlan(data.usage.plan as PlanType);
        return data;
    };

    const uploadToImageKit = async (
        file: File,
        auth: UploadAuthData,
    ): Promise<string> => {
        try {
            const { token, expire, signature, publicKey } = auth;
            const result = await upload({
                file,
                fileName: file.name,
                folder: "pixsuite-uploads",
                expire,
                token,
                signature,
                publicKey,
            });
            if (!result.url) throw new Error("Upload returned no image URL");
            return result.url;
        } catch (err) {
            if (err instanceof ImageKitInvalidRequestError)
                throw new Error("Invalid upload request");
            if (err instanceof ImageKitServerError)
                throw new Error("ImageKit server error");
            if (err instanceof ImageKitUploadNetworkError)
                throw new Error("Network error during upload");
            throw err;
        }
    };

    const handleFiles = async (
        files: File[],
        source: "drag_drop" | "file_picker",
    ) => {
        if (
            uploadInFlight.current ||
            status === "loading" ||
            checkingUsage ||
            busy
        )
            return;
        setUploadError(null);
        const imageFile = files?.find((file) => file.type.startsWith("image/"));
        if (imageFile) {
            const startedAt = performance.now();
            let stage = "upload_authorization";
            const properties = {
                source,
                file_name: imageFile.name,
                file_type: imageFile.type,
                size_bytes: imageFile.size,
                is_authenticated: isAuthenticated,
            };
            trackEvent("image_upload_started", properties);
            uploadInFlight.current = true;
            setIsUploading(true);

            try {
                const auth = await getUploadAuthParams();
                if (!auth) return;
                stage = "upload";
                const imageUrl = await uploadToImageKit(imageFile, auth);
                setUploadedImage(imageUrl);
                onImageUpload(imageUrl);
                trackEvent("image_upload_completed", {
                    ...properties,
                    image_url: imageUrl,
                    plan: auth.usage.plan,
                    upload_count: auth.usage.uploadCount,
                    upload_limit: auth.usage.uploadLimit,
                    duration_ms: Math.round(performance.now() - startedAt),
                });
            } catch (err) {
                trackEvent("image_upload_failed", {
                    ...properties,
                    stage,
                    error: err instanceof Error ? err.message : String(err),
                    duration_ms: Math.round(performance.now() - startedAt),
                });
                console.error("Upload failed:", err);
                setUploadError(
                    "This photo couldn’t upload. Choose it again to retry.",
                );
            } finally {
                uploadInFlight.current = false;
                setIsUploading(false);
            }
        } else if (files.length > 0) {
            trackEvent("image_upload_blocked", {
                reason: "unsupported_file_type",
                source,
            });
        }
    };

    const handlePaymentModalClose = () => {
        setShowPaymentModal(false);
        if (isAuthenticated) {
            checkUsage().catch(console.error);
        } else {
            checkFreeUsage().catch(console.error);
        }
    };

    const clearImage = () => {
        trackEvent("image_cleared", { image_url: uploadedImage });
        setUploadedImage(null);
        onImageUpload("");
    };

    return (
        <div className="relative">
            {(isUploading || checkingUsage) && (
                <LoadingState
                    label={
                        isUploading
                            ? "Uploading your photo…"
                            : "Preparing the editor…"
                    }
                />
            )}
            <>
                {uploadedImage ? (
                    /* Uploaded Preview */
                    <div
                        key="preview"
                        className="relative group rounded-xl overflow-hidden border border-border"
                    >
                        <button
                            onClick={clearImage}
                            disabled={busy || isUploading}
                            aria-label="Remove uploaded photo"
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-destructive/20   cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5 text-foreground hover:text-destructive" />
                        </button>

                        <div className="aspect-square overflow-hidden">
                            <img
                                src={uploadedImage}
                                alt="Uploaded Preview"
                                className="w-full h-full object-cover   "
                            />
                        </div>

                        <div className="p-2.5 bg-muted/50 text-center space-y-0.5">
                            <p className="text-xs font-medium text-foreground">
                                {uploadedImage.startsWith("data:")
                                    ? "Local preview"
                                    : "Ready to edit"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                Pick a tool below
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Drop Zone */
                    <div key="dropzone">
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative rounded-xl p-5 border-2 border-dashed   cursor-pointer ${
                                isDragOver
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                            }`}
                        >
                            {/* Animated gradient border on drag */}
                            {isDragOver && (
                                <div
                                    className="absolute inset-0 rounded-xl pointer-events-none"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, oklch(0.7 0.15 250 / 0.08), oklch(0.7 0.15 300 / 0.08))",
                                    }}
                                />
                            )}

                            <input
                                type="file"
                                disabled={
                                    isUploading ||
                                    checkingUsage ||
                                    status === "loading" ||
                                    busy
                                }
                                accept="image/*"
                                onChange={handleFileSelect}
                                onClick={() =>
                                    trackEvent("image_picker_opened")
                                }
                                className="hidden"
                                id="file-upload"
                            />

                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer block text-center relative z-10"
                            >
                                <div className="mb-3">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-2">
                                        {isUploading ? (
                                            <BrandMark className="w-5 h-5 text-primary " />
                                        ) : isDragOver ? (
                                            <Upload className="w-5 h-5 text-primary " />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold text-foreground mb-1">
                                    {isUploading
                                        ? "Uploading…"
                                        : checkingUsage || status === "loading"
                                          ? "Checking access…"
                                          : isDragOver
                                            ? "Drop it!"
                                            : "Upload Photo"}
                                </h3>

                                <p className="text-[11px] text-muted-foreground mb-3">
                                    {isUploading
                                        ? "Please wait"
                                        : checkingUsage
                                          ? "Loading your upload allowance"
                                          : "Drag & drop or click"}
                                </p>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs cursor-pointer"
                                    disabled={
                                        isUploading ||
                                        checkingUsage ||
                                        status === "loading" ||
                                        busy
                                    }
                                    aria-busy={isUploading || checkingUsage}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document
                                            .getElementById("file-upload")
                                            ?.click();
                                    }}
                                >
                                    {isUploading ? (
                                        <>
                                            <BrandMark className="h-3 w-3 mr-1.5 " />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-3 w-3 mr-1.5" />
                                            {checkingUsage
                                                ? "Checking access…"
                                                : "Browse"}
                                        </>
                                    )}
                                </Button>
                            </label>
                            {(usageError || uploadError) && (
                                <div
                                    role="alert"
                                    className="mt-3 text-xs text-destructive"
                                >
                                    <p>{uploadError || usageError}</p>
                                    {usageError && (
                                        <button
                                            type="button"
                                            className="min-h-11 underline underline-offset-4"
                                            onClick={() =>
                                                (isAuthenticated
                                                    ? checkUsage()
                                                    : checkFreeUsage()
                                                ).catch(() => {})
                                            }
                                        >
                                            Retry access check
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>

            {/* Usage Info */}
            {usageData && (
                <div className="mt-3 space-y-2">
                    {/* Upload count */}
                    <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Upload className="h-2.5 w-2.5" />
                            <span>
                                {usageData.uploadCount}/{usageData.uploadLimit}{" "}
                                uploads
                            </span>
                            {usageData.plan !== "Free" && (
                                <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 h-4"
                                >
                                    {usageData.plan}
                                </Badge>
                            )}
                        </div>
                        {usageData.plan === "Free" && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Crown className="h-2.5 w-2.5 text-primary" />
                                <span>Free</span>
                            </div>
                        )}
                    </div>
                    {/* Upload progress bar */}
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" />
                    </div>

                    {/* Credit balance (for paid users) */}
                    {usageData.creditLimit > 0 && (
                        <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Zap className="h-2.5 w-2.5 text-primary" />
                                <span>
                                    {(
                                        updatedCreditsRemaining ??
                                        usageData.creditsRemaining
                                    )?.toLocaleString()}
                                    /{usageData.creditLimit?.toLocaleString()}{" "}
                                    credits
                                </span>
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center">
                        JPG, PNG, WEBP up to 10MB
                    </p>
                </div>
            )}

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={handlePaymentModalClose}
                onUpgrade={() => {
                    handlePaymentModalClose();
                    if (isAuthenticated) {
                        checkUsage().catch(console.error);
                    }
                }}
                creditsRemaining={
                    updatedCreditsRemaining ?? usageData?.creditsRemaining ?? 0
                }
                creditLimit={usageData?.creditLimit ?? 0}
                uploadCount={usageData?.uploadCount ?? 0}
                uploadLimit={usageData?.uploadLimit ?? 3}
                plan={selectedPlan}
                currentPlan={(usageData?.plan as PlanType) || "Free"}
                isAuthenticated={isAuthenticated}
            />
        </div>
    );
}
