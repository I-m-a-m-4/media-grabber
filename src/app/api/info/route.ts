import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function makeAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('data:') || relativeUrl.startsWith('blob:') || relativeUrl.includes('iVBORw0KGgo')) {
    return '';
  }
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('//')) {
    return relativeUrl.startsWith('//') ? `https:${relativeUrl}` : relativeUrl;
  }
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}



function extractYouTubeVideoId(targetUrl: string): string | null {
  if (!targetUrl) return null;
  const patterns = [
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|watch\?.+&v=)([\w-]{11})/i,
    /youtube\.com\/clip\/([\w-]+)/i,
    /^([\w-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = targetUrl.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Dedicated YouTube Fallback Resolver (Works zero-auth on any cloud host/serverless environment)
async function getYouTubeFallbackInfo(targetUrl: string) {
  try {
    const videoId = extractYouTubeVideoId(targetUrl);
    if (!videoId) return null;

    let title = 'YouTube Video';
    let uploader = 'YouTube Creator';
    let description = '';

    // 1. Official YouTube oEmbed API (Zero credentials needed, fast, resilient on cloud/Vercel)
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json().catch(() => null);
        if (oembedData) {
          if (oembedData.title) title = oembedData.title;
          if (oembedData.author_name) uploader = `${oembedData.author_name} (YouTube)`;
        }
      }
    } catch (e) {
      console.warn('[YouTube Fallback] oEmbed error:', e);
    }

    // 2. High-Res Thumbnail Assets (Google CDN i.ytimg.com direct assets)
    const images: any[] = [
      {
        format_id: 'yt_thumb_maxres',
        ext: 'jpg',
        resolution: '1280x720 (MaxRes HD)',
        vcodec: 'none',
        acodec: 'none',
        direct_url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        asset_type: 'image',
        note: 'HD Video Poster Thumbnail (1080p/720p)',
      },
      {
        format_id: 'yt_thumb_hq',
        ext: 'jpg',
        resolution: '480x360 (HQ)',
        vcodec: 'none',
        acodec: 'none',
        direct_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        asset_type: 'image',
        note: 'High Quality Video Thumbnail',
      },
      {
        format_id: 'yt_thumb_mq',
        ext: 'jpg',
        resolution: '320x180 (MQ)',
        vcodec: 'none',
        acodec: 'none',
        direct_url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        asset_type: 'image',
        note: 'Medium Video Thumbnail',
      },
      {
        format_id: 'yt_thumb_sd',
        ext: 'jpg',
        resolution: '640x480 (SD)',
        vcodec: 'none',
        acodec: 'none',
        direct_url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
        asset_type: 'image',
        note: 'Standard Definition Video Thumbnail',
      },
    ];

    // 3. Fallback Stream Formats (Routed through /api/download engine)
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const formats: any[] = [
      {
        format_id: 'b',
        ext: 'mp4',
        resolution: 'Best Available HD (MP4)',
        fps: 60,
        vcodec: 'h264',
        acodec: 'aac',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=b`,
        asset_type: 'video',
        note: 'Best Available High Definition Video (1080p / 720p)',
      },
      {
        format_id: '137',
        ext: 'mp4',
        resolution: '1080p Full HD',
        fps: 60,
        vcodec: 'h264',
        acodec: 'aac',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=137`,
        asset_type: 'video',
        note: 'Full HD 1080p Video + Audio',
      },
      {
        format_id: '22',
        ext: 'mp4',
        resolution: '720p HD',
        fps: 30,
        vcodec: 'h264',
        acodec: 'aac',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=22`,
        asset_type: 'video',
        note: 'High Definition 720p Video',
      },
      {
        format_id: '135',
        ext: 'mp4',
        resolution: '480p Standard',
        fps: 30,
        vcodec: 'h264',
        acodec: 'aac',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=135`,
        asset_type: 'video',
        note: 'Standard Definition 480p Video',
      },
      {
        format_id: '18',
        ext: 'mp4',
        resolution: '360p Standard',
        fps: 30,
        vcodec: 'h264',
        acodec: 'aac',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=18`,
        asset_type: 'video',
        note: 'Standard Definition 360p Video',
      },
      {
        format_id: '133',
        ext: 'mp4',
        resolution: '240p Low Data',
        fps: 30,
        vcodec: 'h264',
        acodec: 'aac',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=133`,
        asset_type: 'video',
        note: 'Low Bitrate 240p Video',
      },
      {
        format_id: 'audio_best',
        ext: 'mp3',
        resolution: 'Audio Only (Extract MP3)',
        fps: null,
        vcodec: 'none',
        acodec: 'mp3',
        direct_url: `/api/download?url=${encodeURIComponent(canonicalUrl)}&formatId=audio_best&audioOnly=true`,
        asset_type: 'audio',
        note: 'Original High Quality Audio Track (MP3)',
      },
    ];

    return {
      title,
      description: description || `YouTube Video (${videoId})`,
      extracted_text: `YouTube Video: ${title}\nUploader: ${uploader}\nWatch URL: ${canonicalUrl}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: null,
      uploader,
      site_name: 'YouTube',
      formats,
      images,
    };
  } catch (err) {
    console.error('[YouTube Fallback] Error resolving YouTube info:', err);
    return null;
  }
}

async function getYtDlpInfo(targetUrl: string, browserCookie?: string) {
  try {
    const args = [
      '--dump-json',
      '--no-warnings',
      '--socket-timeout',
      '15',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ];

    if (browserCookie && browserCookie.trim()) {
      args.push('--cookies-from-browser', browserCookie.trim());
    }

    args.push(targetUrl);

    const { stdout } = await execFileAsync('yt-dlp', args, { maxBuffer: 15 * 1024 * 1024, timeout: 20000 });

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

      let resolution = 'Standard';
      if (isAudioOnly) {
        resolution = 'Audio Only (Extract MP3/M4A)';
      } else if (fmt.height) {
        resolution = `${fmt.height}p`;
        if (fmt.fps && fmt.fps > 30) resolution += `${fmt.fps}`;
      } else if (fmt.format_note) {
        resolution = fmt.format_note;
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

    if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      const hasBest = formats.some((f) => f.format_id === 'b' || f.resolution?.includes('1080'));
      if (!hasBest) {
        formats.unshift({
          format_id: 'b',
          ext: 'mp4',
          resolution: 'Best Available HD (MP4)',
          fps: 60,
          vcodec: 'h264',
          acodec: 'aac',
          direct_url: `/api/download?url=${encodeURIComponent(targetUrl)}&formatId=b`,
          asset_type: 'video',
          note: 'Best Available High Definition Video (1080p / 720p)',
        });
      }
      const hasAudio = formats.some((f) => f.asset_type === 'audio' || f.format_id === 'audio_best');
      if (!hasAudio) {
        formats.push({
          format_id: 'audio_best',
          ext: 'mp3',
          resolution: 'Audio Only (Extract MP3)',
          fps: null,
          vcodec: 'none',
          acodec: 'mp3',
          direct_url: `/api/download?url=${encodeURIComponent(targetUrl)}&formatId=audio_best&audioOnly=true`,
          asset_type: 'audio',
          note: 'Extracted Original Audio (MP3 Format)',
        });
      }
    }

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
      parsed.thumbnails
        .filter((t: any) => {
          if (!t.url) return false;
          const u = String(t.url);
          if (u.includes('storyboard') || u.includes('/sb/') || u.includes('sqp=')) return false;
          return true;
        })
        .slice(-6)
        .forEach((t: any) => {
          if (t.url && !seenImgUrls.has(t.url)) {
            seenImgUrls.add(t.url);
            images.push({
              format_id: `img_thumb_${images.length + 1}`,
              ext: 'jpg',
              resolution: t.width && t.height ? `${t.width}x${t.height}` : 'Thumbnail',
              vcodec: 'none',
              acodec: 'none',
              direct_url: t.url,
              asset_type: 'image',
              note: `Video Thumbnail ${images.length + 1}`,
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
    const msg = String(err?.message || err || '');
    if (
      !targetUrl.includes('instagram.com') &&
      !msg.includes('Unsupported URL') &&
      !msg.includes('ERROR: [generic]') &&
      !msg.includes('Read timed out') &&
      !msg.includes('HTTPSConnectionPool')
    ) {
      console.warn('yt-dlp extraction note:', msg);
    }
    return null;
  }
}

function sanitizeMediaInfo(info: any, targetUrl: string) {
  if (!info) return info;
  const isInstagram = targetUrl.includes('instagram.com') || (info.site_name && info.site_name.toLowerCase().includes('instagram'));

  const seenIds = new Set<string>();

  const wrapUrl = (u?: string) => {
    if (!u) return u;
    if (isInstagram || u.includes('cdninstagram.com') || u.includes('fbcdn.net')) {
      if (!u.startsWith('/api/download')) {
        return `/api/download?directUrl=${encodeURIComponent(u)}`;
      }
    }
    return u;
  };

  if (Array.isArray(info.images)) {
    info.images = info.images.filter((img: any) => {
      if (!img || !img.direct_url) return false;
      const urlStr = String(img.direct_url);
      if (urlStr.includes('iVBOR') || urlStr.includes('data:image') || urlStr.includes('%2FiVBOR') || urlStr.length < 10) {
        return false;
      }
      return true;
    }).map((img: any, idx: number) => {
      let cleanUrl = wrapUrl(img.direct_url);
      let id = img.format_id || `img_${idx + 1}`;
      if (seenIds.has(id)) {
        id = `${id}_${idx + 1}`;
      }
      seenIds.add(id);

      return {
        ...img,
        format_id: id,
        direct_url: cleanUrl,
      };
    });
  }

  if (Array.isArray(info.formats)) {
    info.formats = info.formats.map((fmt: any, idx: number) => {
      let id = fmt.format_id || `fmt_${idx + 1}`;
      if (seenIds.has(id)) {
        id = `${id}_${idx + 1}`;
      }
      seenIds.add(id);

      return {
        ...fmt,
        format_id: id,
      };
    });
  }

  if (info.thumbnail) {
    info.thumbnail = wrapUrl(info.thumbnail);
  }

  return info;
}

// Dedicated Twitter / X Fallback Resolver
async function getTwitterFallbackInfo(targetUrl: string) {
  try {
    const tweetIdMatch = targetUrl.match(/status\/(\d+)/i) || targetUrl.match(/\/(\d{15,25})(?:\?|\/|$)/);
    if (!tweetIdMatch) return null;
    const tweetId = tweetIdMatch[1];

    let tweet: any = null;

    // 1. Try fxtwitter API
    try {
      const fxRes = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      if (fxRes.ok) {
        const data = await fxRes.json().catch(() => null);
        if (data?.tweet) {
          tweet = data.tweet;
        }
      }
    } catch (e) {
      console.warn('fxtwitter fetch error:', e);
    }

    // 2. Fallback: vxtwitter API if fxtwitter fails
    if (!tweet) {
      try {
        const vxRes = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });
        if (vxRes.ok) {
          const vxData = await vxRes.json().catch(() => null);
          if (vxData) {
            tweet = {
              text: vxData.text || '',
              author: {
                name: vxData.user_name || '',
                screen_name: vxData.user_screen_name || '',
                avatar_url: vxData.user_profile_image_url || '',
              },
              media: {
                videos: Array.isArray(vxData.media_extended)
                  ? vxData.media_extended.filter((m: any) => m.type === 'video' || m.type === 'gif').map((m: any) => ({
                      url: m.url,
                      thumbnail_url: m.thumbnail_url,
                      duration: m.duration_millis ? m.duration_millis / 1000 : null,
                      variants: [{ url: m.url, content_type: 'video/mp4' }],
                    }))
                  : [],
                photos: Array.isArray(vxData.media_extended)
                  ? vxData.media_extended.filter((m: any) => m.type === 'image').map((m: any) => ({
                      url: m.url,
                    }))
                  : [],
              },
            };
          }
        }
      } catch (e) {
        console.warn('vxtwitter fetch error:', e);
      }
    }

    if (tweet) {
      const rawText = tweet.text || '';
      const title = rawText
        ? (rawText.length > 90 ? rawText.slice(0, 90) + '...' : rawText)
        : (tweet.author?.name ? `${tweet.author.name}'s Post on X` : 'Twitter Video');
      const description = rawText;
      const uploader = tweet.author?.name
        ? `${tweet.author.name} (@${tweet.author.screen_name || ''})`
        : 'Twitter / X User';

      const rawVideos = tweet.media?.videos || tweet.quote?.media?.videos || [];
      const allMedia = [
        ...(Array.isArray(tweet.media?.all) ? tweet.media.all : []),
        ...(Array.isArray(tweet.quote?.media?.all) ? tweet.quote.media.all : []),
      ];

      const videoItems: any[] = [];
      if (Array.isArray(rawVideos) && rawVideos.length > 0) {
        videoItems.push(...rawVideos);
      } else {
        allMedia.forEach((m: any) => {
          if (m && (m.type === 'video' || m.type === 'gif' || m.format === 'video/mp4' || (Array.isArray(m.variants) && m.variants.length > 0))) {
            videoItems.push(m);
          }
        });
      }

      const formats: any[] = [];
      const seenFmtUrls = new Set<string>();

      videoItems.forEach((video: any, vIdx: number) => {
        const variants: any[] = (video.variants || []).filter((v: any) =>
          v && (v.content_type === 'video/mp4' || (v.url && v.url.includes('.mp4')))
        );

        // Sort by bitrate descending (highest quality first)
        variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        variants.forEach((v: any, idx: number) => {
          if (!v.url || seenFmtUrls.has(v.url)) return;
          seenFmtUrls.add(v.url);

          const dimMatch = v.url.match(/\/(\d+x\d+)\//);
          let resLabel = dimMatch
            ? dimMatch[1]
            : (video.width && video.height ? `${video.width}x${video.height}` : 'HD Video');

          let maxDim = 0;
          if (dimMatch) {
            const parts = dimMatch[1].split('x').map((n: string) => parseInt(n) || 0);
            maxDim = Math.max(parts[0], parts[1]);
          } else if (video.width || video.height) {
            maxDim = Math.max(video.width || 0, video.height || 0);
          }

          let resTitle = `Standard Video (${resLabel})`;
          if (maxDim >= 1080) resTitle = `1080p Full HD (${resLabel})`;
          else if (maxDim >= 720) resTitle = `720p HD Video (${resLabel})`;
          else if (maxDim >= 480) resTitle = `480p Video (${resLabel})`;

          formats.push({
            format_id: `twitter_vid_${vIdx + 1}_${idx + 1}`,
            ext: 'mp4',
            resolution: resTitle,
            vcodec: 'h264',
            acodec: 'aac',
            direct_url: v.url,
            asset_type: 'video',
            note: `Twitter MP4 Video (${resLabel})`,
          });
        });

        // If no variants matched but video has direct url
        if (variants.length === 0 && video.url && !seenFmtUrls.has(video.url)) {
          seenFmtUrls.add(video.url);
          formats.push({
            format_id: `twitter_vid_${vIdx + 1}_main`,
            ext: 'mp4',
            resolution: video.width && video.height ? `${video.width}x${video.height}` : 'HD Video',
            vcodec: 'h264',
            acodec: 'aac',
            direct_url: video.url,
            asset_type: 'video',
            note: 'Twitter MP4 Video Stream',
          });
        }

        // Add Audio-only extraction format pointing to the highest quality stream
        const highestStream = variants[0]?.url || video.url;
        if (highestStream) {
          formats.push({
            format_id: `twitter_audio_${vIdx + 1}`,
            ext: 'mp3',
            resolution: 'Audio Only (Extract MP3)',
            vcodec: 'none',
            acodec: 'mp3',
            direct_url: highestStream,
            asset_type: 'audio',
            note: 'Original Audio Track (MP3)',
          });
        }
      });

      const images: any[] = [];
      const seenImgUrls = new Set<string>();

      // Photos from tweet
      const photoItems = [
        ...(Array.isArray(tweet.media?.photos) ? tweet.media.photos : []),
        ...(Array.isArray(tweet.quote?.media?.photos) ? tweet.quote.media.photos : []),
        ...allMedia.filter((m: any) => m && (m.type === 'photo' || (!m.variants && m.url && !m.url.includes('.mp4')))),
      ];

      photoItems.forEach((p: any, idx: number) => {
        const pUrl = p?.url;
        if (pUrl && !seenImgUrls.has(pUrl)) {
          seenImgUrls.add(pUrl);
          images.push({
            format_id: `twitter_photo_${idx + 1}`,
            ext: 'jpg',
            resolution: p.width && p.height ? `${p.width}x${p.height}` : 'High Res Photo',
            vcodec: 'none',
            acodec: 'none',
            direct_url: pUrl,
            asset_type: 'image',
            note: `Twitter Photo ${idx + 1}`,
          });
        }
      });

      // Video poster thumbnails
      videoItems.forEach((v: any, idx: number) => {
        const thumb = v?.thumbnail_url;
        if (thumb && !seenImgUrls.has(thumb)) {
          seenImgUrls.add(thumb);
          images.push({
            format_id: `twitter_thumb_${idx + 1}`,
            ext: 'jpg',
            resolution: 'Video Poster Thumbnail',
            vcodec: 'none',
            acodec: 'none',
            direct_url: thumb,
            asset_type: 'image',
            note: `Video ${idx + 1} Poster Thumbnail`,
          });
        }
      });

      // Author avatar
      if (tweet.author?.avatar_url && !seenImgUrls.has(tweet.author.avatar_url)) {
        seenImgUrls.add(tweet.author.avatar_url);
        images.push({
          format_id: 'twitter_author_avatar',
          ext: 'jpg',
          resolution: 'Author Profile Avatar',
          vcodec: 'none',
          acodec: 'none',
          direct_url: tweet.author.avatar_url,
          asset_type: 'image',
          note: `${uploader} Avatar`,
        });
      }

      // Author banner
      if (tweet.author?.banner_url && !seenImgUrls.has(tweet.author.banner_url)) {
        seenImgUrls.add(tweet.author.banner_url);
        images.push({
          format_id: 'twitter_author_banner',
          ext: 'jpg',
          resolution: 'Author Profile Banner',
          vcodec: 'none',
          acodec: 'none',
          direct_url: tweet.author.banner_url,
          asset_type: 'image',
          note: `${uploader} Banner`,
        });
      }

      const primaryThumbnail =
        videoItems[0]?.thumbnail_url || photoItems[0]?.url || tweet.author?.avatar_url;

      if (formats.length > 0 || images.length > 0) {
        return {
          title,
          description,
          extracted_text: description,
          thumbnail: primaryThumbnail,
          duration: videoItems[0]?.duration || null,
          uploader: `Twitter/X • ${uploader}`,
          site_name: 'Twitter / X',
          formats,
          images,
        };
      }
    }
  } catch (err) {
    console.error('Twitter fallback resolver error:', err);
  }
  return null;
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
    const seenFilenames = new Set<string>();

    const addImage = (rawImgUrl: string, note: string) => {
      if (!rawImgUrl) return;
      let absUrl = rawImgUrl
        .replace(/\\\//g, '/')
        .replace(/\\u0026/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/\\u00253D/gi, '=')
        .replace(/\\u002526/gi, '&');

      if (absUrl.startsWith('//')) absUrl = `https:${absUrl}`;
      if (seenUrls.has(absUrl)) return;
      seenUrls.add(absUrl);

      try {
        const urlObj = new URL(absUrl);
        const segments = urlObj.pathname.split('/');
        const filename = segments[segments.length - 1];
        if (filename && filename.includes('.jpg')) {
          if (seenFilenames.has(filename)) return;
          seenFilenames.add(filename);
        }
      } catch (e) {}

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
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
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

            const rawUrlMatches = html.match(/https?:\\?\/\\?\/[^\s"'\\]*(?:scontent|fbcdn)[^\s"'\\]*/gi) || [];
            for (const raw of rawUrlMatches) {
              let u = raw.replace(/\\\/|\\u002f/gi, '/').replace(/\\u0026/gi, '&').replace(/&amp;/gi, '&');
              if ((u.includes('scontent') || u.includes('fbcdn.net')) && !u.includes('rsrc.php') && !u.includes('static.cdninstagram.com') && u.length > 40) {
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

    // Dedicated Twitter / X Fast Resolver (Run first to extract high-res direct streams without yt-dlp timeout)
    if (domain.includes('twitter.com') || domain.includes('x.com') || url.includes('twitter.com') || url.includes('x.com')) {
      const twitterData = await getTwitterFallbackInfo(url);
      if (twitterData && (twitterData.formats?.length > 0 || twitterData.images?.length > 0)) {
        return NextResponse.json(
          sanitizeMediaInfo(
            {
              ...twitterData,
              security: {
                ...security,
                category: 'media_stream',
              },
            },
            url
          )
        );
      }
    }

    if (isMediaStream || !isAppStore) {
      const ytData = await getYtDlpInfo(url, browserCookie);
      if (ytData && ((ytData.formats && ytData.formats.length > 0) || (ytData.images && ytData.images.length > 0))) {
        return NextResponse.json(
          sanitizeMediaInfo(
            {
              ...ytData,
              security: {
                ...security,
                category: 'media_stream',
              },
            },
            url
          )
        );
      }

      // Dedicated YouTube Fallback Extractor (Run if yt-dlp failed, timed out, or blocked)
      if (domain.includes('youtube.com') || domain.includes('youtu.be') || url.includes('youtube.com') || url.includes('youtu.be')) {
        const youtubeData = await getYouTubeFallbackInfo(url);
        if (youtubeData && (youtubeData.formats?.length > 0 || youtubeData.images?.length > 0)) {
          return NextResponse.json(
            sanitizeMediaInfo(
              {
                ...youtubeData,
                security: {
                  ...security,
                  category: 'media_stream',
                },
              },
              url
            )
          );
        }
      }

      // Dedicated TikTok Fallback Extractor
      if (domain.includes('tiktok.com') || url.includes('tiktok.com')) {
        const tiktokData = await getTikTokFallbackInfo(url);
        if (tiktokData && (tiktokData.formats?.length > 0 || tiktokData.images?.length > 0)) {
          return NextResponse.json(
            sanitizeMediaInfo(
              {
                ...tiktokData,
                security: {
                  ...security,
                  category: 'media_stream',
                },
              },
              url
            )
          );
        }
      }

      // Dedicated Instagram Fallback Extractor
      if (domain.includes('instagram.com') || url.includes('instagram.com')) {
        const instagramData = await getInstagramFallbackInfo(url);
        if (instagramData) {
          return NextResponse.json(
            sanitizeMediaInfo(
              {
                ...instagramData,
                security: {
                  ...security,
                  category: 'media_stream',
                },
              },
              url
            )
          );
        }
      }

      // Dedicated Twitter / X Fallback Extractor
      if (domain.includes('twitter.com') || domain.includes('x.com') || url.includes('twitter.com') || url.includes('x.com')) {
        const twitterData = await getTwitterFallbackInfo(url);
        if (twitterData && (twitterData.formats?.length > 0 || twitterData.images?.length > 0)) {
          return NextResponse.json(
            sanitizeMediaInfo(
              {
                ...twitterData,
                security: {
                  ...security,
                  category: 'media_stream',
                },
              },
              url
            )
          );
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
          signal: AbortSignal.timeout(6000),
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
      } catch (e: any) {
        if (e?.name === 'TimeoutError' || e?.code === 'UND_ERR_CONNECT_TIMEOUT' || e?.message?.includes('timeout') || e?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
          console.warn(`[HTML Scraper] Network timeout fetching metadata for ${domain}`);
        } else {
          console.warn(`[HTML Scraper] Network issue fetching HTML fallback for ${domain}:`, e?.message || e);
        }
      }
    }

    // Primary Thumbnail fallback
    if (!primaryThumbnail && images.length > 0) {
      primaryThumbnail = images[0].direct_url;
    } else if (!primaryThumbnail) {
      const ytId = extractYouTubeVideoId(url);
      if (ytId) {
        primaryThumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        addImage(primaryThumbnail, 'YouTube Video Thumbnail');
      } else {
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        addImage(faviconUrl, 'Website Favicon / Icon');
        primaryThumbnail = faviconUrl;
      }
    }

    return NextResponse.json(
      sanitizeMediaInfo(
        {
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
        },
        url
      )
    );
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
