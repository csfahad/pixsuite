import type { ReactNode } from "react";
import { Check, Maximize2, Scissors, Sun } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import styles from "./hero.module.css";

export default function HeroBackdrop({ children }: { children: ReactNode }) {
    return (
        <div className={styles.visual}>
            <div className={styles.backdrop} aria-hidden="true">
                <div
                    data-hero-drift
                    className={`${styles.floatingShape} ${styles.toolShape}`}
                >
                    <div className={styles.toolObject}>
                        <span className={styles.toolPlate} />
                        <span className={styles.toolPlate} />
                        <div className={styles.toolFace}>
                            <div className={styles.toolObjectRow}>
                                <Scissors size={18} />
                                <span>Remove background</span>
                                <Check size={12} />
                            </div>
                            <div className={styles.toolObjectRow}>
                                <Sun size={18} />
                                <span>Drop shadow</span>
                                <Check size={12} />
                            </div>
                            <div className={styles.toolObjectRow}>
                                <Maximize2 size={18} />
                                <span>Upscale 2×</span>
                                <Check size={12} />
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    data-hero-drift
                    className={`${styles.floatingShape} ${styles.cubeShape}`}
                >
                    <div className={styles.editCube}>
                        <span className={styles.cubeTop} />
                        <span className={styles.cubeSide} />
                        <span className={styles.cubeFace}>
                            <BrandMark aria-hidden="true" />
                        </span>
                    </div>
                </div>
                <div
                    data-hero-drift
                    className={`${styles.floatingShape} ${styles.ringShape}`}
                >
                    <div className={styles.colorRing} />
                </div>
            </div>
            {children}
        </div>
    );
}
