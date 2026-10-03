"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAdminMetrics,
  signInWithGoogle,
  UserProfile,
  PaymentRecord,
  DownloadActivity,
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

function formatTimestamp(ts: any): string {
  if (!ts) return "N/A";
  if (ts.toDate) return ts.toDate().toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return new Date(ts).toLocaleString();
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("belloimam431@gmail.com");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "retention" | "downloads" | "users" | "payments">("overview");

  const [metrics, setMetrics] = useState<{
    totalUsers: number;
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
    desktopUsersCount: number;
    webUsersCount: number;
    users: UserProfile[];
    payments: PaymentRecord[];
    recentDownloads: DownloadActivity[];
    cohorts: { singleVisit: 0; returning2to5: 0; powerUsers6plus: 0 };
  }>({
    totalUsers: 0,
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
    desktopUsersCount: 0,
    webUsersCount: 0,
    users: [],
    payments: [],
    recentDownloads: [],
    cohorts: { singleVisit: 0, returning2to5: 0, powerUsers6plus: 0 },
  });

  const AUTHORIZED_ADMIN_EMAIL = "belloimam431@gmail.com";

  useEffect(() => {
    const savedEmail = localStorage.getItem("adminEmail");
    if (savedEmail && savedEmail.toLowerCase() === AUTHORIZED_ADMIN_EMAIL) {
      setIsAuthenticated(true);
      loadMetrics();
    }
  }, []);

  async function loadMetrics() {
    setLoading(true);
    try {
      const data = await fetchAdminMetrics();
      setMetrics(data as any);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="app-layout" data-theme="dark" style={{ minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* Top Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
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

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="theme-toggle-btn" onClick={loadMetrics} title="Refresh Data" disabled={loading}>
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
            className={`tab-btn ${activeTab === "retention" ? "active" : ""}`}
            onClick={() => setActiveTab("retention")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            👥 Retention & Cohorts ({metrics.retentionRate.toFixed(1)}%)
          </button>
          <button
            className={`tab-btn ${activeTab === "downloads" ? "active" : ""}`}
            onClick={() => setActiveTab("downloads")}
            style={{ padding: "0.55rem 1.15rem", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            🖼️ Media & Image Exports ({metrics.totalExports})
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
            💳 Supporters (${metrics.totalRevenue.toFixed(2)})
          </button>
        </div>

        {/* Overview Tab */}
        {(activeTab === "overview" || activeTab === "retention" || activeTab === "downloads") && (
          <>
            {/* Primary KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
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
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Asset Type</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Media Title</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Domain / Source</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Format / Quality</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Platform</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentDownloads.map((d, idx) => (
                      <tr key={d.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
                          {d.title || "Untitled Media"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {d.domain || "web"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span style={{ padding: "0.15rem 0.5rem", borderRadius: "6px", background: "rgba(255,255,255,0.06)", fontSize: "0.75rem" }}>
                            {d.format || "auto"} {d.resolution ? `(${d.resolution})` : ""}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {d.platform || "Web"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {formatTimestamp(d.createdAt)}
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

        {/* Payments Table */}
        {(activeTab === "overview" || activeTab === "payments") && (
          <section className="card" style={{ padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <DollarIcon /> Supporters & Donations ({metrics.payments.length})
            </h3>

            {metrics.payments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                No payments recorded yet in Firestore. When supporters donate via Flutterwave, transactions will appear here automatically.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
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
                      <tr key={p.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
      </div>
    </div>
  );
}
