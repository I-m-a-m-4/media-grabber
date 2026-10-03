use crate::security::{vet_url, SecurityReport};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FormatInfo {
    pub format_id: String,
    pub ext: String,
    pub resolution: String,
    pub fps: Option<f64>,
    pub vcodec: String,
    pub acodec: String,
    pub filesize: Option<u64>,
    pub note: Option<String>,
    pub direct_url: Option<String>,
    pub asset_type: String, // "video", "audio", "image", "screenshot"
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MediaInfo {
    pub title: String,
    pub description: Option<String>,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub uploader: Option<String>,
    pub site_name: Option<String>,
    pub formats: Vec<FormatInfo>,
    pub images: Vec<FormatInfo>,
    pub security: SecurityReport,
}

#[tauri::command]
pub async fn get_media_info(
    app_handle: tauri::AppHandle,
    url: String,
) -> Result<MediaInfo, String> {
    let clean_url = url.trim();

    // 1. Security Link Vetting & Auditing
    let security_report = vet_url(clean_url);

    if !security_report.is_safe {
        return Err(format!(
            "Security Warning: {}",
            security_report.warnings.join(" ")
        ));
    }

    // 2. Engine 1: Dedicated Twitter / X resolver (fast direct MP4 stream extraction)
    if clean_url.contains("twitter.com") || clean_url.contains("x.com") {
        if let Ok(info) = fetch_twitter_info(clean_url, &security_report).await {
            return Ok(info);
        }
    }

    // Attempt yt-dlp for video/audio streaming sites
    if security_report.category == "media_stream" {
        if let Ok(info) = fetch_yt_dlp_info(&app_handle, clean_url, &security_report).await {
            return Ok(info);
        }
    }

    // 3. Engine 2: App Store / Play Store extractor
    if security_report.category == "app_store" {
        if let Ok(info) = fetch_app_store_info(clean_url, &security_report).await {
            return Ok(info);
        }
    }

    // 4. Engine 3: Try yt-dlp fallback (in case unknown site is supported by yt-dlp)
    if let Ok(info) = fetch_yt_dlp_info(&app_handle, clean_url, &security_report).await {
        return Ok(info);
    }

    // 5. Engine 4: Generic Webpage & Direct Media Extractor
    fetch_generic_web_info(clean_url, &security_report).await
}

async fn fetch_twitter_info(
    url: &str,
    security_report: &SecurityReport,
) -> Result<MediaInfo, String> {
    let re = Regex::new(r"(?i)status/(\d+)").unwrap();
    let tweet_id = re
        .captures(url)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str())
        .ok_or_else(|| "Invalid Twitter status URL".to_string())?;

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let fx_url = format!("https://api.fxtwitter.com/status/{}", tweet_id);
    let resp = client.get(&fx_url).send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("fxtwitter returned HTTP {}", resp.status()));
    }

    let json_data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let tweet = json_data
        .get("tweet")
        .ok_or_else(|| "No tweet data found in response".to_string())?;

    let raw_text = tweet.get("text").and_then(|v| v.as_str()).unwrap_or("");
    let author_name = tweet
        .get("author")
        .and_then(|a| a.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("Twitter User");
    let author_handle = tweet
        .get("author")
        .and_then(|a| a.get("screen_name"))
        .and_then(|n| n.as_str())
        .unwrap_or("");
    let avatar_url = tweet
        .get("author")
        .and_then(|a| a.get("avatar_url"))
        .and_then(|n| n.as_str());

    let title = if raw_text.len() > 90 {
        format!("{}...", &raw_text[..90])
    } else if !raw_text.is_empty() {
        raw_text.to_string()
    } else {
        format!("{}'s Video on X", author_name)
    };

    let uploader = format!("{} (@{})", author_name, author_handle);

    let mut formats_list = Vec::new();
    let mut images_list = Vec::new();
    let mut primary_thumb: Option<String> = None;
    let mut duration: Option<f64> = None;
    let mut seen_urls = std::collections::HashSet::new();

    let empty_arr = Vec::new();
    let videos = tweet
        .get("media")
        .and_then(|m| m.get("videos"))
        .and_then(|v| v.as_array())
        .or_else(|| {
            tweet
                .get("quote")
                .and_then(|q| q.get("media"))
                .and_then(|m| m.get("videos"))
                .and_then(|v| v.as_array())
        })
        .unwrap_or(&empty_arr);

    for (v_idx, vid) in videos.iter().enumerate() {
        if duration.is_none() {
            duration = vid.get("duration").and_then(|d| d.as_f64());
        }

        if let Some(thumb) = vid.get("thumbnail_url").and_then(|t| t.as_str()) {
            if primary_thumb.is_none() {
                primary_thumb = Some(thumb.to_string());
            }
            if !seen_urls.contains(thumb) {
                seen_urls.insert(thumb.to_string());
                images_list.push(FormatInfo {
                    format_id: format!("tw_thumb_{}", v_idx + 1),
                    ext: "jpg".to_string(),
                    resolution: "Video Poster Thumbnail".to_string(),
                    fps: None,
                    vcodec: "none".to_string(),
                    acodec: "none".to_string(),
                    filesize: None,
                    note: Some("Video Poster Thumbnail".to_string()),
                    direct_url: Some(thumb.to_string()),
                    asset_type: "image".to_string(),
                });
            }
        }

        if let Some(variants) = vid.get("variants").and_then(|vr| vr.as_array()) {
            let mut mp4_variants: Vec<&serde_json::Value> = variants
                .iter()
                .filter(|v| {
                    let ct = v.get("content_type").and_then(|c| c.as_str()).unwrap_or("");
                    let u = v.get("url").and_then(|c| c.as_str()).unwrap_or("");
                    ct == "video/mp4" || u.contains(".mp4")
                })
                .collect();

            mp4_variants.sort_by(|a, b| {
                let bit_a = a.get("bitrate").and_then(|x| x.as_u64()).unwrap_or(0);
                let bit_b = b.get("bitrate").and_then(|x| x.as_u64()).unwrap_or(0);
                bit_b.cmp(&bit_a)
            });

            for (f_idx, v) in mp4_variants.iter().enumerate() {
                if let Some(v_url) = v.get("url").and_then(|u| u.as_str()) {
                    if !seen_urls.contains(v_url) {
                        seen_urls.insert(v_url.to_string());

                        let res_re = Regex::new(r"/(\d+x\d+)/").unwrap();
                        let dim_str = res_re
                            .captures(v_url)
                            .and_then(|c| c.get(1))
                            .map(|m| m.as_str().to_string())
                            .unwrap_or_else(|| "HD Video".to_string());

                        formats_list.push(FormatInfo {
                            format_id: format!("tw_vid_{}_{}", v_idx + 1, f_idx + 1),
                            ext: "mp4".to_string(),
                            resolution: format!("MP4 Video ({})", dim_str),
                            fps: None,
                            vcodec: "h264".to_string(),
                            acodec: "aac".to_string(),
                            filesize: None,
                            note: Some(format!("Twitter Stream ({})", dim_str)),
                            direct_url: Some(v_url.to_string()),
                            asset_type: "video".to_string(),
                        });
                    }
                }
            }

            if let Some(highest_mp4) = mp4_variants.first() {
                if let Some(h_url) = highest_mp4.get("url").and_then(|u| u.as_str()) {
                    formats_list.push(FormatInfo {
                        format_id: format!("tw_audio_{}", v_idx + 1),
                        ext: "mp3".to_string(),
                        resolution: "Audio Only (MP3 Track)".to_string(),
                        fps: None,
                        vcodec: "none".to_string(),
                        acodec: "mp3".to_string(),
                        filesize: None,
                        note: Some("Original Audio Track".to_string()),
                        direct_url: Some(h_url.to_string()),
                        asset_type: "audio".to_string(),
                    });
                }
            }
        }
    }

    if let Some(avatar) = avatar_url {
        if !seen_urls.contains(avatar) {
            seen_urls.insert(avatar.to_string());
            images_list.push(FormatInfo {
                format_id: "tw_avatar".to_string(),
                ext: "jpg".to_string(),
                resolution: "Author Avatar".to_string(),
                fps: None,
                vcodec: "none".to_string(),
                acodec: "none".to_string(),
                filesize: None,
                note: Some("Author Avatar".to_string()),
                direct_url: Some(avatar.to_string()),
                asset_type: "image".to_string(),
            });
        }
        if primary_thumb.is_none() {
            primary_thumb = Some(avatar.to_string());
        }
    }

    if formats_list.is_empty() && images_list.is_empty() {
        return Err("No media found in tweet".to_string());
    }

    Ok(MediaInfo {
        title,
        description: Some(raw_text.to_string()),
        thumbnail: primary_thumb,
        duration,
        uploader: Some(uploader),
        site_name: Some("Twitter / X".to_string()),
        formats: formats_list,
        images: images_list,
        security: security_report.clone(),
    })
}

