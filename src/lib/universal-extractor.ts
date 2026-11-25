import * as cheerio from 'cheerio';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
export const PREVIEW_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
export const TWITTER_UA = 'Twitterbot/1.0';

export interface ExtractedAsset {
  format_id: string;
  ext: string;
  resolution: string;
  fps?: number | null;
  vcodec: string;
  acodec: string;
  filesize?: number | null;
  direct_url: string;
  asset_type: 'video' | 'audio' | 'image' | 'screenshot';
  note: string;
  /** Internal ranking score (higher = more likely to be primary media) */
  _score?: number;
}

export interface UniversalExtractionResult {
  finalUrl: string;
  title: string;
  description: string;
  extracted_text: string;
  thumbnail?: string;
  duration?: number | null;
  uploader: string;
  site_name: string;
  formats: ExtractedAsset[];
  images: ExtractedAsset[];
  embeddedIframes: string[];
  directMedia?: {
    contentType: string;
    ext: string;
    assetType: 'video' | 'audio' | 'image';
    filesize: number | null;
    filename: string;
  };
}

const TRACKER_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com/tr',
  'connect.facebook.net',
  'analytics.',
  'scorecardresearch.com',
  'quantserve.com',
  'adservice.google',
  'amazon-adsystem.com',
  'pixel.',
  'beacon.',
  'bat.bing.com',
  'hotjar.com',
  'sentry.io',
];

const NOISE_PATH_TOKENS = [
  'spacer',
  'tracking',
  'pixel',
  '1x1',
  'blank.gif',
  'transparent.png',
  'analytics',
  'doubleclick',
  'adserver',
  'sprite',
  'spinner',
  'loading.gif',
  'loader.svg',
];

export function decodeHtmlEntities(value: string): string {
  if (!value) return value;
  return value
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function unescapeJsonUrl(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\\\//g, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u00253D/gi, '=')
    .replace(/\\u002526/gi, '&')
    .replace(/&amp;/g, '&');
}

export function makeAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  if (!relativeUrl) return '';
  const decoded = decodeHtmlEntities(unescapeJsonUrl(relativeUrl));
  if (
    !decoded ||
    decoded.startsWith('data:') ||
    decoded.startsWith('blob:') ||
    decoded.startsWith('javascript:') ||
    decoded.startsWith('mailto:') ||
    decoded.startsWith('#') ||
    decoded.includes('iVBORw0KGgo')
  ) {
    return '';
  }
  if (decoded.startsWith('//')) {
    return `https:${decoded}`;
  }
  if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
    return decoded;
  }
  try {
    return new URL(decoded, baseUrl).href;
  } catch {
    return '';
  }
}

export function isBotChallenge(status: number, html: string): boolean {
  if (status === 401 || status === 403 || status === 429 || status === 503) return true;
  const lower = html.slice(0, 12000).toLowerCase();
  return (
    lower.includes('attention required! | cloudflare') ||
    lower.includes('just a moment...') ||
    lower.includes('cf-browser-verification') ||
    lower.includes('enable javascript and cookies to continue') ||
    lower.includes('checking your browser before accessing') ||
    lower.includes('verify you are human')
  );
}

export function isNoiseUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.length < 12) return true;
  if (TRACKER_HOSTS.some((h) => lower.includes(h))) return true;
  if (NOISE_PATH_TOKENS.some((t) => lower.includes(t))) return true;
  return false;
}

export function extFromContentType(ct: string): {
  ext: string;
  assetType: 'video' | 'audio' | 'image';
} | null {
  const lower = ct.toLowerCase().split(';')[0].trim();
  if (lower === 'application/vnd.apple.mpegurl' || lower === 'application/x-mpegurl') {
    return { ext: 'm3u8', assetType: 'video' };
  }
  if (lower === 'application/dash+xml') {
    return { ext: 'mpd', assetType: 'video' };
  }
  if (lower.startsWith('video/')) {
    if (lower.includes('webm')) return { ext: 'webm', assetType: 'video' };
    if (lower.includes('quicktime') || lower.includes('mov')) return { ext: 'mov', assetType: 'video' };
    if (lower.includes('matroska') || lower.includes('mkv')) return { ext: 'mkv', assetType: 'video' };
    if (lower.includes('ogg')) return { ext: 'ogv', assetType: 'video' };
    return { ext: 'mp4', assetType: 'video' };
  }
  if (lower.startsWith('audio/')) {
    if (lower.includes('mpeg') || lower.includes('mp3')) return { ext: 'mp3', assetType: 'audio' };
    if (lower.includes('mp4') || lower.includes('m4a') || lower.includes('aac')) return { ext: 'm4a', assetType: 'audio' };
    if (lower.includes('wav')) return { ext: 'wav', assetType: 'audio' };
    if (lower.includes('ogg') || lower.includes('opus')) return { ext: 'ogg', assetType: 'audio' };
    if (lower.includes('flac')) return { ext: 'flac', assetType: 'audio' };
    if (lower.includes('webm')) return { ext: 'webm', assetType: 'audio' };
    return { ext: 'mp3', assetType: 'audio' };
  }
  if (lower.startsWith('image/')) {
    if (lower.includes('png')) return { ext: 'png', assetType: 'image' };
    if (lower.includes('webp')) return { ext: 'webp', assetType: 'image' };
    if (lower.includes('gif')) return { ext: 'gif', assetType: 'image' };
    if (lower.includes('avif')) return { ext: 'avif', assetType: 'image' };
    if (lower.includes('svg')) return { ext: 'svg', assetType: 'image' };
    if (lower.includes('bmp')) return { ext: 'bmp', assetType: 'image' };
    return { ext: 'jpg', assetType: 'image' };
  }
  return null;
}

