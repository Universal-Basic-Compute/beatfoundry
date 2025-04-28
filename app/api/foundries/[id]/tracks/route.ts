import { NextRequest, NextResponse } from 'next/server';
import { sendChannelMessage } from '@/lib/kinos-messages-api';

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
      "Respond only with a JSON object containing: 1) 'prompt': a detailed prompt for the music model (including style, sonorities, emotions), and 2) 'lyrics': complete lyrics for the track. Format your response as valid JSON without any additional text.";
    
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
    
    return NextResponse.json(messageResponse);
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
          lyrics: "DIGITAL RAIN\n\nVerse 1:\nSilent codes falling through the night\nPixels dancing in electric light\nMemories stored in clouds above\nData streams flowing like forgotten love\n\nChorus:\nDigital rain washing over me\nCleansing my soul algorithmically\nBits and bytes of a life redesigned\nIn this downpour, I leave the past behind\n\nVerse 2:\nSignals crossing in the atmosphere\nWhispered secrets only machines can hear\nPatterns forming in the binary sea\nA new world emerging for you and me\n\n[Repeat Chorus]\n\nBridge:\nIn the space between the ones and zeros\nWe find ourselves becoming digital heroes\nRewritten, reformatted, reborn anew\nIn this synthetic storm, we break on through\n\n[Final Chorus]\nDigital rain washing over me\nCleansing my soul algorithmically\nBits and bytes of a life redesigned\nIn this downpour, I finally shine"
        }),
        timestamp: new Date().toISOString(),
        channel_id: "tracks"
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to create track' },
      { status: 500 }
    );
  }
}
