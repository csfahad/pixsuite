import posthog, { type CaptureResult, type PostHogConfig } from "posthog-js";
import type { PlanType } from "./plans";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const enabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "false";
const replayEnabled =
    process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY !== "false";
let initialized = false;

export type AnalyticsEvent =
    | "user_identified"
    | "sign_in_started"
    | "sign_out_started"
    | "image_upload_started"
    | "image_upload_completed"
    | "image_upload_failed"
    | "image_upload_blocked"
    | "image_cleared"
    | "editor_tool_selected"
    | "editor_tool_blocked"
    | "editor_effect_removed"
    | "editor_prompt_submitted"
    | "editor_processing_started"
    | "editor_processing_completed"
    | "editor_processing_failed"
    | "editor_processing_unconfirmed"
    | "image_export_started"
    | "image_export_completed"
    | "image_export_failed"
    | "editor_comparison_toggled"
    | "plan_selected"
    | "upgrade_modal_viewed"
    | "checkout_started"
    | "checkout_opened"
    | "checkout_submitted"
    | "checkout_completed"
    | "checkout_failed"
    | "checkout_cancelled"
    | "account_tab_selected"
    | "account_profile_updated"
    | "theme_changed";

type EventProperties = Record<
    string,
    string | number | boolean | string[] | undefined
>;

const redirectEvents = new Set<AnalyticsEvent>([
    "sign_in_started",
    "sign_out_started",
    "checkout_completed",
    "checkout_submitted",
    "checkout_failed",
    "checkout_cancelled",
]);

export function analyticsUrl(value: string): string {
    try {
        const url = new URL(value, "https://pixsuite.csfahad.in");
        url.search = "";
        url.hash = "";
        url.username = "";
        url.password = "";
        return url.toString();
    } catch {
        return "";
    }
}

export function sanitizeAnalyticsEvent(
    event: CaptureResult | null,
): CaptureResult | null {
    if (!event) return null;
    const scrub = (value: unknown, key = ""): unknown => {
        if (typeof value === "string") {
            return /(?:url|referrer|href)$/i.test(key) ||
                /^https?:\/\//i.test(value)
                ? analyticsUrl(value)
                : value;
        }
        if (Array.isArray(value)) return value.map((item) => scrub(item));
        if (value && typeof value === "object") {
            const result: Record<string, unknown> = {};
            for (const [name, item] of Object.entries(value)) {
                const safeName = /^https?:\/\//i.test(name)
                    ? analyticsUrl(name)
                    : name;
                const safeItem = scrub(item, name);
                const previous = result[safeName];
                result[safeName] =
                    Array.isArray(previous) && Array.isArray(safeItem)
                        ? [...previous, ...safeItem]
                        : safeItem;
            }
            return result;
        }
        return value;
    };
    event.properties = scrub(event.properties) as CaptureResult["properties"];
    if (event.$set) event.$set = scrub(event.$set) as CaptureResult["$set"];
    if (event.$set_once)
        event.$set_once = scrub(event.$set_once) as CaptureResult["$set_once"];
    return event;
}

export function getAnalyticsConfig(): Partial<PostHogConfig> {
    return {
        api_host: "/ingest",
        ui_host: "https://us.posthog.com",
        defaults: "2026-08-30",
        debug: false,
        capture_pageview: "history_change",
        capture_pageleave: true,
        autocapture: { capture_copied_text: false },
        disable_surveys: true,
        disable_conversations: true,
        disable_product_tours: true,
        person_profiles: "identified_only",
        opt_out_useragent_filter: process.env.NODE_ENV !== "production",
        mask_all_text: true,
        mask_all_element_attributes: true,
        disable_session_recording: !replayEnabled,
        enable_recording_console_log: false,
        capture_exceptions: false,
        capture_performance: { web_vitals: true, network_timing: false },
        session_recording: {
            maskAllInputs: true,
            blockClass: "ph-no-capture",
            blockSelector:
                '[data-ph-private], .razorpay-container, iframe, canvas, input[type="file"], [data-slot="avatar"], [data-sonner-toast]',
            maskTextSelector: '[data-ph-mask], [contenteditable="true"]',
            recordHeaders: false,
            recordBody: false,
            captureJsonLd: false,
            recordCrossOriginIframes: false,
            captureCanvas: { recordCanvas: false },
            maskCapturedNetworkRequestFn: (request) => {
                if (
                    Object.keys(request).length === 1 &&
                    typeof request.name === "string"
                ) {
                    return { ...request, name: analyticsUrl(request.name) };
                }
                return null;
            },
        },
        before_send: sanitizeAnalyticsEvent,
        get_current_url: analyticsUrl,
        loaded: (client) => {
            client.register({
                app: "pixsuite",
                environment: process.env.NODE_ENV,
            });
        },
    };
}

export function initializeAnalytics(): void {
    if (
        typeof window === "undefined" ||
        !enabled ||
        !projectToken ||
        initialized
    )
        return;
    try {
        // Avoid duplicate initialization and pageviews during development hot reloads.
        if (posthog.config?.token !== projectToken) {
            posthog.init(projectToken, getAnalyticsConfig());
        }
        initialized = true;
    } catch {
        // Analytics must never interrupt editing, authentication, or payments.
    }
}

function canCapture(): boolean {
    return (
        typeof window !== "undefined" &&
        initialized &&
        enabled &&
        Boolean(projectToken)
    );
}

export function trackEvent(
    event: AnalyticsEvent,
    properties: EventProperties = {},
): void {
    if (!canCapture()) return;
    try {
        if (redirectEvents.has(event)) {
            posthog.capture(event, properties, {
                send_instantly: true,
                transport: "sendBeacon",
            });
        } else {
            posthog.capture(event, properties);
        }
    } catch {
        // Keep analytics failures independent of product actions.
    }
}

export function resetAnalyticsIdentity(): void {
    if (!canCapture()) return;
    try {
        posthog.reset();
        posthog.register({
            app: "pixsuite",
            environment: process.env.NODE_ENV,
        });
    } catch {
        /* Authentication must work even when analytics is unavailable. */
    }
}

export function syncAnalyticsIdentity(userId: string | null): void {
    if (!canCapture()) return;
    try {
        const previousUserId = posthog.get_property("pixsuite_user_id");
        if (!userId) {
            if (previousUserId) resetAnalyticsIdentity();
            return;
        }
        if (previousUserId === userId) return;
        // Never merge two accounts that happen to use the same browser.
        if (previousUserId) resetAnalyticsIdentity();
        posthog.identify(userId, { auth_provider: "google" });
        posthog.register({ pixsuite_user_id: userId, is_authenticated: true });
        trackEvent("user_identified", { auth_provider: "google" });
    } catch {
        /* Identity synchronization is best effort. */
    }
}

export function setAnalyticsPlan(plan: PlanType): void {
    if (!canCapture()) return;
    try {
        posthog.register({ plan });
        if (posthog.get_property("pixsuite_user_id"))
            posthog.setPersonProperties({ plan });
    } catch {
        /* Plan changes must not depend on analytics. */
    }
}

export function trackSignOut(): void {
    trackEvent("sign_out_started");
    resetAnalyticsIdentity();
}
