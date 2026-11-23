import posthog, {
    type CaptureResult,
    type CapturedNetworkRequest,
    type PostHogConfig,
} from "posthog-js";
import type { PlanType } from "./plans";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const enabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "false";
const replayEnabled =
    process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY !== "false";
let initialized = false;
const replayOverrides = {
    sampling: true,
    linked_flag: true,
    url_trigger: true,
    event_trigger: true,
} as const;

export type AnalyticsEvent =
    | "user_identified"
    | "sign_in_started"
    | "sign_out_started"
    | "image_upload_started"
    | "image_upload_completed"
    | "image_upload_failed"
    | "image_upload_blocked"
    | "image_cleared"
    | "image_picker_opened"
    | "editor_image_loaded"
    | "editor_prompt_opened"
    | "editor_prompt_changed"
    | "editor_prompt_cancelled"
    | "editor_category_toggled"
    | "editor_credits_deducted"
    | "editor_preview_loaded"
    | "editor_comparison_adjusted"
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
    | "checkout_order_created"
    | "checkout_payment_failed"
    | "checkout_sdk_loaded"
    | "checkout_sdk_failed"
    | "upgrade_modal_closed"
    | "checkout_opened"
    | "checkout_submitted"
    | "checkout_completed"
    | "checkout_failed"
    | "checkout_cancelled"
    | "account_tab_selected"
    | "account_profile_updated"
    | "account_loaded"
    | "account_load_failed"
    | "account_profile_edit_started"
    | "account_profile_edit_cancelled"
    | "account_profile_update_failed"
    | "navigation_menu_toggled"
    | "user_menu_toggled"
    | "navigation_selected"
    | "theme_changed";

type EventProperties = Record<string, unknown>;

const redirectEvents = new Set<AnalyticsEvent>([
    "sign_in_started",
    "sign_out_started",
    "checkout_completed",
    "checkout_submitted",
    "checkout_failed",
    "checkout_cancelled",
    "checkout_payment_failed",
]);

const credentialKey =
    /^(?:authorization|proxyauthorization|cookie|setcookie|password|passwd|csrftoken|accesstoken|refreshtoken|idtoken|clientsecret|privatekey|apikey|secret|signature|razorpaysignature|token)$/i;
const isCredentialKey = (key: string) =>
    credentialKey.test(key.replace(/[-_]/g, ""));

export function analyticsUrl(value: string): string {
    try {
        const url = new URL(value, "https://pixsuite.csfahad.in");
        for (const key of Array.from(url.searchParams.keys())) {
            if (isCredentialKey(key)) url.searchParams.delete(key);
        }
        url.username = "";
        url.password = "";
        return url.toString();
    } catch {
        return "";
    }
}

function analyticsProperties(value: unknown, key = ""): unknown {
    if (typeof value === "string" && /(?:url|referrer|href)$/i.test(key)) {
        return analyticsUrl(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => analyticsProperties(item, key));
    }
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
        Object.entries(value)
            .filter(([name]) => !isCredentialKey(name))
            .map(([name, item]) => [name, analyticsProperties(item, name)]),
    );
}

export function sanitizeAnalyticsEvent(
    event: CaptureResult | null,
): CaptureResult | null {
    if (!event) return null;
    const ingestionToken = event.properties.token;
    event.properties = analyticsProperties(
        event.properties,
    ) as CaptureResult["properties"];
    if (
        typeof ingestionToken === "string" &&
        ingestionToken === projectToken?.trim()
    ) {
        event.properties.token = ingestionToken;
    }
    if (event.$set)
        event.$set = analyticsProperties(event.$set) as CaptureResult["$set"];
    if (event.$set_once)
        event.$set_once = analyticsProperties(
            event.$set_once,
        ) as CaptureResult["$set_once"];
    return event;
}

