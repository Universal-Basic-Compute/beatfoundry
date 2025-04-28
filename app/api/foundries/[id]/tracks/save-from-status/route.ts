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
    
        // For multiple tracks from the same task, create a unique title for each
        const uniqueTitle = tracks.length > 1 
          ? `${title} (Version ${tracks.indexOf(track) + 1})` 
          : title;
    
        // For the first track, try to update existing track by taskId
        if (tracks.indexOf(track) === 0) {
          console.log(`[SAVE-STATUS] Attempting to update existing track with TaskId: ${taskId}`);
          const updatedTrack = await updateTrackByTaskId(taskId, audioUrl);
      
          if (updatedTrack) {
            console.log(`[SAVE-STATUS] Successfully updated track with TaskId ${taskId}`);
            savedTracks.push(updatedTrack);
        
            // Download the track
            try {
              console.log(`[SAVE-STATUS] Downloading track: ${updatedTrack.name}`);
          
              const downloadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://beatfoundry.vercel.app'}/api/foundries/${foundryId}/tracks/download`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  trackId: updatedTrack.id,
                  audioUrl: audioUrl,
                  title: uniqueTitle
                }),
              });
          
              if (!downloadResponse.ok) {
                console.error(`[SAVE-STATUS] Error downloading track:`, await downloadResponse.text());
              } else {
                const downloadData = await downloadResponse.json();
                console.log(`[SAVE-STATUS] Successfully downloaded track to ${downloadData.url}`);
            
                // Update the track object with the new URL
                updatedTrack.url = downloadData.url;
              }
            } catch (downloadError) {
              console.error(`[SAVE-STATUS] Error downloading track:`, downloadError);
              // Continue anyway, we still have the original URL
            }
        
            continue; // Skip creating a new track for the first one
          }
        }
    
        // If no existing track found or this is not the first track, create a new one
        console.log(`[SAVE-STATUS] Creating new track in Airtable: ${uniqueTitle}`);
        const createdTrack = await createTrack(
          foundryId,
          uniqueTitle,
          prompt,
          prompt, // Use prompt as lyrics if no lyrics provided
          audioUrl,
          tracks.indexOf(track) === 0 ? taskId : null // Only save taskId for the first track
        );
            
          console.log(`[SAVE-STATUS] Successfully created new track: ${createdTrack.id}`);
          savedTracks.push(createdTrack);
            
          // Download the track
          try {
            console.log(`[SAVE-STATUS] Downloading track: ${createdTrack.name}`);
              
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
              console.error(`[SAVE-STATUS] Error downloading track:`, await downloadResponse.text());
            } else {
              const downloadData = await downloadResponse.json();
              console.log(`[SAVE-STATUS] Successfully downloaded track to ${downloadData.url}`);
                
              // Update the track object with the new URL
              createdTrack.url = downloadData.url;
            }
          } catch (downloadError) {
            console.error(`[SAVE-STATUS] Error downloading track:`, downloadError);
            // Continue anyway, we still have the original URL
          }
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
