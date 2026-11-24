"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import {
    ArrowLeftRight,
    Check,
    ShieldCheck,
    ImageIcon,
    Layers2,
    RotateCcw,
    Scan,
    Scissors,
    Sun,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import styles from "./hero.module.css";

const DEFAULT_POSITION = 42;
const ORIGINAL = "/hero/studio-original.webp";
const CUTOUT = "/hero/studio-cutout.webp";
const SHADOW = "/hero/studio-shadow.webp";
const BACKGROUNDS = [
    { name: "Transparent", color: null },
    { name: "Mist", color: "#e1eced" },
    { name: "Sand", color: "#f0e5d4" },
    { name: "Ink", color: "#242b32" },
] as const;

export default function BeforeAfterSlider() {
    const comparisonId = useId();
    const [background, setBackground] = useState(1);
    const [shadow, setShadow] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [ready, setReady] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);
    const dividerRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLSpanElement>(null);
    const sliderRef = useRef<HTMLInputElement>(null);
    const activePointer = useRef<number | null>(null);
    const canvasColor = BACKGROUNDS[background].color;

    const moveDivider = (value: number) => {
        const next = Math.max(0, Math.min(100, value));
        if (handleRef.current)
            handleRef.current.style.left = `clamp(20px, ${next}%, calc(100% - 20px))`;
        if (originalRef.current)
            originalRef.current.style.clipPath = `inset(0 ${100 - next}% 0 0)`;
        if (dividerRef.current) dividerRef.current.style.left = `${next}%`;
        if (sliderRef.current) sliderRef.current.value = String(next);
    };

    const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId || !canvasRef.current)
            return;
        const bounds = canvasRef.current.getBoundingClientRect();
        moveDivider(((event.clientX - bounds.left) / bounds.width) * 100);
    };

    const startDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (
            imageError ||
            !event.isPrimary ||
            event.button !== 0 ||
            activePointer.current !== null
        )
            return;
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        sliderRef.current?.focus({ preventScroll: true });
        trackPointer(event);
    };

    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId) return;
        activePointer.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const reset = () => {
        setBackground(1);
        setShadow(true);
        moveDivider(42);
    };

    return (
        <div
            className={styles.workbench}
            aria-label="Interactive PixSuite editing preview"
        >
            <div className={styles.workbenchHeader}>
                <div className={styles.documentTitle}>
                    <BrandMark
                        aria-hidden="true"
                        className={styles.workbenchMark}
                    />
                    <span>Studio edit</span>
                    <span className={styles.documentExtension}>.jpg</span>
                </div>
                <span className={styles.previewLabel}>Interactive preview</span>
                <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Reset the preview"
                    onClick={reset}
                >
                    <RotateCcw size={15} aria-hidden="true" />
                </button>
            </div>
            <div className={styles.workbenchBody}>
                <aside
                    className={styles.tools}
                    aria-label="Preview editing controls"
                >
                    <div className={styles.toolsHeading}>
                        <Layers2 size={15} aria-hidden="true" />
                        <span>Your edit stack</span>
                    </div>
                    <div className={styles.toolStack}>
                        <div className={styles.toolRow}>
                            <span className={styles.toolIcon}>
                                <Scissors size={17} aria-hidden="true" />
                            </span>
                            <span className={styles.toolText}>
                                <span className={styles.longToolLabel}>
                                    Remove background
                                </span>
                                <span className={styles.shortToolLabel}>
                                    Remove BG
                                </span>
                                <span className={styles.toolDetail}>
                                    Subject, preserved.
                                </span>
                            </span>
                            <Check
                                size={14}
                                className={styles.appliedCheck}
                                aria-hidden="true"
                            />
                        </div>
                        <button
                            type="button"
                            className={styles.toolRow}
                            aria-pressed={shadow}
                            onClick={() => setShadow((value) => !value)}
                        >
                            <span className={styles.toolIcon}>
                                <Sun size={17} aria-hidden="true" />
                            </span>
                            <span className={styles.toolText}>
                                Drop shadow
                                <span className={styles.toolDetail}>
                                    A little grounding.
                                </span>
                            </span>
                            <span
                                className={styles.switch}
                                data-on={shadow}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                    <fieldset className={styles.backgroundPicker}>
                        <legend>Canvas background</legend>
                        <div className={styles.swatches}>
                            {BACKGROUNDS.map((option, index) => (
                                <button
                                    key={option.name}
                                    type="button"
                                    aria-label={`${option.name} background`}
                                    aria-pressed={background === index}
                                    onClick={() => setBackground(index)}
                                    className={`${styles.swatch} ${!option.color ? styles.checkerboard : ""}`}
                                    style={
                                        option.color
                                            ? { backgroundColor: option.color }
                                            : undefined
                                    }
                                >
                                    {background === index && (
                                        <Check
                                            size={15}
                                            aria-hidden="true"
                                            style={{
                                                color:
                                                    index === 3
                                                        ? "#fff"
                                                        : "#242b32",
                                            }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                        <span className={styles.backgroundName}>
                            {BACKGROUNDS[background].name}
                        </span>
                    </fieldset>
                    <div className={styles.sourceFile}>
                        <ImageIcon size={15} aria-hidden="true" />
                        <span>
                            Original image<span>1200 × 674</span>
                        </span>
                        <Check size={13} aria-hidden="true" />
                    </div>
                </aside>
                <div className={styles.canvasColumn}>
                    <div className={styles.canvasToolbar}>
                        <label htmlFor={comparisonId}>
                            <Scan size={14} aria-hidden="true" />
                            Comparison
                        </label>
                        <span className={styles.canvasFit}>Fit view</span>
                    </div>
                    <div
                        ref={canvasRef}
                        className={`${styles.comparison} ${styles.checkerboard}`}
                        style={{
                            backgroundColor: canvasColor ?? undefined,
                            backgroundImage: canvasColor ? "none" : undefined,
                        }}
                        onPointerDown={startDrag}
                        onPointerMove={trackPointer}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onLostPointerCapture={() => {
                            activePointer.current = null;
                        }}
                    >
                        <Image
                            src={shadow ? SHADOW : CUTOUT}
                            alt="The same blue car with its background removed"
                            fill
                            priority
                            sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 228px), 880px"
                            className={styles.comparisonImage}
                            onLoad={() => setReady(true)}
                            onError={() => setImageError(true)}
                        />
                        <div
                            ref={originalRef}
                            className={styles.originalImage}
                            style={{
                                clipPath: `inset(0 ${100 - DEFAULT_POSITION}% 0 0)`,
                            }}
                        >
                            <Image
                                src={ORIGINAL}
                                alt="Original photograph of a blue car on a road with trees behind it"
                                fill
                                priority
                                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 228px), 880px"
                                className={styles.comparisonImage}
                                onError={() => setImageError(true)}
                            />
                        </div>
                        <div className={styles.imageLabels} aria-hidden="true">
                            <span>Original</span>
                            <span>
                                Edited
                                <Check size={11} />
                            </span>
                        </div>
                        <div
                            ref={dividerRef}
                            className={styles.divider}
                            style={{ left: `${DEFAULT_POSITION}%` }}
                            aria-hidden="true"
                        ></div>
                        <span
                            ref={handleRef}
                            className={styles.dividerHandle}
                            style={{
                                left: `clamp(20px, ${DEFAULT_POSITION}%, calc(100% - 20px))`,
                            }}
                            aria-hidden="true"
                        >
                            <ArrowLeftRight size={17} />
                        </span>
                        <input
                            ref={sliderRef}
                            id={comparisonId}
                            className={styles.comparisonRange}
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            defaultValue={DEFAULT_POSITION}
                            aria-label="Compare original and edited image"
                            onInput={(event) =>
                                moveDivider(Number(event.currentTarget.value))
                            }
                        />
                        {imageError && (
                            <div className={styles.canvasError} role="alert">
                                <ImageIcon size={24} aria-hidden="true" />
                                <span>The preview couldn’t load.</span>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                >
                                    Reload preview
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={styles.canvasFooter}>
                        <span>
                            <ArrowLeftRight size={12} aria-hidden="true" />
                            Drag to compare
                        </span>
                        <span>1200 × 674</span>
                    </div>
                </div>
            </div>
            <div className={styles.workbenchFooter}>
                <span
                    className={styles.editStatus}
                    role="status"
                    aria-atomic="true"
                >
                    {ready && !imageError ? (
                        <Check size={13} aria-hidden="true" />
                    ) : (
                        <BrandMark width={13} height={13} aria-hidden="true" />
                    )}
                    {imageError
                        ? "Preview unavailable"
                        : ready
                          ? `${shadow ? "2 edits" : "1 edit"} applied`
                          : "Loading preview…"}
                </span>
                <span className={styles.originalStatus}>
                    <ShieldCheck size={13} aria-hidden="true" />
                    Original preserved
                </span>
            </div>
        </div>
    );
}
