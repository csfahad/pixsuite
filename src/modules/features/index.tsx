"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import {
    ArrowRight,
    Crop,
    Expand,
    Maximize2,
    Scissors,
    Type,
} from "lucide-react";
import Link from "@/components/navigation-link";
import home from "@/modules/home/home.module.css";
import styles from "./features.module.css";

function Photo({
    name,
    alt,
    className,
    style,
}: {
    name: string;
    alt: string;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <Image
            src={`/features/${name}.webp`}
            alt={alt}
            fill
            unoptimized
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className={className}
            style={style}
        />
    );
}

function Comparison({
    original,
    result,
    alt,
    label,
    resultLabel,
    transparent = false,
}: {
    original: string;
    result: string;
    alt: string;
    label: string;
    resultLabel: string;
    transparent?: boolean;
}) {
    const [position, setPosition] = useState(46);
    return (
        <>
            <div className={styles.comparisonCanvas}>
                <Photo name={original} alt={`Original ${alt}`} />
                <div
                    className={`${styles.comparisonResult} ${transparent ? styles.checkerboard : ""}`}
                    style={{ clipPath: `inset(0 0 0 ${position}%)` }}
                >
                    <Photo name={result} alt={`${resultLabel}: ${alt}`} />
                </div>
                <span
                    className={styles.comparisonLine}
                    style={{ left: `${position}%` }}
                    aria-hidden
                />
            </div>
            <div className={styles.comparisonControls}>
                <span>Original</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={position}
                    onChange={(event) =>
                        setPosition(Number(event.target.value))
                    }
                    aria-label={label}
                    aria-valuetext={`${position}% original, ${100 - position}% ${resultLabel.toLowerCase()}`}
                />
                <span>{resultLabel}</span>
            </div>
        </>
    );
}

const cropModes = [
    { name: "Smart crop", height: 0.78, x: 0.5, y: 0.41 },
    { name: "Face crop", height: 0.39, x: 0.5, y: 0.28 },
] as const;

function CropPreview() {
    const [selected, setSelected] = useState(0);
    const mode = cropModes[selected] ?? cropModes[0];
    const height = mode.height;
    const width = height / (720 / 880);
    const left = Math.max(0, Math.min(mode.x - width / 2, 1 - width));
    const top = Math.max(0, Math.min(mode.y - height / 2, 1 - height));

    return (
        <>
            <div className={styles.cropCanvas}>
                <div className={styles.cropSource}>
                    <Photo
                        name="portrait-original"
                        alt="Portrait with the selected crop outlined"
                    />
                    <div
                        className={styles.cropSelection}
                        style={{
                            left: `${left * 100}%`,
                            top: `${top * 100}%`,
                            width: `${width * 100}%`,
                            height: `${height * 100}%`,
                        }}
                        aria-hidden
                    >
                        <i />
                        <i />
                        <i />
                        <i />
                    </div>
                </div>
                <ArrowRight
                    size={14}
                    className={styles.cropArrow}
                    aria-hidden
                />
                <div className={styles.cropResult}>
                    <Photo
                        name="portrait-original"
                        alt={`${mode.name} example of the same portrait`}
                        style={{
                            width: `${100 / width}%`,
                            height: `${100 / height}%`,
                            maxWidth: "none",
                            left: `${(-left * 100) / width}%`,
                            top: `${(-top * 100) / height}%`,
                            right: "auto",
                            bottom: "auto",
                        }}
                    />
                </div>
            </div>
            <div
                className={styles.segmentedControls}
                role="group"
                aria-label="Choose a crop preview"
            >
                {cropModes.map((option, index) => (
                    <button
                        type="button"
                        key={option.name}
                        aria-pressed={selected === index}
                        onClick={() => setSelected(index)}
                    >
                        {option.name}
                    </button>
                ))}
            </div>
        </>
    );
}

