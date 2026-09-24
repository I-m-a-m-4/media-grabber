"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ScaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18"></path>
    <path d="M5 8h14"></path>
    <path d="M3 13l4-7 4 7a3 3 0 0 1-6 0z"></path>
    <path d="M13 13l4-7 4 7a3 3 0 0 1-6 0z"></path>
  </svg>
);

export default function TermsPage() {
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
              <ScaleIcon />
            </div>
            <div>
              <h1 className="legal-title">Terms of Service & Legals</h1>
              <p className="legal-subtitle">Effective Date: September 2026</p>
            </div>
          </div>
        </header>

        <article className="card legal-content">
          <section className="legal-section">
            <h2>1. Terms of Acceptance</h2>
            <p>
              By accessing, installing, or using Universal Media Grabber, you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please refrain from using the software.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Permitted & Fair Use Policy</h2>
            <p>
              Universal Media Grabber is provided for personal, educational, archiving, and accessibility purposes. 
              Users are strictly responsible for ensuring that their use complies with local copyright laws, fair-use doctrines, and the legal terms of third-party platforms.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Intellectual Property & Copyright</h2>
            <p>
              Universal Media Grabber does not host, store, copy, or redistribute copyrighted media on its servers. 
              All trademarks, video titles, logos, screenshots, and brand graphics belong to their respective copyright holders. Users must obtain authorization prior to downloading copyrighted works.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Built-in Security Vetting & Malware Guard</h2>
            <p>
              While the application includes link security auditing to block dangerous protocols, SSRF targets, 
              and executable extensions, users are advised to exercise caution when downloading files from unverified online sources.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Disclaimer of Warranties & Limitation of Liability</h2>
            <p>
              The software is provided "AS IS", without warranty of any kind, express or implied. 
              Under no circumstances shall the creators or contributors be liable for any claims, losses, or damages resulting from the use or inability to use this software.
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
