import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function makeAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}

async function getYtDlpInfo(targetUrl: string, browserCookie?: string) {
  try {
    const args = [
      '--dump-json',
      '--no-warnings',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ];

    if (browserCookie && browserCookie.trim()) {
      args.push('--cookies-from-browser', browserCookie.trim());
    }

    args.push(targetUrl);

    const { stdout } = await execFileAsync('yt-dlp', args, { maxBuffer: 15 * 1024 * 1024, timeout: 25000 });

    if (!stdout || !stdout.trim()) return null;
    const parsed = JSON.parse(stdout.trim().split('\n')[0]);
    if (!parsed || !parsed.title) return null;

    const rawFormats = parsed.formats || [];
    const formats: any[] = [];
    const seenFormats = new Set<string>();

    rawFormats.forEach((fmt: any) => {
      if (
        !fmt.url ||
        fmt.format_note === 'storyboard' ||
        fmt.protocol === 'mhtml' ||
        fmt.ext === 'mhtml' ||
        (fmt.vcodec === 'none' && fmt.acodec === 'none')
      )
        return;

      const isAudioOnly = (fmt.vcodec === 'none' || !fmt.vcodec) && fmt.acodec && fmt.acodec !== 'none';
      const isVideoOnly = (fmt.acodec === 'none' || !fmt.acodec) && fmt.vcodec && fmt.vcodec !== 'none';

      let resolution = 'Standard';
      if (isAudioOnly) {
        resolution = 'Audio Only (Extract MP3/M4A)';
      } else if (fmt.height) {
        resolution = `${fmt.height}p`;
        if (fmt.fps && fmt.fps > 30) resolution += `${fmt.fps}`;
      } else if (fmt.format_note) {
        resolution = fmt.format_note;
      }

      if (isVideoOnly) {
        resolution += ' (Video Only)';
      }

      const key = `${resolution}_${fmt.ext}`;
      if (seenFormats.has(key)) return;
      seenFormats.add(key);

      formats.push({
        format_id: fmt.format_id || `fmt_${formats.length + 1}`,
        ext: fmt.ext || (isAudioOnly ? 'mp3' : 'mp4'),
        resolution,
        fps: fmt.fps || null,
        vcodec: fmt.vcodec || 'none',
        acodec: fmt.acodec || 'none',
        filesize: fmt.filesize || fmt.filesize_approx || null,
        note: fmt.format_note || (isAudioOnly ? 'Audio Stream' : `${resolution} Video`),
        direct_url: fmt.url,
        asset_type: isAudioOnly ? 'audio' : 'video',
      });
    });

    const images: any[] = [];
    const seenImgUrls = new Set<string>();

    if (parsed.thumbnail) {
      seenImgUrls.add(parsed.thumbnail);
      images.push({
        format_id: 'img_thumb_main',
        ext: 'jpg',
        resolution: 'High Res Thumbnail',
        vcodec: 'none',
        acodec: 'none',
        direct_url: parsed.thumbnail,
        asset_type: 'image',
        note: 'Header OpenGraph Image',
      });
    }

    if (Array.isArray(parsed.thumbnails)) {
      parsed.thumbnails.forEach((t: any, idx: number) => {
        if (t.url && !seenImgUrls.has(t.url)) {
          seenImgUrls.add(t.url);
          images.push({
            format_id: `img_thumb_${idx + 1}`,
            ext: 'jpg',
            resolution: t.width && t.height ? `${t.width}x${t.height}` : 'Thumbnail',
            vcodec: 'none',
            acodec: 'none',
            direct_url: t.url,
            asset_type: 'image',
            note: `Video Thumbnail ${idx + 1}`,
          });
        }
      });
    }

    return {
      title: parsed.title,
      description: parsed.description || '',
      extracted_text: parsed.description || '',
      thumbnail: parsed.thumbnail || (images.length > 0 ? images[0].direct_url : undefined),
      duration: parsed.duration || null,
      uploader: parsed.uploader || parsed.channel || 'Media Source',
      site_name: parsed.extractor_key || parsed.extractor || 'Video Platform',
      formats,
      images,
    };
  } catch (err: any) {
    if (!targetUrl.includes('instagram.com')) {
      console.warn('yt-dlp extraction note:', err?.message || err);
    }
    return null;
  }
}

