import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, formatId, audioOnly, directUrl } = await request.json();

    if (!url && !directUrl) {
      return NextResponse.json({ error: 'URL or directUrl is required' }, { status: 400 });
    }

    const targetUrl = directUrl || url;

    return NextResponse.json({
      message: `Download initiated for ${targetUrl}`,
      url: targetUrl,
      formatId: formatId || null,
      audioOnly: !!audioOnly,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
