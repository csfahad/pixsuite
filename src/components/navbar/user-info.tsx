"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
    BadgeCheckIcon,
    CreditCardIcon,
    ImagePlus,
    LogOutIcon,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigationFeedback } from "@/components/navigation-feedback";
import { LoadingState } from "@/components/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "@/components/navigation-link";
import { trackEvent, trackSignOut } from "@/lib/analytics";

export default function UserInfo() {
    const { data: session, status: sessionStatus } = useSession();
    const [signingOut, setSigningOut] = useState(false);
    const { beginAction, finish } = useNavigationFeedback();

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length >= 2
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    const handleSignOut = async () => {
        if (signingOut) return;
        setSigningOut(true);
        trackSignOut();
        const token = beginAction("Signing out…");
        try {
            await signOut({ callbackUrl: "/" });
        } catch {
            finish(token);
            setSigningOut(false);
            toast.error("Couldn’t sign out. Try again.");
        }
    };

    const profileImage = session?.user?.image || session?.user?.avatar || "";

    return (
        <DropdownMenu
            modal={false}
            onOpenChange={(open) => trackEvent("user_menu_toggled", { open })}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    aria-busy={signingOut || sessionStatus === "loading"}
                    variant="ghost"
                    size="icon"
                    className="rounded-full cursor-pointer"
                >
                    {signingOut ? (
                        <LoadingState label="" />
                    ) : (
                        <Avatar>
                            <AvatarImage
                                src={profileImage}
                                alt={session?.user?.name || "User"}
                                referrerPolicy="no-referrer"
                            />
                            <AvatarFallback>
                                {getInitials(session?.user?.name)}
                            </AvatarFallback>
                        </Avatar>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <Link
                    href="/editor"
                    onClick={() =>
                        trackEvent("navigation_selected", {
                            destination: "/editor",
                            source: "user_menu",
                        })
                    }
                >
                    <DropdownMenuItem>
                        <ImagePlus />
                        Launch Editor
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </Link>
                <DropdownMenuGroup>
                    <Link
                        href="/account"
                        onClick={() =>
                            trackEvent("navigation_selected", {
                                destination: "/account",
                                source: "user_menu",
                            })
                        }
                    >
                        <DropdownMenuItem>
                            <BadgeCheckIcon />
                            Account
                        </DropdownMenuItem>
                    </Link>
                    <Link
                        href="/account?tab=plan"
                        onClick={() =>
                            trackEvent("navigation_selected", {
                                destination: "/account?tab=plan",
                                source: "user_menu",
                            })
                        }
                    >
                        <DropdownMenuItem>
                            <CreditCardIcon />
                            Billing
                        </DropdownMenuItem>
                    </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    disabled={signingOut}
                    onClick={handleSignOut}
                >
                    <LogOutIcon />
                    {signingOut ? "Signing out…" : "Sign Out"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
