"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

export default function PrivacyPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("mediaGrabberTheme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  return (
    <div className="app-layout" data-theme={theme}>
      <main className="main-content fade-in">
        <header className="page-header card">
          <Link href="/" className="secondary-btn back-btn">
            <ArrowLeftIcon /> Back to Grabber
          </Link>
          <div className="legal-title-group">
            <div className="legal-icon">
              <ShieldIcon />
            </div>
            <div>
              <h1 className="legal-title">Privacy Policy</h1>
              <p className="legal-subtitle">Effective Date: September 2026</p>
            </div>
          </div>
        </header>

        <article className="card legal-content">
          <section className="legal-section">
            <h2>1. Privacy-First Commitment</h2>
            <p>
              Universal Media Grabber is engineered with a strict <strong>Privacy-First</strong> philosophy. 
              We do not track your browsing activity, collect telemetry data, record downloaded URLs, or store personal information on remote servers.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Local Machine Execution</h2>
            <p>
              All URL parsing, link vetting, sidecar executions, and media asset processing occur directly 
              on your local machine. Downloads are saved straight into your designated local Downloads folder.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Third-Party Platform Interaction</h2>
            <p>
              When you fetch content from third-party services (such as YouTube, Instagram, TikTok, Apple App Store, 
              or Google Play), your device communicates directly with those platforms. Universal Media Grabber does not route your media traffic through intermediate proxy servers.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Browser Authentication & Cookies</h2>
            <p>
              If you choose to enable the <em>Browser Cookies</em> option to bypass rate limits or access restricted content, 
              those session cookies are read locally from your browser profile on your device. They are never uploaded, shared, or transmitted anywhere else.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Local Storage & Data Retention</h2>
            <p>
              Your download history and preference settings (such as light/dark mode) are stored locally in your web browser 
              or desktop runtime via <code>localStorage</code>. You can clear your history anytime using the in-app "Clear All" history button.
            </p>
          </section>

          <footer className="legal-footer">
            <p>
              Built with ❤️ by{" "}
              <a
                href="https://bimex-group.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="bimex-link"
              >
                Bimex Group
              </a>{" "}
              • © 2026 Universal Media Grabber
            </p>
          </footer>

        </article>
      </main>
    </div>
  );
}
