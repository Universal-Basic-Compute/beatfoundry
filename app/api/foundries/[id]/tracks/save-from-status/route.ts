import { NextRequest, NextResponse } from 'next/server';
import { createTrack, updateTrackByTaskId } from '@/lib/airtable';

export async function POST(request: NextRequest, { params }: any) {
  const { id: foundryId } = params;
  
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
        
        // Extract track details more carefully
        const audioUrl = track.audioUrl || track.audio_url || track.sourceAudioUrl || '';
        const title = track.title || 'Untitled Track';
        
        // Make sure we extract prompt and lyrics correctly
        let prompt = '';
        let lyrics = '';

        // First, check if we have dedicated fields
        if (track.prompt) {
          prompt = track.prompt;
        }

        if (track.lyrics) {
          lyrics = track.lyrics;
        }

        // If we only have prompt but it looks like lyrics, move it to lyrics field
        if (prompt && !lyrics) {
          // Check if the prompt looks like lyrics (has line breaks, verse markers, etc.)
          if (prompt.includes('\n') || 
              /verse|chorus|bridge|intro|outro/i.test(prompt)) {
            lyrics = prompt;
            // Set a generic prompt instead
            prompt = 'Music generated from these lyrics';
          }
        }

        // If we have neither, use any available text field
        if (!prompt && !lyrics) {
          if (track.text) {
            // Determine if it's lyrics or a prompt
            if (track.text.includes('\n') || 
                /verse|chorus|bridge|intro|outro/i.test(track.text)) {
              lyrics = track.text;
              prompt = 'Music generated from these lyrics';
            } else {
              prompt = track.text;
            }
          }
        }

        // Ensure we have at least something in both fields
        if (!prompt && lyrics) {
          prompt = 'Music generated from these lyrics';
        }

        if (!lyrics && prompt) {
          // Don't automatically create lyrics from a prompt
          lyrics = '';
        }

        if (!audioUrl) {
          console.error(`[SAVE-STATUS] No audio URL found in track data`);
          continue;
        }
    
        console.log(`[SAVE-STATUS] Extracted track details:`);
        console.log(`[SAVE-STATUS] - Title: "${title}"`);
        console.log(`[SAVE-STATUS] - Audio URL: "${audioUrl}"`);
        console.log(`[SAVE-STATUS] - Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
        console.log(`[SAVE-STATUS] - Lyrics: "${lyrics.substring(0, 100)}${lyrics.length > 100 ? '...' : ''}"`);
    
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
              
              // Determine the base URL for the API call
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://beatfoundry.vercel.app');

              console.log(`[SAVE-STATUS] Using base URL for download: ${baseUrl}`);
          
              const downloadResponse = await fetch(`${baseUrl}/api/foundries/${foundryId}/tracks/download`, {
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
    
        // Prevent duplicate processing of the same track
        if (savedTracks.some(saved => saved.url === audioUrl)) {
          console.log(`[SAVE-STATUS] Skipping duplicate track with URL: ${audioUrl}`);
          continue;
        }
    
        const createdTrack = await createTrack(
          foundryId,
          uniqueTitle,
          prompt,  // Use the properly extracted prompt
          lyrics,  // Use the properly extracted lyrics
          audioUrl,
          tracks.indexOf(track) === 0 ? taskId : null // Only save taskId for the first track
        );
        
        console.log(`[SAVE-STATUS] Successfully created new track: ${createdTrack.id}`);
        savedTracks.push(createdTrack);
        
        // Generate a cover image for the track
        try {
          console.log(`[SAVE-STATUS] Generating cover image for track: ${createdTrack.id}`);
          
          // Create a prompt for the cover image based on the track details
          const coverPrompt = `Album cover art for a song titled "${uniqueTitle}". ${
            prompt ? `The music is described as: ${prompt}` : ''
          }. Create a visually striking, professional album cover that captures the essence of the music.`;
          
          console.log(`[SAVE-STATUS] Cover image prompt: "${coverPrompt}"`);
          
          // Get the base URL from the request
          const host = request.headers.get('host') || 'localhost:3001';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const baseUrl = `${protocol}://${host}`;
          
          const coverResponse = await fetch(`${baseUrl}/api/foundries/${foundryId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              trackId: createdTrack.id,
              prompt: coverPrompt,
              title: uniqueTitle
            }),
          });
          
          if (!coverResponse.ok) {
            console.error(`[SAVE-STATUS] Error generating cover image:`, await coverResponse.text());
          } else {
            const coverData = await coverResponse.json();
            console.log(`[SAVE-STATUS] Successfully generated cover image: ${coverData.cover_url}`);
          }
        } catch (coverError) {
          console.error(`[SAVE-STATUS] Error generating cover image:`, coverError);
          // Continue anyway, the cover is optional
        }
            
        // Download the track
        try {
          console.log(`[SAVE-STATUS] Downloading track: ${createdTrack.name}`);
          
          // Get the base URL from the request
          const host = request.headers.get('host') || 'localhost:3001';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const baseUrl = `${protocol}://${host}`;

          console.log(`[SAVE-STATUS] Using base URL for download: ${baseUrl}`);
              
          const downloadResponse = await fetch(`${baseUrl}/api/foundries/${foundryId}/tracks/download`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              trackId: createdTrack.id,
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
            createdTrack.url = downloadData.url;
          }
        } catch (downloadError) {
          console.error(`[SAVE-STATUS] Error downloading track:`, downloadError);
          // Continue anyway, we still have the original URL
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
