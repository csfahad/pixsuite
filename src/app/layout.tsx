import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import Provider from "./providers";
import Navbar from "@/components/navbar";

const poppins = Poppins({
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--font-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "PixSuite",
    description:
        "Edit photos, generate AI images, and bring your ideas to life with Next.js-powered PixSuite AI photo editor and prompt-based image generator.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${poppins.variable} ${geistMono.variable} antialiased`}
            >
                <Provider>
                    <Navbar />
                    {children}
                </Provider>
            </body>
        </html>
    );
}
