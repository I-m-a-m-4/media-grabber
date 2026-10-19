"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAdminMetrics,
  signInWithGoogle,
  UserProfile,
  PaymentRecord,
  DownloadActivity,
  HourlyTrafficItem,
} from "../../lib/firebase";

// SVG Icons
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const MusicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const ArchiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
  </svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ShieldLockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const PulseDot = ({ color = "#10b981" }: { color?: string }) => (
  <span style={{ position: "relative", display: "inline-flex", width: "10px", height: "10px", verticalAlign: "middle" }}>
    <span
      style={{
        position: "absolute",
        display: "inline-flex",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        backgroundColor: color,
        opacity: 0.75,
        animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }}
    />
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        borderRadius: "50%",
        width: "10px",
        height: "10px",
        backgroundColor: color,
      }}
    />
  </span>
);

function formatTimestamp(ts: any): string {
  if (!ts) return "N/A";
  if (ts.toDate) return ts.toDate().toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return new Date(ts).toLocaleString();
}

function formatRelativeTime(ms?: number): string {
  if (!ms) return "N/A";
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 45) return "Just now";
  if (diffSec < 120) return "1 min ago";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatHourLabel(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const nextHour = (hour + 1) % 24;
  const nextAmpm = nextHour >= 12 ? "PM" : "AM";
  const nextH12 = nextHour % 12 === 0 ? 12 : nextHour % 12;
  return `${h12}:00 ${ampm} - ${nextH12}:00 ${nextAmpm}`;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("belloimam431@gmail.com");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "realtime" | "retention" | "downloads" | "users" | "payments">("overview");

  // Admin Theme Switcher (Dark / Light)
  const [adminTheme, setAdminTheme] = useState<"dark" | "light">("dark");

  // Selected download for detail modal
  const [selectedDownload, setSelectedDownload] = useState<DownloadActivity | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Real-time Auto-Refresh state (refreshes presence every 25 seconds)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(25);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // Time-slice Filter state for "Active Users at a Certain Time":
  // modes: "live" (<= 2m) | "15m" | "1h" | "6h" | "24h" | "custom_hour"
  const [timeFilterMode, setTimeFilterMode] = useState<"live" | "15m" | "1h" | "6h" | "24h" | "custom_hour">("live");
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterHour, setFilterHour] = useState<number>(() => new Date().getHours());

  const [metrics, setMetrics] = useState<{
    totalUsers: number;
    activeNow: number;
    active5m: number;
    active15m: number;
    active1h: number;
    active24h: number;
    hourlyTraffic: HourlyTrafficItem[];
    dau: number;
    wau: number;
    mau: number;
    returningUsers: number;
    retentionRate: number;
    avgVisitsPerUser: number;
    totalExports: number;
    totalImageExports: number;
    totalVideoExports: number;
    totalAudioExports: number;
    totalZipExports: number;
    totalPayments: number;
    totalRevenue: number;
    totalSupportClicks: number;
    desktopUsersCount: number;
    webUsersCount: number;
    users: UserProfile[];
    payments: PaymentRecord[];
    recentDownloads: DownloadActivity[];
    cohorts: { singleVisit: number; returning2to5: number; powerUsers6plus: number };
  }>({
    totalUsers: 0,
    activeNow: 0,
    active5m: 0,
    active15m: 0,
    active1h: 0,
    active24h: 0,
    hourlyTraffic: [],
    dau: 0,
    wau: 0,
    mau: 0,
    returningUsers: 0,
    retentionRate: 0,
    avgVisitsPerUser: 1,
    totalExports: 0,
    totalImageExports: 0,
    totalVideoExports: 0,
    totalAudioExports: 0,
    totalZipExports: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalSupportClicks: 0,
    desktopUsersCount: 0,
    webUsersCount: 0,
    users: [],
    payments: [],
    recentDownloads: [],
    cohorts: { singleVisit: 0, returning2to5: 0, powerUsers6plus: 0 },
  });

  const AUTHORIZED_ADMIN_EMAIL = "belloimam431@gmail.com";

  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme") as "dark" | "light" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setAdminTheme(savedTheme);
    }

    const savedEmail = localStorage.getItem("adminEmail");
    if (savedEmail && savedEmail.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
      setIsAuthenticated(true);
      loadMetrics();
    }
  }, []);

  async function loadMetrics(silent = false) {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAdminMetrics();
      if ((data as any).error) {
        setLoadError((data as any).error);
      }
      setMetrics(data as any);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Failed to load metrics:", err);
      setLoadError(err?.message || "Failed to load metrics from Firestore.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Auto-refresh countdown effect (every 1 second decrement)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadMetrics(true);
          return 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh]);

  async function handleGoogleLogin() {
    setAuthError("");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user && user.email && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
        setIsAuthenticated(true);
        localStorage.setItem("adminEmail", user.email.toLowerCase());
        loadMetrics();
      } else {
        setAuthError(
          `Access Denied: Email ${user?.email || "unknown"} is not authorized as Admin. Access is restricted exclusively to ${AUTHORIZED_ADMIN_EMAIL}.`
        );
      }
    } catch (err: any) {
      setAuthError(err.message || "Google Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL) {
      setAuthError(`Access Denied: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized to log into the Admin Dashboard.`);
      return;
    }

    setIsAuthenticated(true);
    localStorage.setItem("adminEmail", cleanEmail);
    setAuthError("");
    loadMetrics();
  }

  function handleLogout() {
    setIsAuthenticated(false);
    localStorage.removeItem("adminEmail");
  }

  if (!isAuthenticated) {
    return (
      <div className="app-layout" data-theme="dark" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card admin-login-card fade-in" style={{ maxWidth: "440px", width: "100%", padding: "2.5rem" }}>
          <div style={{ textTransform: "uppercase", letterSpacing: "1px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", borderRadius: "50%", background: "rgba(255, 102, 0, 0.15)", color: "#ff6600" }}>
              <ShieldLockIcon />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", textAlign: "center" }}>Admin Dashboard</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center", textTransform: "none" }}>
              Authorized access restricted exclusively to <strong>belloimam431@gmail.com</strong>.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleGoogleLogin}
              style={{ background: "#4285F4", color: "#fff", padding: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }}></div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>or email login</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }}></div>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label htmlFor="admin-email" style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>Admin Email Address</label>
              <input
                id="admin-email"
                type="email"
                className="url-input"
                placeholder="belloimam431@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-passcode" style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>Passcode / Password (Optional)</label>
              <input
                id="admin-passcode"
                type="password"
                className="url-input"
                placeholder="Enter password or press Login"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>

            {authError && (
              <p style={{ color: "#ff4d4d", fontSize: "0.825rem", background: "rgba(255, 77, 77, 0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(255, 77, 77, 0.2)" }}>
                {authError}
              </p>
            )}

            <button type="submit" className="primary-btn" style={{ padding: "0.85rem" }}>
              Sign In as Admin
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link href="/" style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <ArrowLeftIcon /> Back to App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Stickiness ratio (DAU / MAU)
  const stickiness = metrics.mau > 0 ? ((metrics.dau / metrics.mau) * 100).toFixed(1) : "0.0";
  const singleCohortPct = metrics.totalUsers > 0 ? Math.round((metrics.cohorts.singleVisit / metrics.totalUsers) * 100) : 0;
  const returnCohortPct = metrics.totalUsers > 0 ? Math.round((metrics.cohorts.returning2to5 / metrics.totalUsers) * 100) : 0;
  const powerCohortPct = metrics.totalUsers > 0 ? Math.round((metrics.cohorts.powerUsers6plus / metrics.totalUsers) * 100) : 0;

  // Filter users by chosen time window
  const nowMs = Date.now();
  const filteredUsers = metrics.users.filter((u) => {
    const lastActive = u.lastActiveMs || 0;
    if (lastActive === 0) return timeFilterMode === "24h";

    const diff = nowMs - lastActive;

    if (timeFilterMode === "live") return diff <= 2 * 60 * 1000;
    if (timeFilterMode === "15m") return diff <= 15 * 60 * 1000;
    if (timeFilterMode === "1h") return diff <= 60 * 60 * 1000;
    if (timeFilterMode === "6h") return diff <= 6 * 60 * 60 * 1000;
    if (timeFilterMode === "24h") return diff <= 24 * 60 * 60 * 1000;
    if (timeFilterMode === "custom_hour") {
      const d = new Date(lastActive);
      const dateStr = d.toISOString().slice(0, 10);
      const hour = d.getHours();
      return dateStr === filterDate && hour === filterHour;
    }
    return true;
  });

  const filteredDesktopCount = filteredUsers.filter((u) =>
    u.platform?.toLowerCase().includes("tauri") || u.platform?.toLowerCase().includes("desktop")
  ).length;
  const filteredWebCount = filteredUsers.length - filteredDesktopCount;

  // Peak hourly max for bar chart scaling
  const maxHourlyUsers = Math.max(...metrics.hourlyTraffic.map((h) => h.userCount), 1);

  return (
    <div
      className="app-layout"
      data-theme={adminTheme}
      style={{
        minHeight: "100vh",
        padding: "1.5rem clamp(1rem, 2.5vw, 2.5rem)",
        width: "100%",
        maxWidth: "100%",
        background: "var(--bg-dark)",
        color: "var(--text-main)",
        transition: "background-color 0.25s ease, color 0.25s ease",
      }}
    >
      <div style={{ width: "100%", maxWidth: "100%", margin: "0" }}>
        {/* Top Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <Link href="/" className="icon-btn" title="Back to App">
                <ArrowLeftIcon />
              </Link>
              <h1 style={{ fontSize: "1.85rem", fontWeight: "800", letterSpacing: "-0.02em" }}>
                Admin Analytics & Metrics
              </h1>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Tracking software users, retention cohorts, image & media exports, and support revenue.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Theme Toggle Button (Dark / Light) */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => {
                const nextTheme = adminTheme === "dark" ? "light" : "dark";
                setAdminTheme(nextTheme);
                localStorage.setItem("adminTheme", nextTheme);
              }}
              title={`Switch to ${adminTheme === "dark" ? "Light" : "Dark"} Mode`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                background: adminTheme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                transition: "all 0.2s ease",
              }}
            >
              {adminTheme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>{adminTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <button className="theme-toggle-btn" onClick={() => loadMetrics(false)} title="Refresh Data" disabled={loading}>
              <RefreshIcon /> {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="support-btn"
              onClick={handleLogout}
              style={{ background: "rgba(255, 77, 77, 0.15)", color: "#ff4d4d", border: "1px solid rgba(255, 77, 77, 0.3)" }}
            >
              Lock Dashboard
            </button>
          </div>
        </header>

        {/* Real-Time Live Presence & Auto-Refresh Strip */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "14px",
            padding: "1rem 1.4rem",
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <PulseDot color="#10b981" />
              <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#10b981" }}>
                {metrics.activeNow} Active Users Right Now
              </span>
              <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "0.2rem 0.5rem", borderRadius: "10px", fontWeight: "700" }}>
                LIVE (&lt; 2m)
              </span>
            </div>

            <div style={{ height: "20px", width: "1px", background: "rgba(255,255,255,0.1)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span>Past 15m: <strong style={{ color: "var(--text-main)" }}>{metrics.active15m}</strong></span>
              <span>•</span>
              <span>Past 1h: <strong style={{ color: "var(--text-main)" }}>{metrics.active1h}</strong></span>
              <span>•</span>
              <span>Today (24h): <strong style={{ color: "var(--text-main)" }}>{metrics.active24h}</strong></span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.825rem" }}>
            <button
              onClick={() => {
                setActiveTab("realtime");
                setTimeFilterMode("live");
              }}
              style={{
                background: "rgba(255, 102, 0, 0.15)",
                color: "#ff6600",
                border: "1px solid rgba(255, 102, 0, 0.3)",
                padding: "0.4rem 0.85rem",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Inspect Live &amp; Peak Times →
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
              <span>Auto-refresh in <strong style={{ color: "#10b981" }}>{countdown}s</strong>{lastRefreshedAt ? ` (${lastRefreshedAt})` : ""}</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  background: autoRefresh ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.08)",
                  color: autoRefresh ? "#10b981" : "var(--text-muted)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {autoRefresh ? "Active" : "Paused"}
              </button>
            </div>
          </div>
        </div>

        {loadError && (
          <div style={{ background: "rgba(255, 77, 77, 0.12)", border: "1px solid rgba(255, 77, 77, 0.3)", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.5rem", color: "#ff6b6b", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <span>
              <strong>Note:</strong> {loadError}
              {(loadError.toLowerCase().includes("client") || loadError.toLowerCase().includes("fetch") || loadError.toLowerCase().includes("failed")) && " (An active Ad-blocker or Brave Shields might be blocking Google Firestore. Please whitelist this page.)"}
            </span>
            <button onClick={() => loadMetrics(false)} style={{ background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "6px", padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
              Retry
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem", overflowX: "auto" }}>
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            📊 Analytics Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "realtime" ? "active" : ""}`}
            onClick={() => setActiveTab("realtime")}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "10px",
              fontSize: "0.9rem",
              cursor: "pointer",
              background: activeTab === "realtime" ? "rgba(16, 185, 129, 0.18)" : undefined,
              borderColor: activeTab === "realtime" ? "#10b981" : undefined,
              color: activeTab === "realtime" ? "#10b981" : undefined,
            }}
          >
            🔴 Real-Time &amp; Peak Traffic ({metrics.activeNow} Live)
          </button>
          <button
            className={`tab-btn ${activeTab === "retention" ? "active" : ""}`}
            onClick={() => setActiveTab("retention")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            👥 Retention &amp; Cohorts ({metrics.retentionRate.toFixed(1)}%)
          </button>
          <button
            className={`tab-btn ${activeTab === "downloads" ? "active" : ""}`}
            onClick={() => setActiveTab("downloads")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            🖼️ Media &amp; Image Exports ({metrics.totalExports})
          </button>
          <button
            className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            👤 Users Registry ({metrics.totalUsers})
          </button>
          <button
            className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            💖 Supporters &amp; Intent ({metrics.totalSupportClicks} clicks • ${metrics.totalRevenue.toFixed(2)})
          </button>
        </div>

        {/* Overview Tab */}
        {(activeTab === "overview" || activeTab === "retention" || activeTab === "downloads") && (
          <>
            {/* Primary KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
              {/* Real-time Active Live Card */}
              <div className="card" style={{ padding: "1.5rem", position: "relative", overflow: "hidden", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <PulseDot color="#10b981" />
                    <span style={{ fontSize: "0.85rem", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                      Active Users Right Now
                    </span>
                  </div>
                  <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                    <ZapIcon />
                  </div>
                </div>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#10b981", marginBottom: "0.5rem" }}>
                  {metrics.activeNow}
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    15m: <strong style={{ color: "var(--text-main)" }}>{metrics.active15m}</strong>
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    1h: <strong style={{ color: "var(--text-main)" }}>{metrics.active1h}</strong>
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    24h: <strong style={{ color: "var(--text-main)" }}>{metrics.active24h}</strong>
                  </span>
                </div>
              </div>

              {/* Unique Users Card */}
              <div className="card" style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>
                    Total Unique Users
                  </span>
                  <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(255, 102, 0, 0.15)", color: "#ff6600" }}>
                    <UserIcon />
                  </div>
                </div>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.5rem" }}>
                  {metrics.totalUsers}
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    DAU: <strong>{metrics.dau}</strong>
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    WAU: <strong>{metrics.wau}</strong>
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    MAU: <strong>{metrics.mau}</strong>
                  </span>
                </div>
              </div>

              {/* Retention & Returning Users Card */}
              <div className="card" style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>
                    Retention Rate
                  </span>
                  <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                    <UsersIcon />
                  </div>
                </div>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#10b981", marginBottom: "0.5rem" }}>
                  {metrics.retentionRate.toFixed(1)}%
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span>
                    Returning: <strong style={{ color: "var(--text-main)" }}>{metrics.returningUsers}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Avg Visits: <strong style={{ color: "var(--text-main)" }}>{metrics.avgVisitsPerUser.toFixed(1)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Stickiness: <strong style={{ color: "#10b981" }}>{stickiness}%</strong>
                  </span>
                </div>
              </div>

              {/* Image & Screenshot Exports Card */}
              <div className="card" style={{ padding: "1.5rem", position: "relative", overflow: "hidden", border: "1px solid rgba(255, 102, 0, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#ff6600", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                    🖼️ Image & Screenshot Exports
                  </span>
                  <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(255, 102, 0, 0.2)", color: "#ff6600" }}>
                    <ImageIcon />
                  </div>
                </div>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#ff8533", marginBottom: "0.5rem" }}>
                  {metrics.totalImageExports}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Total image asset downloads, thumbnails & screenshots captured
                </div>
              </div>

              {/* Total Media Exports Card */}
              <div className="card" style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>
                    Total Media Exports
                  </span>
                  <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                    <ActivityIcon />
                  </div>
                </div>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#3b82f6", marginBottom: "0.5rem" }}>
                  {metrics.totalExports}
                </div>
                <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span>🎥 {metrics.totalVideoExports} vids</span>
                  <span>•</span>
                  <span>🎵 {metrics.totalAudioExports} mp3s</span>
                  <span>•</span>
                  <span>📦 {metrics.totalZipExports} zips</span>
                </div>
              </div>

              {/* Supporters & Donation Intent Card */}
              <div className="card" style={{ padding: "1.5rem", position: "relative", overflow: "hidden", border: "1px solid rgba(236, 72, 153, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#ec4899", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                      💖 Supporters &amp; Intent
                    </span>
                  </div>
                  <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
                    <HeartIcon />
                  </div>
                </div>
                <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#ec4899", marginBottom: "0.5rem" }}>
                  {metrics.totalSupportClicks} <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-muted)" }}>clicks</span>
                </div>
                <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span style={{ background: adminTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    Donors: <strong style={{ color: "var(--text-main)" }}>{metrics.payments.length}</strong>
                  </span>
                  <span style={{ background: adminTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    Raised: <strong style={{ color: "#10b981" }}>${metrics.totalRevenue.toFixed(2)}</strong>
                  </span>
                  <span style={{ background: adminTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                    Conv: <strong style={{ color: "#ec4899" }}>{metrics.totalSupportClicks > 0 ? ((metrics.payments.length / metrics.totalSupportClicks) * 100).toFixed(1) : "0.0"}%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Retention Cohorts & Export Distribution Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              {/* Retention & Frequency Cohorts */}
              <div className="card" style={{ padding: "1.75rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <UsersIcon /> User Retention & Visit Cohorts
                </h3>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                  Frequency of unique users returning to Media Grabber over time.
                </p>

                {/* Cohort 1: 1 Visit */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                    <span>🌱 First-Time / Single Visit Users</span>
                    <strong>{metrics.cohorts.singleVisit} users ({singleCohortPct}%)</strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${singleCohortPct}%`, height: "100%", background: "#64748b", borderRadius: "4px" }}></div>
                  </div>
                </div>

                {/* Cohort 2: 2 - 5 Visits */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                    <span>🔁 Returning Users (2 to 5 visits)</span>
                    <strong style={{ color: "#3b82f6" }}>{metrics.cohorts.returning2to5} users ({returnCohortPct}%)</strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${returnCohortPct}%`, height: "100%", background: "#3b82f6", borderRadius: "4px" }}></div>
                  </div>
                </div>

                {/* Cohort 3: 6+ Visits */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                    <span>⭐ Loyal Power Users (6+ visits)</span>
                    <strong style={{ color: "#ff6600" }}>{metrics.cohorts.powerUsers6plus} users ({powerCohortPct}%)</strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${powerCohortPct}%`, height: "100%", background: "linear-gradient(90deg, #ff6600, #ff8533)", borderRadius: "4px" }}></div>
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px", fontSize: "0.825rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{metrics.dau}</div>
                    <div style={{ fontSize: "0.75rem" }}>Active Today</div>
                  </div>
                  <div style={{ width: "1px", background: "var(--border-subtle)" }}></div>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{metrics.wau}</div>
                    <div style={{ fontSize: "0.75rem" }}>Active 7 Days</div>
                  </div>
                  <div style={{ width: "1px", background: "var(--border-subtle)" }}></div>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{metrics.mau}</div>
                    <div style={{ fontSize: "0.75rem" }}>Active 30 Days</div>
                  </div>
                </div>
              </div>

              {/* Media Exports & Platform Breakdown */}
              <div className="card" style={{ padding: "1.75rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ImageIcon /> Media Export Breakdown & Platforms
                </h3>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                  Types of media downloaded and desktop vs web distribution.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ padding: "1rem", background: "rgba(255, 102, 0, 0.08)", border: "1px solid rgba(255, 102, 0, 0.2)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ff6600", marginBottom: "0.25rem" }}>
                      <ImageIcon />
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Images & Stills</span>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)" }}>{metrics.totalImageExports}</div>
                  </div>

                  <div style={{ padding: "1rem", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#3b82f6", marginBottom: "0.25rem" }}>
                      <VideoIcon />
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Video Streams</span>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)" }}>{metrics.totalVideoExports}</div>
                  </div>

                  <div style={{ padding: "1rem", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#a855f7", marginBottom: "0.25rem" }}>
                      <MusicIcon />
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Audio Tracks</span>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)" }}>{metrics.totalAudioExports}</div>
                  </div>

                  <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", marginBottom: "0.25rem" }}>
                      <ArchiveIcon />
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>ZIP Bundles</span>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)" }}>{metrics.totalZipExports}</div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem", fontWeight: "600" }}>
                    Client Platform Split
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                    <span>💻 Desktop App (Tauri v2): <strong>{metrics.desktopUsersCount} users</strong></span>
                    <span>🌐 Web Browser: <strong>{metrics.webUsersCount} users</strong></span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
                    <div
                      style={{
                        width: `${metrics.totalUsers > 0 ? (metrics.desktopUsersCount / metrics.totalUsers) * 100 : 50}%`,
                        height: "100%",
                        background: "#ff6600",
                      }}
                      title="Desktop"
                    ></div>
                    <div
                      style={{
                        width: `${metrics.totalUsers > 0 ? (metrics.webUsersCount / metrics.totalUsers) * 100 : 50}%`,
                        height: "100%",
                        background: "#3b82f6",
                      }}
                      title="Web"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Real-Time User Presence & Time-Traveler Tab */}
        {activeTab === "realtime" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "2rem" }}>
            {/* Header & Controls Card */}
            <div className="card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <PulseDot color="#10b981" />
                    Real-Time Active Users &amp; Peak Hours Traffic
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    Monitor who is using the software live, or inspect active users during any specific date and hour.
                  </p>
                </div>

                {/* Auto-refresh control */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 0.9rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <ClockIcon />
                    <span>Auto-refresh in <strong style={{ color: "#10b981" }}>{countdown}s</strong>{lastRefreshedAt ? ` (Updated ${lastRefreshedAt})` : ""}</span>
                  </div>
                  <button
                    onClick={() => loadMetrics(false)}
                    style={{ background: "#ff6600", color: "#fff", border: "none", borderRadius: "6px", padding: "0.3rem 0.65rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}
                  >
                    Refresh Now
                  </button>
                </div>
              </div>

              {/* Time Window Selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", fontWeight: "600" }}>
                  Select Time Window to Inspect:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <button
                    onClick={() => setTimeFilterMode("live")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: timeFilterMode === "live" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)",
                      color: timeFilterMode === "live" ? "#10b981" : "var(--text-main)",
                      border: timeFilterMode === "live" ? "1px solid #10b981" : "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <PulseDot color="#10b981" /> 🟢 Live Right Now ({metrics.activeNow})
                  </button>
                  <button
                    onClick={() => setTimeFilterMode("15m")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: timeFilterMode === "15m" ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.05)",
                      color: timeFilterMode === "15m" ? "#f59e0b" : "var(--text-main)",
                      border: timeFilterMode === "15m" ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                    }}
                  >
                    ⏱️ Past 15 Minutes ({metrics.active15m})
                  </button>
                  <button
                    onClick={() => setTimeFilterMode("1h")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: timeFilterMode === "1h" ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                      color: timeFilterMode === "1h" ? "#3b82f6" : "var(--text-main)",
                      border: timeFilterMode === "1h" ? "1px solid #3b82f6" : "1px solid var(--border-subtle)",
                    }}
                  >
                    🕐 Past 1 Hour ({metrics.active1h})
                  </button>
                  <button
                    onClick={() => setTimeFilterMode("6h")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: timeFilterMode === "6h" ? "rgba(168, 85, 247, 0.2)" : "rgba(255,255,255,0.05)",
                      color: timeFilterMode === "6h" ? "#a855f7" : "var(--text-main)",
                      border: timeFilterMode === "6h" ? "1px solid #a855f7" : "1px solid var(--border-subtle)",
                    }}
                  >
                    🌆 Past 6 Hours
                  </button>
                  <button
                    onClick={() => setTimeFilterMode("24h")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: timeFilterMode === "24h" ? "rgba(255, 102, 0, 0.2)" : "rgba(255,255,255,0.05)",
                      color: timeFilterMode === "24h" ? "#ff6600" : "var(--text-main)",
                      border: timeFilterMode === "24h" ? "1px solid #ff6600" : "1px solid var(--border-subtle)",
                    }}
                  >
                    🌅 Past 24 Hours ({metrics.active24h})
                  </button>
                  <button
                    onClick={() => setTimeFilterMode("custom_hour")}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: timeFilterMode === "custom_hour" ? "rgba(236, 72, 153, 0.2)" : "rgba(255,255,255,0.05)",
                      color: timeFilterMode === "custom_hour" ? "#ec4899" : "var(--text-main)",
                      border: timeFilterMode === "custom_hour" ? "1px solid #ec4899" : "1px solid var(--border-subtle)",
                    }}
                  >
                    📅 Specific Date &amp; Hour
                  </button>
                </div>

                {/* Specific Hour & Date Controls */}
                {timeFilterMode === "custom_hour" && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "1rem 1.25rem",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "10px",
                      border: "1px solid rgba(236, 72, 153, 0.3)",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CalendarIcon />
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Date:</span>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={{
                          background: "var(--bg-input)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-subtle)",
                          padding: "0.35rem 0.65rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ClockIcon />
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Hour:</span>
                      <button
                        onClick={() => setFilterHour((prev) => (prev > 0 ? prev - 1 : 23))}
                        style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.8rem" }}
                        title="Previous Hour"
                      >
                        ◀
                      </button>
                      <select
                        value={filterHour}
                        onChange={(e) => setFilterHour(Number(e.target.value))}
                        style={{
                          background: "var(--bg-input)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-subtle)",
                          padding: "0.35rem 0.65rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                        }}
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {formatHourLabel(h)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setFilterHour((prev) => (prev < 23 ? prev + 1 : 0))}
                        style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.8rem" }}
                        title="Next Hour"
                      >
                        ▶
                      </button>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#ec4899", fontWeight: "600", marginLeft: "auto" }}>
                      Filtering for: {filterDate} at {formatHourLabel(filterHour)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 24-Hour Activity Peak Visualizer Bar Chart */}
            <div className="card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ChartBarIcon /> 24-Hour Traffic Peak Heatmap
                  </h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Peak software traffic across hours of the day. Click any hour bar to inspect the active users during that time.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "10px", height: "10px", background: "#ff6600", borderRadius: "2px" }} /> Desktop
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "10px", height: "10px", background: "#3b82f6", borderRadius: "2px" }} /> Web Browser
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }} /> Current Hour
                  </span>
                </div>
              </div>

              {/* Bar Chart Container */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(24, 1fr)",
                  gap: "6px",
                  alignItems: "flex-end",
                  height: "170px",
                  padding: "1rem 0.5rem 0.5rem",
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {metrics.hourlyTraffic.map((item) => {
                  const currentHour = new Date().getHours();
                  const isCurrent = item.hour === currentHour;
                  const isSelected = timeFilterMode === "custom_hour" && filterHour === item.hour;
                  const heightPct = Math.max(8, Math.round((item.userCount / maxHourlyUsers) * 100));

                  return (
                    <div
                      key={item.hour}
                      onClick={() => {
                        setTimeFilterMode("custom_hour");
                        setFilterHour(item.hour);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                        cursor: "pointer",
                        position: "relative",
                      }}
                      title={`${item.label}: ${item.userCount} active users (${item.desktopCount} Desktop, ${item.webCount} Web)`}
                    >
                      {/* Top User Count label */}
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: "700",
                          color: isSelected ? "#ff6600" : isCurrent ? "#10b981" : item.userCount > 0 ? "var(--text-main)" : "transparent",
                          marginBottom: "4px",
                        }}
                      >
                        {item.userCount}
                      </span>

                      {/* Bar Fill */}
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "28px",
                          height: `${heightPct}%`,
                          borderRadius: "4px 4px 0 0",
                          background: isSelected
                            ? "linear-gradient(180deg, #ff8533 0%, #ff5500 100%)"
                            : isCurrent
                            ? "linear-gradient(180deg, #34d399 0%, #059669 100%)"
                            : item.userCount > 0
                            ? "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)"
                            : "rgba(255,255,255,0.06)",
                          boxShadow: isSelected
                            ? "0 0 12px rgba(255, 102, 0, 0.6)"
                            : isCurrent
                            ? "0 0 10px rgba(16, 185, 129, 0.4)"
                            : undefined,
                          transition: "height 0.3s ease, background 0.2s ease",
                        }}
                      />

                      {/* Hour label below */}
                      <span
                        style={{
                          fontSize: "0.62rem",
                          color: isSelected ? "#ff6600" : isCurrent ? "#10b981" : "var(--text-muted)",
                          marginTop: "6px",
                          fontWeight: isSelected || isCurrent ? "700" : "500",
                        }}
                      >
                        {item.hour.toString().padStart(2, "0")}h
                      </span>

                      {/* Indicator for current hour */}
                      {isCurrent && (
                        <div
                          style={{
                            width: "4px",
                            height: "4px",
                            background: "#10b981",
                            borderRadius: "50%",
                            marginTop: "2px",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Users Table for the Filtered Time Slice */}
            <div className="card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <UserIcon /> Active Users at this Time ({filteredUsers.length})
                  </h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {timeFilterMode === "live"
                      ? "Showing users with heartbeat in the last 2 minutes"
                      : timeFilterMode === "15m"
                      ? "Showing users active in the last 15 minutes"
                      : timeFilterMode === "1h"
                      ? "Showing users active in the last 1 hour"
                      : timeFilterMode === "6h"
                      ? "Showing users active in the last 6 hours"
                      : timeFilterMode === "24h"
                      ? "Showing users active in the past 24 hours"
                      : `Showing users active on ${filterDate} at ${formatHourLabel(filterHour)}`}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ padding: "0.3rem 0.75rem", borderRadius: "8px", background: "rgba(255, 102, 0, 0.15)", color: "#ff6600", fontSize: "0.8rem", fontWeight: "600" }}>
                    💻 Desktop: {filteredDesktopCount}
                  </span>
                  <span style={{ padding: "0.3rem 0.75rem", borderRadius: "8px", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontSize: "0.8rem", fontWeight: "600" }}>
                    🌐 Web: {filteredWebCount}
                  </span>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                  <p style={{ fontSize: "1.05rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    No users were active during this specific time window.
                  </p>
                  <p style={{ fontSize: "0.85rem" }}>
                    Try selecting a different hour from the 24-hour chart above, or click <strong>&quot;Past 24 Hours&quot;</strong>.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "0.75rem 1rem" }}>User UID (Firebase)</th>
                        <th style={{ padding: "0.75rem 1rem" }}>Presence Status</th>
                        <th style={{ padding: "0.75rem 1rem" }}>Platform / Client</th>
                        <th style={{ padding: "0.75rem 1rem" }}>Visits &amp; Cohort</th>
                        <th style={{ padding: "0.75rem 1rem" }}>Downloads</th>
                        <th style={{ padding: "0.75rem 1rem" }}>Last Active Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, idx) => {
                        const visits = Number(u.visitCount) || 1;
                        const isPower = visits >= 6;
                        const isReturning = visits >= 2;
                        const lastActive = u.lastActiveMs || 0;
                        const diffMs = nowMs - lastActive;
                        const isLiveNow = diffMs <= 2 * 60 * 1000;
                        const isRecent = diffMs <= 15 * 60 * 1000;

                        return (
                          <tr key={u.uid || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#ff6600" }}>
                              {u.uid}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  background: isLiveNow
                                    ? "rgba(16, 185, 129, 0.2)"
                                    : isRecent
                                    ? "rgba(245, 158, 11, 0.2)"
                                    : "rgba(255,255,255,0.06)",
                                  color: isLiveNow ? "#10b981" : isRecent ? "#f59e0b" : "var(--text-muted)",
                                }}
                              >
                                {isLiveNow && <PulseDot color="#10b981" />}
                                {isLiveNow ? "ONLINE NOW" : isRecent ? `Active ${formatRelativeTime(lastActive)}` : formatRelativeTime(lastActive)}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", fontWeight: "500" }}>
                              <span
                                style={{
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  background: u.platform?.toLowerCase().includes("tauri") || u.platform?.toLowerCase().includes("desktop")
                                    ? "rgba(255, 102, 0, 0.15)"
                                    : "rgba(59, 130, 246, 0.15)",
                                  color: u.platform?.toLowerCase().includes("tauri") || u.platform?.toLowerCase().includes("desktop")
                                    ? "#ff6600"
                                    : "#3b82f6",
                                }}
                              >
                                {u.platform?.toLowerCase().includes("tauri") || u.platform?.toLowerCase().includes("desktop") ? "💻 Desktop" : "🌐 Web"}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span
                                style={{
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "8px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  background: isPower
                                    ? "rgba(255, 102, 0, 0.2)"
                                    : isReturning
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : "rgba(255, 255, 255, 0.08)",
                                  color: isPower ? "#ff6600" : isReturning ? "#3b82f6" : "var(--text-muted)",
                                }}
                              >
                                {visits} visits • {isPower ? "⭐ Power" : isReturning ? "🔁 Returning" : "🌱 New"}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", fontWeight: "600" }}>
                              {u.totalDownloads || 0}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                              {formatTimestamp(u.lastActiveAt || u.lastSeenAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Media Exports Activity Table */}
        {(activeTab === "overview" || activeTab === "downloads") && (
          <section className="card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ActivityIcon /> Recent Media Downloads & Exports ({metrics.recentDownloads.length})
                </h3>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Real-time log of exported images, videos, audio tracks, and ZIP archives.
                </p>
              </div>
            </div>

            {metrics.recentDownloads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                No export activity logged in Firestore yet. As users download videos, audio, images or ZIPs, their download history will stream here.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Asset Type</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Media Title</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Domain / Source</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Format / Quality</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Platform</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Time</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentDownloads.map((d, idx) => (
                      <tr
                        key={d.id || idx}
                        onClick={() => setSelectedDownload(d)}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = adminTheme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        title="Click row to view media details, full URL, and metadata"
                      >
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              background:
                                d.assetType === "image"
                                  ? "rgba(255, 102, 0, 0.2)"
                                  : d.assetType === "video"
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : d.assetType === "audio"
                                  ? "rgba(168, 85, 247, 0.2)"
                                  : "rgba(16, 185, 129, 0.2)",
                              color:
                                d.assetType === "image"
                                  ? "#ff6600"
                                  : d.assetType === "video"
                                  ? "#3b82f6"
                                  : d.assetType === "audio"
                                  ? "#a855f7"
                                  : "#10b981",
                            }}
                          >
                            {d.assetType === "image" ? "🖼️ Image" : d.assetType === "video" ? "🎥 Video" : d.assetType === "audio" ? "🎵 Audio" : "📦 ZIP"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontWeight: "600", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "var(--text-main)" }}>
                            {d.title || "Untitled Media"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {d.domain || "web"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span style={{ padding: "0.15rem 0.5rem", borderRadius: "6px", background: adminTheme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", fontSize: "0.75rem" }}>
                            {d.format || "auto"} {d.resolution ? `(${d.resolution})` : ""}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {d.platform || "Web"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {formatTimestamp(d.createdAt)}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDownload(d);
                            }}
                            style={{
                              background: "rgba(255, 102, 0, 0.12)",
                              color: "#ff6600",
                              border: "1px solid rgba(255, 102, 0, 0.25)",
                              borderRadius: "6px",
                              padding: "0.3rem 0.65rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <span>Inspect</span> 🔍
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Users Tracking Table */}
        {(activeTab === "overview" || activeTab === "users" || activeTab === "retention") && (
          <section className="card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <UserIcon /> Unique Active Users & Return Registry ({metrics.users.length})
                </h3>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Unique client installations with their visit counts and return patterns.
                </p>
              </div>
            </div>

            {metrics.users.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                No anonymous users registered yet in Firestore. Users are automatically recorded upon opening the application.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>User UID (Firebase)</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Visits / Returns</th>
                      <th style={{ padding: "0.75rem 1rem" }}>User Tier</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Platform</th>
                      <th style={{ padding: "0.75rem 1rem" }}>First Seen</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.users.map((u, idx) => {
                      const visits = Number(u.visitCount) || 1;
                      const isPower = visits >= 6;
                      const isReturning = visits >= 2;

                      return (
                        <tr key={u.uid || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#ff6600" }}>
                            {u.uid}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span style={{ fontWeight: "700", color: isPower ? "#ff6600" : isReturning ? "#3b82f6" : "var(--text-main)" }}>
                              {visits} {visits === 1 ? "visit" : "visits"}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span
                              style={{
                                padding: "0.2rem 0.55rem",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: isPower
                                  ? "rgba(255, 102, 0, 0.2)"
                                  : isReturning
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : "rgba(255, 255, 255, 0.08)",
                                color: isPower ? "#ff6600" : isReturning ? "#3b82f6" : "var(--text-muted)",
                              }}
                            >
                              {isPower ? "⭐ Power User" : isReturning ? "🔁 Returning" : "🌱 New"}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", fontWeight: "500" }}>{u.platform || "Web / App"}</td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{formatTimestamp(u.firstSeenAt)}</td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{formatTimestamp(u.lastSeenAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Payments & Supporters Table */}
        {(activeTab === "overview" || activeTab === "payments") && (
          <section className="card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <DollarIcon /> Supporters, Donations &amp; Click Intent
                </h3>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Compare user intent (clicks on the &quot;Support Us&quot; navbar button) against completed Flutterwave payments.
                </p>
              </div>
            </div>

            {/* Supporters Analytics Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
              <div style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(236, 72, 153, 0.08)", border: "1px solid rgba(236, 72, 153, 0.25)" }}>
                <div style={{ fontSize: "0.8rem", color: "#ec4899", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.35rem" }}>
                  🖱️ Support Button Clicks
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-main)" }}>{metrics.totalSupportClicks}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Total clicks on &quot;Support Us&quot; button (Donation Intent)
                </div>
              </div>

              <div style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                <div style={{ fontSize: "0.8rem", color: "#10b981", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.35rem" }}>
                  💝 Completed Donors
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#10b981" }}>{metrics.payments.length}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Successful transactions recorded in Firestore
                </div>
              </div>

              <div style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                <div style={{ fontSize: "0.8rem", color: "#3b82f6", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.35rem" }}>
                  💰 Total Revenue Raised
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#3b82f6" }}>${metrics.totalRevenue.toFixed(2)}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Aggregated gross donations from supporters
                </div>
              </div>

              <div style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(255, 102, 0, 0.08)", border: "1px solid rgba(255, 102, 0, 0.25)" }}>
                <div style={{ fontSize: "0.8rem", color: "#ff6600", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.35rem" }}>
                  📈 Intent Conversion Rate
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#ff6600" }}>
                  {metrics.totalSupportClicks > 0 ? ((metrics.payments.length / metrics.totalSupportClicks) * 100).toFixed(1) : "0.0"}%
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Percentage of button clickers who completed payment
                </div>
              </div>
            </div>

            {metrics.payments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                No completed payments recorded yet in Firestore. When supporters donate via Flutterwave, transactions will appear here automatically.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Supporter Name</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Email</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Amount</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Transaction Ref</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.payments.map((p, idx) => (
                      <tr key={p.id || idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.85rem 1rem", fontWeight: "600" }}>{p.name || "Anonymous Supporter"}</td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>{p.email || "N/A"}</td>
                        <td style={{ padding: "0.85rem 1rem", color: "#10b981", fontWeight: "700" }}>${p.amount} {p.currency}</td>
                        <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.tx_ref}</td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              background: p.status === "successful" || p.status === "completed" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: p.status === "successful" || p.status === "completed" ? "#10b981" : "#ef4444",
                            }}
                          >
                            {p.status || "Completed"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>{formatTimestamp(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Media Download & Export Details Modal */}
        {selectedDownload && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={() => setSelectedDownload(null)}
          >
            <div
              className="card fade-in"
              style={{
                maxWidth: "680px",
                width: "100%",
                padding: "2rem",
                borderRadius: "16px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                position: "relative",
                border: "1px solid var(--border-subtle)",
                background: adminTheme === "light" ? "#ffffff" : "var(--bg-card)",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      background:
                        selectedDownload.assetType === "image"
                          ? "rgba(255, 102, 0, 0.2)"
                          : selectedDownload.assetType === "video"
                          ? "rgba(59, 130, 246, 0.2)"
                          : selectedDownload.assetType === "audio"
                          ? "rgba(168, 85, 247, 0.2)"
                          : "rgba(16, 185, 129, 0.2)",
                      color:
                        selectedDownload.assetType === "image"
                          ? "#ff6600"
                          : selectedDownload.assetType === "video"
                          ? "#3b82f6"
                          : selectedDownload.assetType === "audio"
                          ? "#a855f7"
                          : "#10b981",
                    }}
                  >
                    {selectedDownload.assetType === "image" ? "🖼️ Image Export" : selectedDownload.assetType === "video" ? "🎥 Video Download" : selectedDownload.assetType === "audio" ? "🎵 Audio Download" : "📦 ZIP Bundle"}
                  </span>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>
                    Media Export Details
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedDownload(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.2rem 0.5rem",
                    lineHeight: 1,
                  }}
                  title="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Title & Metadata */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", fontWeight: "600" }}>
                  Media Title
                </label>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)", marginTop: "0.3rem", lineHeight: 1.4 }}>
                  {selectedDownload.title || "Untitled Media"}
                </div>
              </div>

              {/* Full Source URL & Actions */}
              <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "10px", background: adminTheme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "0.4rem" }}>
                  Original Media / Source URL
                </label>
                <div style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: "0.85rem", color: "#3b82f6", marginBottom: "0.75rem" }}>
                  {selectedDownload.url ? (
                    <a href={selectedDownload.url} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>
                      {selectedDownload.url}
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>No URL stored</span>
                  )}
                </div>

                {selectedDownload.url && (
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <a
                      href={selectedDownload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.45rem 0.85rem",
                        borderRadius: "8px",
                        background: "#ff6600",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLinkIcon /> Open Source Link in New Tab
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDownload.url) {
                          navigator.clipboard.writeText(selectedDownload.url);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.45rem 0.85rem",
                        borderRadius: "8px",
                        background: adminTheme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-main)",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <CopyIcon /> {copiedUrl ? "Copied to Clipboard!" : "Copy URL"}
                    </button>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "0.75rem", borderRadius: "8px", background: adminTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Domain / Host</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)", marginTop: "0.2rem" }}>{selectedDownload.domain || "N/A"}</div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", background: adminTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Format &amp; Resolution</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)", marginTop: "0.2rem" }}>
                    {selectedDownload.format || "auto"} {selectedDownload.resolution ? `(${selectedDownload.resolution})` : ""}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", background: adminTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Platform / Client</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)", marginTop: "0.2rem" }}>
                    {selectedDownload.platform || "Web Browser"}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", background: adminTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Download Timestamp</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-main)", marginTop: "0.2rem" }}>
                    {formatTimestamp(selectedDownload.createdAt)}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", background: adminTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Firebase User UID</div>
                  <div style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "#ff6600", marginTop: "0.2rem", wordBreak: "break-all" }}>
                    {selectedDownload.uid || "anonymous"}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedDownload(null)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "10px",
                    background: adminTheme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "var(--text-main)",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