async fn fetch_yt_dlp_info(
    app_handle: &tauri::AppHandle,
    url: &str,
    security_report: &SecurityReport,
) -> Result<MediaInfo, String> {
    let sidecar_command = app_handle
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(["--dump-json", url]);

    let output = sidecar_command
        .output()
        .await
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "yt-dlp failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let first_line = json_str.lines().next().unwrap_or("{}");

    let parsed: serde_json::Value =
        serde_json::from_str(first_line).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut formats_list = Vec::new();
    if let Some(formats) = parsed.get("formats").and_then(|f| f.as_array()) {
        for fmt in formats {
            let format_id = fmt
                .get("format_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let ext = fmt
                .get("ext")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let resolution = fmt
                .get("resolution")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let vcodec = fmt
                .get("vcodec")
                .and_then(|v| v.as_str())
                .unwrap_or("none")
                .to_string();
            let acodec = fmt
                .get("acodec")
                .and_then(|v| v.as_str())
                .unwrap_or("none")
                .to_string();
            let filesize = fmt.get("filesize").and_then(|v| v.as_u64());
            let fps = fmt.get("fps").and_then(|v| v.as_f64());
            let note = fmt
                .get("format_note")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let asset_type = if vcodec != "none" {
                "video".to_string()
            } else {
                "audio".to_string()
            };

            formats_list.push(FormatInfo {
                format_id,
                ext,
                resolution,
                fps,
                vcodec,
                acodec,
                filesize,
                note,
                direct_url: None,
                asset_type,
            });
        }
    }

    let thumbnail = parsed
        .get("thumbnail")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut images_list = Vec::new();
    if let Some(ref thumb) = thumbnail {
        images_list.push(FormatInfo {
            format_id: "thumb_cover".to_string(),
            ext: "jpg".to_string(),
            resolution: "Cover Art / Poster".to_string(),
            fps: None,
            vcodec: "none".to_string(),
            acodec: "none".to_string(),
            filesize: None,
            note: Some("Main Thumbnail".to_string()),
            direct_url: Some(thumb.clone()),
            asset_type: "image".to_string(),
        });
    }

    Ok(MediaInfo {
        title: parsed
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Media Stream")
            .to_string(),
        description: parsed
            .get("description")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        thumbnail,
        duration: parsed.get("duration").and_then(|v| v.as_f64()),
        uploader: parsed
            .get("uploader")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        site_name: parsed
            .get("extractor")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        formats: formats_list,
        images: images_list,
        security: security_report.clone(),
    })
}

async fn fetch_app_store_info(
    url: &str,
    security_report: &SecurityReport,
) -> Result<MediaInfo, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch App Store page: {}", e))?;

    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read HTML: {}", e))?;

    // Extract Title
    let title_re = Regex::new(r#"(?i)<meta\s+property="og:title"\s+content="([^"]+)"#).unwrap();
    let title = title_re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "App Store Listing".to_string());

    // Extract Description
    let desc_re =
        Regex::new(r#"(?i)<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"#)
            .unwrap();
    let description = desc_re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string());

    // Extract Icon/Thumbnail
    let icon_re = Regex::new(r#"(?i)<meta\s+property="og:image"\s+content="([^"]+)"#).unwrap();
    let thumbnail = icon_re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string());

    // Extract Screenshots (Apple App Store, Google Play Store, Microsoft Store img & srcset URLs)
    let img_src_re = Regex::new(r#"(?i)https://is[0-9]-ssl\.mzstatic\.com/image/thumb/[^"'\s\)]+"#).unwrap();
    let play_img_re = Regex::new(r#"(?i)https://play-lh\.googleusercontent\.com/[^"'\s\)]+"#).unwrap();
    let ms_img_re = Regex::new(r#"(?i)https://store-images\.s-microsoft\.com/image/[^"'\s\)\?#]+"#).unwrap();
    let ms_img_re2 = Regex::new(r#"(?i)https://store-images\.microsoft\.com/image/[^"'\s\)\?#]+"#).unwrap();
    let generic_img_re = Regex::new(r#"(?i)<img[^>]+src=["'](https?://[^"'\s]+)["']"#).unwrap();

    let mut images_list = Vec::new();
    let mut seen_urls = std::collections::HashSet::new();

    if let Some(ref thumb) = thumbnail {
        seen_urls.insert(thumb.clone());
        images_list.push(FormatInfo {
            format_id: "app_icon".to_string(),
            ext: "png".to_string(),
            resolution: "App Icon".to_string(),
            fps: None,
            vcodec: "none".to_string(),
            acodec: "none".to_string(),
            filesize: None,
            note: Some("App Icon High Res".to_string()),
            direct_url: Some(thumb.clone()),
            asset_type: "image".to_string(),
        });
    }

    let mut screenshot_idx = 1;

    let mut add_screenshot = |img_url: String, list: &mut Vec<FormatInfo>, seen: &mut std::collections::HashSet<String>, idx: &mut usize| {
        if !seen.contains(&img_url) && !img_url.contains("data:image") && !img_url.ends_with(".svg") {
            seen.insert(img_url.clone());
            list.push(FormatInfo {
                format_id: format!("app_screenshot_{}", *idx),
                ext: "png".to_string(),
                resolution: "App Screenshot".to_string(),
                fps: None,
                vcodec: "none".to_string(),
                acodec: "none".to_string(),
                filesize: None,
                note: Some(format!("Screenshot {}", *idx)),
                direct_url: Some(img_url),
                asset_type: "screenshot".to_string(),
            });
            *idx += 1;
        }
    };

    // 1. Microsoft Store Screenshot CDNs
    for cap in ms_img_re.find_iter(&html) {
        add_screenshot(cap.as_str().to_string(), &mut images_list, &mut seen_urls, &mut screenshot_idx);
    }
    for cap in ms_img_re2.find_iter(&html) {
        add_screenshot(cap.as_str().to_string(), &mut images_list, &mut seen_urls, &mut screenshot_idx);
    }

    // 2. Apple App Store Screenshots
    for cap in img_src_re.find_iter(&html) {
        add_screenshot(cap.as_str().to_string(), &mut images_list, &mut seen_urls, &mut screenshot_idx);
    }

    // 3. Google Play Screenshots
    for cap in play_img_re.find_iter(&html) {
        add_screenshot(cap.as_str().to_string(), &mut images_list, &mut seen_urls, &mut screenshot_idx);
    }

    // 4. Generic App Page Screenshots (<img src="...">)
    for cap in generic_img_re.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            let u = m.as_str().to_string();
            if u.contains("screenshot") || u.contains("slide") || u.contains("screen") || u.contains("store-images") {
                add_screenshot(u, &mut images_list, &mut seen_urls, &mut screenshot_idx);
            }
        }
    }


    Ok(MediaInfo {
        title,
        description,
        thumbnail: thumbnail.clone(),
        duration: None,
        uploader: Some(security_report.domain.clone()),
        site_name: Some("App Store Listing".to_string()),
        formats: Vec::new(),
        images: images_list,
        security: security_report.clone(),
    })
}

async fn fetch_generic_web_info(
    url: &str,
    security_report: &SecurityReport,
) -> Result<MediaInfo, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    // Check if direct file link
    if security_report.category == "direct_media" {
        let ext = security_report
            .file_extension
            .clone()
            .unwrap_or_else(|| "bin".to_string());
        let is_video = ["mp4", "webm", "mkv", "mov", "avi"].contains(&ext.as_str());
        let is_audio = ["mp3", "m4a", "wav", "flac"].contains(&ext.as_str());

        let filename = url
            .split('/')
            .last()
            .unwrap_or("direct_media")
            .split('?')
            .next()
            .unwrap_or("direct_media");

        let mut formats_list = Vec::new();
        let mut images_list = Vec::new();

        let asset_item = FormatInfo {
            format_id: "direct_file".to_string(),
            ext: ext.clone(),
            resolution: "Original Stream".to_string(),
            fps: None,
            vcodec: if is_video { "h246/vp9".to_string() } else { "none".to_string() },
            acodec: if is_audio || is_video { "aac/mp3".to_string() } else { "none".to_string() },
            filesize: None,
            note: Some("Direct Media Download".to_string()),
            direct_url: Some(url.to_string()),
            asset_type: if is_video {
                "video".to_string()
            } else if is_audio {
                "audio".to_string()
            } else {
                "image".to_string()
            },
        };

        if is_video || is_audio {
            formats_list.push(asset_item);
        } else {
            images_list.push(asset_item);
        }

        return Ok(MediaInfo {
            title: filename.to_string(),
            description: Some("Direct File Asset".to_string()),
            thumbnail: if !is_video && !is_audio {
                Some(url.to_string())
            } else {
                None
            },
            duration: None,
            uploader: Some(security_report.domain.clone()),
            site_name: Some("Direct File Source".to_string()),
            formats: formats_list,
            images: images_list,
            security: security_report.clone(),
        });
    }

    // Scrape Webpage HTML
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch web page: {}", e))?;

    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read webpage content: {}", e))?;

    // Extract Title
    let og_title = Regex::new(r#"(?i)<meta\s+property="og:title"\s+content="([^"]+)"#).unwrap();
    let title_tag = Regex::new(r#"(?i)<title[^>]*>([^<]+)</title>"#).unwrap();

    let title = og_title
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .or_else(|| {
            title_tag
                .captures(&html)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().trim().to_string())
        })
        .unwrap_or_else(|| "Web Page Asset".to_string());

    // Extract Description
    let desc_re =
        Regex::new(r#"(?i)<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"#)
            .unwrap();
    let description = desc_re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string());

    // Extract Hero / Og Image
    let og_img_re = Regex::new(r#"(?i)<meta\s+property="og:image"\s+content="([^"]+)"#).unwrap();
    let thumbnail = og_img_re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string());

    let mut images_list = Vec::new();
    let mut formats_list = Vec::new();
    let mut seen_urls = std::collections::HashSet::new();

    if let Some(ref thumb) = thumbnail {
        seen_urls.insert(thumb.clone());
        images_list.push(FormatInfo {
            format_id: "hero_og_image".to_string(),
            ext: "jpg".to_string(),
            resolution: "Og:Image Header".to_string(),
            fps: None,
            vcodec: "none".to_string(),
            acodec: "none".to_string(),
            filesize: None,
            note: Some("Page Primary Image".to_string()),
            direct_url: Some(thumb.clone()),
            asset_type: "image".to_string(),
        });
    }

    // Scrape embedded <img> & <video> tags
    let img_src_re = Regex::new(r#"(?i)<img[^>]+src=["'](https?://[^"'\s]+)["']"#).unwrap();
    let video_src_re = Regex::new(r#"(?i)<video[^>]+src=["'](https?://[^"'\s]+)["']"#).unwrap();

    let mut img_idx = 1;
    for cap in img_src_re.captures_iter(&html) {
        if let Some(img_match) = cap.get(1) {
            let img_url = img_match.as_str().to_string();
            if !seen_urls.contains(&img_url) && !img_url.ends_with(".svg") && !img_url.contains("data:image") {
                seen_urls.insert(img_url.clone());
                images_list.push(FormatInfo {
                    format_id: format!("page_img_{}", img_idx),
                    ext: "png".to_string(),
                    resolution: "Page Graphic / Screenshot".to_string(),
                    fps: None,
                    vcodec: "none".to_string(),
                    acodec: "none".to_string(),
                    filesize: None,
                    note: Some(format!("Page Asset {}", img_idx)),
                    direct_url: Some(img_url),
                    asset_type: "image".to_string(),
                });
                img_idx += 1;
                if img_idx > 25 {
                    break;
                }
            }
        }
    }

    let mut video_idx = 1;
    for cap in video_src_re.captures_iter(&html) {
        if let Some(v_match) = cap.get(1) {
            let v_url = v_match.as_str().to_string();
            if !seen_urls.contains(&v_url) {
                seen_urls.insert(v_url.clone());
                formats_list.push(FormatInfo {
                    format_id: format!("embedded_video_{}", video_idx),
                    ext: "mp4".to_string(),
                    resolution: "Embedded Video".to_string(),
                    fps: None,
                    vcodec: "h264".to_string(),
                    acodec: "aac".to_string(),
                    filesize: None,
                    note: Some(format!("Embedded Media {}", video_idx)),
                    direct_url: Some(v_url),
                    asset_type: "video".to_string(),
                });
                video_idx += 1;
            }
        }
    }

    Ok(MediaInfo {
        title,
        description,
        thumbnail: thumbnail.clone(),
        duration: None,
        uploader: Some(security_report.domain.clone()),
        site_name: Some("Web Media Extractor".to_string()),
        formats: formats_list,
        images: images_list,
        security: security_report.clone(),
    })
}

#[tauri::command]
pub async fn download_media(
    app_handle: tauri::AppHandle,
    url: String,
    format_id: Option<String>,
    audio_only: bool,
    browser_cookie: Option<String>,
    direct_url: Option<String>,
) -> Result<String, String> {
    let download_dir = dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    // If direct_url is provided (for App Store screenshots, images, direct file downloads)
    if let Some(d_url) = direct_url {
        if !d_url.trim().is_empty() {
            return download_direct_file(&d_url, &download_dir).await;
        }
    }

    // Otherwise use yt-dlp sidecar
    let output_template = format!("{}/%(title)s.%(ext)s", download_dir);

    let mut args = vec![url, "-o".to_string(), output_template];

    if audio_only {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push("mp3".to_string());
    } else if let Some(ref fid) = format_id {
        if fid != "direct_file" && !fid.starts_with("app_") && !fid.starts_with("page_") {
            args.push("-f".to_string());
            args.push(format!("{}+bestaudio/best", fid));
        }
    }

    if let Some(browser) = browser_cookie {
        if !browser.is_empty() {
            args.push("--cookies-from-browser".to_string());
            args.push(browser);
        }
    }

    let sidecar_command = app_handle
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(args);

    let output = sidecar_command
        .output()
        .await
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "yt-dlp failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok("Download complete! File saved to your Downloads folder.".to_string())
}

async fn download_direct_file(d_url: &str, download_dir: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(d_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch file: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP request failed with status: {}", resp.status()));
    }

    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    let ext_from_mime = if content_type.contains("image/png") {
        ".png"
    } else if content_type.contains("image/jpeg") || content_type.contains("image/jpg") {
        ".jpg"
    } else if content_type.contains("image/webp") {
        ".webp"
    } else if content_type.contains("image/gif") {
        ".gif"
    } else if content_type.contains("video/mp4") {
        ".mp4"
    } else if content_type.contains("audio/mpeg") || content_type.contains("audio/mp3") {
        ".mp3"
    } else {
        ".png"
    };

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read file bytes: {}", e))?;

    let raw_filename = d_url
        .split('/')
        .last()
        .unwrap_or("screenshot")
        .split('?')
        .next()
        .unwrap_or("screenshot");

    let has_ext = ["png", "jpg", "jpeg", "webp", "gif", "mp4", "mp3", "pdf", "webm", "svg"]
        .iter()
        .any(|ext| raw_filename.to_lowercase().ends_with(ext));

    let clean_filename = if !has_ext || raw_filename.is_empty() || raw_filename.len() > 60 {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        format!("screenshot_{}{}", ts, ext_from_mime)
    } else {
        raw_filename.to_string()
    };

    let save_path = std::path::Path::new(download_dir).join(&clean_filename);

    let mut file = File::create(&save_path)
        .map_err(|e| format!("Failed to create file at {:?}: {}", save_path, e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file bytes: {}", e))?;

    Ok(format!(
        "Asset successfully downloaded to: {}",
        save_path.display()
    ))
}

#[tauri::command]
pub async fn open_downloads_folder(custom_path: Option<String>) -> Result<(), String> {
    let target_path = match custom_path {
        Some(ref p) if !p.trim().is_empty() => std::path::PathBuf::from(p.trim()),
        _ => dirs::download_dir().ok_or("Could not find download directory")?,
    };

    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("explorer");
        if target_path.is_file() {
            cmd.arg(format!("/select,{}", target_path.display()));
        } else {
            cmd.arg(&target_path);
        }
        cmd.spawn().map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        let mut cmd = std::process::Command::new("open");
        if target_path.is_file() {
            cmd.arg("-R").arg(&target_path);
        } else {
            cmd.arg(&target_path);
        }
        cmd.spawn().map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let mut cmd = std::process::Command::new("xdg-open");
        let dir_to_open = if target_path.is_file() {
            target_path.parent().unwrap_or(&target_path)
        } else {
            &target_path
        };
        cmd.arg(dir_to_open);
        cmd.spawn().map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

