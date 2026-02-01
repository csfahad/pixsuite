'use client';

import Footer from '@/components/footer';
import { motion } from 'motion/react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background pt-18">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="container mx-auto px-4 max-w-4xl py-12"
            >
                <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-muted-foreground">
                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
                        <p>
                            We collect information you provide directly to us, such as when you create an account, subscribe to a plan,
                            or communicate with us. This may include your name, email address, and payment information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                        <p>
                            We use the information we collect to operate, maintain, and improve our services, to process transactions,
                            and to communicate with you about your account and updates to our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Security</h2>
                        <p>
                            We implement reasonable security measures to protect your personal information. However, no method of transmission
                            over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">4. Third-Party Services</h2>
                        <p>
                            We may use third-party service providers to help us provide our services, such as payment processors (e.g., Razorpay)
                            and cloud storage providers. These third parties may have access to your information only to perform tasks on our
                            behalf and are obligated not to disclose or use it for any other purpose.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies</h2>
                        <p>
                            We use cookies and similar tracking technologies to track the activity on our service and hold certain information.
                            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">6. Changes to This Policy</h2>
                        <p>
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                            Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at csfahad.dev@gmail.com
                        </p>
                    </section>
                </div>
            </motion.div>
            <Footer />
        </div>
    );
}
