"use client";

import {
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowRight,
    CalendarDays,
    CircleAlert,
    CircleCheck,
    Clock3,
    CreditCard,
    ImagePlus,
    Mail,
    Pencil,
    UserRound,
    Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageLoading } from "@/components/loading-state";
import { useAppRouter } from "@/components/navigation-feedback";
import {
    setAnalyticsPlan,
    trackEvent,
    updateAnalyticsProfile,
} from "@/lib/analytics";
import { isPaidPlan, PLAN_PRICES_PAISE, type PlanType } from "@/lib/plans";
import home from "@/modules/home/home.module.css";
import styles from "./account.module.css";

type UserData = {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    plan: PlanType;
    creditsUsed: number;
    creditLimit: number;
    uploadCount: number;
    uploadLimit: number;
    subscriptionExpiresAt: string | null;
    createdAt: string;
    updatedAt: string;
};

const sections = [
    { id: "account", label: "Profile", href: "/account", Icon: UserRound },
    {
        id: "plan",
        label: "Plan & Billing",
        href: "/account?tab=plan",
        Icon: CreditCard,
    },
] as const;

const numberFormat = new Intl.NumberFormat("en-IN");
const priceFormat = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

function AccountDate({ value }: { value: string }) {
    return <time dateTime={value}>{dateFormat.format(new Date(value))}</time>;
}

export default function AccountPage() {
    return (
        <Suspense fallback={<PageLoading label="Loading account…" />}>
            <AccountSettings />
        </Suspense>
    );
}

