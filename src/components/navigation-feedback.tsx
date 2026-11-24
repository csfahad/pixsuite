"use client";

import {
    Suspense,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/loading-state";

type Router = ReturnType<typeof useRouter>;
type NavigateOptions = Parameters<Router["push"]>[1];
type NavigationContextValue = {
    begin: (href: string) => number;
    finish: (token: number) => void;
    beginAction: (label: string) => number;
    complete: () => void;
    navigate: (
        href: string,
        options?: NavigateOptions,
        replace?: boolean,
    ) => void;
};
const NavigationContext = createContext<NavigationContextValue | null>(null);

function routeLabel(href: string) {
    const pathname = new URL(href, "https://pixsuite.csfahad.in").pathname;
    const names: Record<string, string> = {
        "/": "PixSuite",
        "/editor": "editor",
        "/account": "account",
        "/signin": "sign-in",
        "/terms": "terms",
        "/privacy": "privacy policy",
    };
    return `Opening ${names[pathname] ?? "page"}…`;
}

function RouteCompletion({ complete }: { complete: () => void }) {
    const pathname = usePathname();
    const search = useSearchParams().toString();
    useEffect(() => complete(), [pathname, search, complete]);
    return null;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [statusText, setStatusText] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const token = useRef(0);
    const transitionToken = useRef(0);
    const sawTransition = useRef(false);

    const begin = useCallback((href: string) => {
        const next = new URL(href, window.location.href);
        const current = new URL(window.location.href);
        if (
            next.origin !== current.origin ||
            next.pathname + next.search === current.pathname + current.search
        )
            return 0;
        if (["/", "/terms", "/privacy"].includes(next.pathname)) {
            ++token.current;
            setStatusText(null);
            return 0;
        }
        const nextToken = ++token.current;
        setStatusText(routeLabel(href));
        return nextToken;
    }, []);
    const beginAction = useCallback((label: string) => {
        const nextToken = ++token.current;
        setStatusText(label);
        return nextToken;
    }, []);
    const finish = useCallback((finishedToken: number) => {
        if (finishedToken && finishedToken === token.current)
            setStatusText(null);
    }, []);
    const complete = useCallback(() => setStatusText(null), []);
    const navigate = useCallback(
        (href: string, options?: NavigateOptions, replace = false) => {
            transitionToken.current = begin(href);
            startTransition(() =>
                replace
                    ? router.replace(href, options)
                    : router.push(href, options),
            );
        },
        [router, begin],
    );
    useEffect(() => {
        if (isPending) sawTransition.current = true;
        else if (sawTransition.current) {
            sawTransition.current = false;
            finish(transitionToken.current);
        }
    }, [isPending, finish]);
    const value = useMemo(
        () => ({ begin, finish, navigate, beginAction, complete }),
        [begin, finish, navigate, beginAction, complete],
    );

    return (
        <NavigationContext.Provider value={value}>
            <Suspense fallback={null}>
                <RouteCompletion complete={complete} />
            </Suspense>
            <div data-app-surface>{children}</div>
            {statusText && <LoadingState label={statusText} />}
        </NavigationContext.Provider>
    );
}

export function useNavigationFeedback() {
    const context = useContext(NavigationContext);
    if (!context)
        throw new Error("Navigation feedback requires NavigationProvider");
    return context;
}

export function useAppRouter(): Router {
    const router = useRouter();
    const { navigate } = useNavigationFeedback();
    return useMemo(
        () => ({
            ...router,
            push: (href: string, options?: NavigateOptions) =>
                navigate(href, options),
            replace: (href: string, options?: NavigateOptions) =>
                navigate(href, options, true),
        }),
        [router, navigate],
    );
}
