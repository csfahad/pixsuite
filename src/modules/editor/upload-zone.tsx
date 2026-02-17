import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { Crown, ImageIcon, Loader2, Upload, X } from "lucide-react";
import {
    ImageKitInvalidRequestError,
    ImageKitServerError,
    ImageKitUploadNetworkError,
    upload,
} from "@imagekit/next";
import { Button } from "@/components/ui/button";
import PaymentModal from "@/components/modals/payment-modal";

interface UploadZoneProps {
    onImageUpload: (imageUrl: string) => void;
}

export default function UploadZone({ onImageUpload }: UploadZoneProps) {
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;
    const hasTransferred = useRef(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<"Lite" | "Pro">("Lite");

    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [usageData, setUsageData] = useState<{
        usageCount: number;
        usageLimit: number;
        plan: string;
        canUpload: boolean;
    } | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            if (!hasTransferred.current) {
                hasTransferred.current = true;
                fetch("/api/transfer-usage", { method: "POST" })
                    .then(() => checkUsage())
                    .catch(console.error);
            } else {
                checkUsage()?.catch(console.error);
            }
        } else {
            checkFreeUsage().catch(console.error);
        }
    }, [isAuthenticated]);

    // auto-open payment modal after OAuth redirect
    useEffect(() => {
        const upgradePlan = searchParams.get("showUpgrade");
        if (upgradePlan && isAuthenticated) {
            router.replace("/editor", { scroll: false });

            // check if user already has an active paid plan
            fetch("/api/usage")
                .then((res) => res.json())
                .then((data) => {
                    setUsageData(data);
                    const currentPlan = data?.plan || "Free";
                    if (currentPlan === "Free") {
                        setSelectedPlan(upgradePlan as "Lite" | "Pro");
                        setShowPaymentModal(true);
                    }
                })
                .catch(console.error);
        }
    }, [searchParams, isAuthenticated]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            handleFiles(files);
        },
        []
    );

    const getUploadAuthParams = async () => {
        const response = await fetch("/api/upload-auth");

        if (!response.ok) {
            throw new Error("Failed to get upload auth params");
        }
        const data = await response?.json();

        return data;
    };

    const uploadToImageKit = async (file: File): Promise<string> => {
        try {
            const { token, expire, signature, publicKey } =
                await getUploadAuthParams();

            const result = await upload({
                file,
                fileName: file?.name,
                folder: "pixsuite-uploads",
                expire,
                token,
                signature,
                publicKey,
                onProgress: (event) => {
                    console.log(
                        `Upload progress: ${(event.loaded / event.total) * 100
                        }%`
                    );
                },
            });

            return result.url || "";
        } catch (err) {
            if (err instanceof ImageKitInvalidRequestError) {
                throw new Error("Invalid upload request");
            } else if (err instanceof ImageKitServerError) {
                throw new Error("ImageKit server error");
            } else if (err instanceof ImageKitUploadNetworkError) {
                throw new Error("Network error during upload");
            } else {
                throw new Error("Upload failed");
            }
        }
    };

    const handleFiles = async (files: File[]) => {
        const imageFile = files?.find((file) => file.type.startsWith("image/"));
        if (imageFile) {
            setIsUploading(true);

            try {
                if (isAuthenticated) {
                    const usage = await checkUsage();

                    if (!usage.canUpload) {
                        setShowPaymentModal(true);
                        setIsUploading(false);
                        return;
                    }
                    await updateUsage();
                } else {
                    const usage = await checkFreeUsage();

                    if (!usage.canUpload) {
                        setShowPaymentModal(true);
                        setIsUploading(false);
                        return;
                    }
                    await updateFreeUsage();
                }

                // upload to imagekit
                const imageUrl = await uploadToImageKit(imageFile);
                setUploadedImage(imageUrl);
                onImageUpload(imageUrl);
            } catch (err) {
                console.error("Upload failed:", err);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const checkUsage = async () => {
        const response = await fetch("/api/usage");
        if (!response.ok) {
            throw new Error("Failed to check usage");
        }
        const data = await response.json();
        setUsageData(data);
        return data;
    };

    const checkFreeUsage = async () => {
        const response = await fetch("/api/free-usage");
        if (!response.ok) {
            throw new Error("Failed to check free usage");
        }
        const data = await response.json();
        setUsageData(data);
        return data;
    };

    const updateFreeUsage = async () => {
        const response = await fetch("/api/free-usage", { method: "POST" });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
                setUsageData(errorData);
                setShowPaymentModal(true);
                throw new Error("Free usage limit reached");
            }
            throw new Error("Failed to update free usage");
        }
        const data = await response.json();
        setUsageData(data);
        return data;
    };

    const updateUsage = async () => {
        const response = await fetch("/api/usage", { method: "POST" });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
                setUsageData(errorData);
                setShowPaymentModal(true);
                throw new Error("Usage limit reached");
            }
            throw new Error("Failed to update usage");
        }
        const data = await response.json();
        setUsageData(data);
        return data;
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
        setUploadedImage(null);
        onImageUpload("");
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
        >
            {uploadedImage ? (
                <div className="relative glass rounded-lg p-4 border border-card-border">
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 z-10 p-1 bg-background/80 rounded-full hover:bg-destructive/20 transition-colors"
                    >
                        <X className="h-4 w-4 text-foreground hover:text-destructive" />
                    </button>

                    <div className="aspect-square rounded-lg overflow-hidden">
                        <img
                            src={uploadedImage}
                            alt="Uploaded Preview"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="mt-3 text-center">
                        <p className="text-sm font-medium text-foreground">
                            {uploadedImage.startsWith("data:")
                                ? "Local preview"
                                : "Uploaded to cloud"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Ready for AI magic
                        </p>
                    </div>
                </div>
            ) : (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`shadow-glass rounded-lg p-8 border-2 border-dashed border-primary-800 transition-all duration-300 cursor-pointer ${isDragOver
                        ? "border-primary bg-primary/5 scale-105"
                        : "border-card-border hover:border-primary/50 hover:bg-primary/5"
                        }`}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                    />

                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer block text-center"
                    >
                        <motion.div
                            animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                            className="mb-4"
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-primary/20 to-secondary/20 mb-4">
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                ) : isDragOver ? (
                                    <Upload className="w-8 h-8 text-primary animate-bounce" />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-primary" />
                                )}
                            </div>
                        </motion.div>

                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {isUploading
                                ? "Uploading to cloud..."
                                : isDragOver
                                    ? "Drop your photo here"
                                    : "Upload Photo"}
                        </h3>

                        <p className="text-muted-foreground text-sm mb-4">
                            {isUploading
                                ? "Please wait while we upload your image"
                                : "Drag & drop or click to browse"}
                        </p>

                        <Button
                            variant="outline"
                            className="glass border-card-border cursor-pointer"
                            disabled={isUploading}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById("file-upload")?.click();
                            }}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Browse Files
                                </>
                            )}
                        </Button>
                    </label>
                </div>
            )}

            {/* Usage Info */}
            {usageData && (
                <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                        <span>
                            Usage: {usageData.usageCount}/{usageData.usageLimit}
                        </span>
                        {usageData.plan === "Free" && (
                            <Crown className="h-3 w-3 text-primary" />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Supports JPG, PNG, WEBP up to 10MB
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
                usageCount={usageData?.usageCount || 0}
                usageLimit={usageData?.usageLimit || 3}
                plan={selectedPlan}
                isAuthenticated={isAuthenticated}
            />
        </motion.div>
    );
}
