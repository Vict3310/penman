import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { MotionProvider } from "@/components/motion-provider";
import { getSiteSettings } from "@/lib/site";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const bodyFont = localFont({ src: [
  { path: "../assets/fonts/Lato-Regular.ttf", weight: "400" },
  { path: "../assets/fonts/Lato-Bold.ttf", weight: "700" },
], variable: "--font-body", display: "swap" });
const displayFont = localFont({ src: [
  { path: "../assets/fonts/Lato-Regular.ttf", weight: "400" },
  { path: "../assets/fonts/Lato-Bold.ttf", weight: "700" },
  { path: "../assets/fonts/Lato-Black.ttf", weight: "900" },
], variable: "--font-display", display: "swap" });
const serifFont = localFont({ src: "../assets/fonts/LiberationSerif-Italic.ttf", weight: "400", style: "italic", variable: "--font-editorial", display: "swap" });

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
  const content = (
    <>
      {children}
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
    </>
  );

  return (
    <html
      lang="en"
      // `data-scroll-behavior` lets Next.js suspend smooth scrolling during
      // route transitions, which would otherwise animate the jump between pages.
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${displayFont.variable} ${serifFont.variable} scroll-smooth`}
    >
      <body>{content}</body>
    </html>
  );
}
