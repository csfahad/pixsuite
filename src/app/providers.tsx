"use client";
import { SessionProvider } from "next-auth/react";
import AnalyticsIdentity from "@/components/analytics-identity";

export default function Provider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AnalyticsIdentity />
            {children}
        </SessionProvider>
    );
}
