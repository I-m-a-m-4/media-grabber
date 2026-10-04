"use client";

import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";

import Link from "next/link";
import JSZip from "jszip";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { initAnonymousUser, recordPaymentTransaction, recordDownloadActivity, auth } from "../lib/firebase";

interface SecurityReport {
  is_safe: boolean;
  risk_level: "safe" | "caution" | "high_risk";
  domain: string;
  protocol: string;
  category: "media_stream" | "app_store" | "direct_media" | "web_page" | "executable_warning";
  warnings: string[];
  file_extension?: string;
}

interface FormatInfo {
  format_id: string;
  ext: string;
  resolution: string;
  fps?: number;
  vcodec: string;
  acodec: string;
  filesize?: number;
  note?: string;
  direct_url?: string;
  asset_type: "video" | "audio" | "image" | "screenshot";
}

interface MediaInfo {
  title: string;
  description?: string;
  extracted_text?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  site_name?: string;
  formats: FormatInfo[];
  images: FormatInfo[];
  security: SecurityReport;
}

interface HistoryItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  timestamp: number;
  format: string;
  assetType: string;
  duration?: string;
  resolution?: string;
  size?: string;
  uploader?: string;
  status: "downloading" | "completed" | "failed";
  progress: number;
  errorMsg?: string;
}

export type LogoVariant = "ring" | "play_magnet" | "cyber_shield" | "gem";

// Brand Vector Logos (4 Varieties)
const BrandLogoIcon = ({ size = 42, variant = "ring" }: { size?: number; variant?: LogoVariant }) => {
  if (variant === "play_magnet") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} style={{ borderRadius: "10px", flexShrink: 0 }}>
        <defs>
          <linearGradient id="logoGradPlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4500" />
            <stop offset="100%" stopColor="#FF8C00" />
          </linearGradient>
          <linearGradient id="glowOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#logoGradPlay)" />
        <rect x="16" y="16" width="480" height="240" rx="120" fill="url(#glowOverlay)" />
        <path d="M 190 145 L 365 256 L 190 367 Z" fill="rgba(255, 255, 255, 0.22)" />
        <path d="M 256 120 V 300 M 180 230 L 256 300 L 332 230" fill="none" stroke="#FFFFFF" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="160" y1="380" x2="352" y2="380" stroke="#FFFFFF" strokeWidth="36" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "cyber_shield") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} style={{ borderRadius: "10px", flexShrink: 0 }}>
        <defs>
          <linearGradient id="logoGradShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6600" />
            <stop offset="100%" stopColor="#D93800" />
          </linearGradient>
        </defs>
        <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#logoGradShield)" />
        <path d="M 256 85 L 385 138 V 260 C 385 342 256 415 256 415 C 256 415 127 342 127 260 V 138 Z" fill="none" stroke="#FFFFFF" strokeWidth="32" strokeLinejoin="round" />
        <path d="M 256 155 V 295 M 198 238 L 256 295 L 314 238" fill="none" stroke="#FFFFFF" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="256" cy="345" r="14" fill="#FFFFFF" />
      </svg>
    );
  }

  if (variant === "gem") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} style={{ borderRadius: "10px", flexShrink: 0 }}>
        <defs>
          <linearGradient id="logoGradGem" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7700" />
            <stop offset="50%" stopColor="#FF5500" />
            <stop offset="100%" stopColor="#B32400" />
          </linearGradient>
        </defs>
        <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#logoGradGem)" />
        <polygon points="256,70 410,160 410,340 256,430 102,340 102,160" fill="none" stroke="#FFFFFF" strokeWidth="28" strokeLinejoin="round" />
        <polyline points="102,160 256,250 410,160" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="20" />
        <line x1="256" y1="250" x2="256" y2="430" stroke="rgba(255,255,255,0.4)" strokeWidth="20" />
        <path d="M 256 150 V 310 M 196 250 L 256 310 L 316 250" fill="none" stroke="#FFFFFF" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Default: Ring Arrow
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} style={{ borderRadius: "10px", flexShrink: 0 }}>
      <defs>
        <linearGradient id="orangeGradInline" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5500" />
          <stop offset="100%" stopColor="#FF7700" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="url(#orangeGradInline)" />
      <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 140 240 A 136 136 0 1 1 372 240" strokeWidth="32" />
        <line x1="256" y1="120" x2="256" y2="304" strokeWidth="36" />
        <polyline points="184,232 256,304 328,232" strokeWidth="36" />
        <line x1="152" y1="376" x2="360" y2="376" strokeWidth="36" />
      </g>
    </svg>
  );
};

// Icons
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
  </svg>
);

const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"></polyline>
    <polyline points="9 21 3 21 3 15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
);

