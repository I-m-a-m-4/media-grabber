import "./globals.css";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#ff6600",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://usemediagrabber.vercel.app"),
  title: {
    default: "Universal Media Grabber - Free Online Video & Audio Downloader",
    template: "%s | Universal Media Grabber",
  },
  description:
    "Download HD videos, MP3 audio, App Store screenshots, and high-res media from YouTube, Instagram, TikTok, Twitter, Apple App Store, Google Play, and any URL instantly.",
  keywords: [
    "media grabber",
    "universal media grabber",
    "video downloader",
    "youtube downloader",
    "instagram reels downloader",
    "tiktok downloader",
    "mp3 extractor",
    "app store screenshot grabber",
    "free media grabber",
    "web asset downloader",
    "online media saver",
  ],
  authors: [{ name: "Bimex Group", url: "https://bimex-group.vercel.app/" }],
  creator: "Bimex Group",
  publisher: "Bimex Group",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://usemediagrabber.vercel.app",
  },
  openGraph: {
    title: "Universal Media Grabber - Download Media From Any Link",
    description:
      "Free online media downloader. Download videos, audio, app store screenshots, and web media instantly with no ads or registration.",
    url: "https://usemediagrabber.vercel.app",
    siteName: "Universal Media Grabber",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://usemediagrabber.vercel.app/icon.png",
        width: 512,
        height: 512,
        alt: "Universal Media Grabber Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Universal Media Grabber",
    description:
      "Download HD videos, audio tracks, and App Store screenshots from any link.",
    images: ["https://usemediagrabber.vercel.app/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Universal Media Grabber",
    "url": "https://usemediagrabber.vercel.app",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "description":
      "Download HD videos, MP3 audio, App Store screenshots, and high-res media from YouTube, Instagram, TikTok, and any URL.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
