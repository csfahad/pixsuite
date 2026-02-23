"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
    User,
    CreditCard,
    Mail,
    Calendar,
    Clock,
    Shield,
    Sparkles,
    Zap,
    Crown,
    Star,
    ArrowUpRight,
    Check,
    Loader2,
    Pencil,
    X,
    ChevronRight,
    DollarSign,
    CalendarCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type UserData = {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    plan: "Free" | "Lite" | "Pro";
    usageCount: number;
    usageLimit: number;
    subscriptionExpiresAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type Tab = "account" | "plan";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "plan", label: "Plan & Billing", icon: CreditCard },
];

const planConfig = {
    Free: {
        icon: Star,
        color: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
        label: "Free Plan",
        description: "Basic access with limited edits",
        price: "$0",
        period: "/forever",
    },
    Lite: {
        icon: Zap,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        label: "Lite Plan",
        description: "1,000 edits/month with all AI features",
        price: "$9",
        period: "/month",
    },
    Pro: {
        icon: Crown,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        label: "Pro Plan",
        description: "Unlimited edits with priority support",
        price: "$29",
        period: "/month",
    },
};

export default function AccountPage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<Tab>(
        (searchParams.get("tab") as Tab) || "account"
    );
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (sessionStatus === "unauthenticated") {
            router.replace("/");
        }
    }, [sessionStatus, router]);

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/account");
            if (res.status === 401) {
                router.replace("/");
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setUserData(data);
                setNewName(data.name);
            }
        } catch (err) {
            console.error("Failed to fetch account data:", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchUserData();
        }
    }, [sessionStatus, fetchUserData]);

    useEffect(() => {
        const tabParam = searchParams.get("tab") as Tab;
        if (tabParam && (tabParam === "account" || tabParam === "plan")) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
    };

    const handleSaveName = async () => {
        if (!newName.trim() || newName.trim() === userData?.name) {
            setEditingName(false);
            return;
        }

        setSaving(true);
        setSaveError(null);
        try {
            const res = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() }),
            });

            if (res.ok) {
                const updated = await res.json();
                setUserData(updated);
                setEditingName(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2500);
            } else {
                const err = await res.json();
                setSaveError(err.error || "Failed to update name");
            }
        } catch {
            setSaveError("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length >= 2
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatRelativeDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    const usagePercentage = userData
        ? Math.min((userData.usageCount / userData.usageLimit) * 100, 100)
        : 0;

    const creditsRemaining = userData
        ? Math.max(userData.usageLimit - userData.usageCount, 0)
        : 0;

    const isSubscriptionActive = userData?.subscriptionExpiresAt
        ? new Date(userData.subscriptionExpiresAt) > new Date()
        : false;

    if (sessionStatus === "loading" || sessionStatus === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                    <Loader2 className="h-8 w-8 text-muted-foreground" />
                </motion.div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background pt-28 pb-12">
                {/* Page header */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl font-bold text-foreground">
                            Account Settings
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your account settings and billing preferences
                        </p>
                    </motion.div>
                </div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar */}
                        <motion.aside
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="md:w-[220px] shrink-0"
                        >
                            {/* Mobile: horizontal tabs */}
                            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                                {tabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap cursor-pointer
                                                ${isActive
                                                    ? "text-foreground"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-muted rounded-lg"
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 380,
                                                        damping: 30,
                                                    }}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center gap-3">
                                                <tab.icon className="h-4 w-4" />
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </motion.aside>

                        {/* Content */}
                        <motion.main
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex-1 min-w-0"
                        >
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        {/* Skeleton */}
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-32 rounded-xl bg-muted/50 animate-pulse"
                                            />
                                        ))}
                                    </motion.div>
                                ) : activeTab === "account" ? (
                                    <AccountTab
                                        key="account"
                                        userData={userData}
                                        editingName={editingName}
                                        setEditingName={setEditingName}
                                        newName={newName}
                                        setNewName={setNewName}
                                        saving={saving}
                                        saveSuccess={saveSuccess}
                                        saveError={saveError}
                                        setSaveError={setSaveError}
                                        handleSaveName={handleSaveName}
                                        getInitials={getInitials}
                                        formatDate={formatDate}
                                        formatRelativeDate={formatRelativeDate}
                                        profileImage={
                                            session?.user?.image ||
                                            (session as any)?.user?.avatar ||
                                            ""
                                        }
                                    />
                                ) : (
                                    <PlanTab
                                        key="plan"
                                        userData={userData}
                                        usagePercentage={usagePercentage}
                                        creditsRemaining={creditsRemaining}
                                        isSubscriptionActive={isSubscriptionActive}
                                        formatDate={formatDate}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.main>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

function AccountTab({
    userData,
    editingName,
    setEditingName,
    newName,
    setNewName,
    saving,
    saveSuccess,
    saveError,
    setSaveError,
    handleSaveName,
    getInitials,
    formatDate,
    formatRelativeDate,
    profileImage,
}: {
    userData: UserData | null;
    editingName: boolean;
    setEditingName: (v: boolean) => void;
    newName: string;
    setNewName: (v: string) => void;
    saving: boolean;
    saveSuccess: boolean;
    saveError: string | null;
    setSaveError: (v: string | null) => void;
    handleSaveName: () => Promise<void>;
    getInitials: (name: string | null | undefined) => string;
    formatDate: (d: string) => string;
    formatRelativeDate: (d: string) => string;
    profileImage: string;
}) {
    if (!userData) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Profile header card */}
            <Card className="border-border/50 overflow-hidden">
                <div className="h-24 bg-linear-to-br from-primary/10 via-primary/5 to-transparent" />
                <CardContent className="relative pt-0 -mt-12 px-6 pb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                                <AvatarImage
                                    src={profileImage}
                                    alt={userData.name}
                                    referrerPolicy="no-referrer"
                                />
                                <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                                    {getInitials(userData.name)}
                                </AvatarFallback>
                            </Avatar>
                        </motion.div>
                        <div className="flex-1 pt-2 sm:pt-0 sm:pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-semibold text-foreground">
                                    {userData.name}
                                </h2>
                                {userData.plan !== "Free" && (
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${planConfig[userData.plan].color} ${planConfig[userData.plan].border}`}
                                    >
                                        {userData.plan}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {userData.email}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Personal information */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Personal Information
                </h3>

                <Card className="border-border/50">
                    <CardContent className="p-0 divide-y divide-border/50">
                        {/* Name (editable) */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Full Name
                                    </Label>
                                    {editingName ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                value={newName}
                                                onChange={(e) => {
                                                    setNewName(e.target.value);
                                                    setSaveError(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveName();
                                                    if (e.key === "Escape") {
                                                        setEditingName(false);
                                                        setNewName(userData.name);
                                                    }
                                                }}
                                                className="h-8 text-sm max-w-[240px]"
                                                autoFocus
                                                disabled={saving}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSaveName}
                                                disabled={saving}
                                                className="h-8 px-3 cursor-pointer"
                                            >
                                                {saving ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Check className="h-3 w-3" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingName(false);
                                                    setNewName(userData.name);
                                                    setSaveError(null);
                                                }}
                                                className="h-8 px-2 cursor-pointer"
                                                disabled={saving}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {userData.name}
                                        </p>
                                    )}
                                    <AnimatePresence>
                                        {saveError && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-xs text-destructive mt-1"
                                            >
                                                {saveError}
                                            </motion.p>
                                        )}
                                        {saveSuccess && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-xs text-emerald-500 mt-1 flex items-center gap-1"
                                            >
                                                <Check className="h-3 w-3" />
                                                Name updated successfully
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            {!editingName && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => setEditingName(true)}
                                            className="shrink-0 cursor-pointer"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit name</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center px-6 py-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Email Address
                                    </Label>
                                    <p className="text-sm font-medium text-foreground">
                                        {userData.email}
                                    </p>
                                </div>
                            </div>
                            <Badge
                                variant="secondary"
                                className="text-[10px] shrink-0"
                            >
                                Verified
                            </Badge>
                        </div>

                        <Separator className="opacity-0" />

                        {/* Member since */}
                        <div className="flex items-center px-6 py-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Calendar className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Member Since
                                    </Label>
                                    <p className="text-sm font-medium text-foreground">
                                        {formatDate(userData.createdAt)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Last updated */}
                        <div className="flex items-center px-6 py-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Last Updated
                                    </Label>
                                    <p className="text-sm font-medium text-foreground">
                                        {formatRelativeDate(userData.updatedAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}

function PlanTab({
    userData,
    usagePercentage,
    creditsRemaining,
    isSubscriptionActive,
    formatDate,
}: {
    userData: UserData | null;
    usagePercentage: number;
    creditsRemaining: number;
    isSubscriptionActive: boolean;
    formatDate: (d: string) => string;
}) {
    if (!userData) return null;

    const plan = planConfig[userData.plan];
    const PlanIcon = plan.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Current plan card */}
            <Card className={`border-border/50 overflow-hidden`}>
                <div
                    className={`h-2 ${userData.plan === "Pro"
                        ? "bg-linear-to-r from-amber-500 to-orange-500"
                        : userData.plan === "Lite"
                            ? "bg-linear-to-r from-blue-500 to-cyan-500"
                            : "bg-linear-to-r from-muted-foreground/30 to-muted-foreground/10"
                        }`}
                />
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 10,
                                }}
                                className={`h-14 w-14 rounded-xl ${plan.bg} flex items-center justify-center`}
                            >
                                <PlanIcon
                                    className={`h-7 w-7 ${plan.color}`}
                                />
                            </motion.div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {plan.label}
                                    </h3>
                                    {isSubscriptionActive && (
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] text-emerald-500 border-emerald-500/30"
                                        >
                                            Active
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {plan.description}
                                </p>
                            </div>
                        </div>
                        {userData.plan !== "Pro" && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 cursor-pointer gap-1"
                                onClick={() => {
                                    const el = document.getElementById("pricing");
                                    if (el) {
                                        el.scrollIntoView({ behavior: "smooth" });
                                    } else {
                                        window.location.href = "/#pricing";
                                    }
                                }}
                            >
                                Upgrade
                                <ArrowUpRight className="h-3 w-3" />
                            </Button>
                        )}
                    </div>

                    {/* Plan details */}
                    <Separator className="my-5" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Plan price */}
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan Amount</p>
                                <p className="text-sm font-semibold text-foreground">
                                    {plan.price}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {plan.period}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Subscribed date */}
                        {userData.subscriptionExpiresAt && (
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <CalendarCheck className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Subscribed On</p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {formatDate(userData.createdAt)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Renewal / expiry */}
                        {userData.subscriptionExpiresAt && (
                            <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isSubscriptionActive ? "bg-emerald-500/10" : "bg-destructive/10"
                                    }`}>
                                    <Calendar className={`h-4 w-4 ${isSubscriptionActive ? "text-emerald-500" : "text-destructive"
                                        }`} />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                        {isSubscriptionActive ? "Expires On" : "Expired On"}
                                    </p>
                                    <p className={`text-sm font-semibold ${isSubscriptionActive ? "text-foreground" : "text-destructive"
                                        }`}>
                                        {formatDate(userData.subscriptionExpiresAt)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Credits usage */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Credit Usage
                </h3>
                <Card className="border-border/50">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Credits Used
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    {userData.usageCount.toLocaleString()}
                                    <span className="text-base font-normal text-muted-foreground">
                                        {" "}
                                        / {userData.usageLimit.toLocaleString()}
                                    </span>
                                </p>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold ${usagePercentage >= 90
                                            ? "bg-destructive/10 text-destructive"
                                            : usagePercentage >= 70
                                                ? "bg-amber-500/10 text-amber-500"
                                                : "bg-emerald-500/10 text-emerald-500"
                                            }`}
                                    >
                                        {Math.round(usagePercentage)}%
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {creditsRemaining.toLocaleString()} credits remaining
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="space-y-2">
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                style={{ transformOrigin: "left" }}
                            >
                                <Progress
                                    value={usagePercentage}
                                    className="h-2.5"
                                />
                            </motion.div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {creditsRemaining.toLocaleString()} remaining
                                </span>
                                <span>
                                    {userData.usageLimit.toLocaleString()} total
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick stats */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Quick Stats
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            label: "Total Edits",
                            value: userData.usageCount.toLocaleString(),
                            icon: Sparkles,
                            color: "text-primary",
                            bg: "bg-primary/10",
                        },
                        {
                            label: "Credits Left",
                            value: creditsRemaining.toLocaleString(),
                            icon: Zap,
                            color:
                                creditsRemaining < 5
                                    ? "text-destructive"
                                    : "text-emerald-500",
                            bg:
                                creditsRemaining < 5
                                    ? "bg-destructive/10"
                                    : "bg-emerald-500/10",
                        },
                        {
                            label: "Plan Tier",
                            value: userData.plan,
                            icon: PlanIcon,
                            color: plan.color,
                            bg: plan.bg,
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            whileHover={{ y: -2 }}
                        >
                            <Card className="border-border/50 h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}
                                        >
                                            <stat.icon
                                                className={`h-4 w-4 ${stat.color}`}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                            {stat.label}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {stat.value}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Upgrade CTA */}
            {userData.plan !== "Pro" && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card className="border-border/50 overflow-hidden">
                        <div className="bg-linear-to-br from-primary/5 via-transparent to-primary/5 p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Crown className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">
                                            {userData.plan === "Free"
                                                ? "Unlock more with Lite or Pro"
                                                : "Upgrade to Pro for unlimited edits"}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            Get access to all features and higher
                                            limits
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    className="cursor-pointer gap-1 shrink-0"
                                    onClick={() => {
                                        window.location.href = "/#pricing";
                                    }}
                                >
                                    View Plans
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </motion.div>
    );
}
