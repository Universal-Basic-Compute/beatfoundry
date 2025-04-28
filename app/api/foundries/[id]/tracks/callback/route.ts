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
    console.log(`Received SUNO API callback for foundry ${foundryId}:`, body);
    
    // Store the generated music URLs in Airtable
    if (body.code === 200 && body.data) {
      const tracks = body.data.data;
      
      if (tracks && tracks.length > 0) {
        console.log('Generated tracks:', tracks);
        
        // Store each track in Airtable
        for (const track of tracks) {
          try {
            // Extract track details
            const {
              audio_url,
              title,
              prompt,
              tags,
              duration,
            } = track;
            
            // Get the lyrics from the request metadata
            // This assumes we've stored the track parameters somewhere
            // For now, we'll use a placeholder
            const lyrics = prompt || "No lyrics available";
            
            // Store in Airtable
            await createTrack(
              foundryId,
              title,
              prompt,
              lyrics,
              audio_url
            );
            
            console.log(`Stored track "${title}" in Airtable`);
          } catch (trackError) {
            console.error('Error storing track:', trackError);
          }
        }
      }
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
