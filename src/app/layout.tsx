import type { Metadata, Viewport } from "next";
import { Geist, Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { MotionProvider } from "@/components/motion-provider";
import { getSiteSettings } from "@/lib/site";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { brand, seo } = await getSiteSettings();
  const url = getSiteUrl();

  return {
    metadataBase: new URL(url),
    title: {
      default: seo.default_title || brand.business_name,
      template: `%s — ${brand.business_name}`,
    },
    description: seo.default_description,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    applicationName: brand.business_name,
    openGraph: {
      type: "website",
      siteName: brand.business_name,
      title: seo.default_title || brand.business_name,
      description: seo.default_description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.default_title || brand.business_name,
      description: seo.default_description,
    },
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#FBFAF7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // `data-scroll-behavior` lets Next.js suspend smooth scrolling during
      // route transitions, which would otherwise animate the jump between pages.
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${inter.variable} ${instrumentSerif.variable} scroll-smooth`}
    >
      <body>
        {children}
        {/* Reveal animations start elements at opacity 0, which would hide the
            whole page from users without JavaScript. This restores it. */}
        <noscript>
          <style>{`[data-reveal],[data-panel-img],.word-reveal{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        <MotionProvider />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              borderRadius: "9999px",
              border: "1px solid rgba(0,0,0,0.1)",
              background: "#FFFFFF",
              color: "#12281A",
            },
          }}
        />
      </body>
    </html>
  );
}
