import { NextRequest, NextResponse } from 'next/server';
import { createTrack } from '@/lib/airtable';

// This endpoint will receive callbacks from SUNO API when music generation is complete
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const foundryId = params.id;
  
  try {
    const body = await request.json();
    console.log(`Received SUNO API callback for foundry ${foundryId}:`, JSON.stringify(body, null, 2));
    
    // Store the generated music URLs in Airtable
    if (body.code === 200 && body.data) {
      // The structure might be different than expected
      // Let's log the exact structure to understand it better
      console.log('Body data structure:', JSON.stringify(body.data, null, 2));
      
      // Check different possible structures
      const tracks = body.data.data || body.data || [];
      
      if (tracks && tracks.length > 0) {
        console.log(`Found ${tracks.length} tracks to store`);
        
        // Store each track in Airtable
        for (const track of tracks) {
          try {
            console.log('Processing track:', JSON.stringify(track, null, 2));
            
            // Extract track details - handle different possible structures
            const audioUrl = track.audio_url || track.audioUrl || track.url || '';
            const title = track.title || 'Untitled Track';
            const prompt = track.prompt || '';
            
            if (!audioUrl) {
              console.error('No audio URL found in track data');
              continue;
            }
            
            // Get the lyrics from the track data or use a placeholder
            const lyrics = track.lyrics || prompt || "No lyrics available";
            
            console.log(`Creating track in Airtable: ${title}, URL: ${audioUrl}`);
            
            // Store in Airtable
            const createdTrack = await createTrack(
              foundryId,
              title,
              prompt,
              lyrics,
              audioUrl
            );
            
            console.log(`Successfully stored track "${title}" in Airtable:`, createdTrack);
          } catch (trackError) {
            console.error('Error storing track in Airtable:', trackError);
          }
        }
      } else {
        console.warn('No tracks found in callback data');
      }
    } else {
      console.warn('Invalid callback data structure or error code:', body.code);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing SUNO API callback:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