export function captureAnalyticsNetworkRequest(
    request: CapturedNetworkRequest,
): CapturedNetworkRequest {
    const captured = { ...request, name: analyticsUrl(request.name) };
    for (const key of ["requestHeaders", "responseHeaders"] as const) {
        if (captured[key]) {
            captured[key] = analyticsProperties(
                captured[key],
            ) as (typeof captured)[typeof key];
        }
    }
    for (const key of ["requestBody", "responseBody"] as const) {
        const body = captured[key];
        if (!body) continue;
        try {
            captured[key] = JSON.stringify(
                analyticsProperties(JSON.parse(body)),
            );
        } catch {
            const headers =
                captured[
                    key === "requestBody" ? "requestHeaders" : "responseHeaders"
                ];
            const contentType = Object.entries(headers ?? {}).find(
                ([name]) => name.toLowerCase() === "content-type",
            )?.[1];
            if (
                contentType?.includes("multipart/form-data") &&
                /boundary=/i.test(contentType) &&
                body.includes("\n")
            ) {
                captured[key] = body.replace(
                    /(name="([^"]+)"[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n)([\s\S]*?)(?=\r?\n--)/g,
                    (part, prefix, name) =>
                        isCredentialKey(name)
                            ? `${prefix}[credential removed]`
                            : part,
                );
            } else if (
                contentType?.includes("application/x-www-form-urlencoded") ||
                contentType?.includes("multipart/form-data")
            ) {
                const form = new URLSearchParams(body);
                for (const name of Array.from(form.keys())) {
                    if (isCredentialKey(name)) form.delete(name);
                }
                captured[key] = form.toString();
            }
        }
    }
    return captured;
}

export function getAnalyticsConfig(): Partial<PostHogConfig> {
    return {
        api_host: "/ingest",
        ui_host: "https://us.posthog.com",
        defaults: "2026-08-30",
        debug: process.env.NODE_ENV === "development",
        capture_pageview: "history_change",
        capture_pageleave: true,
        disable_capture_url_hashes: false,
        mask_personal_data_properties: false,
        autocapture: {
            capture_copied_text: true,
            capture_value_css_selector_allowlist: [
                "input",
                "textarea",
                "select",
            ],
        },
        capture_heatmaps: true,
        capture_dead_clicks: true,
        disable_surveys: true,
        disable_conversations: true,
        disable_product_tours: true,
        person_profiles: "identified_only",
        opt_out_useragent_filter: process.env.NODE_ENV !== "production",
        mask_all_text: false,
        mask_all_element_attributes: false,
        disable_session_recording: !replayEnabled,
        enable_recording_console_log: true,
        capture_exceptions: true,
        capture_performance: { web_vitals: true, network_timing: true },
        session_recording: {
            maskAllInputs: false,
            maskAllElementAttributes: false,
            blockClass: /$^/,
            ignoreClass: /$^/,
            maskTextClass: /$^/,
            // Explicit no-match selectors override project settings. null would
            // fall back to the project's masking and blocking selectors.
            blockSelector: ":not(*)",
            maskTextSelector: ":not(*)",
            maskInputOptions: { password: true },
            recordHeaders: true,
            recordBody: true,
            streamNetworkBody: true,
            captureJsonLd: true,
            collectFonts: true,
            inlineStylesheet: true,
            recordCrossOriginIframes: true,
            captureCanvas: {
                recordCanvas: true,
                canvasFps: 4,
                canvasQuality: "1",
            },
            maskCapturedNetworkRequestFn: captureAnalyticsNetworkRequest,
        },
        before_send: sanitizeAnalyticsEvent,
        get_current_url: analyticsUrl,
        loaded: (client) => {
            // Remove the old custom label from returning browsers' persistence.
            client.unregister("environment");
            client.register({ app: "pixsuite" });
            if (replayEnabled) client.startSessionRecording(replayOverrides);
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

export function getAnalyticsSessionId(): string | undefined {
    if (!canCapture()) return;
    try {
        return posthog.get_session_id();
    } catch {
        /* Checkout must work even when analytics is unavailable. */
    }
}

export function resetAnalyticsIdentity(): void {
    if (!canCapture()) return;
    try {
        posthog.reset();
        posthog.register({ app: "pixsuite" });
        if (replayEnabled) posthog.startSessionRecording(replayOverrides);
    } catch {
        /* Authentication must work even when analytics is unavailable. */
    }
}

export function updateAnalyticsProfile(properties: EventProperties): void {
    if (!canCapture()) return;
    try {
        if (posthog.get_property("pixsuite_user_id")) {
            posthog.setPersonProperties(properties);
        }
    } catch {
        /* Profile edits must not depend on analytics. */
    }
}

export function syncAnalyticsIdentity(
    userId: string | null,
    profile: EventProperties = {},
): void {
    if (!canCapture()) return;
    try {
        const previousUserId = posthog.get_property("pixsuite_user_id");
        if (!userId) {
            if (previousUserId) resetAnalyticsIdentity();
            return;
        }
        if (previousUserId === userId) {
            updateAnalyticsProfile(profile);
            return;
        }
        // Never merge two accounts that happen to use the same browser.
        if (previousUserId) resetAnalyticsIdentity();
        posthog.identify(userId, { auth_provider: "google", ...profile });
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
