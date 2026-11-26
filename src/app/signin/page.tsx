import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/loading-state";
import SignInScreen from "./sign-in-screen";

export const metadata: Metadata = {
    title: "Sign in | PixSuite",
};

export default function SignInPage() {
    return (
        <Suspense fallback={<PageLoading label="Loading sign-in…" />}>
            <SignInScreen />
        </Suspense>
    );
}