function filenameFromHeadersOrUrl(url: string, contentDisposition?: string | null): string {
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].replace(/["']/g, ''));
      } catch {}
    }
    const basicMatch = contentDisposition.match(/filename=["']?([^"';\r\n]+)["']?/i);
    if (basicMatch?.[1]) return basicMatch[1].trim();
  }
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean);
    if (segs.length > 0) {
      return decodeURIComponent(segs[segs.length - 1]);
    }
  } catch {}
  return 'media_asset';
}

/**
 * Fast HEAD probe to detect direct media files even when URLs have no file extension
 * (CDN links, S3 presigned URLs, short redirect links, etc.)
 */
export async function probeDirectMedia(targetUrl: string): Promise<{
  finalUrl: string;
  contentType: string;
  ext: string;
  assetType: 'video' | 'audio' | 'image';
  filesize: number | null;
  filename: string;
} | null> {
  try {
    const res = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const detected = extFromContentType(ct);
    if (!detected) return null;

    const finalUrl = res.url || targetUrl;
    const cl = res.headers.get('content-length');
    const filesize = cl && !Number.isNaN(Number(cl)) ? Number(cl) : null;
    const filename = filenameFromHeadersOrUrl(finalUrl, res.headers.get('content-disposition'));

    return {
      finalUrl,
      contentType: ct,
      ext: detected.ext,
      assetType: detected.assetType,
      filesize,
      filename,
    };
  } catch {
    return null;
  }
}

export interface FetchedUniversalPage {
  html: string;
  contentType: string;
  finalUrl: string;
  contentLength: number | null;
  contentDisposition: string | null;
}

/**
 * Fetches a page with redirect tracking and multi-User-Agent fallback for bot walls.
 */
