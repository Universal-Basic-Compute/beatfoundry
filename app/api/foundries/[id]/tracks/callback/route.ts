// @ts-nocheck
import { NextResponse } from 'next/server';
import { createTrack, updateTrackByTaskId } from '@/lib/airtable';

// This endpoint will receive callbacks from SUNO API when music generation is complete
export async function POST(request, { params }) {
  const foundryId = params.id;
  console.log(`[CALLBACK] Received SUNO API callback for foundry ID: ${foundryId}`);
  console.log(`[CALLBACK] Request URL: ${request.url}`);
  console.log(`[CALLBACK] Request headers:`, JSON.stringify(Object.fromEntries([...request.headers.entries()]), null, 2));
  
  try {
    const body = await request.json();
    console.log(`[CALLBACK] Callback body:`, JSON.stringify(body, null, 2));
    
    // Store the generated music URLs in Airtable
    if (body.code === 200 && body.data) {
      console.log(`[CALLBACK] Successful callback with code 200`);
      
      // The structure might be different than expected
      // Let's log the exact structure to understand it better
      console.log('[CALLBACK] Body data structure:', JSON.stringify(body.data, null, 2));
      
      // Extract the taskId from the callback data
      const taskId = body.data.taskId || body.data.task_id || body.taskId || body.task_id;
      console.log(`[CALLBACK] Extracted taskId: ${taskId}`);
      
      // Check different possible structures
      const tracks = Array.isArray(body.data) ? body.data : 
                     body.data?.data && Array.isArray(body.data.data) ? body.data.data : 
                     [body.data]; // Treat as single track if not an array
      
      console.log(`[CALLBACK] Extracted tracks array:`, JSON.stringify(tracks, null, 2));
      
      if (tracks && tracks.length > 0) {
        console.log(`[CALLBACK] Found ${tracks.length} tracks to store`);
        
        // Store each track in Airtable
        for (const track of tracks) {
          try {
            console.log('[CALLBACK] Processing track:', JSON.stringify(track, null, 2));
            
            // Extract track details - handle different possible structures
            const audioUrl = track.audio_url || track.audioUrl || track.url || '';
            const title = track.title || track.name || 'Untitled Track';
            const prompt = track.prompt || track.description || '';
            
            console.log('[CALLBACK] Extracted track details:');
            console.log(`[CALLBACK] - Title: "${title}"`);
            console.log(`[CALLBACK] - Audio URL: "${audioUrl}"`);
            console.log(`[CALLBACK] - Prompt: "${prompt}"`);
            
            if (!audioUrl) {
              console.error('[CALLBACK] No audio URL found in track data');
              continue;
            }
            
            // Get the lyrics from the track data or use a placeholder
            const lyrics = track.lyrics || prompt || "No lyrics available";
            console.log(`[CALLBACK] - Lyrics: "${lyrics.substring(0, 100)}${lyrics.length > 100 ? '...' : ''}"`);
            
            // Try to update existing track by taskId first
            if (taskId) {
              console.log(`[CALLBACK] Attempting to update existing track with TaskId: ${taskId}`);
              const updatedTrack = await updateTrackByTaskId(taskId, audioUrl);
              
              if (updatedTrack) {
                console.log(`[CALLBACK] Successfully updated track with TaskId ${taskId}`);
                continue; // Skip creating a new track
              }
            }
            
            console.log(`[CALLBACK] Creating new track in Airtable: ${title}, URL: ${audioUrl}`);
            
            // Store in Airtable
            const createdTrack = await createTrack(
              foundryId,
              title,
              prompt,
              lyrics,
              audioUrl,
              taskId // Save the taskId with the new track
            );
            
            console.log(`[CALLBACK] Successfully stored track "${title}" in Airtable:`);
            console.log(`[CALLBACK] - Track ID: ${createdTrack.id}`);
            console.log(`[CALLBACK] - Track Name: ${createdTrack.name}`);
            console.log(`[CALLBACK] - Track URL saved to Airtable: ${createdTrack.url}`);
            
            // Download the track
            try {
              console.log(`[CALLBACK] Downloading track: ${createdTrack.name}`);
              
              const downloadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://beatsfoundry.vercel.app'}/api/foundries/${foundryId}/tracks/download`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  trackId: createdTrack.id,
                  audioUrl: audioUrl,
                  title: title
                }),
              });
              
              if (!downloadResponse.ok) {
                console.error(`[CALLBACK] Error downloading track:`, await downloadResponse.text());
              } else {
                const downloadData = await downloadResponse.json();
                console.log(`[CALLBACK] Successfully downloaded track to ${downloadData.url}`);
              }
            } catch (downloadError) {
              console.error(`[CALLBACK] Error downloading track:`, downloadError);
              // Continue anyway, we still have the original URL
            }
          } catch (trackError) {
            console.error('[CALLBACK] Error storing track in Airtable:', trackError);
          }
        }
      } else {
        console.warn('[CALLBACK] No tracks found in callback data');
      }
    } else {
      console.warn('[CALLBACK] Invalid callback data structure or error code:', body.code);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CALLBACK] Error processing SUNO API callback:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
