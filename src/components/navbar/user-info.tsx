"use client";

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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { trackEvent, trackSignOut } from "@/lib/analytics";

export default function UserInfo() {
    const { data: session } = useSession();

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        const names = name.split(" ");
        return names.length >= 2
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    const handleSignOut = () => {
        trackSignOut();
        signOut({ callbackUrl: "/" });
    };

    const profileImage = session?.user?.image || session?.user?.avatar || "";

    return (
        <DropdownMenu
            onOpenChange={(open) => trackEvent("user_menu_toggled", { open })}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full cursor-pointer"
                >
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
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                    <LogOutIcon />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
