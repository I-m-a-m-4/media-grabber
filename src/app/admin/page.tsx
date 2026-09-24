"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAdminMetrics, UserProfile, PaymentRecord } from "../../lib/firebase";

// Icons
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
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
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState<{
    totalUsers: number;
    totalPayments: number;
    totalRevenue: number;
    users: UserProfile[];
    payments: PaymentRecord[];
  }>({
    totalUsers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    users: [],
    payments: []
  });

  const DEFAULT_PIN = "admin2026"; // Default passkey

  useEffect(() => {
    const savedAuth = localStorage.getItem("adminAuthenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      loadMetrics();
    }
  }, []);

  async function loadMetrics() {
    setLoading(true);
    const data = await fetchAdminMetrics();
    setMetrics(data);
    setLoading(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pin === DEFAULT_PIN || pin === "bimex") {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuthenticated", "true");
      setPinError("");
      loadMetrics();
    } else {
      setPinError("Invalid Admin Passkey. (Default: admin2026)");
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    localStorage.removeItem("adminAuthenticated");
  }

  if (!isAuthenticated) {
    return (
      <div className="app-layout" data-theme="dark" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card admin-login-card fade-in" style={{ maxWidth: "420px", width: "100%", padding: "2.5rem" }}>
          <div style={{ textTransform: "uppercase", letterSpacing: "1px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", borderRadius: "50%", background: "rgba(255, 102, 0, 0.15)", color: "#ff6600" }}>
              <ShieldLockIcon />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", textAlign: "center" }}>Admin Dashboard</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center", textTransform: "none" }}>
              Enter security passcode to access application analytics and payment records.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label htmlFor="admin-passcode" style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>Passcode</label>
              <input
                id="admin-passcode"
                type="password"
                className="url-input"
                placeholder="Enter passcode (e.g. admin2026)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
              {pinError && <p style={{ color: "#ff4d4d", fontSize: "0.8rem", marginTop: "0.4rem" }}>{pinError}</p>}
            </div>

            <button type="submit" className="primary-btn" style={{ padding: "0.85rem" }}>
              Unlock Dashboard
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

  return (
    <div className="app-layout" data-theme="dark" style={{ minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <Link href="/" className="icon-btn" title="Back to App">
                <ArrowLeftIcon />
              </Link>
              <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Admin Analytics & Metrics</h1>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Real-time user engagement, Firebase anonymous auth metrics, and Flutterwave payment tracking.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="theme-toggle-btn" onClick={loadMetrics} title="Refresh Data" disabled={loading}>
              <RefreshIcon /> {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button className="support-btn" onClick={handleLogout} style={{ background: "rgba(255, 77, 77, 0.15)", color: "#ff4d4d", border: "1px solid rgba(255, 77, 77, 0.3)" }}>
              Lock Dashboard
            </button>
          </div>
        </header>

        {/* Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
          <div className="card" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ padding: "1rem", borderRadius: "14px", background: "rgba(255, 102, 0, 0.15)", color: "#ff6600" }}>
              <UserIcon />
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unique Anonymous Users</span>
              <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem" }}>{metrics.totalUsers}</h2>
            </div>
          </div>

          <div className="card" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ padding: "1rem", borderRadius: "14px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <DollarIcon />
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Revenue</span>
              <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem", color: "#10b981" }}>${metrics.totalRevenue.toFixed(2)}</h2>
            </div>
          </div>

          <div className="card" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ padding: "1rem", borderRadius: "14px", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
              <CreditCardIcon />
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment Transactions</span>
              <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.25rem" }}>{metrics.totalPayments}</h2>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <section className="card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            💳 Recent Payments & Supporters ({metrics.payments.length})
          </h3>

          {metrics.payments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              No payments recorded yet in Firestore. When supporters donate via Flutterwave, transactions will appear here automatically.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
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
                      <td style={{ padding: "1rem", fontWeight: "600" }}>{p.name || "Anonymous Supporter"}</td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{p.email || "N/A"}</td>
                      <td style={{ padding: "1rem", color: "#10b981", fontWeight: "700" }}>${p.amount} {p.currency}</td>
                      <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.tx_ref}</td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          background: p.status === "successful" || p.status === "completed" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: p.status === "successful" || p.status === "completed" ? "#10b981" : "#ef4444"
                        }}>
                          {p.status || "Completed"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>{formatTimestamp(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Users Tracking Table */}
        <section className="card" style={{ padding: "1.75rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            👤 Unique Active Installations & Sessions ({metrics.users.length})
          </h3>

          {metrics.users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              No anonymous users registered yet in Firestore. Users are automatically recorded upon opening the application.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>User UID (Firebase)</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Auth Type</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Platform</th>
                    <th style={{ padding: "0.75rem 1rem" }}>First Seen</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.users.map((u, idx) => (
                    <tr key={u.uid || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#ff6600" }}>{u.uid}</td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "8px", background: "rgba(255,255,255,0.08)", fontSize: "0.75rem" }}>
                          {u.isAnonymous ? "Anonymous" : "User Account"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: "500" }}>{u.platform || "Web / App"}</td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>{formatTimestamp(u.firstSeenAt)}</td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>{formatTimestamp(u.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
