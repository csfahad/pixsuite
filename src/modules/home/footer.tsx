import { ArrowUp, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import Link from "@/components/navigation-link";
import ModeToggle from "@/components/modeToggle";
import styles from "./home.module.css";

export default function HomeFooter({
    pricingHref = "#pricing",
    topHref = "#hero",
}: {
    pricingHref?: string;
    topHref?: string;
} = {}) {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.footerTop}>
                    <div className={styles.footerIntro}>
                        <Link
                            href="/"
                            aria-label="PixSuite home"
                            className={styles.footerBrand}
                        >
                            <BrandLogo className="h-7" aria-hidden />
                        </Link>
                        <h2>
                            Edit the photo.
                            <br />
                            Keep the original.
                        </h2>
                        <p>
                            A browser workspace for background removal, crop
                            tools, and prompt-based edits.
                        </p>
                    </div>
                    <nav
                        aria-label="Footer product navigation"
                        className={styles.footerGroup}
                    >
                        <h3>Product</h3>
                        <Link href="/editor">
                            Open editor <ArrowUpRight size={14} aria-hidden />
                        </Link>
                        <Link href={pricingHref}>Plans & pricing</Link>
                    </nav>
                    <nav
                        aria-label="Footer support navigation"
                        className={styles.footerGroup}
                    >
                        <h3>Support</h3>
                        <a href="mailto:support@pixsuite.csfahad.in">Contact</a>
                        <Link href="/terms">Terms of service</Link>
                        <Link href="/privacy">Privacy policy</Link>
                    </nav>
                </div>
                <div className={styles.footerBottom}>
                    <p>© {new Date().getFullYear()} PixSuite</p>
                    <div className={styles.footerUtilities}>
                        <ModeToggle />
                        <a
                            href={topHref}
                            aria-label="Back to top"
                            title="Back to top"
                        >
                            <ArrowUp size={17} aria-hidden />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
