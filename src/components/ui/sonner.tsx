"use client";

import type { CSSProperties } from "react";
import {
    CircleAlert,
    CircleCheck,
    Info,
    LoaderCircle,
    TriangleAlert,
    X,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";
import home from "@/modules/home/home.module.css";
import styles from "./sonner.module.css";

export function Toaster() {
    return (
        <Sonner
            className={styles.toaster}
            position="bottom-right"
            gap={8}
            offset={{ bottom: "max(24px, env(safe-area-inset-bottom))" }}
            mobileOffset={{
                bottom: "calc(12px + env(safe-area-inset-bottom))",
                left: "max(12px, env(safe-area-inset-left))",
                right: "max(12px, env(safe-area-inset-right))",
            }}
            style={{ "--width": "360px" } as CSSProperties}
            closeButton
            icons={{
                success: <CircleCheck size={18} aria-hidden />,
                info: <Info size={18} aria-hidden />,
                warning: <TriangleAlert size={18} aria-hidden />,
                error: <CircleAlert size={18} aria-hidden />,
                loading: <LoaderCircle size={18} aria-hidden />,
                close: <X size={16} aria-hidden />,
            }}
            toastOptions={{
                unstyled: true,
                closeButtonAriaLabel: "Dismiss notification",
                classNames: {
                    toast: `${home.surface} ${styles.toast}`,
                    content: styles.content,
                    title: styles.title,
                    description: styles.description,
                    icon: styles.icon,
                    loader: styles.loader,
                    closeButton: styles.close,
                    actionButton: styles.action,
                    cancelButton: styles.cancel,
                },
            }}
        />
    );
}