function formatBytes(bytes?: number, decimals = 2) {
  if (!bytes || bytes === 0) return "Unknown size";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function parseFormatDisplay(fmt: FormatInfo) {
  let title = fmt.resolution || "Standard Quality";
  let dim = "";

  // Extract dimensions like (720x1280) or 720x1280 or 1920x1080
  const dimMatch = title.match(/\((\d+)[x×](\d+)\)/) || title.match(/(\d+)[x×](\d+)/);
  if (dimMatch) {
    dim = `${dimMatch[1]} × ${dimMatch[2]} px`;
    title = title.replace(/\s*\(\d+[x×]\d+\)/, "").trim();
  }

  // Remove redundant container tags like (MP4), (WEBM), (Video Only)
  title = title.replace(/\s*\((mp4|webm|m4a|mp3|mkv|avi)\)/gi, "").trim();
  title = title.replace(/\s*\(video\s+only\)/gi, "").trim();
  title = title.replace(/\s+Video$/i, "").trim();

  return { title, dim };
}



// Flutterwave Support Modal
function SupportModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState<number>(5);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const config = {
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK-33162c3bb2bb347a6606f3e44645f1c9-X",
    tx_ref: "MG_" + Date.now(),
    amount: amount,
    currency: "USD",
    payment_options: "card,mobilemoney,ussd,banktransfer",
    customer: {
      email: email || "supporter@mediagrabber.app",
      phone_number: "08000000000",
      name: name || "Anonymous Supporter",
    },
    customizations: {
      title: "Support Universal Media Grabber",
      description: "Thank you for supporting open-source software development!",
      logo: "https://bimex-group.vercel.app/logo.png",
    },
  };

  const handleFlutterwavePayment = useFlutterwave(config);

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="modal-card card slide-down" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="support-header-title">
            <HeartIcon />
            <h2>Support Universal Media Grabber</h2>
          </div>
          <button className="icon-btn close-modal-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="support-desc">
            Universal Media Grabber is free, open source, and privacy-first. Your support helps maintain sidecar binaries, scraper updates, and new features!
          </p>
          <div className="amount-selector">
            <button className={`amount-btn ${amount === 5 ? "active" : ""}`} onClick={() => setAmount(5)}>☕ $5 Coffee</button>
            <button className={`amount-btn ${amount === 10 ? "active" : ""}`} onClick={() => setAmount(10)}>🚀 $10 Supporter</button>
            <button className={`amount-btn ${amount === 25 ? "active" : ""}`} onClick={() => setAmount(25)}>💖 $25 Sponsor</button>
          </div>
          <div className="form-group">
            <label htmlFor="supporter-name">Your Name (Optional)</label>
            <input id="supporter-name" type="text" className="url-input sm-input" placeholder="e.g. Bello Imam" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="supporter-email">Your Email (Optional)</label>
            <input id="supporter-email" type="email" className="url-input sm-input" placeholder="e.g. supporter@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="primary-btn flutterwave-btn"
            onClick={() => {
              handleFlutterwavePayment({
                callback: async (response) => {
                  console.log("Payment response:", response);
                  try {
                    await recordPaymentTransaction({
                      uid: auth?.currentUser?.uid || "anonymous",
                      email: email || (response as any).customer?.email || "supporter@mediagrabber.app",
                      name: name || (response as any).customer?.name || "Anonymous Supporter",
                      amount: amount,
                      currency: "USD",
                      status: (response as any).status || "successful",
                      tx_ref: config.tx_ref,
                      transaction_id: (response as any).transaction_id || (response as any).flw_ref || ""
                    });
                  } catch (e) {
                    console.error("Failed to store payment record:", e);
                  }
                  closePaymentModal();
                  onClose();
                },
                onClose: () => {},
              });
            }}
          >
            💳 Pay ${amount} via Flutterwave
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryItemCard({ item, removeHistoryItem, handleOpenDownloadsFolder, reFetchHistoryItem }: { item: HistoryItem; removeHistoryItem: (id: string) => void; handleOpenDownloadsFolder: (path?: string) => void; reFetchHistoryItem: (url: string) => void }) {
  const isDownloading = item.status === "downloading";
  const isFailed = item.status === "failed";
  const pct = Math.max(5, Math.min(100, Math.round(item.progress || 10)));

  return (
    <li className={`history-item ${isDownloading ? "item-downloading" : ""} ${isFailed ? "item-failed" : ""}`}>
      <div className="history-thumbnail-wrapper">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="history-thumbnail" referrerPolicy="no-referrer" />
        ) : (
          <div className="history-thumbnail-placeholder">No Img</div>
        )}
      </div>
      
      <div className="history-details">
        <h4 title={item.title}>{item.title}</h4>
        
        <div className="history-meta">
          <span><ClockIcon /> {item.duration || "00:00:00"}</span>
          <span><MonitorIcon /> {item.resolution || item.format}</span>
          <span><FileIcon /> {item.size || "Unknown Size"}</span>
          <span><UserIcon /> {item.uploader}</span>
        </div>
        
        <div className="history-url-row">
          <span className="history-link" title={item.url}>{item.url}</span>
          <SearchIcon />
        </div>

        {/* Live Active Progress Bar */}
        {isDownloading && (
          <div className="history-progress-wrap">
            <div className="history-progress-track">
              <div 
                className="history-progress-fill" 
                style={{ width: `${pct}%` }} 
              />
            </div>
            <div className="history-progress-meta">
              <span className="history-pulse-text">
                <span className="pulse-dot"></span> Downloading...
              </span>
              <span className="history-percentage">{pct}%</span>
            </div>
          </div>
        )}

        {/* Failed Error Message */}
        {isFailed && (
          <div className="history-error-row">
            <span className="history-error-badge">Failed</span>
            <span className="history-error-msg">{item.errorMsg || "Download encountered an error. Click Retry to try again."}</span>
          </div>
        )}
      </div>
      
      <div className="history-actions">
        <button className="icon-btn history-action-btn" onClick={() => removeHistoryItem(item.id)} title="Remove"><TrashIcon /></button>
        <button className="icon-btn history-action-btn" onClick={() => { navigator.clipboard.writeText(item.url); }} title="Copy Link"><LinkIcon /></button>
        <button className="icon-btn history-action-btn" onClick={() => reFetchHistoryItem(item.url)} title="Retry"><RefreshIcon /></button>
        <button className="icon-btn history-action-btn" onClick={() => window.open(item.url, '_blank')} title="Open Original Link"><PlayIcon /></button>
        
        <div className={`history-status-indicator ${item.status || "completed"}`} title={isDownloading ? `Downloading: ${pct}%` : isFailed ? "Failed" : "Download Complete"}>
          {isDownloading ? (
            <div className="history-spin-loader" />
          ) : isFailed ? (
            <div className="history-fail-indicator"><ErrorIcon /></div>
          ) : (
            <CheckCircleIcon />
          )}
        </div>
        
        {isTauriApp() && (
          <button className="icon-btn history-action-btn" onClick={() => handleOpenDownloadsFolder()} title="Open Downloads Folder"><FolderIcon /></button>
        )}
      </div>
    </li>
  );
}

function isTauriApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return (
    "__TAURI__" in w ||
    "__TAURI_INTERNALS__" in w ||
    "__TAURI_POST_MESSAGE__" in w ||
    !!w.__TAURI_INTERNALS__ ||
    !!w.__TAURI_INVOKE__ ||
    (typeof w.location !== "undefined" && (
      w.location.origin?.startsWith("tauri://") ||
      w.location.hostname === "tauri.localhost"
    ))
  );
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [logoStyle, setLogoStyle] = useState<LogoVariant>("ring");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [url, setUrl] = useState("");

  const [browserCookie, setBrowserCookie] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  // Active view tab inside Media Card: "text" | "images" | "video"
  const [mediaTab, setMediaTab] = useState<"text" | "images" | "video">("images");
  const [previewImage, setPreviewImage] = useState<FormatInfo | null>(null);

  // App states
  const [loading, setLoading] = useState(false);
  const [activeDownloadIds, setActiveDownloadIds] = useState<string[]>([]);
  const [zipping, setZipping] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // User selections
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [audioOnly, setAudioOnly] = useState(false);
  const [streamFilter, setStreamFilter] = useState<"all" | "hd1080" | "hd720" | "sd" | "audio">("all");

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss Toast Notifications
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg("");
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Load Firebase Auth, Theme, Logo & History on mount
  useEffect(() => {
    initAnonymousUser();

    const savedTheme = localStorage.getItem("mediaGrabberTheme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    const savedLogo = localStorage.getItem("mediaGrabberLogoStyle") as LogoVariant | null;
    if (savedLogo) {
      setLogoStyle(savedLogo);
    }

    const savedHistory = localStorage.getItem("mediaGrabberHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    inputRef.current?.focus();
  }, []);

  function handleLogoChange(newLogo: LogoVariant) {
    setLogoStyle(newLogo);
    localStorage.setItem("mediaGrabberLogoStyle", newLogo);
  }

  // Save Theme on change
  useEffect(() => {
    localStorage.setItem("mediaGrabberTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setErrorMsg("");
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error("Clipboard access error", err);
    }
  }

  async function handleCopyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMsg("Text copied to clipboard!");
    } catch (err) {
      setErrorMsg("Failed to copy text to clipboard.");
    }
  }

  async function handleCopyImage(imageUrl: string, note?: string) {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(imageUrl);
        setSuccessMsg(note ? `Copied link for "${note}"!` : "Image link copied to clipboard!");
      }
    } catch (err) {
      setErrorMsg("Failed to copy image link.");
    }
  }

  async function handleFetchInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg("Please paste or type a URL first.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setMediaInfo(null);
    setSelectedFormat("");
    setShowHistory(false);

    try {
      let info: MediaInfo;
      if (isTauriApp()) {
        info = await invoke<MediaInfo>("get_media_info", { url: url.trim() });
      } else {
        const queryUrl = `/api/info?url=${encodeURIComponent(url.trim())}${browserCookie ? `&browser=${encodeURIComponent(browserCookie)}` : ""}`;
        const res = await fetch(queryUrl);
        const textResponse = await res.text();
        let parsedData: any = null;
        try {
          parsedData = JSON.parse(textResponse);
        } catch {
          if (!res.ok) {
            throw new Error(`Server returned status ${res.status}. Please check your link or use the Desktop/Mobile app.`);
          }
          throw new Error("Received an unexpected HTML response from server instead of JSON.");
        }
        if (!res.ok) {
          throw new Error(parsedData?.error || `Failed to fetch media details (${res.status})`);
        }
        info = parsedData;
      }

      if (info) {
        if (!info.security) {
          info.security = {
            is_safe: true,
            risk_level: "safe",
            domain: info.site_name || "web",
            protocol: "https",
            category: "media_stream",
            warnings: [],
          };
        }
        if (!info.formats) info.formats = [];
        if (!info.images) info.images = [];
      }

      setMediaInfo(info);

      // Prioritize Streams & Formats (video tab) first whenever video/audio formats exist
      if (info.formats && info.formats.length > 0) {
        setMediaTab("video");
      } else if (info.images && info.images.length > 0) {
        setMediaTab("images");
      } else {
        setMediaTab("text");
      }

      if (info.formats && info.formats.length > 0) {
        const videoFormats = info.formats.filter((f) => f.vcodec !== "none");
        if (videoFormats.length > 0) {
          const bestFmt =
            videoFormats.find((f) => f.resolution?.includes("1080")) ||
            videoFormats.find((f) => f.resolution?.includes("720") || f.resolution?.includes("HD")) ||
            videoFormats[0];
          setSelectedFormat(bestFmt.format_id);
        } else {
          setSelectedFormat(info.formats[0].format_id);
        }
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(
        error.message ||
          error ||
          "Failed to fetch media details. Please check the URL and your connection."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(targetFormatId?: string, directUrl?: string, itemNote?: string) {
    if (!url || !mediaInfo) return;

    const fmtToUse = targetFormatId || selectedFormat;

    if (!audioOnly && !fmtToUse && !directUrl) {
      setErrorMsg("Please select a download format or asset.");
      return;
    }

    const downloadJobId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const selectedFmtForMeta =
      mediaInfo.formats.find((f) => f.format_id === fmtToUse) ||
      mediaInfo.images?.find((img) => img.format_id === fmtToUse) ||
      null;

    // 1. Create history item immediately with "downloading" status
    const newItem: HistoryItem = {
      id: downloadJobId,
      title: itemNote ? `${mediaInfo.title} (${itemNote})` : mediaInfo.title,
      url: url.trim(),
      thumbnail: directUrl || mediaInfo.thumbnail,
      timestamp: Date.now(),
      format: audioOnly
        ? "Audio (MP3)"
        : selectedFmtForMeta?.asset_type === "video" || directUrl?.includes(".mp4")
        ? "MP4 Video"
        : directUrl
        ? "Image / Asset"
        : "Video",
      assetType: audioOnly
        ? "Audio Stream"
        : selectedFmtForMeta?.asset_type === "video" || directUrl?.includes(".mp4")
        ? "Video Stream"
        : directUrl
        ? "Image Asset"
        : "Media Stream",
      duration: mediaInfo.duration ? new Date(mediaInfo.duration * 1000).toISOString().substring(11, 19) : "00:00:00",
      resolution: selectedFmtForMeta?.resolution || (directUrl?.includes(".mp4") ? "HD Video" : "Asset"),
      size: selectedFmtForMeta?.filesize ? formatBytes(selectedFmtForMeta.filesize) : (audioOnly ? "Audio Track" : "Direct Stream"),
      uploader: mediaInfo.uploader || "User",
      status: "downloading",
      progress: 12,
    };

    // 2. Immediately add to history and save to localStorage
    setHistory((prev) => {
      const updated = [newItem, ...prev.filter(item => item.id !== downloadJobId)].slice(0, 50);
      localStorage.setItem("mediaGrabberHistory", JSON.stringify(updated));
      return updated;
    });

    const activeKeys = [downloadJobId, ...(fmtToUse ? [fmtToUse] : [])];
    setActiveDownloadIds((prev) => [...prev, ...activeKeys]);
    setErrorMsg("");
    setSuccessMsg("Download started! Check progress in History.");

    // 3. Smooth progress simulation ticker while backend runs
    let progressVal = 12;
    const progressInterval = setInterval(() => {
      progressVal = Math.min(94, progressVal + Math.floor(Math.random() * 8) + 4);
      setHistory((prev) =>
        prev.map((item) =>
          item.id === downloadJobId && item.status === "downloading"
            ? { ...item, progress: progressVal }
            : item
        )
      );
    }, 450);

    // 4. Asynchronously perform download without blocking additional downloads
    (async () => {
      try {
        let resMsg = "";
        if (isTauriApp()) {
          resMsg = await invoke<string>("download_media", {
            url: url.trim(),
            formatId: fmtToUse || null,
            audioOnly,
            browserCookie: browserCookie || null,
            directUrl: directUrl || null,
          });
        } else {
          const selectedFmtObj =
            mediaInfo.formats.find((f) => f.format_id === fmtToUse) ||
            mediaInfo.images?.find((img) => img.format_id === fmtToUse);
          const streamUrlToUse = directUrl || selectedFmtObj?.direct_url;

          if (streamUrlToUse || fmtToUse) {
            const isImage =
              selectedFmtObj?.asset_type === "image" ||
              selectedFmtObj?.asset_type === "screenshot" ||
              (directUrl && /\.(jpg|jpeg|png|webp|gif|svg|avif)/i.test(directUrl)) ||
              (itemNote && /(image|screenshot|poster|thumbnail)/i.test(itemNote));

            const ext = audioOnly
              ? "mp3"
              : selectedFmtObj?.ext || (isImage ? "jpg" : "mp4");
            const noteLabel = audioOnly
              ? "Audio_MP3"
              : (itemNote || selectedFmtObj?.resolution || (isImage ? "Asset_Image" : "Media_Stream"));
            const baseName = `${mediaInfo.title || "media"}_${noteLabel}`.replace(/[^a-zA-Z0-9_-]/g, "_");
            const safeName = baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
            
            const downloadApiUrl = `/api/download?url=${encodeURIComponent(url.trim())}&directUrl=${encodeURIComponent(streamUrlToUse || '')}&formatId=${encodeURIComponent(fmtToUse || '')}&audioOnly=${audioOnly}&filename=${encodeURIComponent(safeName)}`;
            
            const a = document.createElement("a");
            a.href = downloadApiUrl;
            a.download = safeName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            resMsg = audioOnly
              ? "Audio MP3 stream download started! Check your Downloads folder."
              : isImage
              ? "Image download started! Check your Downloads folder."
              : "Video stream download started! Check your Downloads folder.";
          } else {
            const res = await fetch("/api/download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: url.trim(),
                formatId: fmtToUse || null,
                audioOnly,
                browserCookie: browserCookie || null,
                directUrl: directUrl || null,
              }),
            });
            const textRes = await res.text();
            let data: any = null;
            try {
              data = JSON.parse(textRes);
            } catch {
              if (!res.ok) throw new Error(`Download server returned error (${res.status})`);
              throw new Error("Received an unexpected HTML response from download server.");
            }
            if (!res.ok) throw new Error(data?.error || "Web download request failed");
            resMsg = data.message || "Download completed successfully!";
          }
        }

        clearInterval(progressInterval);
        // Mark complete in history
        setHistory((prev) => {
          const updated = prev.map((item) =>
            item.id === downloadJobId
              ? { ...item, status: "completed" as const, progress: 100 }
              : item
          );
          localStorage.setItem("mediaGrabberHistory", JSON.stringify(updated));
          return updated;
        });

        // Track download activity in Firebase Analytics
        const isImage =
          selectedFmtForMeta?.asset_type === "image" ||
          selectedFmtForMeta?.asset_type === "screenshot" ||
          (directUrl && /\.(jpg|jpeg|png|webp|gif|svg|avif)/i.test(directUrl)) ||
          (itemNote && /(image|screenshot|poster|thumbnail)/i.test(itemNote));

        const computedAssetType: "image" | "video" | "audio" = audioOnly
          ? "audio"
          : isImage
          ? "image"
          : "video";

        let sourceDomain = "unknown";
        try {
          sourceDomain = mediaInfo.security?.domain || new URL(url.trim()).hostname;
        } catch {
          sourceDomain = "unknown";
        }

        recordDownloadActivity({
          assetType: computedAssetType,
          mediaTitle: (itemNote ? `${mediaInfo.title} (${itemNote})` : mediaInfo.title) || "Media",
          mediaUrl: directUrl || url.trim(),
          sourceDomain,
          format: audioOnly ? "mp3" : (selectedFmtForMeta?.ext || (isImage ? "image" : "mp4")),
          resolution: selectedFmtForMeta?.resolution || (audioOnly ? "Audio" : isImage ? (itemNote || "Image") : "Default"),
          isDesktop: isTauriApp(),
        });

        setSuccessMsg(resMsg || "Download completed successfully!");
      } catch (error: any) {
        clearInterval(progressInterval);
        console.error(error);
        setHistory((prev) => {
          const updated = prev.map((item) =>
            item.id === downloadJobId
              ? { ...item, status: "failed" as const, errorMsg: error.message || String(error) }
              : item
          );
          localStorage.setItem("mediaGrabberHistory", JSON.stringify(updated));
          return updated;
        });
        setErrorMsg(`Download failed: ${error.message || error}`);
      } finally {
        setActiveDownloadIds((prev) => prev.filter((id) => !activeKeys.includes(id)));
      }
    })();
  }

  async function handleDownloadAllZip() {
    if (!mediaInfo || !mediaInfo.images || mediaInfo.images.length === 0) return;

    setZipping(true);
    setErrorMsg("");
    setSuccessMsg("Generating ZIP archive bundle of all media assets...");

    try {
      let blob: Blob | null = null;

      // Try server route first when running on Next.js web server
      if (!isTauriApp()) {
        try {
          const res = await fetch("/api/zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: mediaInfo.title,
              description: mediaInfo.description || mediaInfo.extracted_text,
              uploader: mediaInfo.uploader,
              site_name: mediaInfo.site_name,
              url: url.trim(),
              images: mediaInfo.images,
            }),
          });
          if (res.ok) {
            blob = await res.blob();
          }
        } catch (serverZipErr) {
          console.warn("Server ZIP generation failed, trying client-side JSZip:", serverZipErr);
        }
      }

      // If in Tauri desktop app or server route was unavailable, bundle in-browser via JSZip
      if (!blob) {
        const zip = new JSZip();
        let metaText = `UNIVERSAL MEDIA GRABBER ASSET BUNDLE\n=====================================\n\n`;
        metaText += `Title: ${mediaInfo.title || 'N/A'}\n`;
        metaText += `Source: ${mediaInfo.uploader || mediaInfo.site_name || 'N/A'}\n`;
        metaText += `Original URL: ${url.trim() || 'N/A'}\n\n`;
        zip.file("metadata.txt", metaText);

        const imgFolder = zip.folder("images");
        await Promise.all(
          mediaInfo.images.map(async (imgItem, idx) => {
            let directUrl = imgItem.direct_url;
            if (!directUrl) return;
            while (directUrl && directUrl.includes('directUrl=')) {
              try {
                const part = directUrl.split('directUrl=')[1].split('&')[0];
                directUrl = decodeURIComponent(part);
              } catch (e) {
                break;
              }
            }
            if (directUrl.startsWith('//')) directUrl = `https:${directUrl}`;

            try {
              const r = await fetch(directUrl);
              if (r.ok) {
                const buf = await r.arrayBuffer();
                const ext = imgItem.ext || 'jpg';
                const safeName = (imgItem.note || `asset_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
                imgFolder?.file(`${safeName}.${ext}`, buf);
              }
            } catch (err) {
              console.warn("Client failed to fetch image for zip:", directUrl, err);
            }
          })
        );
        blob = await zip.generateAsync({ type: "blob" });
      }

      const safeTitle = (mediaInfo.title || "media_assets").replace(/[^a-zA-Z0-9_-]/g, "_");
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `[usemediagrabber.vercel.app]_${safeTitle}_media_bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMsg("ZIP Archive Bundle downloaded! Saved to your Downloads folder.");

      let zipDomain = "unknown";
      try {
        zipDomain = mediaInfo.security?.domain || new URL(url.trim()).hostname;
      } catch {
        zipDomain = "unknown";
      }

      recordDownloadActivity({
        assetType: "zip",
        mediaTitle: `${mediaInfo.title || "Media Assets"} (Bundle)`,
        mediaUrl: url.trim(),
        sourceDomain: zipDomain,
        format: "zip",
        resolution: `${mediaInfo.images?.length || 0} assets`,
        isDesktop: isTauriApp(),
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`ZIP generation failed: ${err.message || err}`);
    } finally {
      setZipping(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("mediaGrabberHistory");
  }

  function removeHistoryItem(id: string) {
    setHistory((prev) => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem("mediaGrabberHistory", JSON.stringify(updated));
      return updated;
    });
  }

  async function handleOpenDownloadsFolder(customPath?: string) {
    try {
      if (isTauriApp()) {
        try {
          await invoke("open_downloads_folder", { customPath: customPath || null });
        } catch (innerErr) {
          console.warn("invoke open_downloads_folder failed, falling back to openPath", innerErr);
          const dDir = await downloadDir();
          await openPath(dDir);
        }
      } else {
        setSuccessMsg("Check your Downloads folder for the downloaded files.");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Failed to open downloads folder: ${error?.message || error}`);
    }
  }

  function reFetchHistoryItem(url: string) {
    setUrl(url);
    setShowHistory(false);
  }

  return (
    <div className="app-layout" data-theme={theme}>
      {/* Toast Notifications */}
      <div className="toast-container" aria-live="polite">
        {errorMsg && (
          <div className="toast error-toast" role="alert" onClick={() => setErrorMsg("")} title="Click to dismiss">
            <ErrorIcon /> <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="toast success-toast" role="status" onClick={() => setSuccessMsg("")} title="Click to dismiss">
            <CheckIcon /> <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Top Navbar */}
      <header className="navbar-container">
        <nav className="top-navbar">
          <div className="header-brand">
            <BrandLogoIcon size={38} variant={logoStyle} />
            <h1 className="title">Universal Media Grabber</h1>
          </div>
          <div className="top-actions-group">
            <Link
              href="/admin-imamshaffy"
              className="admin-link-btn"
              title="Admin Dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#ff6600",
                textDecoration: "none",
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(255, 102, 0, 0.35)",
                background: "rgba(255, 102, 0, 0.1)",
              }}
            >
              <ShieldIcon /> Admin
            </Link>
            <button
              className="support-btn"
              onClick={() => setShowSupportModal(true)}
              title="Support Universal Media Grabber"
            >
              <HeartIcon /> Support Us
            </button>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="hero-section">
          <h2 className="hero-title">Universal Link & Media Downloader</h2>
          <p className="subtitle">
            Download videos, audio tracks, App Store screenshots, and high-res media from any link.
          </p>
        </div>

        <section className="search-section card">
          <div className="search-tabs">
            <button
              className={`tab-btn ${!showHistory ? "active" : ""}`}
              onClick={() => setShowHistory(false)}
            >
              Grabber
            </button>
            <button
              className={`tab-btn ${showHistory ? "active" : ""}`}
              onClick={() => setShowHistory(true)}
            >
              <HistoryIcon /> History ({history.length})
            </button>
          </div>

          {!showHistory ? (
            <>
              <form className="search-form" onSubmit={handleFetchInfo}>
                <div className="input-wrapper">
                  <input
                    ref={inputRef}
                    className="url-input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.currentTarget.value)}
                    placeholder="Paste link here (YouTube, App Store, Instagram, TikTok, Website...)"
                    aria-label="Media URL"
                    disabled={loading}
                  />
                  <div className="input-actions">
                    <button
                      type="button"
                      className="paste-btn"
                      onClick={handlePasteFromClipboard}
                      title="Paste URL from Clipboard"
                    >
                      <ClipboardIcon /> Paste
                    </button>
                    <button
                      type="button"
                      className="icon-btn settings-toggle"
                      onClick={() => setShowSettings(!showSettings)}
                      aria-label="Toggle Settings"
                      title="Advanced Settings"
                    >
                      <SettingsIcon />
                    </button>
                  </div>
                </div>

                <button
                  className={`primary-btn ${loading ? "loading" : ""}`}
                  type="submit"
                  disabled={loading || !url.trim()}
                >
                  {loading ? (
                    <span className="loader"></span>
                  ) : (
                    <>
                      <SearchIcon /> Fetch Assets
                    </>
                  )}
                </button>
              </form>

              {showSettings && (
                <div className="advanced-settings slide-down">
                  <div className="form-group">
                    <label htmlFor="browser-select">Instagram & Restricted Site Auth (Browser Cookies)</label>
                    <select
                      id="browser-select"
                      className="select-input"
                      value={browserCookie}
                      onChange={(e) => setBrowserCookie(e.currentTarget.value)}
                    >
                      <option value="">Anonymous (No Authentication)</option>
                      <option value="chrome">Chrome</option>
                      <option value="edge">Edge</option>
                      <option value="firefox">Firefox</option>
                      <option value="brave">Brave</option>
                      <option value="opera">Opera</option>
                      <option value="safari">Safari</option>
                    </select>
                    <p className="help-text">Select browser to extract logged-in session cookies for restricted links.</p>
                  </div>

                  <div className="form-group" style={{ marginTop: "1rem" }}>
                    <label htmlFor="logo-select">App Brand Logo Variety</label>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <select
                        id="logo-select"
                        className="select-input"
                        value={logoStyle}
                        onChange={(e) => handleLogoChange(e.currentTarget.value as LogoVariant)}
                      >
                        <option value="ring">Variety 1: Orbital Downloader Ring (Default)</option>
                        <option value="play_magnet">Variety 2: Media Play & Magnet Arrow</option>
                        <option value="cyber_shield">Variety 3: Cyber Security Stream Shield</option>
                        <option value="gem">Variety 4: Hexagonal Prism Gem Core</option>
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                        <BrandLogoIcon size={34} variant={logoStyle} />
                      </div>
                    </div>
                    <p className="help-text">Choose your favorite modern SVG logo style.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="history-section fade-in">
              <div className="history-header">
                <h3>Recent Downloads</h3>
                {history.length > 0 && (
                  <button className="clear-history-btn" onClick={clearHistory}>
                    <TrashIcon /> Clear All
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="empty-history">
                  <p>No downloads yet. Your recent downloads will appear here.</p>
                </div>
              ) : (
                <ul className="history-list">
                  {history.map((item) => (
                    <HistoryItemCard 
                      key={item.id} 
                      item={item} 
                      removeHistoryItem={removeHistoryItem} 
                      handleOpenDownloadsFolder={handleOpenDownloadsFolder} 
                      reFetchHistoryItem={reFetchHistoryItem} 
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Empty State */}
        {!mediaInfo && !loading && !showHistory && (
          <div className="empty-state">
            <div className="empty-icon">🌐</div>
            <p>Paste any URL above — YouTube, Apple App Store, Google Play, Microsoft Store, Instagram, TikTok, or web page.</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !mediaInfo && !showHistory && (
          <div className="card skeleton-card fade-in">
            <div className="skeleton-loading-badge">
              <span className="loader sm-loader"></span>
              <span>Analyzing link & inspecting available streams...</span>
            </div>
            <div className="skeleton-header">
              <div className="skeleton-img"></div>
              <div className="skeleton-details">
                <div className="skeleton-line title-line"></div>
                <div className="skeleton-line sub-line"></div>
              </div>
            </div>
            <div className="skeleton-body">
              <div className="skeleton-block"></div>
              <div className="skeleton-block"></div>
            </div>
          </div>
        )}

        {/* Media Details & Security Vetting Card */}
        {mediaInfo && !showHistory && (
          <section className="media-card card fade-in">
            {/* Security Vetting Badge Header */}
            <div className={`security-bar security-${(mediaInfo.security?.risk_level || "safe").toLowerCase()}`}>
              <div className="security-title">
                <ShieldIcon />
                <span>
                  Link Vetting Audit: <strong>{(mediaInfo.security?.risk_level || "SAFE").toUpperCase()}</strong> ({mediaInfo.security?.domain || mediaInfo.site_name || "web"})
                </span>
              </div>
              <div className="security-badges">
                <span className="sec-tag">{(mediaInfo.security?.protocol || "HTTPS").toUpperCase()}</span>
                <span className="sec-tag">{(mediaInfo.security?.category || "media_stream").replace("_", " ").toUpperCase()}</span>
              </div>
            </div>

            {mediaInfo.security?.warnings && mediaInfo.security.warnings.length > 0 && (
              <div className="security-warnings">
                {mediaInfo.security.warnings.map((w, idx) => (
                  <p key={idx} className="warning-item">
                    ⚠️ {w}
                  </p>
                ))}
              </div>
            )}

            <div className="media-header">
              <div className="media-thumbnail-wrapper">
                {mediaInfo.thumbnail || (mediaInfo.images && mediaInfo.images.length > 0 && mediaInfo.images[0].direct_url) ? (
                  <img
                    src={mediaInfo.thumbnail || (mediaInfo.images && mediaInfo.images[0].direct_url)}
                    alt={mediaInfo.title}
                    className="media-thumbnail"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="thumbnail-placeholder">
                    <BrandLogoIcon size={38} />
                  </div>
                )}
                {mediaInfo.duration && (
                  <span className="media-duration">
                    {Math.floor(mediaInfo.duration / 60)}:
                    {(mediaInfo.duration % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>

              <div className="media-info">
                <h2 className="media-title" title={mediaInfo.title}>
                  {mediaInfo.title}
                </h2>
                <div className="media-meta">
                  {mediaInfo.uploader && <span className="uploader">Source: {mediaInfo.uploader}</span>}
                  {mediaInfo.site_name && <span className="site-name"> • {mediaInfo.site_name}</span>}
                </div>
                {mediaInfo.description && (
                  <p className="media-description">
                    {mediaInfo.description.length > 180
                      ? mediaInfo.description.substring(0, 180) + "..."
                      : mediaInfo.description}
                  </p>
                )}
              </div>
            </div>

            {/* Asset Category View Switcher Tabs */}
            <div className="asset-type-tabs">
              {mediaInfo.formats && mediaInfo.formats.length > 0 && (
                <button
                  className={`asset-tab-btn ${mediaTab === "video" ? "active" : ""}`}
                  onClick={() => setMediaTab("video")}
                >
                  <VideoIcon /> Streams & Formats ({mediaInfo.formats.length})
                </button>
              )}
              {mediaInfo.images && mediaInfo.images.length > 0 && (
                <button
                  className={`asset-tab-btn ${mediaTab === "images" ? "active" : ""}`}
                  onClick={() => setMediaTab("images")}
                >
                  <ImageIcon /> Images & Thumbnails ({mediaInfo.images.length})
                </button>
              )}
              <button
                className={`asset-tab-btn ${mediaTab === "text" ? "active" : ""}`}
                onClick={() => setMediaTab("text")}
              >
                📝 Text & Overview
              </button>
            </div>

            {/* Tab 1: Images & App Store Screenshots Grid */}
            {mediaTab === "images" && mediaInfo.images && mediaInfo.images.length > 0 && (
              <div className="images-grid-container fade-in">
                <div className="images-tab-header">
                  <span className="images-count-label">
                    {mediaInfo.images.length} High-Resolution Assets Extracted
                  </span>
                  <button
                    className="primary-btn sm-btn zip-all-btn"
                    onClick={handleDownloadAllZip}
                    disabled={zipping}
                    title="Download all screenshots & logos as a single ZIP file"
                  >
                    {zipping ? (
                      <>
                        <span className="loader sm-loader"></span> Zipping Assets...
                      </>
                    ) : (
                      <>
                        📦 Zip & Download All ({mediaInfo.images.length})
                      </>
                    )}
                  </button>
                </div>
                <div className="images-grid">
                  {mediaInfo.images.map((imgItem, idx) => (
                    <div key={imgItem.format_id ? `${imgItem.format_id}_${idx}` : `img_key_${idx}`} className="image-card">
                      <div
                        className="image-preview-wrapper"
                        onClick={() => setPreviewImage(imgItem)}
                        title="Click to expand / view high-res image"
                      >
                        {imgItem.direct_url ? (
                          <img src={imgItem.direct_url} alt={imgItem.note || "Asset"} className="image-preview" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="image-placeholder">Asset Image</div>
                        )}
                        <span className="image-tag">{imgItem.ext.toUpperCase()}</span>
                        <div className="image-hover-overlay">
                          <ExpandIcon /> Click to Expand
                        </div>
                      </div>
                      <div className="image-card-footer">
                        <span className="image-note" title={imgItem.note || imgItem.resolution}>
                          {imgItem.note || imgItem.resolution}
                        </span>
                        <div className="image-card-actions">
                          <button
                            className="secondary-btn image-action-btn"
                            onClick={() => imgItem.direct_url && handleCopyImage(imgItem.direct_url, imgItem.note)}
                            title="Copy Image Link to Clipboard"
                          >
                            <ClipboardIcon /> Copy
                          </button>
                          <button
                            className="secondary-btn image-action-btn primary-subtle"
                            disabled={activeDownloadIds.includes(imgItem.format_id)}
                            onClick={() => handleDownload(imgItem.format_id, imgItem.direct_url, imgItem.note)}
                            title="Download file directly to your local computer"
                          >
                            {activeDownloadIds.includes(imgItem.format_id) ? (
                              <span className="loader sm-loader"></span>
                            ) : (
                              <>
                                <DownloadIcon /> Save
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Text & Overview Details Tab */}
            {mediaTab === "text" && (
              <div className="text-details-container fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                <div className="text-overview-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0, flex: 1 }}>{mediaInfo.title}</h3>
                    <button
                      className="secondary-btn"
                      onClick={() => handleCopyText(`${mediaInfo.title}\n\n${mediaInfo.description || ''}\n\n${mediaInfo.extracted_text || ''}`)}
                      title="Copy all text to clipboard"
                    >
                      <ClipboardIcon /> Copy Text
                    </button>
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6", margin: "0 0 1rem 0" }}>
                    {mediaInfo.description || mediaInfo.extracted_text || "No detailed description available."}
                  </p>
                  {mediaInfo.extracted_text && mediaInfo.extracted_text !== mediaInfo.description && (
                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", marginTop: "1rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)", marginBottom: "0.5rem" }}>Extracted Page Content:</h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", whiteSpace: "pre-line", lineHeight: "1.5" }}>
                        {mediaInfo.extracted_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Video Streams & Audio Controls Tab */}
            {mediaTab === "video" && mediaInfo.formats && mediaInfo.formats.length > 0 && (
              <div className="download-controls fade-in">
                {/* Modern Audio Toggle Card */}
                <div className="audio-toggle-card">
                  <div className="audio-toggle-left">
                    <div className="audio-toggle-icon">🎵</div>
                    <div className="audio-toggle-info">
                      <span className="audio-toggle-title">Extract Audio Track (MP3)</span>
                      <span className="audio-toggle-desc">Download standalone audio file without video stream</span>
                    </div>
                  </div>
                  <label className="toggle-switch" htmlFor="audio-toggle">
                    <input
                      type="checkbox"
                      checked={audioOnly}
                      onChange={(e) => {
                        const isAudio = e.currentTarget.checked;
                        setAudioOnly(isAudio);
                        if (isAudio) {
                          const audioFmt = mediaInfo.formats.find((f) => f.asset_type === "audio" || f.vcodec === "none");
                          if (audioFmt) setSelectedFormat(audioFmt.format_id);
                        } else {
                          const vidFmt = mediaInfo.formats.find((f) => f.asset_type !== "audio" && f.vcodec !== "none");
                          if (vidFmt) setSelectedFormat(vidFmt.format_id);
                        }
                      }}
                      id="audio-toggle"
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                {(() => {
                  const videoFormats = mediaInfo.formats.filter((f) => f.asset_type !== "audio" && f.vcodec !== "none");
                  const audioFormats = mediaInfo.formats.filter((f) => f.asset_type === "audio" || f.vcodec === "none");
                  const displayFormats = audioOnly
                    ? (audioFormats.length > 0 ? audioFormats : mediaInfo.formats)
                    : (videoFormats.length > 0 ? videoFormats : mediaInfo.formats);

                  const bestFormatId = displayFormats.length > 0 ? displayFormats[0].format_id : null;
                  const selectedFmtObj = mediaInfo.formats.find((f) => f.format_id === selectedFormat);

                  let downloadBtnLabel = "Download Selected Stream";
                  if (audioOnly) {
                    downloadBtnLabel = "Download Audio Track (MP3)";
                  } else if (selectedFmtObj) {
                    const cleanTitle = parseFormatDisplay(selectedFmtObj).title;
                    downloadBtnLabel = `Download ${cleanTitle} (${selectedFmtObj.ext.toUpperCase()})`;
                  }

                  // Counts for filters
                  const hd1080Count = displayFormats.filter(f => {
                    const res = (f.resolution || "").toLowerCase();
                    return res.includes("1080") || res.includes("1440") || res.includes("2160") || res.includes("4k") || res.includes("2k");
                  }).length;
                  const hd720Count = displayFormats.filter(f => (f.resolution || "").toLowerCase().includes("720")).length;
                  const sdCount = displayFormats.filter(f => {
                    const res = (f.resolution || "").toLowerCase();
                    return res.includes("480") || res.includes("360") || res.includes("240") || res.includes("144");
                  }).length;
                  const audioCount = displayFormats.filter(f => f.asset_type === "audio" || f.vcodec === "none").length;

                  const filteredFormats = displayFormats.filter(fmt => {
                    if (streamFilter === "all") return true;
                    const res = (fmt.resolution || "").toLowerCase();
                    const isAud = fmt.asset_type === "audio" || fmt.vcodec === "none";
                    if (streamFilter === "hd1080") return res.includes("1080") || res.includes("1440") || res.includes("2160") || res.includes("4k") || res.includes("2k");
                    if (streamFilter === "hd720") return res.includes("720");
                    if (streamFilter === "sd") return res.includes("480") || res.includes("360") || res.includes("240") || res.includes("144");
                    if (streamFilter === "audio") return isAud;
                    return true;
                  });

                  const isMainBtnLoading = selectedFormat ? activeDownloadIds.includes(selectedFormat) : false;

                  return (
                    <>
                      {/* Top Prominent Quick Action Download Banner - ALWAYS visible at top so user never has to scroll */}
                      <div className="stream-action-banner">
                        <div className="stream-action-summary">
                          <span className="stream-action-badge">READY TO DOWNLOAD</span>
                          <div className="stream-action-title">
                            <strong>{audioOnly ? "🎵 MP3 Audio Track" : (selectedFmtObj ? parseFormatDisplay(selectedFmtObj).title : "Select Stream Quality")}</strong>
                            {selectedFmtObj && (
                              <span className="stream-action-meta">
                                • {selectedFmtObj.ext.toUpperCase()} • {selectedFmtObj.filesize ? formatBytes(selectedFmtObj.filesize) : (audioOnly ? "Audio Stream" : "Direct Stream")}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          className={`primary-btn top-download-btn ${isMainBtnLoading ? "loading" : ""}`}
                          onClick={() => handleDownload()}
                          disabled={!audioOnly && !selectedFormat}
                        >
                          {isMainBtnLoading ? (
                            <>
                              <span className="loader"></span> Downloading Media...
                            </>
                          ) : (
                            <>
                              <DownloadIcon /> {downloadBtnLabel}
                            </>
                          )}
                        </button>
                      </div>

                      <div className="custom-quality-container">
                        <div className="quality-header-row">
                          <span className="quality-header-label">
                            {audioOnly ? (
                              <span style={{ color: "var(--accent)" }}>🎵 Audio Track Streams</span>
                            ) : (
                              <>
                                <VideoIcon /> Select Video Quality Stream
                              </>
                            )}
                          </span>
                          <span className="help-text">
                            Showing {filteredFormats.length} of {displayFormats.length} Streams
                          </span>
                        </div>

                        {/* Stream Resolution Filter Chips */}
                        <div className="quality-filter-bar">
                          <button
                            type="button"
                            className={`filter-chip ${streamFilter === "all" ? "active" : ""}`}
                            onClick={() => setStreamFilter("all")}
                          >
                            All ({displayFormats.length})
                          </button>
                          {hd1080Count > 0 && (
                            <button
                              type="button"
                              className={`filter-chip ${streamFilter === "hd1080" ? "active" : ""}`}
                              onClick={() => setStreamFilter("hd1080")}
                            >
                              ★ 1080p+ HD ({hd1080Count})
                            </button>
                          )}
                          {hd720Count > 0 && (
                            <button
                              type="button"
                              className={`filter-chip ${streamFilter === "hd720" ? "active" : ""}`}
                              onClick={() => setStreamFilter("hd720")}
                            >
                              720p HD ({hd720Count})
                            </button>
                          )}
                          {sdCount > 0 && (
                            <button
                              type="button"
                              className={`filter-chip ${streamFilter === "sd" ? "active" : ""}`}
                              onClick={() => setStreamFilter("sd")}
                            >
                              SD 480p/360p ({sdCount})
                            </button>
                          )}
                          {audioCount > 0 && (
                            <button
                              type="button"
                              className={`filter-chip ${streamFilter === "audio" ? "active" : ""}`}
                              onClick={() => {
                                setStreamFilter("audio");
                                setAudioOnly(true);
                              }}
                            >
                              🎵 Audio ({audioCount})
                            </button>
                          )}
                        </div>

                        {/* Interactive Stream Quality Cards Grid with direct download buttons */}
                        <div className="quality-grid">
                          {filteredFormats.map((fmt) => {
                            const isSelected = selectedFormat === fmt.format_id;
                            const isBest = fmt.format_id === bestFormatId && !audioOnly;
                            const { title: resTitle, dim: dimTag } = parseFormatDisplay(fmt);
                            const isAudio = fmt.asset_type === "audio" || fmt.vcodec === "none";
                            const isCardDownloading = activeDownloadIds.includes(fmt.format_id);

                            return (
                              <div
                                key={fmt.format_id}
                                className={`quality-card ${isSelected ? "selected" : ""}`}
                                onClick={() => {
                                  setSelectedFormat(fmt.format_id);
                                  if (isAudio && !audioOnly) setAudioOnly(true);
                                  if (!isAudio && audioOnly) setAudioOnly(false);
                                }}
                              >
                                <div className="quality-card-header">
                                  <div className="quality-header-content">
                                    {isBest && (
                                      <div className="quality-badge-row">
                                        <span className="recommended-pill">★ BEST QUALITY</span>
                                      </div>
                                    )}
                                    <div className="quality-main-title">
                                      <span>{resTitle}</span>
                                    </div>
                                  </div>
                                  <div className={`radio-indicator ${isSelected ? "selected" : "unselected"}`}>
                                    {isSelected ? <CheckIcon /> : null}
                                  </div>
                                </div>

                                <div className="quality-card-specs">
                                  <span className="spec-chip format">{fmt.ext.toUpperCase()}</span>
                                  {dimTag ? <span className="spec-chip dim">{dimTag}</span> : null}
                                  {fmt.fps ? <span className="spec-chip fps">{fmt.fps} fps</span> : null}
                                </div>

                                <div className="quality-card-footer">
                                  <div className="quality-card-meta-col">
                                    <span className="meta-size">
                                      {fmt.filesize ? formatBytes(fmt.filesize) : (isAudio ? "MP3 Audio Track" : "Direct Stream")}
                                    </span>
                                    <span className="meta-codec">
                                      {fmt.vcodec !== "none" ? "H.264 / AAC" : "Audio Only"}
                                    </span>
                                  </div>

                                  {/* Direct Download Button Right On The Card */}
                                  <button
                                    type="button"
                                    className={`quick-card-download-btn ${isCardDownloading ? "loading" : ""}`}
                                    title={`Download ${resTitle}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFormat(fmt.format_id);
                                      if (isAudio && !audioOnly) setAudioOnly(true);
                                      if (!isAudio && audioOnly) setAudioOnly(false);
                                      handleDownload(fmt.format_id);
                                    }}
                                  >
                                    {isCardDownloading ? (
                                      <>
                                        <span className="loader-mini"></span> Downloading...
                                      </>
                                    ) : (
                                      <>
                                        <DownloadIcon /> Download
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        className={`primary-btn download-btn ${isMainBtnLoading ? "loading" : ""}`}
                        onClick={() => handleDownload()}
                        disabled={!audioOnly && !selectedFormat}
                      >
                        {isMainBtnLoading ? (
                          <>
                            <span className="loader"></span> Downloading Media Stream...
                          </>
                        ) : (
                          <>
                            <DownloadIcon /> {downloadBtnLabel}
                          </>
                        )}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {/* App Footer */}
        <footer className="app-footer">
          <div className="footer-links">
            <button className="footer-link-btn" onClick={() => setLegalModal("privacy")}>
              Privacy Policy
            </button>
            <span className="dot">•</span>
            <button className="footer-link-btn" onClick={() => setLegalModal("terms")}>
              Terms & Legals
            </button>
            <span className="dot">•</span>
            <Link href="/privacy" className="footer-link">
              Web Privacy
            </Link>
            <span className="dot">•</span>
            <Link href="/terms" className="footer-link">
              Web Terms
            </Link>
          </div>
          <p className="footer-copy">
            Built with ❤️ by{" "}
            <a
              href="https://bimex-group.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="bimex-link"
            >
              Bimex Group
            </a>{" "}
            • Universal Media Grabber
          </p>
        </footer>
      </main>

      {/* Support Flutterwave Modal */}
      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}

      {/* Modal Dialog for Desktop & In-App Viewing */}
      {legalModal && (
        <div className="modal-overlay fade-in" onClick={() => setLegalModal(null)}>
          <div className="modal-card card slide-down" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{legalModal === "privacy" ? "Privacy Policy" : "Terms of Service & Legals"}</h2>
              <button className="icon-btn close-modal-btn" onClick={() => setLegalModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {legalModal === "privacy" ? (
                <>
                  <h3>1. Privacy-First Philosophy</h3>
                  <p>Universal Media Grabber does not track, sell, or collect your media links or browsing history.</p>
                  <h3>2. Local Processing</h3>
                  <p>All processing runs locally on your machine. Downloads go directly to your Downloads folder.</p>
                  <h3>3. Local Browser Cookies</h3>
                  <p>Optional cookie extraction for Instagram rate limits is read locally and never uploaded anywhere.</p>
                  <h3>4. Local Data Retention</h3>
                  <p>Download history is stored locally in your browser/app via localStorage and can be cleared anytime.</p>
                </>
              ) : (
                <>
                  <h3>1. Fair Use Policy</h3>
                  <p>Provided for personal, fair-use media downloading, archiving, education, and accessibility purposes.</p>
                  <h3>2. Copyright Responsibility</h3>
                  <p>Users are responsible for complying with copyright laws and platform terms of service.</p>
                  <h3>3. Security & Malware Guard</h3>
                  <p>Includes built-in link vetting to block malicious protocols, SSRF targets, and executable binary risks.</p>
                  <h3>4. Disclaimer of Warranties</h3>
                  <p>Software is provided "AS IS" without warranty of any kind.</p>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="primary-btn sm-btn" onClick={() => setLegalModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Lightbox Modal for High-Res Image Viewing */}
      {previewImage && (
        <div className="modal-overlay lightbox-overlay fade-in" onClick={() => setPreviewImage(null)}>
          <div className="modal-card lightbox-card card slide-down" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="lightbox-header-info">
                <h3>{previewImage.note || previewImage.resolution || "Expanded Image Preview"}</h3>
                <span className="sec-tag">{previewImage.ext.toUpperCase()}</span>
              </div>
              <button className="icon-btn close-modal-btn" onClick={() => setPreviewImage(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body lightbox-body">
              {previewImage.direct_url ? (
                <img
                  src={previewImage.direct_url}
                  alt={previewImage.note || "High Resolution Preview"}
                  className="lightbox-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p>No high-resolution preview available.</p>
              )}
            </div>
            <div className="modal-footer lightbox-footer">
              <button
                className="secondary-btn"
                onClick={() => previewImage.direct_url && handleCopyImage(previewImage.direct_url, previewImage.note)}
              >
                <ClipboardIcon /> Copy Link
              </button>
              <button
                className="primary-btn sm-btn"
                disabled={activeDownloadIds.includes(previewImage.format_id)}
                onClick={() => {
                  if (previewImage.direct_url) {
                    handleDownload(previewImage.format_id, previewImage.direct_url, previewImage.note);
                  }
                }}
              >
                {activeDownloadIds.includes(previewImage.format_id) ? (
                  <>
                    <span className="loader sm-loader"></span> Downloading...
                  </>
                ) : (
                  <>
                    <DownloadIcon /> Save to Computer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
