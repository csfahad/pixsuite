import type { Metadata } from "next";
import LegalDocument, { type LegalSection } from "@/modules/legal/document";

export const metadata: Metadata = {
    title: "Terms of Service | PixSuite",
    description:
        "The terms that apply to your account, content, and use of PixSuite.",
};

const sections: readonly LegalSection[] = [
    {
        id: "acceptance-of-terms",
        title: "1. Acceptance of Terms",
        content: (
            <p>
                By accessing and using PixSuite, you accept and agree to be
                bound by the terms and provision of this agreement. If you do
                not agree to abide by these terms, please do not use this
                service.
            </p>
        ),
    },
    {
        id: "description-of-service",
        title: "2. Description of Service",
        content: (
            <p>
                PixSuite provides AI-powered photo editing and image generation
                tools. We reserve the right to modify, suspend, or discontinue
                the service at any time without notice.
            </p>
        ),
    },
    {
        id: "user-accounts",
        title: "3. User Accounts",
        content: (
            <p>
                You are responsible for maintaining the confidentiality of your
                account and password. You agree to accept responsibility for all
                activities that occur under your account. To access certain
                features, you may be required to register for an account.
            </p>
        ),
    },
    {
        id: "payment-and-refunds",
        title: "4. Payment and Refunds",
        content: (
            <p>
                PixSuite offers paid subscription plans (&quot;Starter&quot;,
                &quot;Lite&quot; and &quot;Pro&quot;). By subscribing, you agree
                to pay the fees indicated for the selected plan. Payments are
                processed securely via third-party providers. Refund requests
                are handled on a case-by-case basis.
            </p>
        ),
    },
    {
        id: "user-content",
        title: "5. User Content",
        content: (
            <p>
                You retain all rights to the images you upload and generate.
                However, by using the service, you grant PixSuite a limited
                license to process and store your content solely for the purpose
                of providing the service to you.
            </p>
        ),
    },
    {
        id: "prohibited-uses",
        title: "6. Prohibited Uses",
        content: (
            <p>
                You agree not to use the service to generate or manipulate
                content that is illegal, harmful, threatening, abusive,
                harassing, defamatory, or otherwise objectionable. We reserve
                the right to terminate accounts that violate this policy.
            </p>
        ),
    },
    {
        id: "limitation-of-liability",
        title: "7. Limitation of Liability",
        content: (
            <p>
                In no event shall PixSuite be liable for any indirect,
                incidental, special, consequential or punitive damages,
                including without limitation, loss of profits, data, use,
                goodwill, or other intangible losses, resulting from your access
                to or use of or inability to access or use the service.
            </p>
        ),
    },
];

export default function TermsPage() {
    return (
        <LegalDocument
            title="Terms of Service"
            description="The terms that apply to your account, content, and use of PixSuite."
            sections={sections}
            related={{ href: "/privacy", label: "Read the privacy policy" }}
        />
    );
}
