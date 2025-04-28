import { NextRequest, NextResponse } from 'next/server';
import { createTrack, updateTrackByTaskId } from '@/lib/airtable';

export async function POST(request: NextRequest, { params }: any) {
  const foundryId = params.id;
  
  console.log(`[SAVE-STATUS] Saving tracks from status response for foundry ID: ${foundryId}`);
  
  try {
    const body = await request.json();
    console.log(`[SAVE-STATUS] Request body:`, JSON.stringify(body, null, 2));
    
    const { taskId, tracks } = body;
    
    if (!taskId || !tracks || !Array.isArray(tracks)) {
      console.error(`[SAVE-STATUS] Invalid request body: missing taskId or tracks array`);
      return NextResponse.json(
        { error: 'Invalid request body: missing taskId or tracks array' },
        { status: 400 }
      );
    }
    
    console.log(`[SAVE-STATUS] Processing ${tracks.length} tracks for taskId: ${taskId}`);
    
    const savedTracks = [];
    
    for (const track of tracks) {
      try {
        console.log(`[SAVE-STATUS] Processing track:`, JSON.stringify(track, null, 2));
        
        // Extract track details
        const audioUrl = track.audioUrl || track.audio_url || track.sourceAudioUrl || '';
        const title = track.title || 'Untitled Track';
        const prompt = track.prompt || '';
        
        if (!audioUrl) {
          console.error(`[SAVE-STATUS] No audio URL found in track data`);
          continue;
        }
        
        console.log(`[SAVE-STATUS] Extracted track details:`);
        console.log(`[SAVE-STATUS] - Title: "${title}"`);
        console.log(`[SAVE-STATUS] - Audio URL: "${audioUrl}"`);
        
        // Try to update existing track by taskId first
        console.log(`[SAVE-STATUS] Attempting to update existing track with TaskId: ${taskId}`);
        const updatedTrack = await updateTrackByTaskId(taskId, audioUrl);
        
        if (updatedTrack) {
          console.log(`[SAVE-STATUS] Successfully updated track with TaskId ${taskId}`);
          savedTracks.push(updatedTrack);
        } else {
          // If no existing track found, create a new one
          console.log(`[SAVE-STATUS] No existing track found, creating new track`);
          const createdTrack = await createTrack(
            foundryId,
            title,
            prompt,
            prompt, // Use prompt as lyrics if no lyrics provided
            audioUrl,
            taskId
          );
          
          console.log(`[SAVE-STATUS] Successfully created new track: ${createdTrack.id}`);
          savedTracks.push(createdTrack);
        }
      } catch (trackError) {
        console.error(`[SAVE-STATUS] Error processing track:`, trackError);
      }
    }
    
    console.log(`[SAVE-STATUS] Successfully saved ${savedTracks.length} tracks`);
    
    return NextResponse.json({ 
      success: true,
      saved_tracks: savedTracks.length,
      tracks: savedTracks
    });
  } catch (error) {
    console.error(`[SAVE-STATUS] Error saving tracks from status:`, error);
    return NextResponse.json(
      { error: 'Failed to save tracks from status' },
      { status: 500 }
    );
  }
}