export async function fetchUniversalPage(pageUrl: string): Promise<FetchedUniversalPage> {
  const userAgents = [BROWSER_UA, PREVIEW_UA, TWITTER_UA];
  let lastError: any = null;
  let sawBotWall = false;

  for (const ua of userAgents) {
    try {
      const res = await fetch(pageUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(9500),
      });

      const contentType = res.headers.get('content-type') || '';
      const finalUrl = res.url || pageUrl;
      const cl = res.headers.get('content-length');
      const contentLength = cl && !Number.isNaN(Number(cl)) ? Number(cl) : null;
      const contentDisposition = res.headers.get('content-disposition');

      // If the URL resolved directly to a media asset, avoid reading huge binary bodies into text
      if (extFromContentType(contentType)) {
        try {
          await res.body?.cancel();
        } catch {}
        return { html: '', contentType, finalUrl, contentLength, contentDisposition };
      }

      const body = await res.text();
      if (res.ok && !isBotChallenge(res.status, body)) {
        return { html: body, contentType, finalUrl, contentLength, contentDisposition };
      }

      if (isBotChallenge(res.status, body)) {
        sawBotWall = true;
      } else {
        lastError = new Error(`Remote site returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  if (sawBotWall) {
    throw Object.assign(new Error('Bot challenge detected'), { botWall: true });
  }
  throw Object.assign(
    new Error(`Could not reach the page: ${lastError?.message || lastError || 'Network error'}`),
    { botWall: false }
  );
}

/**
 * Picks the highest resolution URL from an HTML srcset string.
 */
function pickBestFromSrcset(srcset: string): { url: string; width: number } | null {
  if (!srcset) return null;
  const candidates = srcset
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(/\s+/);
      const url = parts[0];
      const descriptor = parts[1] || '';
      let weight = 1;
      if (descriptor.endsWith('w')) {
        weight = parseInt(descriptor, 10) || 1;
      } else if (descriptor.endsWith('x')) {
        weight = Math.round((parseFloat(descriptor) || 1) * 1000);
      }
      return { url, width: weight };
    })
    .filter((c) => c.url && !c.url.startsWith('data:'));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return candidates[0];
}

function classifyMediaUrl(url: string): { type: 'video' | 'audio' | 'image'; ext: string } | null {
  try {
    const u = new URL(url);
    const pathLower = u.pathname.toLowerCase();
    const vidMatch = pathLower.match(/\.(mp4|webm|mkv|mov|m4v|avi|m3u8|mpd|ogv)$/);
    if (vidMatch) return { type: 'video', ext: vidMatch[1] };
    const audMatch = pathLower.match(/\.(mp3|m4a|wav|aac|flac|ogg|opus)$/);
    if (audMatch) return { type: 'audio', ext: audMatch[1] };
    const imgMatch = pathLower.match(/\.(jpe?g|png|webp|gif|avif|svg)$/);
    if (imgMatch) return { type: 'image', ext: imgMatch[1] === 'jpeg' ? 'jpg' : imgMatch[1] };

    // Query-param format hints (e.g., ?format=jpg, ?fm=webp, ?mime=video/mp4)
    const fmtParam = (u.searchParams.get('format') || u.searchParams.get('fm') || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(fmtParam)) {
      return { type: 'image', ext: fmtParam === 'jpeg' ? 'jpg' : fmtParam };
    }
    if (['mp4', 'webm', 'm3u8'].includes(fmtParam)) {
      return { type: 'video', ext: fmtParam };
    }
  } catch {}
  return null;
}

const VIDEO_KEY_HINTS = [
  'videourl',
  'video_url',
  'playbackurl',
  'playback_url',
  'streamurl',
  'stream_url',
  'hlsurl',
  'hls_url',
  'dashurl',
  'dash_url',
  'playaddr',
  'play_addr',
  'contenturl',
  'media_url',
  'mp4url',
  'mp4_url',
  'hdurl',
  'sdurl',
  'sourceurl',
];

const AUDIO_KEY_HINTS = ['audiourl', 'audio_url', 'soundurl', 'trackurl', 'podcasturl', 'enclosureurl'];

const HIGH_RES_IMG_KEY_HINTS = [
  'orig',
  'original',
  'full',
  'highres',
  'display_url',
  'imageurl',
  'image_url',
  'hero',
  'cover',
  'poster',
  'banner',
  'large',
  'zoom',
];

/**
 * Recursively walks parsed JSON objects (JSON-LD, __NEXT_DATA__, __INITIAL_STATE__, etc.)
 * to discover media URLs without needing site-specific schemas.
 */
function walkJsonForMedia(
  root: unknown,
  baseUrl: string,
  onVideo: (url: string, note: string, score: number) => void,
  onAudio: (url: string, note: string, score: number) => void,
  onImage: (url: string, note: string, score: number) => void
) {
  let visitedNodes = 0;
  const MAX_NODES = 4000;
  const MAX_DEPTH = 14;

  function visit(node: unknown, keyHint: string, depth: number) {
    if (visitedNodes >= MAX_NODES || depth > MAX_DEPTH || node == null) return;
    visitedNodes++;

    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (trimmed.length < 10 || trimmed.length > 2000) return;
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('//')) {
        return;
      }
      const absUrl = makeAbsoluteUrl(trimmed, baseUrl);
      if (!absUrl || isNoiseUrl(absUrl)) return;

      const lowerKey = keyHint.toLowerCase();
      const classified = classifyMediaUrl(absUrl);

      if (classified?.type === 'video') {
        const isManifest = classified.ext === 'm3u8' || classified.ext === 'mpd';
        onVideo(
          absUrl,
          isManifest ? 'Adaptive Stream (Page Data)' : 'Video Stream (Page Data)',
          isManifest ? 85 : 90
        );
        return;
      }
      if (classified?.type === 'audio') {
        onAudio(absUrl, 'Audio Stream (Page Data)', 85);
        return;
      }
      if (classified?.type === 'image') {
        if (lowerKey.includes('avatar') || lowerKey.includes('icon') || lowerKey.includes('favicon')) {
          return;
        }
        const isHighResKey = HIGH_RES_IMG_KEY_HINTS.some((h) => lowerKey.includes(h));
        onImage(absUrl, isHighResKey ? 'High-Res Page Data Image' : 'Page Data Image', isHighResKey ? 78 : 55);
        return;
      }

      // Key-hint fallback for extensionless CDN URLs inside hydration JSON
      if (VIDEO_KEY_HINTS.some((h) => lowerKey.includes(h))) {
        onVideo(absUrl, 'Video Stream (Hydrated Data)', 82);
      } else if (AUDIO_KEY_HINTS.some((h) => lowerKey.includes(h))) {
        onAudio(absUrl, 'Audio Stream (Hydrated Data)', 82);
      }
      return;
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < Math.min(node.length, 100); i++) {
        visit(node[i], keyHint, depth + 1);
      }
      return;
    }

    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      // Schema.org VideoObject / AudioObject fast extraction
      const schemaType = String(obj['@type'] || '').toLowerCase();
      if (schemaType.includes('videoobject')) {
        const cUrl = typeof obj.contentUrl === 'string' ? makeAbsoluteUrl(obj.contentUrl, baseUrl) : '';
        if (cUrl && !isNoiseUrl(cUrl)) onVideo(cUrl, 'Structured Video (JSON-LD)', 95);
      } else if (schemaType.includes('audioobject')) {
        const cUrl = typeof obj.contentUrl === 'string' ? makeAbsoluteUrl(obj.contentUrl, baseUrl) : '';
        if (cUrl && !isNoiseUrl(cUrl)) onAudio(cUrl, 'Structured Audio (JSON-LD)', 95);
      }

      const keys = Object.keys(obj);
      for (let i = 0; i < Math.min(keys.length, 120); i++) {
        const k = keys[i];
        visit(obj[k], k, depth + 1);
      }
    }
  }

  visit(root, '', 0);
}

/**
 * Extracts a balanced JSON object starting at `{` after a hydration assignment like `window.__INITIAL_STATE__ = {`
 */
function extractAssignedJson(scriptText: string, markerRegex: RegExp): unknown | null {
  const match = markerRegex.exec(scriptText);
  if (!match) return null;
  const startIdx = scriptText.indexOf('{', match.index + match[0].length - 1);
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  const limit = Math.min(scriptText.length, startIdx + 500_000);

  for (let i = startIdx; i < limit; i++) {
    const ch = scriptText[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = scriptText.slice(startIdx, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Fetches universal oEmbed metadata if the page advertises an oEmbed endpoint.
 */
async function fetchOEmbed(oembedUrl: string): Promise<any | null> {
  try {
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

function normalizeDedupKey(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    return u.href;
  } catch {
    return rawUrl;
  }
}

/**
 * Universal Tier 1 HTML + DOM + oEmbed + JSON Hydration extractor.
 * Works across arbitrary websites without site-specific hardcoding.
 */
export async function extractUniversalFromHtml(
  html: string,
  finalUrl: string
): Promise<UniversalExtractionResult> {
  const $ = cheerio.load(html);
  const urlObj = new URL(finalUrl);
  const domain = urlObj.hostname;

  let title = '';
  let description = '';
  let uploader = domain;
  let site_name = '';
  let primaryThumbnail: string | undefined;
  let duration: number | null = null;

  const formats: ExtractedAsset[] = [];
  const images: ExtractedAsset[] = [];
  const embeddedIframes: string[] = [];

  const seenMedia = new Set<string>();
  const seenImages = new Set<string>();
  const seenIframes = new Set<string>();

  const addMedia = (
    rawUrl: string,
    assetType: 'video' | 'audio',
    note: string,
    resolution = 'Original Stream',
    score = 70
  ) => {
    const absUrl = makeAbsoluteUrl(rawUrl, finalUrl);
    if (!absUrl || isNoiseUrl(absUrl)) return;
    const key = normalizeDedupKey(absUrl);
    if (seenMedia.has(key)) return;
    seenMedia.add(key);

    const classified = classifyMediaUrl(absUrl);
    const rawExt = classified?.ext || (assetType === 'video' ? 'mp4' : 'mp3');
    const isHls = rawExt === 'm3u8';
    const isDash = rawExt === 'mpd';
    const formatId = `${assetType}_${formats.length + 1}`;

    formats.push({
      format_id: formatId,
      ext: isHls || isDash ? 'mp4' : rawExt,
      resolution: isHls
        ? 'HLS Adaptive Video Stream'
        : isDash
        ? 'DASH Adaptive Video Stream'
        : resolution,
      fps: assetType === 'video' ? 30 : null,
      vcodec: assetType === 'video' ? 'h264' : 'none',
      acodec: assetType === 'audio' ? rawExt : 'aac',
      direct_url: absUrl,
      asset_type: assetType,
      note,
      _score: score,
    });

    if (assetType === 'video') {
      formats.push({
        format_id: `${formatId}_audio`,
        ext: 'mp3',
        resolution: 'Audio Only (Extract MP3)',
        fps: null,
        vcodec: 'none',
        acodec: 'mp3',
        direct_url: `/api/download?url=${encodeURIComponent(finalUrl)}&directUrl=${encodeURIComponent(absUrl)}&audioOnly=true`,
        asset_type: 'audio',
        note: `Extracted Audio Track (${note})`,
        _score: score - 25,
      });
    }
  };

  const addImage = (rawUrl: string, note: string, score = 50, resolution = 'High Res Asset') => {
    const absUrl = makeAbsoluteUrl(rawUrl, finalUrl);
    if (!absUrl || isNoiseUrl(absUrl)) return;
    const key = normalizeDedupKey(absUrl);
    if (seenImages.has(key)) return;
    seenImages.add(key);

    const classified = classifyMediaUrl(absUrl);
    const ext = classified?.type === 'image' ? classified.ext : 'jpg';

    images.push({
      format_id: `img_${images.length + 1}`,
      ext,
      resolution,
      vcodec: 'none',
      acodec: 'none',
      direct_url: absUrl,
      asset_type: 'image',
      note,
      _score: score,
    });
  };

  const addIframe = (rawUrl: string) => {
    const absUrl = makeAbsoluteUrl(rawUrl, finalUrl);
    if (!absUrl || isNoiseUrl(absUrl) || seenIframes.has(absUrl)) return;
    seenIframes.add(absUrl);
    embeddedIframes.push(absUrl);
  };

  // 1. Metadata (OpenGraph, Twitter Cards, standard <meta>, <title>)
  const meta = (selector: string) => $(selector).attr('content')?.trim() || '';
  title =
    meta('meta[property="og:title"]') ||
    meta('meta[name="twitter:title"]') ||
    $('title').first().text().trim() ||
    `${domain} Asset`;
  description =
    meta('meta[property="og:description"]') ||
    meta('meta[name="description"]') ||
    meta('meta[name="twitter:description"]') ||
    '';
  site_name = meta('meta[property="og:site_name"]') || domain;
  uploader =
    meta('meta[name="author"]') ||
    meta('meta[property="article:author"]') ||
    meta('meta[name="twitter:creator"]') ||
    site_name ||
    domain;

  const ogImages = [
    meta('meta[property="og:image:secure_url"]'),
    meta('meta[property="og:image"]'),
    meta('meta[name="twitter:image:src"]'),
    meta('meta[name="twitter:image"]'),
    $('link[rel="image_src"]').attr('href')?.trim() || '',
  ].filter(Boolean);

  for (const img of ogImages) {
    addImage(img, 'Featured OpenGraph Image', 95, 'Featured HD Image');
    if (!primaryThumbnail) {
      const abs = makeAbsoluteUrl(img, finalUrl);
      if (abs) primaryThumbnail = abs;
    }
  }

  // OpenGraph / Twitter direct video & audio tags
  const ogVideos = [
    meta('meta[property="og:video:secure_url"]'),
    meta('meta[property="og:video:url"]'),
    meta('meta[property="og:video"]'),
    meta('meta[name="twitter:player:stream"]'),
  ].filter(Boolean);
  for (const v of ogVideos) {
    // Some sites put an HTML embed player URL in og:video; keep it as iframe if it looks like an embed page
    const classified = classifyMediaUrl(makeAbsoluteUrl(v, finalUrl));
    if (classified?.type === 'video') {
      addMedia(v, 'video', 'OpenGraph Video Stream', 'HD Video', 95);
    } else if (/embed|player/i.test(v)) {
      addIframe(v);
    } else {
      addMedia(v, 'video', 'OpenGraph Video Stream', 'HD Video', 85);
    }
  }

  const ogAudios = [
    meta('meta[property="og:audio:secure_url"]'),
    meta('meta[property="og:audio:url"]'),
    meta('meta[property="og:audio"]'),
  ].filter(Boolean);
  for (const a of ogAudios) {
    addMedia(a, 'audio', 'OpenGraph Audio Track', 'Audio Stream', 92);
  }

  // 2. Universal oEmbed Discovery (<link rel="alternate" type="application/json+oembed">)
  const oembedHref =
    $('link[rel="alternate"][type*="oembed"][type*="json"]').first().attr('href') || '';
  if (oembedHref) {
    const oembedUrl = makeAbsoluteUrl(oembedHref, finalUrl);
    if (oembedUrl) {
      const oembed = await fetchOEmbed(oembedUrl);
      if (oembed) {
        if (oembed.title && title === `${domain} Asset`) title = String(oembed.title);
        if (oembed.author_name) uploader = String(oembed.author_name);
        if (oembed.provider_name) site_name = String(oembed.provider_name);
        if (oembed.thumbnail_url) {
          addImage(String(oembed.thumbnail_url), `${site_name} oEmbed Thumbnail`, 92, 'oEmbed Thumbnail');
          if (!primaryThumbnail) primaryThumbnail = makeAbsoluteUrl(String(oembed.thumbnail_url), finalUrl);
        }
        if (oembed.url && oembed.type === 'photo') {
          addImage(String(oembed.url), `${site_name} Original Photo`, 98, 'Original Photo');
        }
        if (typeof oembed.html === 'string') {
          const $embed = cheerio.load(oembed.html);
          $embed('iframe').each((_, el) => {
            const src = $embed(el).attr('src');
            if (src) addIframe(src);
          });
        }
      }
    }
  }

  // 3. JSON-LD & Embedded Hydration State (__NEXT_DATA__, __NUXT__, __INITIAL_STATE__, etc.)
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
        ? parsed['@graph']
        : [parsed];
      for (const item of items) {
        if (item?.name && title === `${domain} Asset`) title = String(item.name);
        if (item?.description && !description) description = String(item.description);
        if (typeof item?.duration === 'number' && !duration) duration = item.duration;
      }
      walkJsonForMedia(
        parsed,
        finalUrl,
        (u, note, score) => addMedia(u, 'video', note, 'HD Video', score),
        (u, note, score) => addMedia(u, 'audio', note, 'Audio Stream', score),
        (u, note, score) => addImage(u, note, score)
      );
    } catch {}
  });

  // Walk <script type="application/json"> (e.g. __NEXT_DATA__, __PWS_DATA__, Shopify/Nuxt JSON)
  $('script[type="application/json"], script#__NEXT_DATA__, script#__NUXT_DATA__').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw || raw.length > 1_500_000) return;
    try {
      const parsed = JSON.parse(raw);
      walkJsonForMedia(
        parsed,
        finalUrl,
        (u, note, score) => addMedia(u, 'video', note, 'HD Video', score),
        (u, note, score) => addMedia(u, 'audio', note, 'Audio Stream', score),
        (u, note, score) => addImage(u, note, score)
      );
    } catch {}
  });

  // Walk inline JS hydration assignments & scan for direct stream URLs
  const hydrationMarkers = [
    /window\.__INITIAL_STATE__\s*=\s*\{/,
    /window\.__DATA__\s*=\s*\{/,
    /window\.__PRELOADED_STATE__\s*=\s*\{/,
    /window\.__APP_STATE__\s*=\s*\{/,
    /window\.__NUXT__\s*=\s*\{/,
  ];

  $('script:not([src])').each((_, el) => {
    const scriptText = $(el).text();
    if (!scriptText || scriptText.length < 20) return;

    for (const marker of hydrationMarkers) {
      if (marker.test(scriptText)) {
        const parsed = extractAssignedJson(scriptText, marker);
        if (parsed) {
          walkJsonForMedia(
            parsed,
            finalUrl,
            (u, note, score) => addMedia(u, 'video', note, 'HD Video', score),
            (u, note, score) => addMedia(u, 'audio', note, 'Audio Stream', score),
            (u, note, score) => addImage(u, note, score)
          );
        }
      }
    }

    // Deep scan inline scripts for escaped or raw stream URLs (.m3u8, .mpd, .mp4, .webm, .mp3, .m4a)
    const streamRegex =
      /https?(?::\\?\/\\?\/)[^\s"'<>`\\]+?\.(?:m3u8|mpd|mp4|webm|mp3|m4a)(?:\?[^\s"'<>`\\]*)?/gi;
    let m: RegExpExecArray | null;
    let hits = 0;
    while ((m = streamRegex.exec(scriptText)) !== null && hits < 15) {
      const candidate = unescapeJsonUrl(m[0]);
      const classified = classifyMediaUrl(candidate);
      if (classified && (classified.type === 'video' || classified.type === 'audio')) {
        hits++;
        addMedia(
          candidate,
          classified.type,
          classified.ext === 'm3u8'
            ? 'HLS Streaming Manifest'
            : classified.ext === 'mpd'
            ? 'DASH Streaming Manifest'
            : classified.type === 'audio'
            ? 'Embedded Audio Stream'
            : 'Direct Video Stream',
          classified.ext === 'm3u8' || classified.ext === 'mpd' ? 'Adaptive HD Stream' : 'Original Stream',
          80
        );
      }
    }
  });

  // 4. HTML5 <video> and <audio> tags
  $('video').each((idx, el) => {
    const $v = $(el);
    const src = $v.attr('src') || $v.attr('data-src');
    if (src) addMedia(src, 'video', `HTML5 Video ${idx + 1}`, 'Original Video', 92);

    const poster = $v.attr('poster');
    if (poster) {
      addImage(poster, `Video Poster ${idx + 1}`, 88, 'Video Poster');
      if (!primaryThumbnail) primaryThumbnail = makeAbsoluteUrl(poster, finalUrl);
    }

    $v.find('source').each((_, sEl) => {
      const sSrc = $(sEl).attr('src') || $(sEl).attr('data-src');
      const label = $(sEl).attr('label') || $(sEl).attr('size') || 'HTML5 Video Stream';
      if (sSrc) addMedia(sSrc, 'video', label, label, 90);
    });
  });

  $('audio').each((idx, el) => {
    const $a = $(el);
    const src = $a.attr('src') || $a.attr('data-src');
    if (src) addMedia(src, 'audio', `HTML5 Audio ${idx + 1}`, 'Audio Stream', 90);

    $a.find('source').each((_, sEl) => {
      const sSrc = $(sEl).attr('src') || $(sEl).attr('data-src');
      if (sSrc) addMedia(sSrc, 'audio', 'HTML5 Audio Track', 'Audio Stream', 88);
    });
  });

  // 5. Direct downloadable media links in <a href>
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const abs = makeAbsoluteUrl(href, finalUrl);
    if (!abs || isNoiseUrl(abs)) return;
    const classified = classifyMediaUrl(abs);
    if (classified?.type === 'video') {
      addMedia(abs, 'video', $(el).text().trim().slice(0, 50) || 'Linked Video File', 'Direct Video', 84);
    } else if (classified?.type === 'audio') {
      addMedia(abs, 'audio', $(el).text().trim().slice(0, 50) || 'Linked Audio File', 'Direct Audio', 84);
    }
  });

  // 6. Embedded <iframe> players
  $('iframe').each((_, el) => {
    if (embeddedIframes.length >= 6) return;
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) addIframe(src);
  });

  // 7. Images: <picture>, <img srcset/data-*>, and CSS background-image
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset') || $(el).attr('data-srcset');
    const best = srcset ? pickBestFromSrcset(srcset) : null;
    if (best) {
      addImage(
        best.url,
        'High-Res Picture Asset',
        best.width >= 800 ? 82 : 65,
        best.width >= 100 ? `${best.width}w` : 'High Res Asset'
      );
    }
  });

  $('img').each((_, el) => {
    if (images.length >= 60) return;
    const $img = $(el);
    const widthAttr = parseInt($img.attr('width') || '0', 10);
    const heightAttr = parseInt($img.attr('height') || '0', 10);
    // Skip explicitly tiny icons/badges (< 48px)
    if ((widthAttr > 0 && widthAttr < 48) || (heightAttr > 0 && heightAttr < 48)) {
      return;
    }

    const srcset = $img.attr('srcset') || $img.attr('data-srcset');
    const bestSrcset = srcset ? pickBestFromSrcset(srcset) : null;

    const candidate =
      bestSrcset?.url ||
      $img.attr('data-full-src') ||
      $img.attr('data-highres') ||
      $img.attr('data-zoom-image') ||
      $img.attr('data-original') ||
      $img.attr('data-lazy-src') ||
      $img.attr('data-src') ||
      $img.attr('src') ||
      '';

    if (!candidate) return;

    const alt = ($img.attr('alt') || '').trim();
    const cls = ($img.attr('class') || '').toLowerCase();
    let score = 55;
    if (widthAttr >= 600 || heightAttr >= 400 || (bestSrcset && bestSrcset.width >= 800)) score += 20;
    if (/hero|gallery|product|screenshot|featured|main|cover|photo/i.test(cls)) score += 12;
    if (/avatar|icon|logo|badge|emoji/i.test(cls) || /icon|logo/i.test(candidate)) score -= 25;

    const resLabel =
      widthAttr && heightAttr
        ? `${widthAttr}x${heightAttr}`
        : bestSrcset && bestSrcset.width >= 100
        ? `${bestSrcset.width}w`
        : 'High Res Asset';

    addImage(candidate, alt ? alt.slice(0, 60) : `Media Asset ${images.length + 1}`, score, resLabel);
  });

  // Inline CSS background-image extraction
  $('[style*="background-image"]').each((_, el) => {
    if (images.length >= 65) return;
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/i);
    if (bgMatch?.[2]) {
      addImage(bgMatch[2], 'Background Visual Asset', 52);
    }
  });

  // High-res apple-touch-icon as low-priority fallback icon
  const touchIcon = $('link[rel="apple-touch-icon"]').first().attr('href');
  if (touchIcon) {
    addImage(touchIcon, 'Site Touch Icon', 20, 'Icon');
  }

  // 8. Clean text extraction (prefer <article> or <main> before falling back to all <p>)
  const paragraphs: string[] = [];
  const textContainer = $('article').length > 0 ? $('article') : $('main').length > 0 ? $('main') : $('body');
  textContainer.find('p').each((_, el) => {
    if (paragraphs.length >= 10) return;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 30) paragraphs.push(text);
  });

  const extracted_text =
    paragraphs.length > 0 ? paragraphs.join('\n\n') : description || 'No extra text content extracted.';
  if (!description && paragraphs.length > 0) {
    description = paragraphs[0];
  }

  // 9. Rank by score descending & strip internal _score
  formats.sort((a, b) => (b._score || 0) - (a._score || 0));
  images.sort((a, b) => (b._score || 0) - (a._score || 0));

  const cleanFormats = formats.map(({ _score, ...rest }) => rest);
  const cleanImages = images.slice(0, 45).map(({ _score, ...rest }) => rest);

  if (!primaryThumbnail && cleanImages.length > 0) {
    primaryThumbnail = cleanImages[0].direct_url;
  }

  return {
    finalUrl,
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description),
    extracted_text,
    thumbnail: primaryThumbnail,
    duration,
    uploader: decodeHtmlEntities(uploader),
    site_name: decodeHtmlEntities(site_name || domain),
    formats: cleanFormats,
    images: cleanImages,
    embeddedIframes,
  };
}

