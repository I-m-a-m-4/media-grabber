use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SecurityReport {
    pub is_safe: bool,
    pub risk_level: String, // "safe", "caution", "high_risk"
    pub domain: String,
    pub protocol: String,
    pub category: String, // "media_stream", "app_store", "direct_media", "web_page", "executable_warning"
    pub warnings: Vec<String>,
    pub file_extension: Option<String>,
}

pub fn vet_url(raw_url: &str) -> SecurityReport {
    let mut warnings = Vec::new();
    let trimmed_url = raw_url.trim();

    let parsed_url = match Url::parse(trimmed_url) {
        Ok(u) => u,
        Err(_) => {
            return SecurityReport {
                is_safe: false,
                risk_level: "high_risk".to_string(),
                domain: "Invalid URL".to_string(),
                protocol: "unknown".to_string(),
                category: "executable_warning".to_string(),
                warnings: vec!["Invalid or malformed URL structure.".to_string()],
                file_extension: None,
            };
        }
    };

    let scheme = parsed_url.scheme().to_lowercase();
    let host_str = parsed_url.host_str().unwrap_or("").to_lowercase();

    // 1. Protocol Validation
    if scheme != "http" && scheme != "https" {
        return SecurityReport {
            is_safe: false,
            risk_level: "high_risk".to_string(),
            domain: host_str,
            protocol: scheme.clone(),
            category: "executable_warning".to_string(),
            warnings: vec![format!("Blocked unsafe protocol: '{}'. Only HTTP and HTTPS are permitted.", scheme)],
            file_extension: None,
        };
    }

    // 2. Localhost & Private IP SSRF / Internal Network Protection
    let is_local = host_str == "localhost"
        || host_str == "127.0.0.1"
        || host_str == "0.0.0.0"
        || host_str == "::1"
        || host_str == "169.254.169.254"
        || host_str.ends_with(".local")
        || host_str.ends_with(".internal")
        || host_str.ends_with(".lan")
        || host_str.starts_with("192.168.")
        || host_str.starts_with("10.")
        || (host_str.starts_with("172.") && is_private_172(&host_str));

    if is_local {
        return SecurityReport {
            is_safe: false,
            risk_level: "high_risk".to_string(),
            domain: host_str.clone(),
            protocol: scheme.clone(),
            category: "executable_warning".to_string(),
            warnings: vec![format!("Blocked access to local/private network host '{}' for security protection.", host_str)],
            file_extension: None,
        };
    }

    // 3. Inspect Path File Extension
    let path = parsed_url.path();
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    let high_risk_exts = [
        "exe", "msi", "bat", "cmd", "scr", "vbs", "ps1", "js", "dll", "sys", "com", "pif", "app",
        "dmg", "pkg", "iso", "apk", "jar", "vbe", "wsf", "cpl", "inf", "lnk", "reg", "sh",
    ];

    let safe_media_exts = [
        "mp4", "webm", "mkv", "avi", "mov", "mp3", "m4a", "aac", "flac", "wav", "jpg", "jpeg",
        "png", "webp", "gif", "svg", "pdf", "heic", "bmp", "tiff",
    ];

    let mut risk_level = "safe".to_string();
    let mut category = "web_page".to_string();

    // Categorize by Domain / URL patterns
    if host_str.contains("youtube.com")
        || host_str.contains("youtu.be")
        || host_str.contains("instagram.com")
        || host_str.contains("tiktok.com")
        || host_str.contains("twitter.com")
        || host_str.contains("x.com")
        || host_str.contains("vimeo.com")
        || host_str.contains("facebook.com")
        || host_str.contains("twitch.tv")
    {
        category = "media_stream".to_string();
    } else if host_str.contains("apps.apple.com")
        || host_str.contains("play.google.com")
        || host_str.contains("microsoft.com")
    {
        category = "app_store".to_string();
    }


    if let Some(ref extension) = ext {
        if high_risk_exts.contains(&extension.as_str()) {
            risk_level = "high_risk".to_string();
            category = "executable_warning".to_string();
            warnings.push(format!(
                "High Risk File Extension detected: '.{}'. Downloading executable files poses malware risks.",
                extension
            ));
        } else if safe_media_exts.contains(&extension.as_str()) {
            if category == "web_page" {
                category = "direct_media".to_string();
            }
        }
    }

    if scheme == "http" {
        warnings.push("Unencrypted HTTP link detected. Content is not protected by HTTPS SSL.".to_string());
        if risk_level == "safe" {
            risk_level = "caution".to_string();
        }
    }

    let is_safe = risk_level != "high_risk";

    SecurityReport {
        is_safe,
        risk_level,
        domain: host_str,
        protocol: scheme,
        category,
        warnings,
        file_extension: ext,
    }
}

fn is_private_172(host: &str) -> bool {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() == 4 && parts[0] == "172" {
        if let Ok(second) = parts[1].parse::<u8>() {
            return (16..=31).contains(&second);
        }
    }
    false
}
