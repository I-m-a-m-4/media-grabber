import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const url = rawUrl.trim();
  const domain = new URL(url).hostname || 'web-source';

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

  // Detect App Store / Play Store
  const isAppStore = domain.includes('apps.apple.com') || domain.includes('play.google.com');

  const security = {
    is_safe: true,
    risk_level: url.startsWith('https') ? 'safe' : 'caution',
    domain,
    protocol: url.startsWith('https') ? 'https' : 'http',
    category: isAppStore ? 'app_store' : 'web_page',
    warnings: url.startsWith('https') ? [] : ['Unencrypted HTTP link detected.'],
    file_extension: null,
  };

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = await res.text();

    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"/i);
    const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);

    const title = titleMatch ? titleMatch[1] : 'Web Page Asset';
    const description = descMatch ? descMatch[1] : undefined;
    const thumbnail = imgMatch ? imgMatch[1] : undefined;

    const images: any[] = [];
    if (thumbnail) {
      images.push({
        format_id: 'og_header_img',
        ext: 'jpg',
        resolution: 'Page Header Image',
        vcodec: 'none',
        acodec: 'none',
        direct_url: thumbnail,
        asset_type: 'image',
        note: 'Primary Image Asset',
      });
    }

    return NextResponse.json({
      title,
      description,
      thumbnail,
      duration: null,
      uploader: domain,
      site_name: isAppStore ? 'App Store Listing' : 'Web Media Source',
      formats: [],
      images,
      security,
    });
  } catch (err: any) {
    return NextResponse.json({
      title: 'Web Asset',
      description: 'Extracted via Web Fallback',
      formats: [],
      images: [],
      security,
    });
  }
}
