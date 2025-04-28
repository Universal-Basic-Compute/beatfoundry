import { NextRequest, NextResponse } from 'next/server';
import { sendChannelMessage } from '@/lib/kinos-messages-api';
import { generateMusic } from '@/lib/suno-api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const foundryId = params.id;
  const body = await request.json();
  
  if (!body.content) {
    return NextResponse.json(
      { error: 'Message content is required' },
      { status: 400 }
    );
  }
  
  try {
    // Add instructions to respond with JSON containing prompt and lyrics
    const trackInstructions = 
      "Respond only with a JSON object containing: 1) 'prompt': a detailed prompt for the music model (including style, sonorities, emotions), 2) 'style': a specific music genre or style (e.g., 'Jazz', 'Classical', 'Electronic'), 3) 'title': a creative title for the track, and 4) 'lyrics': complete lyrics for the track. Format your response as valid JSON without any additional text.";
    
    const messageResponse = await sendChannelMessage(
      foundryId,
      'tracks', // Channel ID for tracks
      body.content,
      {
        mode: 'creative',
        addSystem: trackInstructions,
        historyLength: 10,
      }
    );
    
    // Parse the response content to get the music generation parameters
    let musicParams;
    try {
      // The content might be a JSON string
      if (typeof messageResponse.content === 'string') {
        musicParams = JSON.parse(messageResponse.content);
      } else {
        musicParams = messageResponse.content;
      }
      
      // Validate the required fields
      if (!musicParams.prompt || !musicParams.style || !musicParams.title || !musicParams.lyrics) {
        throw new Error('Missing required music parameters');
      }
    } catch (parseError) {
      console.error('Error parsing music parameters:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse music parameters from AI response' },
        { status: 500 }
      );
    }
    
    // Generate music with SUNO API
    let musicResponse;
    try {
      // Use the server's URL for the callback
      const host = request.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      const callbackUrl = `${protocol}://${host}/api/foundries/${foundryId}/tracks/callback`;
      
      musicResponse = await generateMusic(
        musicParams.lyrics, // Use lyrics as the prompt for SUNO
        musicParams.style,
        musicParams.title,
        false, // Not instrumental since we're using lyrics
        callbackUrl
      );
    } catch (musicError) {
      console.error('Error generating music:', musicError);
      // Continue without music generation in case of error
    }
    
    // Return the combined response
    return NextResponse.json({
      ...messageResponse,
      music_task_id: musicResponse?.data?.task_id,
      music_parameters: {
        prompt: musicParams.prompt,
        style: musicParams.style,
        title: musicParams.title,
        lyrics: musicParams.lyrics
      }
    });
  } catch (error) {
    console.error('Error in POST /api/foundries/[id]/tracks:', error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        id: `mock-track-${Date.now()}`,
        status: "completed",
        role: "assistant",
        content: JSON.stringify({
          prompt: "Create an electronic ambient track with deep bass, ethereal synth pads, and a slow evolving melody. The mood should be introspective and slightly melancholic, with occasional moments of hope breaking through. Include subtle field recordings of rain and distant thunder to create atmosphere.",
          style: "Electronic Ambient",
          title: "Digital Rain",
          lyrics: "DIGITAL RAIN\n\nVerse 1:\nSilent codes falling through the night\nPixels dancing in electric light\nMemories stored in clouds above\nData streams flowing like forgotten love\n\nChorus:\nDigital rain washing over me\nCleansing my soul algorithmically\nBits and bytes of a life redesigned\nIn this downpour, I leave the past behind\n\nVerse 2:\nSignals crossing in the atmosphere\nWhispered secrets only machines can hear\nPatterns forming in the binary sea\nA new world emerging for you and me\n\n[Repeat Chorus]\n\nBridge:\nIn the space between the ones and zeros\nWe find ourselves becoming digital heroes\nRewritten, reformatted, reborn anew\nIn this synthetic storm, we break on through\n\n[Final Chorus]\nDigital rain washing over me\nCleansing my soul algorithmically\nBits and bytes of a life redesigned\nIn this downpour, I finally shine"
        }),
        timestamp: new Date().toISOString(),
        channel_id: "tracks",
        music_task_id: `mock-task-${Date.now()}`,
        music_parameters: {
          prompt: "Create an electronic ambient track with deep bass, ethereal synth pads, and a slow evolving melody.",
          style: "Electronic Ambient",
          title: "Digital Rain",
          lyrics: "DIGITAL RAIN\n\nVerse 1:\nSilent codes falling through the night\nPixels dancing in electric light..."
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to create track' },
      { status: 500 }
    );
  }
}
