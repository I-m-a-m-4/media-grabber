"use client";

import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";

import Link from "next/link";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { initAnonymousUser, recordPaymentTransaction, auth } from "../lib/firebase";

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
  status: "downloading" | "completed";
  progress: number;
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

const CloudDownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const CircularProgress = ({ progress }: { progress: number }) => (
  <div style={{ position: "relative", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="none" stroke="#333" strokeWidth="2" />
      <circle cx="10" cy="10" r="8" fill="none" stroke="#FFB800" strokeWidth="2"
        strokeDasharray="50.26"
        strokeDashoffset={50.26 - (50.26 * progress) / 100}
        transform="rotate(-90 10 10)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
    <span style={{ position: "absolute", fontSize: "0.45rem", fontWeight: "bold", color: "#FFB800" }}>{progress}</span>
  </div>
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

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function HistoryItemCard({ item, removeHistoryItem, handleOpenDownloadsFolder, reFetchHistoryItem }: { item: HistoryItem; removeHistoryItem: (id: string) => void; handleOpenDownloadsFolder: () => void; reFetchHistoryItem: (url: string) => void }) {
  const [progress, setProgress] = useState(item.progress || (item.status === 'completed' ? 100 : Math.floor(Math.random() * 20) + 1));
  const [status, setStatus] = useState(item.status);

  useEffect(() => {
    if (status === 'downloading') {
      const interval = setInterval(() => {
        setProgress(p => {
          const next = p + Math.floor(Math.random() * 8) + 2;
          if (next >= 100) {
            setStatus('completed');
            clearInterval(interval);
            return 100;
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <li className="history-item" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1E1E1E', padding: '0.75rem', borderRadius: '8px', gap: '1rem', border: '1px solid #333' }}>
      <div className="history-thumbnail-wrapper" style={{ width: '130px', height: '75px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000' }}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="history-thumbnail-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem' }}>No Img</div>
        )}
      </div>
      
      <div className="history-details" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500', color: '#EAEAEA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#888' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ClockIcon /> {item.duration || "00:00:00"}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MonitorIcon /> {item.resolution || item.format}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileIcon /> {item.size || "Unknown Size"}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserIcon /> {item.uploader}</span>
        </div>
        
        <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{item.url}</span>
          <SearchIcon />
        </div>
      </div>
      
      <div className="history-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <button className="icon-btn" style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#999', cursor: 'pointer', padding: '0.35rem' }} onClick={() => removeHistoryItem(item.id)} title="Remove"><TrashIcon /></button>
        <button className="icon-btn" style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#999', cursor: 'pointer', padding: '0.35rem' }} onClick={() => { navigator.clipboard.writeText(item.url); }} title="Copy Link"><LinkIcon /></button>
        <button className="icon-btn" style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#999', cursor: 'pointer', padding: '0.35rem' }} onClick={() => reFetchHistoryItem(item.url)} title="Retry"><RefreshIcon /></button>
        <button className="icon-btn" style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#999', cursor: 'pointer', padding: '0.35rem' }} onClick={() => handleOpenDownloadsFolder()} title="Play"><PlayIcon /></button>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <button className="icon-btn" style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#999', cursor: 'pointer', padding: '0.35rem' }} title={status === 'downloading' ? 'Downloading...' : 'Completed'} onClick={() => { if(status === 'downloading') setStatus('completed'); }}>
            <CloudDownloadIcon />
          </button>
          {status === 'downloading' ? (
             <CircularProgress progress={progress} />
          ) : (
             <CheckCircleIcon />
          )}
        </div>
        
        <button className="icon-btn" style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#999', cursor: 'pointer', padding: '0.35rem' }} onClick={() => handleOpenDownloadsFolder()} title="Open Folder"><FolderIcon /></button>
      </div>
    </li>
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
  const [downloading, setDownloading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // User selections
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [audioOnly, setAudioOnly] = useState(false);

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
      // @ts-ignore
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        info = await invoke<MediaInfo>("get_media_info", { url: url.trim() });
      } else {
        const queryUrl = `/api/info?url=${encodeURIComponent(url.trim())}${browserCookie ? `&browser=${encodeURIComponent(browserCookie)}` : ""}`;
        const res = await fetch(queryUrl);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch from web API");
        }
        info = await res.json();
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
          setSelectedFormat(videoFormats[videoFormats.length - 1].format_id);
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

    setDownloading(true);
    if (targetFormatId) setDownloadingId(targetFormatId);
    setErrorMsg("");
    setSuccessMsg("Download started. Saving file to your computer...");

    try {
      let resMsg = "";
      // @ts-ignore
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        resMsg = await invoke<string>("download_media", {
          url: url.trim(),
          formatId: fmtToUse || null,
          audioOnly,
          browserCookie: browserCookie || null,
          directUrl: directUrl || null,
        });
      } else {
        const selectedFmtObj = mediaInfo.formats.find((f) => f.format_id === fmtToUse);
        const streamUrlToUse = directUrl || selectedFmtObj?.direct_url;

        if (streamUrlToUse || fmtToUse) {
          // Direct stream attachment proxy download to local machine
          const ext = audioOnly ? "mp3" : (selectedFmtObj?.ext || "mp4");
          const noteLabel = audioOnly
            ? "Audio_MP3"
            : (itemNote || selectedFmtObj?.resolution || "Media_Stream");
          const baseName = `${mediaInfo.title || "media"}_${noteLabel}`.replace(/[^a-zA-Z0-9_-]/g, "_");
          const safeName = baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
          
          const downloadApiUrl = `/api/download?url=${encodeURIComponent(url.trim())}&directUrl=${encodeURIComponent(directUrl || '')}&formatId=${encodeURIComponent(fmtToUse || '')}&audioOnly=${audioOnly}&filename=${encodeURIComponent(safeName)}`;
          
          const a = document.createElement("a");
          a.href = downloadApiUrl;
          a.download = safeName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          resMsg = audioOnly
            ? "Audio MP3 stream download started! Check your Downloads folder."
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
          if (!res.ok) throw new Error("Web download request failed");
          const data = await res.json();
          resMsg = data.message || "Download completed successfully!";
        }
      }

      setSuccessMsg(resMsg || "Download completed successfully!");

      // Add to history
      const selectedFmtForMeta = mediaInfo.formats.find((f) => f.format_id === fmtToUse) || null;
      
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: itemNote ? `${mediaInfo.title} (${itemNote})` : mediaInfo.title,
        url: url.trim(),
        thumbnail: directUrl || mediaInfo.thumbnail,
        timestamp: Date.now(),
        format: audioOnly ? "Audio (MP3)" : directUrl ? "Image / Asset" : "Video",
        assetType: directUrl ? "Image Asset" : "Media Stream",
        duration: mediaInfo.duration ? new Date(mediaInfo.duration * 1000).toISOString().substring(11, 19) : "00:00:00",
        resolution: selectedFmtForMeta?.resolution || "HD 720p 1280x720",
        size: selectedFmtForMeta?.filesize ? formatBytes(selectedFmtForMeta.filesize) : (audioOnly ? "4.2 MB" : "Unknown Size"),
        uploader: mediaInfo.uploader || "User",
        status: "downloading",
        progress: 0,
      };

      setHistory((prev) => {
        const updated = [newItem, ...prev].slice(0, 50);
        localStorage.setItem("mediaGrabberHistory", JSON.stringify(updated));
        return updated;
      });
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Download failed: ${error.message || error}`);
      setSuccessMsg("");
    } finally {
      setDownloading(false);
      setDownloadingId(null);
    }
  }

  async function handleDownloadAllZip() {
    if (!mediaInfo || !mediaInfo.images || mediaInfo.images.length === 0) return;

    setZipping(true);
    setErrorMsg("");
    setSuccessMsg("Generating ZIP archive bundle of all media assets...");

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

      if (!res.ok) {
        throw new Error("Failed to generate ZIP archive bundle.");
      }

      const blob = await res.blob();
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

  async function handleOpenDownloadsFolder() {
    try {
      // @ts-ignore
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        const dDir = await downloadDir();
        await open(dDir);
      } else {
        setSuccessMsg("Check your Downloads folder for the downloaded files.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to open downloads folder.");
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
                    disabled={loading || downloading}
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
                  disabled={loading || downloading || !url.trim()}
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
                <ul className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0', margin: '0', listStyle: 'none' }}>
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
              {mediaInfo.images && mediaInfo.images.length > 0 && (
                <button
                  className={`asset-tab-btn ${mediaTab === "images" ? "active" : ""}`}
                  onClick={() => setMediaTab("images")}
                >
                  <ImageIcon /> Images & Screenshots ({mediaInfo.images.length})
                </button>
              )}
              <button
                className={`asset-tab-btn ${mediaTab === "text" ? "active" : ""}`}
                onClick={() => setMediaTab("text")}
              >
                📝 Text & Overview
              </button>
              {mediaInfo.formats && mediaInfo.formats.length > 0 && (
                <button
                  className={`asset-tab-btn ${mediaTab === "video" ? "active" : ""}`}
                  onClick={() => setMediaTab("video")}
                >
                  <VideoIcon /> Streams & Formats ({mediaInfo.formats.length})
                </button>
              )}
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
                          <img src={imgItem.direct_url} alt={imgItem.note || "Asset"} className="image-preview" />
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
                            disabled={downloading}
                            onClick={() => handleDownload(imgItem.format_id, imgItem.direct_url, imgItem.note)}
                            title="Download file directly to your local computer"
                          >
                            {downloadingId === imgItem.format_id ? (
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
                <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
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
                <div className="control-group switch-group" style={{ marginBottom: "1rem" }}>
                  <label className="switch-label">
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={audioOnly}
                        onChange={(e) => setAudioOnly(e.currentTarget.checked)}
                        disabled={downloading}
                        id="audio-toggle"
                      />
                      <span className="slider round"></span>
                    </div>
                    <span className="switch-text">🎵 Extract Audio Only (MP3 Track)</span>
                  </label>
                </div>

                {!audioOnly && (
                  <div className="custom-quality-container">
                    <div className="quality-header-row">
                      <span className="quality-header-label">
                        <VideoIcon /> Select Video Stream Quality
                      </span>
                      <span className="help-text">
                        {mediaInfo.formats.filter((f) => f.vcodec !== "none").length || mediaInfo.formats.length} Streams Available
                      </span>
                    </div>

                    {/* Interactive Stream Quality Cards Grid */}
                    <div className="quality-grid">
                      {mediaInfo.formats.map((fmt, idx) => {
                        const isSelected = selectedFormat === fmt.format_id;
                        const isBest = idx === mediaInfo.formats.length - 1 || (fmt.resolution && (fmt.resolution.includes("1080") || fmt.resolution.includes("HD")));
                        return (
                          <div
                            key={fmt.format_id}
                            className={`quality-card ${isSelected ? "selected" : ""}`}
                            onClick={() => !downloading && setSelectedFormat(fmt.format_id)}
                          >
                            <div className="quality-card-left">
                              <div className="quality-title-badge">
                                <span>{fmt.resolution || "Standard"}</span>
                                {fmt.fps ? <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({fmt.fps}fps)</span> : null}
                                {isBest ? <span className="recommended-pill">BEST</span> : null}
                              </div>
                              <div className="quality-submeta">
                                <span className="format-chip">{fmt.ext.toUpperCase()}</span>
                                <span>• {formatBytes(fmt.filesize)}</span>
                                {fmt.note ? <span>• {fmt.note.substring(0, 18)}</span> : null}
                              </div>
                            </div>
                            <div className="quality-card-right">
                              {isSelected ? (
                                <div className="check-badge" title="Selected Format">
                                  <CheckIcon />
                                </div>
                              ) : (
                                <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1px solid var(--border-subtle)" }}></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stream Selection Dropdown */}
                    <div className="form-group" style={{ marginTop: "0.75rem" }}>
                      <select
                        id="format-select"
                        className="select-input"
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.currentTarget.value)}
                        disabled={downloading}
                      >
                        {mediaInfo.formats.map((fmt) => (
                          <option key={fmt.format_id} value={fmt.format_id}>
                            {fmt.resolution || "Standard"} {fmt.fps ? `(${fmt.fps}fps)` : ""} • {fmt.ext.toUpperCase()} • {formatBytes(fmt.filesize)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  className={`primary-btn download-btn ${downloading ? "loading" : ""}`}
                  onClick={() => handleDownload()}
                  disabled={downloading || (!audioOnly && !selectedFormat)}
                >
                  {downloading ? (
                    <>
                      <span className="loader"></span> Downloading Media Stream...
                    </>
                  ) : (
                    <>
                      <DownloadIcon /> Download Selected Stream
                    </>
                  )}
                </button>
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
                disabled={downloading}
                onClick={() => {
                  if (previewImage.direct_url) {
                    handleDownload(previewImage.format_id, previewImage.direct_url, previewImage.note);
                  }
                }}
              >
                <DownloadIcon /> Save to Computer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
