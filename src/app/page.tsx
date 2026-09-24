"use client";

import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Link from "next/link";


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
}

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

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [url, setUrl] = useState("");

  const [browserCookie, setBrowserCookie] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);

  // Load Theme & History on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("mediaGrabberTheme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
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

  // Save Theme on change
  useEffect(() => {
    localStorage.setItem("mediaGrabberTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }


  // Active view tab inside Media Card: "video" | "images"
  const [mediaTab, setMediaTab] = useState<"video" | "images">("video");

  // App states
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // User selections
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [audioOnly, setAudioOnly] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
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

  // Save history on change
  useEffect(() => {
    localStorage.setItem("mediaGrabberHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (errorMsg) setErrorMsg("");
    if (successMsg) setSuccessMsg("");
  }, [url, audioOnly, selectedFormat, browserCookie]);

  async function handleFetchInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg("Please enter a valid URL.");
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
        const res = await fetch(`/api/info?url=${encodeURIComponent(url.trim())}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch from web API");
        }
        info = await res.json();
      }

      setMediaInfo(info);

      // Select default view tab
      if (info.formats && info.formats.length > 0) {
        setMediaTab("video");
        const videoFormats = info.formats.filter((f) => f.vcodec !== "none");
        if (videoFormats.length > 0) {
          setSelectedFormat(videoFormats[videoFormats.length - 1].format_id);
        } else {
          setSelectedFormat(info.formats[0].format_id);
        }
      } else if (info.images && info.images.length > 0) {
        setMediaTab("images");
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
    setSuccessMsg("Download started. Saving to your Downloads folder...");

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

      setSuccessMsg(resMsg || "Download completed successfully!");

      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: itemNote ? `${mediaInfo.title} (${itemNote})` : mediaInfo.title,
        url: url.trim(),
        thumbnail: directUrl || mediaInfo.thumbnail,
        timestamp: Date.now(),
        format: audioOnly ? "Audio (MP3)" : directUrl ? "Image / Asset" : "Video",
        assetType: directUrl ? "Image Asset" : "Media Stream",
      };

      setHistory((prev) => [newItem, ...prev].slice(0, 50));
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Download failed: ${error.message || error}`);
      setSuccessMsg("");
    } finally {
      setDownloading(false);
      setDownloadingId(null);
    }
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div className="app-layout" data-theme={theme}>
      {/* Toast Notifications */}
      <div className="toast-container" aria-live="polite">
        {errorMsg && (
          <div className="toast error-toast" role="alert">
            <ErrorIcon /> <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="toast success-toast" role="status">
            <CheckIcon /> <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="app-header">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="header-top-bar">
            <img src="/icon.svg" alt="Universal Media Grabber Logo" className="header-app-icon" />
            <h1 className="title">Universal Media & Asset Grabber</h1>
          </div>
          <p className="subtitle">
            Download videos, audio tracks, App Store screenshots, and high-res media from any link.
          </p>
        </header>


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
                    <li key={item.id} className="history-item">
                      <div className="history-thumbnail-wrapper">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="history-thumbnail" />
                        ) : (
                          <div className="history-thumbnail-placeholder">No Img</div>
                        )}
                      </div>
                      <div className="history-details">
                        <h4>{item.title}</h4>
                        <div className="history-meta">
                          <span className="history-format">{item.format}</span>
                          <span className="history-date">{formatDate(item.timestamp)}</span>
                        </div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="history-link">
                          {item.url}
                        </a>
                      </div>
                    </li>
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
            <h3>Universal Link & Media Downloader</h3>
            <p>Paste any URL — YouTube, Apple App Store, Google Play, Instagram, TikTok, or web page.</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !mediaInfo && !showHistory && (
          <div className="card skeleton-card">
            <div className="skeleton-header">
              <div className="skeleton-img"></div>
              <div className="skeleton-details">
                <div className="skeleton-line title-line"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
          </div>
        )}

        {/* Media Details & Security Vetting Card */}
        {mediaInfo && !showHistory && (
          <section className="media-card card fade-in">
            {/* Security Vetting Badge Header */}
            <div className={`security-bar security-${mediaInfo.security.risk_level}`}>
              <div className="security-title">
                <ShieldIcon />
                <span>
                  Link Vetting Audit: <strong>{mediaInfo.security.risk_level.toUpperCase()}</strong> ({mediaInfo.security.domain})
                </span>
              </div>
              <div className="security-badges">
                <span className="sec-tag">{mediaInfo.security.protocol.toUpperCase()}</span>
                <span className="sec-tag">{mediaInfo.security.category.replace("_", " ").toUpperCase()}</span>
              </div>
            </div>

            {mediaInfo.security.warnings.length > 0 && (
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
                {mediaInfo.thumbnail ? (
                  <img src={mediaInfo.thumbnail} alt={mediaInfo.title} className="media-thumbnail" />
                ) : (
                  <div className="thumbnail-placeholder">No Image</div>
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
                  <ImageIcon /> Images & Screenshots ({mediaInfo.images.length})
                </button>
              )}
            </div>

            {/* Video Streams & Audio Controls Tab */}
            {mediaTab === "video" && mediaInfo.formats.length > 0 && (
              <div className="download-controls">
                <div className="control-group switch-group">
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
                    <span className="switch-text">Audio Only (Extract MP3)</span>
                  </label>
                </div>

                {!audioOnly && (
                  <div className="control-group">
                    <label htmlFor="format-select" className="label">
                      Select Video Quality
                    </label>
                    <select
                      id="format-select"
                      className="select-input large-select"
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.currentTarget.value)}
                      disabled={downloading}
                    >
                      {mediaInfo.formats.map((fmt) => (
                        <option key={fmt.format_id} value={fmt.format_id}>
                          {fmt.resolution || "Standard"} {fmt.fps ? `(${fmt.fps}fps)` : ""} •{" "}
                          {fmt.ext.toUpperCase()} • {formatBytes(fmt.filesize)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  className={`primary-btn download-btn ${downloading ? "loading" : ""}`}
                  onClick={() => handleDownload()}
                  disabled={downloading || (!audioOnly && !selectedFormat)}
                >
                  {downloading ? (
                    <>
                      <span className="loader"></span> Downloading Media...
                    </>
                  ) : (
                    <>
                      <DownloadIcon /> Download Media Stream
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Images & App Store Screenshots Grid Tab */}
            {mediaTab === "images" && mediaInfo.images.length > 0 && (
              <div className="images-grid-container fade-in">
                <div className="images-grid">
                  {mediaInfo.images.map((imgItem) => (
                    <div key={imgItem.format_id} className="image-card">
                      <div className="image-preview-wrapper">
                        {imgItem.direct_url ? (
                          <img src={imgItem.direct_url} alt={imgItem.note || "Asset"} className="image-preview" />
                        ) : (
                          <div className="image-placeholder">Asset Image</div>
                        )}
                        <span className="image-tag">{imgItem.ext.toUpperCase()}</span>
                      </div>
                      <div className="image-card-footer">
                        <span className="image-note">{imgItem.note || imgItem.resolution}</span>
                        <button
                          className="secondary-btn image-dl-btn"
                          disabled={downloading}
                          onClick={() => handleDownload(imgItem.format_id, imgItem.direct_url, imgItem.note)}
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
                  ))}
                </div>
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
    </div>
  );
}

