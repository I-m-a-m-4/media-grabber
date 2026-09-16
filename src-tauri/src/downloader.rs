pub mod downloader {
    use serde::{Deserialize, Serialize};
    use tauri_plugin_shell::ShellExt;

    #[derive(Serialize)]
    pub struct FormatInfo {
        pub format_id: String,
        pub ext: String,
        pub resolution: String,
        pub fps: Option<f64>,
        pub vcodec: String,
        pub acodec: String,
        pub filesize: Option<u64>,
        pub note: Option<String>,
    }

    #[derive(Serialize)]
    pub struct MediaInfo {
        pub title: String,
        pub description: Option<String>,
        pub thumbnail: Option<String>,
        pub duration: Option<f64>,
        pub uploader: Option<String>,
        pub formats: Vec<FormatInfo>,
    }

    #[tauri::command]
    pub async fn get_media_info(app_handle: tauri::AppHandle, url: String) -> Result<MediaInfo, String> {
        let sidecar_command = app_handle.shell().sidecar("yt-dlp")
            .map_err(|e| format!("Failed to create sidecar command: {}", e))?
            .args(["--dump-json", &url]);

        let output = sidecar_command.output().await
            .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

        if !output.status.success() {
            return Err(format!("yt-dlp failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let json_str = String::from_utf8_lossy(&output.stdout);
        let first_line = json_str.lines().next().unwrap_or("{}");

        let parsed: serde_json::Value = serde_json::from_str(first_line)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        let mut formats_list = Vec::new();
        if let Some(formats) = parsed.get("formats").and_then(|f| f.as_array()) {
            for fmt in formats {
                let format_id = fmt.get("format_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let ext = fmt.get("ext").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let resolution = fmt.get("resolution").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let vcodec = fmt.get("vcodec").and_then(|v| v.as_str()).unwrap_or("none").to_string();
                let acodec = fmt.get("acodec").and_then(|v| v.as_str()).unwrap_or("none").to_string();
                let filesize = fmt.get("filesize").and_then(|v| v.as_u64());
                let fps = fmt.get("fps").and_then(|v| v.as_f64());
                let note = fmt.get("format_note").and_then(|v| v.as_str()).map(|s| s.to_string());

                formats_list.push(FormatInfo {
                    format_id,
                    ext,
                    resolution,
                    fps,
                    vcodec,
                    acodec,
                    filesize,
                    note,
                });
            }
        }

        Ok(MediaInfo {
            title: parsed.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
            description: parsed.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
            thumbnail: parsed.get("thumbnail").and_then(|v| v.as_str()).map(|s| s.to_string()),
            duration: parsed.get("duration").and_then(|v| v.as_f64()),
            uploader: parsed.get("uploader").and_then(|v| v.as_str()).map(|s| s.to_string()),
            formats: formats_list,
        })
    }

    #[tauri::command]
    pub async fn download_media(
        app_handle: tauri::AppHandle,
        url: String,
        format_id: Option<String>,
        audio_only: bool,
        browser_cookie: Option<String>,
    ) -> Result<String, String> {
        
        // For simplicity, download to the user's Downloads folder
        let download_dir = dirs::download_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string());
        
        let output_template = format!("{}/%(title)s.%(ext)s", download_dir);

        let mut args = vec![
            url,
            "-o".to_string(),
            output_template,
        ];

        if audio_only {
            args.push("-x".to_string());
            args.push("--audio-format".to_string());
            args.push("mp3".to_string());
        } else if let Some(fid) = format_id {
            args.push("-f".to_string());
            args.push(format!("{}+bestaudio/best", fid));
        }

        if let Some(browser) = browser_cookie {
            if !browser.is_empty() {
                args.push("--cookies-from-browser".to_string());
                args.push(browser);
            }
        }

        let sidecar_command = app_handle.shell().sidecar("yt-dlp")
            .map_err(|e| format!("Failed to create sidecar command: {}", e))?
            .args(args);

        let output = sidecar_command.output().await
            .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

        if !output.status.success() {
            return Err(format!("yt-dlp failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        Ok("Download complete!".to_string())
    }
}