// Dedicated TikTok Fallback Resolver
async function getTikTokFallbackInfo(targetUrl: string) {
  try {
    const apiReqUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(apiReqUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.data) {
        const d = data.data;
        const title = d.title || 'TikTok Video';
        const uploader = d.author?.nickname || d.author?.unique_id || 'TikTok Creator';
        const rawCover = d.cover || d.origin_cover || d.dynamic_cover;
        const thumbnail = rawCover ? (rawCover.startsWith('//') ? `https:${rawCover}` : rawCover) : undefined;
        
        const formats: any[] = [];
        if (d.play) {
          const directPlay = d.play.startsWith('//') ? `https:${d.play}` : d.play;
          formats.push({
            format_id: 'tiktok_hd_no_watermark',
            ext: 'mp4',
            resolution: 'HD Video (No Watermark)',
            vcodec: 'h264',
            acodec: 'aac',
            direct_url: directPlay,
            asset_type: 'video',
            note: 'High-Res MP4 Video without Watermark',
          });
        }
        if (d.wmplay) {
          const wmPlay = d.wmplay.startsWith('//') ? `https:${d.wmplay}` : d.wmplay;
          formats.push({
            format_id: 'tiktok_wm_video',
            ext: 'mp4',
            resolution: 'Standard Video (With Watermark)',
            vcodec: 'h264',
            acodec: 'aac',
            direct_url: wmPlay,
            asset_type: 'video',
            note: 'Original TikTok Video',
          });
        }
        if (d.music) {
          const musicPlay = d.music.startsWith('//') ? `https:${d.music}` : d.music;
          formats.push({
            format_id: 'tiktok_music_mp3',
            ext: 'mp3',
            resolution: 'Audio Only (Extract MP3)',
            vcodec: 'none',
            acodec: 'mp3',
            direct_url: musicPlay,
            asset_type: 'audio',
            note: 'Original Audio Track MP3',
          });
        }

        const images: any[] = [];
        if (thumbnail) {
          images.push({
            format_id: 'tiktok_cover_img',
            ext: 'jpg',
            resolution: 'Original Cover Image',
            vcodec: 'none',
            acodec: 'none',
            direct_url: thumbnail,
            asset_type: 'image',
            note: 'TikTok Video Poster Thumbnail',
          });
        }

        if (formats.length > 0) {
          return {
            title,
            description: title,
            extracted_text: title,
            thumbnail,
            duration: d.duration || null,
            uploader: `TikTok • ${uploader}`,
            site_name: 'TikTok',
            formats,
            images,
          };
        }
      }
    }
  } catch (err) {
    console.error('TikTok fallback resolver error:', err);
  }
  return null;
}