/**
 * Builds universal fetch headers for downloading assets from any CDN,
 * dynamically deriving Referer and Origin from the source page or asset URL.
 */
export function buildDynamicDownloadHeaders(
  assetUrl: string,
  pageUrl?: string,
  accept = '*/*'
): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    Accept: accept,
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const lowerAsset = assetUrl.toLowerCase();
  const lowerPage = (pageUrl || '').toLowerCase();

  // Known strict CDN referers
  if (
    lowerAsset.includes('cdninstagram.com') ||
    lowerAsset.includes('fbcdn.net') ||
    lowerPage.includes('instagram.com')
  ) {
    headers['Referer'] = 'https://www.instagram.com/';
    headers['Origin'] = 'https://www.instagram.com';
    return headers;
  }
  if (
    lowerAsset.includes('twimg.com') ||
    lowerPage.includes('twitter.com') ||
    lowerPage.includes('x.com')
  ) {
    headers['Referer'] = 'https://x.com/';
    headers['Origin'] = 'https://x.com';
    return headers;
  }
  if (lowerAsset.includes('pinimg.com') || lowerPage.includes('pinterest.com')) {
    headers['Referer'] = 'https://www.pinterest.com/';
    headers['Origin'] = 'https://www.pinterest.com';
    return headers;
  }

  // Dynamic universal Referer/Origin based on source pageUrl (fallback to asset origin)
  try {
    const refSource = pageUrl && /^https?:\/\//i.test(pageUrl) ? pageUrl : assetUrl;
    const origin = new URL(refSource).origin;
    headers['Referer'] = `${origin}/`;
    headers['Origin'] = origin;
  } catch {}

  return headers;
}

