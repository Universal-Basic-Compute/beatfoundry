import { NextRequest, NextResponse } from 'next/server';
import { updateTrackUrl } from '@/lib/airtable';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: NextRequest, { params }: any) {
  const foundryId = params.id;
  
  console.log(`[DOWNLOAD] Downloading track for foundry ID: ${foundryId}`);
  
  try {
    const body = await request.json();
    console.log(`[DOWNLOAD] Request body:`, JSON.stringify(body, null, 2));
    
    const { trackId, audioUrl, title } = body;
    
    if (!trackId || !audioUrl) {
      console.error(`[DOWNLOAD] Invalid request body: missing trackId or audioUrl`);
      return NextResponse.json(
        { error: 'Invalid request body: missing trackId or audioUrl' },
        { status: 400 }
      );
    }
    
    // Create directory if it doesn't exist
    const songsDir = path.join(process.cwd(), 'public', 'songs');
    await mkdir(songsDir, { recursive: true });
    
    // Generate a safe filename from the title
    const safeTitle = title
      ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'track';
    
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${safeTitle}_${timestamp}.mp3`;
    const filePath = path.join(songsDir, filename);
    const publicUrl = `/songs/${filename}`;
    
    console.log(`[DOWNLOAD] Downloading from ${audioUrl} to ${filePath}`);
    
    // Fetch the audio file
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      console.error(`[DOWNLOAD] Failed to download audio: ${response.status}`);
      return NextResponse.json(
        { error: `Failed to download audio: ${response.status}` },
        { status: 500 }
      );
    }
    
    // Get the audio data as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write the file
    fs.writeFileSync(filePath, buffer);
    console.log(`[DOWNLOAD] File saved to ${filePath}`);
    
    // Update the track URL in Airtable
    const updatedTrack = await updateTrackUrl(trackId, publicUrl);
    console.log(`[DOWNLOAD] Updated track URL in Airtable: ${publicUrl}`);
    
    return NextResponse.json({
      success: true,
      track: updatedTrack,
      url: publicUrl
    });
  } catch (error) {
    console.error(`[DOWNLOAD] Error downloading track:`, error);
    return NextResponse.json(
      { error: 'Failed to download track' },
      { status: 500 }
    );
  }
}