// Dedicated Instagram Fallback Resolver
async function getInstagramFallbackInfo(targetUrl: string) {
  try {
    let cleanUrl = targetUrl.split('?')[0].replace(/\/+$/, '');
    const isProfile = !cleanUrl.includes('/p/') && !cleanUrl.includes('/reel/') && !cleanUrl.includes('/tv/');
    
    let username = '';
    let postId = '';

    if (isProfile) {
      const parts = cleanUrl.split('/').filter(Boolean);
      username = parts[parts.length - 1].replace('@', '');
    } else {
      const parts = cleanUrl.split('/').filter(Boolean);
      postId = parts[parts.length - 1];
    }

    let title = isProfile ? `@${username} Instagram Profile` : `Instagram Post (${postId})`;
    let description = '';
    let uploader = username ? `Instagram • @${username}` : 'Instagram';
    const images: any[] = [];
    const formats: any[] = [];
    const seenUrls = new Set<string>();

    const addImage = (rawImgUrl: string, note: string) => {
      if (!rawImgUrl) return;
      let absUrl = rawImgUrl
        .replaceAll('\\/', '/')
        .replaceAll('\\u0026', '&')
        .replaceAll('&amp;', '&')
        .replaceAll('\\u00253D', '=')
        .replaceAll('\\u002526', '&');

      if (absUrl.startsWith('//')) absUrl = `https:${absUrl}`;
      if (seenUrls.has(absUrl)) return;
      seenUrls.add(absUrl);

      // Filter static assets and domain-only URLs
      if (
        absUrl.includes('rsrc.php') ||
        absUrl.includes('/rsrc/') ||
        absUrl.includes('static.cdninstagram.com') ||
        absUrl.endsWith('.com') ||
        absUrl.endsWith('.com/') ||
        absUrl.length < 35
      )
        return;

      // Proxy Instagram CDN images to prevent hotlink 403 Forbidden broken images in UI
      const proxiedUrl = `/api/download?directUrl=${encodeURIComponent(absUrl)}`;

      images.push({
        format_id: `ig_img_${images.length + 1}`,
        ext: 'jpg',
        resolution: 'High Res Asset',
        vcodec: 'none',
        acodec: 'none',
        direct_url: proxiedUrl,
        asset_type: 'image',
        note,
      });
    };

    // 1. Try Instagram Web API
    if (isProfile && username) {
      try {
        const apiRes = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'X-IG-App-ID': '936619743392459',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': `https://www.instagram.com/${username}/`,
          },
          cache: 'no-store',
        });

        if (apiRes.ok) {
          const data = await apiRes.json().catch(() => null);
          const user = data?.data?.user;
          if (user) {
            title = user.full_name ? `${user.full_name} (@${username})` : `@${username} Instagram Account`;
            description = user.biography || `Instagram Account @${username} with ${user.edge_owner_to_timeline_media?.count || 0} posts`;
            uploader = `Instagram • @${username}`;

            const avatar = user.profile_pic_url_hd || user.profile_pic_url;
            if (avatar) addImage(avatar, 'Profile Picture HD');

            const edges = user.edge_owner_to_timeline_media?.edges || [];
            edges.forEach((edge: any, idx: number) => {
              const node = edge.node;
              if (node) {
                const imgUrl = node.display_url || node.thumbnail_src;
                const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || `Instagram Post ${idx + 1}`;
                if (imgUrl) addImage(imgUrl, caption.length > 50 ? `${caption.slice(0, 50)}...` : caption);

                if (node.is_video && node.video_url) {
                  formats.push({
                    format_id: `ig_vid_${formats.length + 1}`,
                    ext: 'mp4',
                    resolution: node.dimensions ? `${node.dimensions.width}x${node.dimensions.height}` : 'HD Video',
                    vcodec: 'h264',
                    acodec: 'aac',
                    direct_url: `/api/download?directUrl=${encodeURIComponent(node.video_url)}`,
                    asset_type: 'video',
                    note: caption.length > 50 ? `${caption.slice(0, 50)}...` : caption,
                  });
                }
              }
            });
          }
        }
      } catch (e) {
        console.error('IG web_profile_info error:', e);
      }
    }

    // 2. Fallback Scraper via Embed & Direct HTML
    if (images.length === 0) {
      const fetchUrls = isProfile ? [
        `https://www.instagram.com/${username}/embed/`,
        `https://www.instagram.com/${username}/`
      ] : [
        `https://www.instagram.com/p/${postId}/embed/captioned/`,
        `https://www.instagram.com/p/${postId}/`
      ];

      for (const fUrl of fetchUrls) {
        try {
          const res = await fetch(fUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            cache: 'no-store',
          });

          if (res.ok) {
            const html = await res.text();

            const ogImg = html.match(/meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)?.[1] ||
                          html.match(/meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/i)?.[1];
            if (ogImg) addImage(ogImg, 'Header / Avatar Image');

            const ogTitle = html.match(/meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1];
            if (ogTitle && title.startsWith('@')) title = ogTitle;

            const ogDesc = html.match(/meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)?.[1];
            if (ogDesc && !description) description = ogDesc;

            const rawUrlMatches = html.match(/(https?:\\\/\\\/[^\s"'\\]+|https?:\/\/[^\s"']+)/g) || [];
            for (const raw of rawUrlMatches) {
              let u = raw.replaceAll('\\/', '/').replaceAll('\\u0026', '&').replaceAll('&amp;', '&');
              if ((u.includes('cdninstagram.com') || u.includes('fbcdn.net')) && !u.includes('rsrc.php') && u.length > 30) {
                addImage(u, isProfile ? `Instagram Feed Media ${images.length + 1}` : `Instagram Post Media ${images.length + 1}`);
              }
            }
          }
        } catch (e) {
          console.error(`IG HTML fetch error for ${fUrl}:`, e);
        }
      }
    }

    if (images.length > 0 || formats.length > 0) {
      return {
        title,
        description: description || `Instagram ${isProfile ? 'Profile & Feed' : 'Media Post'} for ${username || postId}`,
        extracted_text: description || `Extracted ${images.length} images from Instagram.`,
        thumbnail: images.length > 0 ? images[0].direct_url : undefined,
        duration: null,
        uploader,
        site_name: 'Instagram',
        formats,
        images,
      };
    }

    if (isProfile) {
      return {
        title: `@${username} Instagram Profile`,
        description: `Instagram requires authentication to download full account profile feeds. Please select your browser (Chrome/Edge/Firefox) in the Auth Settings or paste a direct Instagram Post or Reel URL (e.g. instagram.com/p/...).`,
        extracted_text: `Instagram Account @${username}. Extractions for entire profiles require browser cookies or direct post URLs.`,
        thumbnail: undefined,
        duration: null,
        uploader: `Instagram • @${username}`,
        site_name: 'Instagram Profile',
        formats: [],
        images: [],
      };
    }
  } catch (err) {
    console.error('Instagram fallback resolver error:', err);
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const requestUrl = request.url || 'http://localhost';
    const { searchParams } = new URL(requestUrl);
    const rawUrl = searchParams.get('url');
    const browserCookie = searchParams.get('browser') || undefined;

    if (!rawUrl) {
      return NextResponse.json({ status: 'ok', message: 'Media Grabber API Info Endpoint' });
    }

    const url = rawUrl.trim();
    let targetUrlObj: URL;
    try {
      targetUrlObj = new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format provided.' }, { status: 400 });
    }

    const domain = targetUrlObj.hostname || 'web-source';

    // Basic web security vetting
    const isHttp = url.startsWith('http://') || url.startsWith('https://');
    if (!isHttp) {
      return NextResponse.json(
        { error: 'Security Warning: Only HTTP and HTTPS protocols are allowed.' },
        { status: 400 }
      );
    }

    const isLocal =
      domain === 'localhost' ||
      domain === '127.0.0.1' ||
      domain.startsWith('192.168.') ||
      domain.startsWith('10.');

    if (isLocal) {
      return NextResponse.json(
        { error: 'Security Warning: Blocked local network access.' },
        { status: 403 }
      );
    }

    // Detect App Store / Store domains
    const isAppStore =
      domain.includes('apps.apple.com') ||
      domain.includes('play.google.com') ||
      domain.includes('apps.microsoft.com') ||
      domain.includes('microsoft.com') ||
      domain.includes('steampowered.com') ||
      domain.includes('amazon.com');

    const security = {
      is_safe: true,
      risk_level: url.startsWith('https') ? 'safe' : 'caution',
      domain,
      protocol: url.startsWith('https') ? 'https' : 'http',
      category: isAppStore ? 'app_store' : 'web_page',
      warnings: url.startsWith('https') ? [] : ['Unencrypted HTTP link detected.'],
      file_extension: null,
    };

    let extractedText = '';
    const images: any[] = [];
    const seenUrls = new Set<string>();

    const addImage = (rawImgUrl: string, note: string) => {
      if (!rawImgUrl || rawImgUrl.startsWith('data:')) return;
      let absUrl = rawImgUrl.startsWith('//') ? `https:${rawImgUrl}` : makeAbsoluteUrl(rawImgUrl, url);

      // Ignore 16x16 / 32x32 website favicons or tiny website logos when processing social media streams
      if (absUrl.includes('favicon') || absUrl.includes('apple-touch-icon') || absUrl.includes('/logo-') || absUrl.includes('/logo.')) {
        if (domain.includes('tiktok.com') || domain.includes('youtube.com') || domain.includes('facebook.com') || domain.includes('instagram.com')) {
          return;
        }
      }

      const extMatch = absUrl.match(/\.(png|jpg|jpeg|webp|gif|svg|avif)/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'png';

      // Proxy Instagram image URLs to avoid hotlink 403 errors in browser
      const finalUrl = (absUrl.includes('cdninstagram.com') || absUrl.includes('fbcdn.net'))
        ? `/api/download?directUrl=${encodeURIComponent(absUrl)}`
        : absUrl;

      images.push({
        format_id: `img_${seenUrls.size}`,
        ext,
        resolution: 'High Res Asset',
        vcodec: 'none',
        acodec: 'none',
        direct_url: finalUrl,
        asset_type: 'image',
        note,
      });
    };

    let title = `${domain} Asset`;
    let description = '';
    let primaryThumbnail: string | undefined = undefined;
    let uploader = domain;
    let site_name = isAppStore ? 'App Store Listing' : 'Web Media Source';

    // -------------------------------------------------------------
    // SPECIAL HANDLER 0: YouTube & Video Streaming Extractor (yt-dlp)
    // -------------------------------------------------------------
    const isMediaStream =
      domain.includes('youtube.com') ||
      domain.includes('youtu.be') ||
      domain.includes('tiktok.com') ||
      domain.includes('instagram.com') ||
      domain.includes('twitter.com') ||
      domain.includes('x.com') ||
      domain.includes('vimeo.com') ||
      domain.includes('twitch.tv') ||
      domain.includes('facebook.com') ||
      domain.includes('dailymotion.com');

    if (isMediaStream || !isAppStore) {
      const ytData = await getYtDlpInfo(url, browserCookie);
      if (ytData && ((ytData.formats && ytData.formats.length > 0) || (ytData.images && ytData.images.length > 0))) {
        if (ytData.images) {
          ytData.images = ytData.images.map((img: any) => {
            if (img.direct_url && (img.direct_url.includes('cdninstagram.com') || img.direct_url.includes('fbcdn.net'))) {
              return { ...img, direct_url: `/api/download?directUrl=${encodeURIComponent(img.direct_url)}` };
            }
            return img;
          });
        }
        return NextResponse.json({
          ...ytData,
          security: {
            ...security,
            category: 'media_stream',
          },
        });
      }

      // Dedicated TikTok Fallback Extractor
      if (domain.includes('tiktok.com') || url.includes('tiktok.com')) {
        const tiktokData = await getTikTokFallbackInfo(url);
        if (tiktokData && (tiktokData.formats?.length > 0 || tiktokData.images?.length > 0)) {
          return NextResponse.json({
            ...tiktokData,
            security: {
              ...security,
              category: 'media_stream',
            },
          });
        }
      }

      // Dedicated Instagram Fallback Extractor
      if (domain.includes('instagram.com') || url.includes('instagram.com')) {
        const instagramData = await getInstagramFallbackInfo(url);
        if (instagramData) {
          return NextResponse.json({
            ...instagramData,
            security: {
              ...security,
              category: 'media_stream',
            },
          });
        }
      }
    }

    // -------------------------------------------------------------
    // SPECIAL HANDLER 1: Microsoft Store Display Catalog API
    // -------------------------------------------------------------
    const msProductIdMatch = url.match(/detail\/([a-zA-Z0-9]{12})/i) || url.match(/\/([a-zA-Z0-9]{12})(?:\?|\/|$)/i);
    if ((domain.includes('apps.microsoft.com') || domain.includes('microsoft.com')) && msProductIdMatch) {
      const productId = msProductIdMatch[1];
      try {
        const msCatalogUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products/${productId}?market=US&languages=en-us`;
        const msRes = await fetch(msCatalogUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
          },
        });

        if (msRes.ok) {
          const catalogData = await msRes.json();
          const product = catalogData.Product || catalogData.Products?.[0];
          const localized = product?.LocalizedProperties?.[0];

          if (localized) {
            title = localized.ProductTitle || title;
            description = localized.ProductDescription || description;
            uploader = localized.PublisherName || uploader;
            site_name = 'Microsoft Store';

            const msImages = localized.Images || [];
            let screenshotIndex = 1;

            // First pass: extract Logos, Icons & Artwork
            msImages.forEach((imgObj: any) => {
              const imgUrl = imgObj.Uri || imgObj.Url;
              const purpose = imgObj.ImagePurpose || '';
              if (imgUrl && (purpose === 'Logo' || purpose === 'Poster' || purpose === 'Tile' || purpose === 'BoxArt' || purpose === 'SuperHeroArt')) {
                const width = imgObj.Width && imgObj.Height ? `${imgObj.Width}x${imgObj.Height}` : purpose;
                const caption = imgObj.Caption ? ` (${imgObj.Caption})` : '';
                addImage(imgUrl, `App ${purpose} ${width}${caption}`);
                if (!primaryThumbnail) primaryThumbnail = imgUrl.startsWith('//') ? `https:${imgUrl}` : imgUrl;
              }
            });

            // Second pass: extract 100% of Screenshots
            msImages.forEach((imgObj: any) => {
              const imgUrl = imgObj.Uri || imgObj.Url;
              const purpose = imgObj.ImagePurpose || '';
              if (imgUrl && purpose === 'Screenshot') {
                const width = imgObj.Width && imgObj.Height ? `${imgObj.Width}x${imgObj.Height}` : 'Screenshot';
                const caption = imgObj.Caption ? ` - ${imgObj.Caption}` : '';
                addImage(imgUrl, `App Screenshot ${screenshotIndex++} (${width})${caption}`);
              }
            });
          }
        }
      } catch (e) {
        console.error('Microsoft Display Catalog API fetch error:', e);
      }
    }

    // -------------------------------------------------------------
    // SPECIAL HANDLER 2: Apple App Store iTunes Lookup API
    // -------------------------------------------------------------
    const appleAppIdMatch = url.match(/id([0-9]+)/i);
    if (domain.includes('apps.apple.com') && appleAppIdMatch) {
      const appId = appleAppIdMatch[1];
      try {
        const appleLookupUrl = `https://itunes.apple.com/lookup?id=${appId}`;
        const appleRes = await fetch(appleLookupUrl);
        if (appleRes.ok) {
          const appleData = await appleRes.json();
          const app = appleData.results?.[0];
          if (app) {
            title = app.trackName || title;
            description = app.description || description;
            uploader = app.artistName || uploader;
            site_name = 'Apple App Store';

            const iconUrl = app.artworkUrl512 || app.artworkUrl100;
            if (iconUrl) {
              addImage(iconUrl, 'App Store Icon / Logo (512x512)');
              if (!primaryThumbnail) primaryThumbnail = iconUrl;
            }

            if (Array.isArray(app.screenshotUrls)) {
              app.screenshotUrls.forEach((sUrl: string, idx: number) => {
                addImage(sUrl, `iPhone Screenshot ${idx + 1}`);
              });
            }

            if (Array.isArray(app.ipadScreenshotUrls)) {
              app.ipadScreenshotUrls.forEach((sUrl: string, idx: number) => {
                addImage(sUrl, `iPad Screenshot ${idx + 1}`);
              });
            }
          }
        }
      } catch (e) {
        console.error('Apple iTunes Lookup API error:', e);
      }
    }

    // -------------------------------------------------------------
    // GENERAL WEB PAGE SCRAPER (HTML + OpenGraph + JSON-LD)
    // -------------------------------------------------------------
    // Fetch raw HTML if images are low or title is default
    if (images.length < 3 || title === `${domain} Asset`) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        const html = await res.text();

        // 1. JSON-LD parsing
        const jsonLdMatches = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        if (jsonLdMatches) {
          for (const block of jsonLdMatches) {
            try {
              const content = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
              const parsed = JSON.parse(content);
              const items = Array.isArray(parsed) ? parsed : [parsed];

              for (const item of items) {
                if (item.name && title === `${domain} Asset`) title = item.name;
                if (item.description && !description) description = item.description;

                if (item.image) {
                  if (typeof item.image === 'string') addImage(item.image, 'Store Product Image');
                  else if (Array.isArray(item.image)) {
                    item.image.forEach((img: any) => {
                      if (typeof img === 'string') addImage(img, 'Store Product Image');
                      else if (img?.url) addImage(img.url, 'Store Product Image');
                    });
                  } else if (item.image.url) {
                    addImage(item.image.url, 'Store Product Image');
                  }
                }

                if (item.screenshot) {
                  if (typeof item.screenshot === 'string') addImage(item.screenshot, 'App Screenshot');
                  else if (Array.isArray(item.screenshot)) {
                    item.screenshot.forEach((s: any) => {
                      if (typeof s === 'string') addImage(s, 'App Screenshot');
                      else if (s?.url) addImage(s.url, 'App Screenshot');
                    });
                  }
                }
              }
            } catch (e) {}
          }
        }

        // 2. OpenGraph & Title fallback
        const ogTitle = (
          html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1] ||
          html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:title"/i)?.[1] ||
          html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        );

        const ogDesc = (
          html.match(/<meta\s+(?:property|name)="(?:og:description|description|twitter:description)"\s+content="([^"]+)"/i)?.[1] ||
          html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="(?:og:description|description|twitter:description)"/i)?.[1]
        );

        const ogImage = (
          html.match(/<meta\s+(?:property|name)="(?:og:image|twitter:image|msapplication-TileImage)"\s+content="([^"]+)"/i)?.[1] ||
          html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="(?:og:image|twitter:image)"/i)?.[1]
        );

        const iconRelMatch = (
          html.match(/<link\s+rel="(?:apple-touch-icon|shortcut icon|icon)"\s+href="([^"]+)"/i)?.[1] ||
          html.match(/<link\s+href="([^"]+)"\s+rel="(?:apple-touch-icon|shortcut icon|icon)"/i)?.[1]
        );

        if (ogTitle && title === `${domain} Asset`) title = ogTitle;
        if (ogDesc && !description) description = ogDesc;

        if (ogImage) addImage(ogImage, 'Header OpenGraph Image');
        if (iconRelMatch) addImage(iconRelMatch, 'App / Website Icon');

        if (ogImage && !primaryThumbnail) primaryThumbnail = makeAbsoluteUrl(ogImage, url);

        // 3. Extract <img> and <source> tag candidates across any website
        const imgTagRegex = /<(?:img|source)\s+[^>]*?(?:src|data-src|srcset|data-srcset|data-original|data-highres|data-zoom-image|data-full-src)=["']([^"'\s]+)["'][^>]*>/gi;
        let match;
        let count = 0;
        while ((match = imgTagRegex.exec(html)) !== null && count < 50) {
          let srcCandidate = match[1];
          if (srcCandidate.includes(',')) {
            // Pick highest resolution candidate from srcset
            srcCandidate = srcCandidate.split(',').pop()?.trim().split(' ')[0] || srcCandidate;
          }
          if (
            !srcCandidate.includes('spacer') &&
            !srcCandidate.includes('tracking') &&
            !srcCandidate.includes('pixel') &&
            !srcCandidate.includes('avatar') &&
            !srcCandidate.includes('badge') &&
            !srcCandidate.includes('analytics') &&
            srcCandidate.length > 5
          ) {
            count++;
            const isScreenshot = match[0].toLowerCase().includes('screenshot') || match[0].toLowerCase().includes('gallery') || match[0].toLowerCase().includes('hero') || match[0].toLowerCase().includes('product');
            addImage(srcCandidate, isScreenshot ? `App / Product Image ${images.length + 1}` : `Media Asset ${images.length + 1}`);
          }
        }

        // 4. Extract paragraph text content for Overview tab
        const paragraphs: string[] = [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pMatch;
        while ((pMatch = pRegex.exec(html)) !== null && paragraphs.length < 8) {
          const cleanP = pMatch[1].replace(/<[^>]+>/g, '').trim();
          if (cleanP.length > 30) {
            paragraphs.push(cleanP);
          }
        }
        if (paragraphs.length > 0) {
          description = description || paragraphs[0];
          extractedText = paragraphs.join('\n\n');
        }
      } catch (e) {
        console.error('HTML Scraper fallback error:', e);
      }
    }

    // Primary Thumbnail fallback
    if (!primaryThumbnail && images.length > 0) {
      primaryThumbnail = images[0].direct_url;
    } else if (!primaryThumbnail) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      addImage(faviconUrl, 'Website Favicon / Icon');
      primaryThumbnail = faviconUrl;
    }

    return NextResponse.json({
      title,
      description,
      extracted_text: extractedText || 'No extra text content extracted.',
      thumbnail: primaryThumbnail,
      duration: null,
      uploader,
      site_name,
      formats: [],
      images,
      security,
    });
  } catch (err: any) {
    return NextResponse.json({
      title: 'Web Media Asset',
      description: 'Extracted via Web Fallback',
      extracted_text: 'Fallback media details.',
      formats: [],
      images: [],
      security: {
        is_safe: true,
        risk_level: 'safe',
        domain: 'web',
        protocol: 'https',
        category: 'web_page',
        warnings: [],
      },
    });
  }
}
