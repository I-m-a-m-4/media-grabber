import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json({ message: 'Media Grabber Process Endpoint', status: 'ok' });
    }

    return NextResponse.json({
      message: 'Audio extraction initiated.',
    });
  } catch (error) {
    return NextResponse.json({ message: 'Media Grabber Process Endpoint', status: 'ok' });
  }
}
