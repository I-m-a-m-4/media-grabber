import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url, formatId, audioOnly, directUrl } = body;

    if (!url && !directUrl) {
      return NextResponse.json({ message: 'Media Grabber Download Endpoint', status: 'ok' });
    }

    const targetUrl = directUrl || url;

    return NextResponse.json({
      message: `Download initiated for ${targetUrl}`,
      url: targetUrl,
      formatId: formatId || null,
      audioOnly: !!audioOnly,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Media Grabber Download Endpoint', status: 'ok' });
  }
}
