"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useEffect, useRef, type ComponentProps, type RefObject } from "react";
import { useNavigationFeedback } from "@/components/navigation-feedback";

function LinkCompletion({ token }: { token: RefObject<number> }) {
    const { pending } = useLinkStatus();
    const { finish } = useNavigationFeedback();
    const sawPending = useRef(false);
    useEffect(() => {
        if (pending) sawPending.current = true;
        else if (sawPending.current) {
            sawPending.current = false;
            finish(token.current);
        }
    }, [pending, finish, token]);
    useEffect(() => () => finish(token.current), [finish, token]);
    return null;
}

export default function NavigationLink({
    href,
    children,
    onNavigate,
    ...props
}: ComponentProps<typeof NextLink>) {
    const { begin } = useNavigationFeedback();
    const token = useRef(0);
    return (
        <NextLink
            href={href}
            {...props}
            onNavigate={(event) => {
                let cancelled = false;
                onNavigate?.({
                    preventDefault() {
                        cancelled = true;
                        event.preventDefault();
                    },
                });
                if (cancelled) return;
                const target =
                    typeof href === "string" ? href : (href.pathname ?? "/");
                token.current = begin(target);
            }}
        >
            {children}
            <LinkCompletion token={token} />
        </NextLink>
    );
}
