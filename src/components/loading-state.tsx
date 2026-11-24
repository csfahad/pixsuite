"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { Dialog } from "radix-ui";
import { BrandMark } from "@/components/brand/logo";

const loaderOrder: string[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
const activeLoader = () => loaderOrder.at(-1) ?? null;

export function LoadingState({
    label = "Loading…",
}: {
    label?: string;
    className?: string;
}) {
    const id = useId();
    const previousFocus = useRef<HTMLElement | null>(null);
    const activeId = useSyncExternalStore(subscribe, activeLoader, () => null);

    useEffect(() => {
        loaderOrder.push(id);
        notify();
        return () => {
            loaderOrder.splice(loaderOrder.indexOf(id), 1);
            notify();
        };
    }, [id]);

    return (
        <Dialog.Root open={activeId === id}>
            <Dialog.Portal>
                <Dialog.Overlay className="app-loader-backdrop" />
                <Dialog.Content
                    className="app-loader"
                    onInteractOutside={(event) => event.preventDefault()}
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onOpenAutoFocus={() => {
                        previousFocus.current =
                            document.activeElement as HTMLElement | null;
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        if (previousFocus.current?.isConnected)
                            previousFocus.current.focus({
                                preventScroll: true,
                            });
                    }}
                >
                    <div className="app-loader-content">
                        <BrandMark
                            className="app-loader-mark"
                            aria-hidden="true"
                        />
                        <Dialog.Title className="app-loader-name">
                            PixSuite
                        </Dialog.Title>
                        <Dialog.Description
                            className="app-loader-label"
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {label || "Loading…"}
                        </Dialog.Description>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function PageLoading({
    label = "Loading PixSuite…",
}: {
    label?: string;
}) {
    return <LoadingState label={label} />;
}
