"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { syncAnalyticsIdentity } from "@/lib/analytics";

export default function AnalyticsIdentity() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;

    useEffect(() => {
        if (status === "loading") return;
        if (status === "authenticated") {
            if (userId) syncAnalyticsIdentity(userId);
        } else {
            syncAnalyticsIdentity(null);
        }
    }, [status, userId]);

    return null;
}
