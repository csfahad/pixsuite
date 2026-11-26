"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
    ArrowRight,
    ChevronDown,
    CreditCardIcon,
    ImagePlus,
    LogOutIcon,
    UserRound,
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "@/components/navigation-link";
import { trackEvent, trackSignOut } from "@/lib/analytics";
import home from "@/modules/home/home.module.css";
import styles from "./user-info.module.css";

const destinations = [
    { href: "/editor", label: "Launch Editor", Icon: ImagePlus },
    { href: "/account", label: "Account", Icon: UserRound },
    { href: "/account?tab=plan", label: "Billing", Icon: CreditCardIcon },
];

function getInitials(name: string, email: string) {
    const words = name.split(/\s+/);
    const initials =
        words.length > 1
            ? words.slice(0, 2).map((word) => Array.from(word)[0])
            : Array.from(name || email.split("@")[0]).slice(0, 2);
    return initials.join("").toUpperCase() || "U";
}

export default function UserInfo({
    onMobileNavigate,
}: {
    onMobileNavigate?: () => void;
}) {
    const { data: session } = useSession();
    const [signingOut, setSigningOut] = useState(false);
    const { beginAction, finish } = useNavigationFeedback();

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
            toast.error("Couldn’t sign out", {
                description: "Try signing out again.",
            });
        }
    };

    const name = session?.user?.name?.trim() ?? "";
    const email = session?.user?.email?.trim() ?? "";
    const avatar = (
        <>
            <AvatarImage
                src={session?.user?.image || session?.user?.avatar || undefined}
                alt=""
                referrerPolicy="no-referrer"
                className="object-cover"
            />
            <AvatarFallback className={styles.initials}>
                {getInitials(name, email)}
            </AvatarFallback>
        </>
    );
    const profile = (
        <div className={styles.profile}>
            <Avatar size="lg" aria-hidden="true">
                {avatar}
            </Avatar>
            <div className={styles.identity}>
                <p className={styles.name} title={name || email || undefined}>
                    {name || email || "Your account"}
                </p>
                {name && email && (
                    <p className={styles.email} title={email}>
                        {email}
                    </p>
                )}
            </div>
        </div>
    );
    const links = destinations.map(({ href, label, Icon }) => {
        const isEditor = href === "/editor";
        const link = (
            <Link
                key={href}
                href={href}
                className={styles.item}
                data-primary={isEditor || undefined}
                onNavigate={onMobileNavigate}
                onClick={() =>
                    trackEvent("navigation_selected", {
                        destination: href,
                        source: onMobileNavigate ? "mobile_menu" : "user_menu",
                    })
                }
            >
                <Icon aria-hidden />
                {label}
                {isEditor && (
                    <ArrowRight className={styles.arrow} aria-hidden />
                )}
            </Link>
        );
        return onMobileNavigate ? (
            link
        ) : (
            <DropdownMenuItem key={href} asChild>
                {link}
            </DropdownMenuItem>
        );
    });
    const signOutLabel = signingOut ? "Signing out…" : "Sign out";

    if (onMobileNavigate) {
        return (
            <section
                aria-label="Signed-in account"
                className={`${home.surface} ${styles.mobileSection}`}
            >
                {profile}
                <div className={styles.links}>{links}</div>
                <hr className={styles.mobileSeparator} />
                <button
                    type="button"
                    className={`${styles.item} ${styles.signOut}`}
                    disabled={signingOut}
                    onClick={handleSignOut}
                >
                    <LogOutIcon aria-hidden />
                    {signOutLabel}
                </button>
            </section>
        );
    }

    return (
        <DropdownMenu
            modal={false}
            onOpenChange={(open) => trackEvent("user_menu_toggled", { open })}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    aria-label="Account menu"
                    aria-busy={signingOut}
                    variant="ghost"
                    className={`${home.surface} ${styles.trigger}`}
                >
                    <Avatar aria-hidden="true">{avatar}</Avatar>
                    <ChevronDown className={styles.chevron} aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className={`${home.surface} ${styles.menu}`}
            >
                {profile}
                <DropdownMenuSeparator className={styles.separator} />
                <DropdownMenuGroup className={styles.links}>
                    {links}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className={styles.separator} />
                <DropdownMenuItem
                    className={`${styles.item} ${styles.signOut}`}
                    disabled={signingOut}
                    onSelect={handleSignOut}
                >
                    <LogOutIcon aria-hidden />
                    {signOutLabel}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