/**
 * Fetches a media asset with smart header fallback:
 * 1) Try with dynamic Referer/Origin (required by hotlink-protected CDNs)
 * 2) If 401/403, retry with asset's own origin as Referer
 * 3) If still 401/403, retry with NO Referer/Origin (required by some strict signed-URL CDNs like S3/CloudFront)
 */
export async function fetchMediaAssetWithFallback(
  assetUrl: string,
  pageUrl?: string,
  accept = '*/*'
): Promise<Response> {
  const primaryHeaders = buildDynamicDownloadHeaders(assetUrl, pageUrl, accept);
  let res = await fetch(assetUrl, {
    headers: primaryHeaders,
    redirect: 'follow',
  });

  if (res.ok || (res.status !== 401 && res.status !== 403)) {
    return res;
  }

  // Retry 2: Asset's own origin
  try {
    const assetOrigin = new URL(assetUrl).origin;
    if (primaryHeaders['Origin'] !== assetOrigin) {
      res = await fetch(assetUrl, {
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: accept,
          Referer: `${assetOrigin}/`,
          Origin: assetOrigin,
        },
        redirect: 'follow',
      });
      if (res.ok) return res;
    }
  } catch {}

  // Retry 3: Clean request with no Referer/Origin
  res = await fetch(assetUrl, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: accept,
    },
    redirect: 'follow',
  });

  return res;
}

