import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getFilenameFromUrl(url: string, defaultName = 'downloaded-asset'): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.includes('.')) {
      return lastSegment.replace(/[^a-zA-Z0-9._-]/g, '_');
    }
  } catch (e) {}
  return `${defaultName}_${Date.now()}.png`;
}

async function downloadWithYtDlp(pageUrl: string, formatId?: string, audioOnly?: boolean) {
  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const isAudio = audioOnly || formatId === 'audio_best' || formatId?.includes('audio') || formatId?.includes('mp3');
  const ext = isAudio ? 'mp3' : 'mp4';
  const filePrefix = `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const tempFilePath = path.join(scratchDir, `${filePrefix}.${ext}`);

  const args = [
    '--no-warnings',
    '--no-check-certificates',
  ];

  if (isAudio) {
    args.push('-x', '--audio-format', 'mp3', '-o', tempFilePath);
  } else if (formatId && formatId !== 'b' && !formatId.startsWith('img_')) {
    args.push('-f', `${formatId}+bestaudio/${formatId}/best/b`, '-o', tempFilePath);
  } else {
    args.push('-f', 'b/best', '-o', tempFilePath);
  }
  args.push(pageUrl);

  return new Promise<{ buffer: Buffer; ext: string } | null>((resolve) => {
    const proc = spawn('yt-dlp', args);
    proc.stderr.on('data', () => {});
    proc.on('close', () => {
      let actualPath = tempFilePath;
      if (!fs.existsSync(actualPath)) {
        const files = fs.readdirSync(scratchDir);
        const match = files.find((f) => f.startsWith(filePrefix));
        if (match) {
          actualPath = path.join(scratchDir, match);
        }
      }

      if (fs.existsSync(actualPath)) {
        try {
          const buffer = fs.readFileSync(actualPath);
          const actualExt = path.extname(actualPath).replace('.', '') || ext;
          try {
            fs.unlinkSync(actualPath);
          } catch (e) {}
          resolve({ buffer, ext: actualExt });
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
}

function formatBrandedFilename(filename: string): string {
  const brandPrefix = '[usemediagrabber.vercel.app]';
  let clean = filename.replace(/["'\r\n]/g, '_').trim();
  if (clean.startsWith(brandPrefix)) return clean;
  return `${brandPrefix}_${clean}`;
}

async function handleDownloadRequest(
  pageUrl: string,
  directUrl?: string,
  customFilename?: string,
  formatId?: string,
  audioOnly?: boolean
) {
  try {
    // Unwrap target URL and direct URL if proxied
    let actualDirectUrl = directUrl || '';
    while (actualDirectUrl && actualDirectUrl.includes('directUrl=')) {
      try {
        const splitPart = actualDirectUrl.split('directUrl=')[1].split('&')[0];
        const decoded = decodeURIComponent(splitPart);
        if (decoded === actualDirectUrl) break;
        actualDirectUrl = decoded;
      } catch (e) {
        break;
      }
    }

    let targetUrl = actualDirectUrl || pageUrl;
    while (targetUrl && targetUrl.includes('directUrl=')) {
      try {
        const splitPart = targetUrl.split('directUrl=')[1].split('&')[0];
        const decoded = decodeURIComponent(splitPart);
        if (decoded === targetUrl) break;
        targetUrl = decoded;
      } catch (e) {
        break;
      }
    }

    const isDirectAvailable = Boolean(
      actualDirectUrl &&
      actualDirectUrl.trim().length > 0 &&
      !actualDirectUrl.includes('googlevideo.com')
    );

    const isYtStream =
      pageUrl.includes('youtube.com') ||
      pageUrl.includes('youtu.be') ||
      pageUrl.includes('tiktok.com') ||
      pageUrl.includes('vimeo.com') ||
      pageUrl.includes('twitter.com') ||
      pageUrl.includes('x.com') ||
      pageUrl.includes('facebook.com') ||
      (!isDirectAvailable && pageUrl.includes('instagram.com'));

    const isAudio = audioOnly || formatId === 'audio_best' || formatId?.includes('audio') || formatId?.includes('mp3');

    // 1. YouTube/Video stream download via yt-dlp temp file stream
    // Only invoke yt-dlp when no directUrl is available or when directUrl is a protected googlevideo stream
    if (isYtStream && !isDirectAvailable) {
      const ytResult = await downloadWithYtDlp(pageUrl, formatId, isAudio);
      if (ytResult && ytResult.buffer.length > 0) {
        const ext = ytResult.ext || (isAudio ? 'mp3' : 'mp4');
        let safeFilename = customFilename || `media_${Date.now()}.${ext}`;
        if (!safeFilename.endsWith(`.${ext}`)) {
          safeFilename += `.${ext}`;
        }
        const brandedName = formatBrandedFilename(safeFilename);

        const headers = new Headers();
        headers.set('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
        headers.set('Content-Disposition', `attachment; filename="${brandedName}"`);
        headers.set('Content-Length', ytResult.buffer.length.toString());
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        return new NextResponse(new Uint8Array(ytResult.buffer), {
          status: 200,
          headers,
        });
      }

      // If serverless yt-dlp failed or was blocked on this host, do NOT fall through to fetching HTML web page
      return NextResponse.json(
        {
          error:
            'Video stream could not be downloaded via the web server proxy. For direct downloads without cloud rate-limits, please use the Media Grabber Desktop App.',
        },
        { status: 503 }
      );
    }

    // 2. Standard direct media asset / stream proxy fetch
    let fetchUrl = actualDirectUrl || targetUrl;
    if (fetchUrl.startsWith('//')) {
      fetchUrl = `https:${fetchUrl}`;
    }

    const reqHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    if (fetchUrl.includes('instagram.com') || fetchUrl.includes('cdninstagram.com') || fetchUrl.includes('fbcdn.net') || pageUrl.includes('instagram.com')) {
      reqHeaders['Referer'] = 'https://www.instagram.com/';
      reqHeaders['Origin'] = 'https://www.instagram.com';
    }

    if (fetchUrl.includes('twimg.com') || fetchUrl.includes('twitter.com') || fetchUrl.includes('x.com') || pageUrl.includes('twitter.com') || pageUrl.includes('x.com')) {
      reqHeaders['Referer'] = 'https://x.com/';
      reqHeaders['Origin'] = 'https://x.com';
    }

    const response = await fetch(fetchUrl, {
      headers: reqHeaders,
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        const ytResult = await downloadWithYtDlp(pageUrl, formatId, audioOnly);
        if (ytResult && ytResult.buffer.length > 0) {
          const ext = ytResult.ext || (audioOnly ? 'mp3' : 'mp4');
          let safeFilename = customFilename || `media_${Date.now()}.${ext}`;
          if (!safeFilename.endsWith(`.${ext}`)) safeFilename += `.${ext}`;
          const brandedName = formatBrandedFilename(safeFilename);

          const headers = new Headers();
          headers.set('Content-Type', audioOnly ? 'audio/mpeg' : 'video/mp4');
          headers.set('Content-Disposition', `attachment; filename="${brandedName}"`);
          headers.set('Content-Length', ytResult.buffer.length.toString());
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

          return new NextResponse(new Uint8Array(ytResult.buffer), {
            status: 200,
            headers,
          });
        }
      }

      return NextResponse.json(
        { error: `Failed to fetch asset from remote server. Status: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    let filename = customFilename || getFilenameFromUrl(fetchUrl);

    if (!filename.includes('.')) {
      if (contentType.includes('png')) filename += '.png';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) filename += '.jpg';
      else if (contentType.includes('webp')) filename += '.webp';
      else if (contentType.includes('gif')) filename += '.gif';
      else if (contentType.includes('svg')) filename += '.svg';
      else if (contentType.includes('mp4')) filename += '.mp4';
      else if (contentType.includes('mp3')) filename += '.mp3';
      else filename += '.bin';
    }

    const brandedName = formatBrandedFilename(filename);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${brandedName}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    return NextResponse.json(
      { error: `Download failed: ${error.message || error}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageUrl = searchParams.get('url') || '';
  const directUrl = searchParams.get('directUrl') || undefined;
  const filename = searchParams.get('filename') || undefined;
  const formatId = searchParams.get('formatId') || undefined;
  const audioOnly = searchParams.get('audioOnly') === 'true';

  if (!pageUrl && !directUrl) {
    return NextResponse.json({ message: 'Media Grabber Download Proxy Endpoint', status: 'ok' });
  }

  return handleDownloadRequest(pageUrl, directUrl, filename, formatId, audioOnly);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url, directUrl, filename, formatId, audioOnly } = body;
    const pageUrl = url || directUrl || '';

    if (!pageUrl) {
      return NextResponse.json({ error: 'Missing target URL for download' }, { status: 400 });
    }

    return handleDownloadRequest(pageUrl, directUrl, filename, formatId, audioOnly);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process download request' }, { status: 500 });
  }
}