function FillPreview() {
    const [expanded, setExpanded] = useState(true);
    return (
        <>
            <div className={`${styles.fillCanvas} ${styles.checkerboard}`}>
                <div
                    className={styles.fillPhoto}
                    style={{ clipPath: expanded ? undefined : "inset(8% 26%)" }}
                >
                    <Photo
                        name="landscape-wide"
                        alt="Mountain landscape used to illustrate an expanded canvas"
                    />
                </div>
                <div className={styles.startingCanvas} aria-hidden>
                    <span>Starting canvas</span>
                </div>
            </div>
            <div
                className={styles.segmentedControls}
                role="group"
                aria-label="Choose a generative fill preview"
            >
                <button
                    type="button"
                    aria-pressed={!expanded}
                    onClick={() => setExpanded(false)}
                >
                    Original frame
                </button>
                <button
                    type="button"
                    aria-pressed={expanded}
                    onClick={() => setExpanded(true)}
                >
                    Expanded canvas
                </button>
            </div>
        </>
    );
}

function PromptPreview() {
    const [warm, setWarm] = useState(true);
    return (
        <>
            <div className={styles.promptCanvas}>
                <Photo
                    name={warm ? "light-warm" : "light-original"}
                    alt={`Deer in a meadow, ${warm ? "with a warmer light treatment" : "in the original photograph"}`}
                />
                <div className={styles.promptInstruction}>
                    <Type size={14} aria-hidden />
                    <span>Give the scene warmer evening light.</span>
                </div>
            </div>
            <div
                className={styles.segmentedControls}
                role="group"
                aria-label="Choose a prompt edit preview"
            >
                <button
                    type="button"
                    aria-pressed={!warm}
                    onClick={() => setWarm(false)}
                >
                    Original photo
                </button>
                <button
                    type="button"
                    aria-pressed={warm}
                    onClick={() => setWarm(true)}
                >
                    Prompt preview
                </button>
            </div>
        </>
    );
}

function Feature({
    title,
    description,
    icon,
    children,
    wide = false,
}: {
    title: string;
    description: string;
    icon: ReactNode;
    children: ReactNode;
    wide?: boolean;
}) {
    return (
        <article
            className={`${styles.feature} ${wide ? styles.wideFeature : ""}`}
        >
            <div className={styles.featureCopy}>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <div className={styles.preview}>
                <div className={styles.previewHeader}>
                    <span>
                        {icon} {title}
                    </span>
                    <span>Illustrative preview</span>
                </div>
                {children}
            </div>
        </article>
    );
}

export default function Features() {
    return (
        <section
            id="features"
            className={`${home.featuresSection} ${styles.section}`}
            aria-labelledby="features-heading"
        >
            <div className={home.container}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 id="features-heading">Choose what to change.</h2>
                        <p>
                            Five editing tools, each with a different job. Start
                            with the part of your photo that needs attention.
                        </p>
                    </div>
                    <Link href="/editor" className={styles.editorLink}>
                        Open the editor <ArrowRight size={16} aria-hidden />
                    </Link>
                </div>
                <div className={styles.grid}>
                    <Feature
                        title="Background removal"
                        description="Keep the subject. Remove the surroundings. Make a clean cutout for a product listing, a layout, or a new background."
                        icon={<Scissors size={14} aria-hidden />}
                    >
                        <Comparison
                            original="lamp-original"
                            result="lamp-cutout"
                            alt="a floor lamp"
                            label="Compare the lamp photo with its transparent cutout"
                            resultLabel="Cutout"
                            transparent
                        />
                    </Feature>
                    <Feature
                        title="Smart & face crop"
                        description="Frame the main subject, or bring a face closer. Create a focused crop without finding the edges yourself."
                        icon={<Crop size={14} aria-hidden />}
                    >
                        <CropPreview />
                    </Feature>
                    <Feature
                        title="Upscale & retouch"
                        description="Make room for more detail. Upscale to 2× for a larger image, or retouch the photo before you export."
                        icon={<Maximize2 size={14} aria-hidden />}
                    >
                        <Comparison
                            original="detail-small"
                            result="detail-restored"
                            alt="coffee cups viewed from above"
                            label="Compare low resolution with the full-detail reference"
                            resultLabel="Detail"
                        />
                    </Feature>
                    <Feature
                        title="Generative fill"
                        description="Give the photo more room. Extend the scene beyond its original frame to fit a different composition."
                        icon={<Expand size={14} aria-hidden />}
                        wide
                    >
                        <FillPreview />
                    </Feature>
                    <Feature
                        title="Prompt edits"
                        description="Describe the change in your own words. Adjust the setting, light, or details while working from the photo you uploaded."
                        icon={<Type size={14} aria-hidden />}
                        wide
                    >
                        <PromptPreview />
                    </Feature>
                </div>
            </div>
        </section>
    );
}
