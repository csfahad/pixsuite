'use client';

import Footer from '@/components/footer';
import { motion } from 'motion/react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background pt-18">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="container mx-auto px-4 max-w-4xl py-12"
            >
                <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-muted-foreground">
                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using PixSuite, you accept and agree to be bound by the terms and provision of this agreement.
                            If you do not agree to abide by these terms, please do not use this service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
                        <p>
                            PixSuite provides AI-powered photo editing and image generation tools. We reserve the right to modify, suspend, or
                            discontinue the service at any time without notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
                        <p>
                            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility
                            for all activities that occur under your account. To access certain features, you may be required to register for an account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">4. Payment and Refunds</h2>
                        <p>
                            PixSuite offers paid subscription plans ("Lite" and "Pro"). By subscribing, you agree to pay the fees indicated for
                            the selected plan. Payments are processed securely via third-party providers. Refund requests are handled on a case-by-case basis.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">5. User Content</h2>
                        <p>
                            You retain all rights to the images you upload and generate. However, by using the service, you grant PixSuite a
                            limited license to process and store your content solely for the purpose of providing the service to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">6. Prohibited Uses</h2>
                        <p>
                            You agree not to use the service to generate or manipulate content that is illegal, harmful, threatening, abusive,
                            harassing, defamatory, or otherwise objectionable. We reserve the right to terminate accounts that violate this policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">7. Limitation of Liability</h2>
                        <p>
                            In no event shall PixSuite be liable for any indirect, incidental, special, consequential or punitive damages,
                            including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from
                            your access to or use of or inability to access or use the service.
                        </p>
                    </section>
                </div>
            </motion.div>
            <Footer />
        </div>
    );
}
