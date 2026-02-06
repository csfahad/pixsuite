"use client"

import { signOut, useSession } from "next-auth/react"
import {
    BadgeCheckIcon,
    BellIcon,
    CreditCardIcon,
    LogOutIcon,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default function UserInfo() {
    const { data: session } = useSession()

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U"
        const names = name.split(" ")
        return names.length >= 2
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase()
    }

    const handleSignOut = () => {
        signOut({ callbackUrl: "/" })
    }

    const profileImage = session?.user?.image || session?.user?.avatar || ""

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full cursor-pointer">
                    <Avatar>
                        <AvatarImage
                            src={profileImage}
                            alt={session?.user?.name || "User"}
                            referrerPolicy="no-referrer"
                        />
                        <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <BadgeCheckIcon />
                        Account
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <CreditCardIcon />
                        Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <BellIcon />
                        Notifications
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                    <LogOutIcon />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
