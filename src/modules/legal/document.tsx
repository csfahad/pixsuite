import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/navigation-link";
import Footer from "@/modules/home/footer";
import home from "@/modules/home/home.module.css";
import styles from "./legal.module.css";

export type LegalSection = {
    id: string;
    title: string;
    content: ReactNode;
};

type LegalDocumentProps = {
    title: string;
    description: string;
    sections: readonly LegalSection[];
    related: { href: string; label: string };
};

export default function LegalDocument({
    title,
    description,
    sections,
    related,
}: LegalDocumentProps) {
    return (
        <>
            <main id="legal-top" className={`${home.surface} ${styles.page}`}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>{title}</h1>
                        <p>{description}</p>
                    </header>

                    <div className={styles.layout}>
                        <aside className={styles.contents}>
                            <nav aria-label={`${title} contents`}>
                                <p className={styles.contentsTitle}>
                                    On this page
                                </p>
                                <ol>
                                    {sections.map((section) => (
                                        <li key={section.id}>
                                            <a href={`#${section.id}`}>
                                                {section.title.replace(
                                                    /^\d+\.\s*/,
                                                    "",
                                                )}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        </aside>

                        <article className={styles.document} aria-label={title}>
                            {sections.map((section) => (
                                <section
                                    key={section.id}
                                    id={section.id}
                                    className={styles.section}
                                    aria-labelledby={`${section.id}-heading`}
                                >
                                    <h2 id={`${section.id}-heading`}>
                                        {section.title}
                                    </h2>
                                    {section.content}
                                </section>
                            ))}
                            <div className={styles.related}>
                                <Link href={related.href}>
                                    {related.label}
                                    <ArrowRight size={16} aria-hidden />
                                </Link>
                            </div>
                        </article>
                    </div>
                </div>
            </main>
            <Footer pricingHref="/#pricing" topHref="#legal-top" />
        </>
    );
}
