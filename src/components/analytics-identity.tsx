"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { syncAnalyticsIdentity } from "@/lib/analytics";

export default function AnalyticsIdentity() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const name = session?.user?.name;
    const email = session?.user?.email;
    const avatar = session?.user?.image || session?.user?.avatar;

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated") {
            if (userId) syncAnalyticsIdentity(userId, { name, email, avatar });
        } else {
            syncAnalyticsIdentity(null);
        }
    }, [status, userId, name, email, avatar]);

    return null;
}
