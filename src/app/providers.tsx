"use client";
import { SessionProvider } from "next-auth/react";
import AnalyticsIdentity from "@/components/analytics-identity";
import { NavigationProvider } from "@/components/navigation-feedback";

export default function Provider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <NavigationProvider>
                <AnalyticsIdentity />
                {children}
            </NavigationProvider>
        </SessionProvider>
    );
}
