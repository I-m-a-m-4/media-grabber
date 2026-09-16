"use client";

import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FormatInfo {
  format_id: string;
  ext: string;
  resolution: string;
  fps?: number;
  vcodec: string;
  acodec: string;
  filesize?: number;
  note?: string;
}

interface MediaInfo {
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  formats: FormatInfo[];
}

interface HistoryItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  timestamp: number;
  format: string;
}

// Icons
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function formatBytes(bytes?: number, decimals = 2) {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function App() {
  const [url, setUrl] = useState("");
  const [browserCookie, setBrowserCookie] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  
  // App states
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
    setShowHistory(false); // Hide history when fetching new media

    try {
      const info = await invoke<MediaInfo>("get_media_info", { url: url.trim() });
      setMediaInfo(info);
      
      const videoFormats = info.formats.filter(f => f.vcodec !== "none");
      if (videoFormats.length > 0) {
        setSelectedFormat(videoFormats[videoFormats.length - 1].format_id);
      } else if (info.formats.length > 0) {
        setSelectedFormat(info.formats[0].format_id);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Failed to fetch media details. Ensure you are running the desktop app.`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!url || !mediaInfo) return;
    if (!audioOnly && !selectedFormat) {
      setErrorMsg("Please select a download format.");
      return;
    }
    
    setDownloading(true);
    setErrorMsg("");
    setSuccessMsg("Download started. Check your Downloads folder.");
    
    try {
      const res = await invoke<string>("download_media", {
        url: url.trim(),
        formatId: selectedFormat || null,
        audioOnly,
        browserCookie: browserCookie || null,
      });
      setSuccessMsg(res || "Download completed successfully!");
      
      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: mediaInfo.title,
        url: url.trim(),
        thumbnail: mediaInfo.thumbnail,
        timestamp: Date.now(),
        format: audioOnly ? "Audio (MP3)" : "Video",
      };
      
      setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50 items
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Download failed: ${error}`);
      setSuccessMsg("");
    } finally {
      setDownloading(false);
    }
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div className="app-layout">
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
          <h1 className="title">Universal Media Grabber</h1>
          <p className="subtitle">Download high-quality video and audio from anywhere.</p>
        </header>

        <section className="search-section card">
          <div className="search-tabs">
            <button 
              className={`tab-btn ${!showHistory ? 'active' : ''}`}
              onClick={() => setShowHistory(false)}
            >
              Grabber
            </button>
            <button 
              className={`tab-btn ${showHistory ? 'active' : ''}`}
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
                    placeholder="Paste media link here (YouTube, Instagram...)"
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
                  className={`primary-btn ${loading ? 'loading' : ''}`} 
                  type="submit" 
                  disabled={loading || downloading || !url.trim()}
                >
                  {loading ? (
                    <span className="loader"></span>
                  ) : (
                    <>
                      <SearchIcon /> Fetch
                    </>
                  )}
                </button>
              </form>

              {showSettings && (
                <div className="advanced-settings slide-down">
                  <div className="form-group">
                    <label htmlFor="browser-select">Instagram Auth (Browser Cookies)</label>
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
                    <p className="help-text">Select your primary browser to bypass rate limits on sites like Instagram.</p>
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
                  {history.map(item => (
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
            <div className="empty-icon">🔗</div>
            <h3>Ready to grab some media</h3>
            <p>Paste a link above to fetch available download options.</p>
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

        {/* Media Details Card */}
        {mediaInfo && !showHistory && (
          <section className="media-card card fade-in">
            <div className="media-header">
              <div className="media-thumbnail-wrapper">
                {mediaInfo.thumbnail ? (
                  <img src={mediaInfo.thumbnail} alt={mediaInfo.title} className="media-thumbnail" />
                ) : (
                  <div className="thumbnail-placeholder">No Image</div>
                )}
                {mediaInfo.duration && (
                  <span className="media-duration">
                    {Math.floor(mediaInfo.duration / 60)}:{(mediaInfo.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              
              <div className="media-info">
                <h2 className="media-title" title={mediaInfo.title}>{mediaInfo.title}</h2>
                <div className="media-meta">
                  {mediaInfo.uploader && <span className="uploader">{mediaInfo.uploader}</span>}
                </div>
              </div>
            </div>

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
                  <span className="switch-text">Audio Only (MP3 Extraction)</span>
                </label>
              </div>

              {!audioOnly && (
                <div className="control-group">
                  <label htmlFor="format-select" className="label">Select Quality</label>
                  <select
                    id="format-select"
                    className="select-input large-select"
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.currentTarget.value)}
                    disabled={downloading}
                  >
                    {mediaInfo.formats
                      .filter((f) => f.vcodec !== "none")
                      .map((fmt) => (
                        <option key={fmt.format_id} value={fmt.format_id}>
                          {fmt.resolution} {fmt.fps ? `(${fmt.fps}fps)` : ""} • {fmt.ext.toUpperCase()} • {formatBytes(fmt.filesize)}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <button
                className={`primary-btn download-btn ${downloading ? 'loading' : ''}`}
                onClick={handleDownload}
                disabled={downloading || (!audioOnly && !selectedFormat)}
              >
                {downloading ? (
                  <>
                    <span className="loader"></span> Processing...
                  </>
                ) : (
                  <>
                    <DownloadIcon /> Download Media
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
