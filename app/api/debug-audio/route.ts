import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Local-only debug aid: saves a copy of the recorded exam audio to disk so
// it can be listened to directly, independent of what the backend does with
// it (the backend transcribes and deletes it, so there's otherwise no way
// to verify what was actually captured). Not part of the exam data pipeline.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const debugDir = path.join(process.cwd(), 'debug-audio');
  await mkdir(debugDir, { recursive: true });

  const ext = (audio.name.split('.').pop() || 'webm').replace(/[^a-z0-9]/gi, '');
  const filename = `recording-${Date.now()}.${ext}`;
  const filePath = path.join(debugDir, filename);

  const buffer = Buffer.from(await audio.arrayBuffer());
  await writeFile(filePath, buffer);

  return NextResponse.json({ saved: filename, sizeBytes: buffer.length });
}
