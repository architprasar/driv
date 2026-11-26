import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import "./home.css";
import { getCmsSite } from "@/lib/cms";
import AppAlertHost from "@/components/ui/AppAlertHost";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Set at build time (deployment/frontend.Dockerfile DEMO_MODE build arg).
const demoMode = ["true", "1", "yes"].includes(
  (process.env.NEXT_PUBLIC_DEMO_MODE || "").toLowerCase(),
);

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DrivioCars | Cars, parts and vehicle auctions",
  description:
    "Explore used cars, spare parts and vehicle auctions. Review seller details, available inspection records and order terms before buying.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getCmsSite();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${plusJakartaSans.variable} ${inter.variable}`}>
      <head>
        {process.env.NEXT_PUBLIC_ASSISTANT_API_URL && <>
        <Script src="/aiui.js" strategy="afterInteractive" />
        <Script id="aiui-init" strategy="afterInteractive">
          {`
            (function init() {
              if (window.aiUI) {
                window.aiUI.init({
                  mode: 'server',
                  serverUrl: ${JSON.stringify(process.env.NEXT_PUBLIC_ASSISTANT_API_URL)},
                });
              } else {
                setTimeout(init, 50);
              }
            })();
          `}
        </Script>
        </>}
      </head>
      {/* Shared sticky header stays in document flow on every route. */}
      <body className="bg-background text-on-surface min-h-screen">
        {demoMode && (
          <div
            role="note"
            className="border-b border-live-border bg-live-container px-4 py-2 text-center text-sm font-medium text-on-live-container"
          >
            Demo site: checkout is simulated and no money is charged.
          </div>
        )}
        <SiteChrome position="header" site={site} />
        <main>{children}</main>
        <SiteChrome position="footer" site={site} />
        <AppAlertHost />
      </body>
    </html>
  );
}
