import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_AUTHOR }],
  keywords: [
    "developer tools",
    "online utilities",
    "IP calculator",
    "subnet calculator",
    "QR code generator",
    "invoice generator",
    "JSON Schema",
    "env comparator",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#171514" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <div className="site-shell flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-sm">
              <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
                <Link
                  href="/"
                  aria-label={`${SITE_NAME} home`}
                  className="group inline-flex items-baseline text-lg font-semibold tracking-tighter text-foreground"
                >
                  {SITE_NAME}
                  <span
                    aria-hidden="true"
                    className="ml-0.5 inline-block text-signal transition-transform duration-200 ease-soft group-hover:rotate-12"
                  >
                    *
                  </span>
                </Link>
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="top-center" richColors />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
