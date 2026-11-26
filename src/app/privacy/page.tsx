import type { Metadata } from "next";
import LegalDocument, { type LegalSection } from "@/modules/legal/document";

export const metadata: Metadata = {
    title: "Privacy Policy | PixSuite",
    description: "How information is collected and used when you use PixSuite.",
};

const sections: readonly LegalSection[] = [
    {
        id: "information-we-collect",
        title: "1. Information We Collect",
        content: (
            <p>
                We collect information you provide directly to us, such as when
                you create an account, subscribe to a plan, or communicate with
                us. This may include your name, email address, and payment
                information. We also collect pageviews, browser and device
                information, and product usage events, such as uploads, editing
                tool selections, exports, and subscription checkout outcomes.
            </p>
        ),
    },
    {
        id: "how-we-use-your-information",
        title: "2. How We Use Your Information",
        content: (
            <p>
                We use the information we collect to operate, maintain, and
                improve our services, to process transactions, and to
                communicate with you about your account and updates to our
                services.
            </p>
        ),
    },
    {
        id: "data-security",
        title: "3. Data Security",
        content: (
            <p>
                We implement reasonable security measures to protect your
                personal information. However, no method of transmission over
                the Internet is 100% secure, and we cannot guarantee absolute
                security.
            </p>
        ),
    },
    {
        id: "third-party-services",
        title: "4. Third-Party Services",
        content: (
            <p>
                We may use third-party service providers to help us provide our
                services, such as payment processors (e.g., Razorpay) and cloud
                storage providers. These third parties may have access to your
                information only to perform tasks on our behalf and are
                obligated not to disclose or use it for any other purpose.
            </p>
        ),
    },
    {
        id: "cookies",
        title: "5. Cookies",
        content: (
            <p>
                We use cookies and similar tracking technologies to track the
                activity on our service and hold certain information. You can
                instruct your browser to refuse all cookies or to indicate when
                a cookie is being sent.
            </p>
        ),
    },
    {
        id: "changes-to-this-policy",
        title: "6. Changes to This Policy",
        content: (
            <p>
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page. You are advised to review this Privacy Policy
                periodically for any changes.
            </p>
        ),
    },
    {
        id: "contact-us",
        title: "7. Contact Us",
        content: (
            <p>
                If you have any questions about this Privacy Policy, please
                contact us at{" "}
                <a href="mailto:support@pixsuite.csfahad.in">
                    support@pixsuite.csfahad.in
                </a>
            </p>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <LegalDocument
            title="Privacy Policy"
            description="How information is collected and used when you use PixSuite."
            sections={sections}
            related={{ href: "/terms", label: "Read the terms of service" }}
        />
    );
}
