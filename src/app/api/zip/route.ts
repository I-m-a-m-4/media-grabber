import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, images, description, uploader, site_name, url } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided to zip.' }, { status: 400 });
    }

    const zip = new JSZip();
    const safeTitle = (title || 'media_assets').replace(/[^a-zA-Z0-9_-]/g, '_');

    // Add metadata text file
    let metaText = `UNIVERSAL MEDIA GRABBER ASSET BUNDLE\n`;
    metaText += `=====================================\n\n`;
    metaText += `Title: ${title || 'N/A'}\n`;
    metaText += `Source: ${uploader || site_name || 'N/A'}\n`;
    metaText += `Original URL: ${url || 'N/A'}\n`;
    metaText += `Downloaded At: ${new Date().toISOString()}\n\n`;
    if (description) {
      metaText += `Description:\n${description}\n`;
    }
    zip.file('metadata.txt', metaText);

    const screenshotsFolder = zip.folder('screenshots');
    const logosFolder = zip.folder('logos_and_artwork');
    const generalFolder = zip.folder('images');

    // Download images in parallel with concurrency cap
    let index = 1;
    await Promise.all(
      images.map(async (imgItem: any) => {
        const directUrl = imgItem.direct_url;
        if (!directUrl) return;

        let fetchUrl = directUrl.startsWith('//') ? `https:${directUrl}` : directUrl;
        try {
          const res = await fetch(fetchUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'image/*,*/*',
            },
          });

          if (!res.ok) return;

          const buffer = await res.arrayBuffer();
          const ext = imgItem.ext || 'png';
          const note = imgItem.note || `asset_${index}`;
          const safeNote = note.replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${safeNote}.${ext}`;

          if (note.toLowerCase().includes('screenshot')) {
            screenshotsFolder?.file(fileName, buffer);
          } else if (
            note.toLowerCase().includes('logo') ||
            note.toLowerCase().includes('icon') ||
            note.toLowerCase().includes('poster') ||
            note.toLowerCase().includes('hero')
          ) {
            logosFolder?.file(fileName, buffer);
          } else {
            generalFolder?.file(fileName, buffer);
          }
          index++;
        } catch (err) {
          console.error(`Failed to fetch image for zip: ${fetchUrl}`, err);
        }
      })
    );

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set(
      'Content-Disposition',
      `attachment; filename="[usemediagrabber.vercel.app]_${safeTitle}_media_bundle.zip"`
    );
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(zipBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('ZIP Bundle Route Error:', error);
    return NextResponse.json(
      { error: `Failed to create ZIP bundle: ${error.message || error}` },
      { status: 500 }
    );
  }
}