function AccountSettings() {
    const { data: session, status } = useSession();
    const router = useAppRouter();
    const active =
        useSearchParams().get("tab") === "plan" ? sections[1] : sections[0];
    const [account, setAccount] = useState<UserData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/");
            return;
        }
        if (status !== "authenticated") return;

        const controller = new AbortController();
        const load = async () => {
            try {
                const response = await fetch("/api/account", {
                    signal: controller.signal,
                });
                if (controller.signal.aborted) return;
                if (response.status === 401) {
                    router.replace("/");
                    return;
                }
                if (!response.ok) {
                    trackEvent("account_load_failed", {
                        status_code: response.status,
                    });
                    setLoadError(true);
                    return;
                }
                const data: UserData = await response.json();
                if (controller.signal.aborted) return;
                setAccount(data);
                setAnalyticsPlan(data.plan);
                updateAnalyticsProfile(data);
                trackEvent("account_loaded", { profile: data });
            } catch (error) {
                if (controller.signal.aborted) return;
                trackEvent("account_load_failed", {
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                setLoadError(true);
            }
        };
        void load();
        return () => controller.abort();
    }, [attempt, router, status]);

    if (status === "unauthenticated") {
        return <PageLoading label="Opening PixSuite…" />;
    }

    return (
        <main className={`${home.surface} ${styles.page}`}>
            <div className={styles.container}>
                <header className={styles.pageHeader}>
                    <h1>Account settings</h1>
                </header>
                <div className={styles.layout}>
                    <nav
                        className={styles.navigation}
                        aria-label="Account settings"
                    >
                        {sections.map(({ id, label, href, Icon }) => (
                            <Link
                                key={id}
                                href={href}
                                scroll={false}
                                aria-current={
                                    active.id === id ? "page" : undefined
                                }
                                className={styles.navLink}
                                onClick={() =>
                                    trackEvent("account_tab_selected", {
                                        tab: id,
                                    })
                                }
                            >
                                <Icon size={16} aria-hidden />
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <section
                        className={styles.content}
                        aria-labelledby="account-view-title"
                    >
                        <h2 id="account-view-title">{active.label}</h2>
                        {loadError ? (
                            <div
                                className={`${styles.panel} ${styles.feedback}`}
                            >
                                <p className={styles.loadError} role="alert">
                                    <CircleAlert size={16} aria-hidden />
                                    Your account couldn’t load.
                                </p>
                                <Button
                                    className={styles.button}
                                    onClick={() => {
                                        setLoadError(false);
                                        setAttempt((value) => value + 1);
                                    }}
                                >
                                    Try again
                                </Button>
                            </div>
                        ) : !account || status !== "authenticated" ? (
                            <div
                                className={`${styles.panel} ${styles.skeleton}`}
                                role="status"
                            >
                                <p className="sr-only">Loading your account…</p>
                                <span aria-hidden />
                                <span aria-hidden />
                                <span aria-hidden />
                            </div>
                        ) : active.id === "account" ? (
                            <Profile
                                account={account}
                                onSaved={(updated) =>
                                    setAccount(
                                        (current) =>
                                            current && {
                                                ...current,
                                                name: updated.name,
                                                updatedAt: updated.updatedAt,
                                            },
                                    )
                                }
                                image={
                                    session?.user?.image ||
                                    session?.user?.avatar ||
                                    account.avatar ||
                                    undefined
                                }
                            />
                        ) : (
                            <Billing account={account} />
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}

function Profile({
    account,
    image,
    onSaved,
}: {
    account: UserData;
    image?: string;
    onSaved: (account: UserData) => void;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const restoreEditFocus = useRef(false);
    const editButton = useCallback((button: HTMLButtonElement | null) => {
        if (button && restoreEditFocus.current) {
            restoreEditFocus.current = false;
            button.focus({ preventScroll: true });
        }
    }, []);

    const name = account.name.trim();
    const words = name.split(/\s+/);
    const initials =
        words.length > 1
            ? words
                  .slice(0, 2)
                  .map((word) => Array.from(word)[0])
                  .join("")
            : Array.from(name || account.email)
                  .slice(0, 2)
                  .join("");

    const closeEditor = () => {
        restoreEditFocus.current = true;
        setDraft(null);
        setError(null);
    };

    const cancelEdit = () => {
        if (saving) return;
        trackEvent("account_profile_edit_cancelled", {
            field: "name",
            name: draft,
        });
        closeEditor();
    };

    const saveName = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving || draft === null) return;
        const nextName = draft.trim();
        if (!nextName) {
            setError("Enter your full name.");
            return;
        }
        if (nextName === name) {
            closeEditor();
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const response = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: nextName }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => null);
                trackEvent("account_profile_update_failed", {
                    field: "name",
                    status_code: response.status,
                    error: body?.error,
                });
                setError(
                    response.status === 400 && typeof body?.error === "string"
                        ? body.error
                        : "Your name couldn’t be saved. Try again.",
                );
                return;
            }
            const updated: UserData = await response.json();
            onSaved(updated);
            updateAnalyticsProfile(updated);
            trackEvent("account_profile_updated", {
                field: "name",
                previous_name: account.name,
                name: updated.name,
                profile: updated,
            });
            setSaved(true);
            closeEditor();
        } catch (error) {
            trackEvent("account_profile_update_failed", {
                field: "name",
                error: error instanceof Error ? error.message : String(error),
            });
            setError("Your name couldn’t be saved. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.panel}>
            <p className="sr-only" role="status">
                {saved ? "Name updated." : ""}
            </p>
            <div
                className={styles.identity}
                data-editing={draft !== null || undefined}
            >
                <Avatar className={styles.avatar} aria-hidden="true">
                    <AvatarImage
                        src={image}
                        alt=""
                        referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>
                        {initials.toUpperCase() || "U"}
                    </AvatarFallback>
                </Avatar>
                {draft !== null ? (
                    <form
                        className={styles.nameForm}
                        onSubmit={saveName}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") cancelEdit();
                        }}
                    >
                        <label
                            htmlFor="account-name"
                            className={styles.fieldLabel}
                        >
                            Full name
                        </label>
                        <Input
                            id="account-name"
                            autoComplete="name"
                            maxLength={100}
                            value={draft}
                            readOnly={saving}
                            aria-invalid={!!error}
                            aria-describedby={
                                error ? "account-name-error" : undefined
                            }
                            onChange={(event) => {
                                setDraft(event.target.value);
                                setError(null);
                            }}
                            autoFocus
                        />
                        {error && (
                            <p
                                id="account-name-error"
                                className={styles.formError}
                                role="alert"
                            >
                                {error}
                            </p>
                        )}
                        <div className={styles.formActions}>
                            <Button
                                type="submit"
                                className={styles.button}
                                disabled={saving}
                                aria-busy={saving}
                            >
                                {saving ? "Saving…" : "Save name"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className={styles.button}
                                disabled={saving}
                                onClick={cancelEdit}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div>
                            <h3 className={styles.displayName}>
                                {name || "Your account"}
                            </h3>
                            {isPaidPlan(account.plan) && (
                                <p className={styles.identityPlan}>
                                    {account.plan} plan
                                </p>
                            )}
                            {saved && (
                                <p
                                    className={styles.statusMessage}
                                    aria-hidden="true"
                                >
                                    Name updated.
                                </p>
                            )}
                        </div>
                        <Button
                            ref={editButton}
                            type="button"
                            variant="outline"
                            className={`${styles.button} ${styles.quietButton}`}
                            onClick={() => {
                                setSaved(false);
                                setDraft(account.name);
                                trackEvent("account_profile_edit_started", {
                                    field: "name",
                                    name: account.name,
                                });
                            }}
                        >
                            <Pencil size={15} aria-hidden />
                            Edit name
                        </Button>
                    </>
                )}
            </div>

            <div className={styles.emailRow}>
                <ProfileDetail label="Email address" Icon={Mail}>
                    {account.email}
                </ProfileDetail>
                <span className={styles.verified}>
                    <CircleCheck size={14} aria-hidden />
                    Verified
                </span>
            </div>

            <div className={styles.metadata}>
                <ProfileDetail label="Member since" Icon={CalendarDays}>
                    <AccountDate value={account.createdAt} />
                </ProfileDetail>
                <ProfileDetail label="Last updated" Icon={Clock3}>
                    <AccountDate value={account.updatedAt} />
                </ProfileDetail>
            </div>
        </div>
    );
}

function ProfileDetail({
    label,
    Icon,
    children,
}: {
    label: string;
    Icon: typeof Mail;
    children: ReactNode;
}) {
    return (
        <div className={styles.labeledValue}>
            <Icon size={16} aria-hidden />
            <dl>
                <dt className={styles.fieldLabel}>{label}</dt>
                <dd className={styles.fieldValue}>{children}</dd>
            </dl>
        </div>
    );
}

function Billing({ account }: { account: UserData }) {
    const [openedAt] = useState(Date.now);
    const plan = account.plan;
    const paid = isPaidPlan(plan);
    const expiry = paid ? account.subscriptionExpiresAt : null;
    const active = paid && !!expiry && Date.parse(expiry) > openedAt;
    const inactive = paid && !active;
    const price = paid ? PLAN_PRICES_PAISE[plan] / 100 : 0;

    return (
        <>
            <section
                className={`${styles.panel} ${styles.planSummary}`}
                aria-label="Current plan"
            >
                <div className={styles.planMain}>
                    <div>
                        <div className={styles.planName}>
                            <h3>{plan} plan</h3>
                            {paid && (
                                <span
                                    className={styles.planStatus}
                                    data-inactive={inactive || undefined}
                                >
                                    {active
                                        ? "Active"
                                        : expiry
                                          ? "Expired"
                                          : "Inactive"}
                                </span>
                            )}
                        </div>
                        <p className={styles.planPrice}>
                            {priceFormat.format(price)}
                            {paid && (
                                <span className={styles.muted}> / month</span>
                            )}
                        </p>
                    </div>
                    {(plan !== "Pro" || inactive) && (
                        <Button asChild className={styles.button}>
                            <Link href="/#pricing">
                                View plans
                                <ArrowRight size={16} aria-hidden />
                            </Link>
                        </Button>
                    )}
                </div>
                <p className={styles.planAccess}>
                    {expiry ? (
                        <>
                            <CalendarDays size={16} aria-hidden />
                            <span>
                                {active
                                    ? "Access expires on "
                                    : "Access expired on "}
                                <AccountDate value={expiry} />
                            </span>
                        </>
                    ) : (
                        <>
                            <CircleCheck size={16} aria-hidden />
                            {paid
                                ? "Choose a plan to restore paid access."
                                : "No payment required"}
                        </>
                    )}
                </p>
            </section>

            <section
                className={styles.usageSection}
                aria-labelledby="usage-title"
            >
                <h3 id="usage-title">
                    {inactive ? "Previous plan usage" : "Monthly usage"}
                </h3>
                <div className={`${styles.panel} ${styles.usageGrid}`}>
                    <UsageMetric
                        label="AI credits"
                        Icon={Zap}
                        used={account.creditsUsed}
                        limit={account.creditLimit}
                        inactive={inactive}
                        empty="Included with paid plans."
                    />
                    <UsageMetric
                        label="Uploads"
                        Icon={ImagePlus}
                        used={account.uploadCount}
                        limit={account.uploadLimit}
                        inactive={inactive}
                        empty="There’s no upload allowance on this plan."
                    />
                </div>
            </section>
        </>
    );
}

function UsageMetric({
    label,
    Icon,
    used,
    limit,
    inactive,
    empty,
}: {
    label: string;
    Icon: typeof Zap;
    used: number;
    limit: number;
    inactive: boolean;
    empty: string;
}) {
    const remaining = Math.max(0, limit - used);
    const percent =
        limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
    const usageText = `${numberFormat.format(used)} of ${numberFormat.format(limit)} used`;

    return (
        <div className={styles.usageMetric}>
            <p className={styles.usageLabel}>
                <Icon size={16} aria-hidden />
                {label}
            </p>
            {limit > 0 ? (
                <>
                    <p className={styles.usageValue}>
                        <strong>
                            {numberFormat.format(inactive ? used : remaining)}
                        </strong>
                        <span className={styles.muted}>
                            {inactive ? "used" : "remaining"}
                        </span>
                    </p>
                    <Progress
                        aria-label={`${label} used`}
                        getValueLabel={() => usageText}
                        value={percent}
                        className={styles.meter}
                        data-full={percent === 100 || undefined}
                    />
                    <p className={styles.usageCaption}>
                        {inactive
                            ? `of ${numberFormat.format(limit)} available`
                            : usageText}
                    </p>
                </>
            ) : (
                <p className={styles.muted}>{empty}</p>
            )}
        </div>
    );
}
