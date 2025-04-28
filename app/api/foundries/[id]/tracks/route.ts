// @ts-nocheck
import { NextResponse } from 'next/server';
import { sendChannelMessage } from '@/lib/kinos-messages-api';
import { generateMusic } from '@/lib/suno-api';
import { getTracksByFoundryId, createTrack } from '@/lib/airtable';

async function checkMusicGenerationStatus(taskId: string) {
  console.log(`[TRACKS] Checking music generation status for task ID: ${taskId}`);
  
  const url = `https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      console.error(`[TRACKS] Error response from status API: ${response.status}`);
      const errorText = await response.text();
      console.error(`[TRACKS] Error details: ${errorText}`);
      throw new Error(`Failed to check music generation status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[TRACKS] Status check response:`, data);
    
    return data;
  } catch (error) {
    console.error('[TRACKS] Error checking music generation status:', error);
    throw error;
  }
}

// Add a GET method to fetch tracks
export async function GET(request, { params }) {
  const foundryId = params.id;
  
  try {
    const tracks = await getTracksByFoundryId(foundryId);
    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json([
        {
          id: 'mock-track-1',
          name: 'Digital Rain',
          prompt: 'Create an electronic ambient track with deep bass',
          lyrics: 'Digital rain washing over me...',
          url: 'https://example.com/track1.mp3',
          createdAt: new Date().toISOString(),
          foundryId,
        },
        {
          id: 'mock-track-2',
          name: 'Neon Dreams',
          prompt: 'A synthwave track with retro vibes',
          lyrics: 'In the glow of neon lights...',
          url: 'https://example.com/track2.mp3',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          foundryId,
        },
      ]);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const foundryId = params.id;
  console.log(`[TRACKS] Starting track creation for foundry ID: ${foundryId}`);
  
  const body = await request.json();
  console.log(`[TRACKS] Request body:`, body);
  
  if (!body.content) {
    console.log(`[TRACKS] Error: Message content is required`);
    return NextResponse.json(
      { error: 'Message content is required' },
      { status: 400 }
    );
  }
  
  // Extract the instrumental parameter, default to false if not provided
  const instrumental = body.instrumental === true;
  console.log(`[TRACKS] Instrumental mode: ${instrumental}`);
  
  try {
    // Check if this is from autonomous thinking
    const fromThinking = body.fromThinking === true;
    console.log(`[TRACKS] From autonomous thinking: ${fromThinking}`);
    
    // If this is from autonomous thinking, use a more specific instruction
    const trackInstructions = fromThinking
      ? (instrumental
          ? "You are receiving thoughts from an AI musician's autonomous thinking process. Create a JSON object containing: 1) 'prompt': a brief list of keywords for style, sonorities, and emotions (no more than 10-15 words total) based on these thoughts, 2) 'style': a specific music genre or style that fits the thoughts, 3) 'title': a creative title for the track inspired by the thoughts, and 4) 'presentation': a brief artistic explanation of the concept behind this track (2-3 sentences). Format your response as valid JSON without any additional text. This will be an instrumental track without lyrics."
          : "You are receiving thoughts from an AI musician's autonomous thinking process. Create a JSON object containing: 1) 'prompt': a brief list of keywords for style, sonorities, and emotions (no more than 10-15 words total) based on these thoughts, 2) 'style': a specific music genre or style that fits the thoughts, 3) 'title': a creative title for the track inspired by the thoughts, 4) 'presentation': a brief artistic explanation of the concept behind this track (2-3 sentences), and 5) 'lyrics': complete lyrics for the track that reflect the thoughts. Format your response as valid JSON without any additional text.")
      : (instrumental
          ? "Respond only with a JSON object containing: 1) 'prompt': a brief list of keywords for style, sonorities, and emotions (no more than 10-15 words total), 2) 'style': a specific music genre or style (e.g., 'Jazz', 'Classical', 'Electronic'), 3) 'title': a creative title for the track, and 4) 'presentation': a brief artistic explanation of the concept behind this track (2-3 sentences). Format your response as valid JSON without any additional text. This will be an instrumental track without lyrics."
          : "Respond only with a JSON object containing: 1) 'prompt': a brief list of keywords for style, sonorities, and emotions (no more than 10-15 words total), 2) 'style': a specific music genre or style (e.g., 'Jazz', 'Classical', 'Electronic'), 3) 'title': a creative title for the track, 4) 'presentation': a brief artistic explanation of the concept behind this track (2-3 sentences), and 5) 'lyrics': complete lyrics for the track. Format your response as valid JSON without any additional text.");
    
    console.log(`[TRACKS] Sending message to 'tracks' channel with instructions`);
  
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
    
    console.log(`[TRACKS] Received response from channel:`, messageResponse);
    
    // Parse the response as JSON parameters
    let musicParams;
    
    try {
      console.log(`[TRACKS] Parsing music parameters from response content:`, messageResponse.content);
      
      // The content might be a string or an object
      if (typeof messageResponse.content === 'string') {
        musicParams = JSON.parse(messageResponse.content);
      } else {
        musicParams = messageResponse.content;
      }
      
      console.log(`[TRACKS] Parsed music parameters:`, musicParams);
      
      // Validate the required fields
      if (!musicParams.prompt || !musicParams.style || !musicParams.title) {
        console.log(`[TRACKS] Error: Missing required music parameters`);
        throw new Error('Missing required music parameters');
      }
      
      // If we have a presentation, add it as a message
      if (musicParams.presentation) {
        try {
          console.log(`[TRACKS] Adding presentation as a message: "${musicParams.presentation}"`);
          
          // Format the presentation message
          const presentationMessage = `**Song Concept: ${musicParams.title}**\n\n${musicParams.presentation}\n\n*Style: ${musicParams.style}*`;
          
          // Add the presentation as a message from the assistant
          await sendChannelMessage(
            foundryId,
            'general', // Use the general channel for the presentation
            presentationMessage,
            {
              mode: 'creative',
            }
          );
          
          console.log(`[TRACKS] Successfully added presentation as a message`);
        } catch (messageError) {
          console.error(`[TRACKS] Error adding presentation as a message:`, messageError);
          // Continue anyway, don't fail the request
        }
      }
    } catch (parseError) {
      console.error(`[TRACKS] Error parsing music parameters:`, parseError);
      return NextResponse.json(
        { error: 'Failed to parse music parameters from AI response' },
        { status: 500 }
      );
    }
    
    // Generate music with SUNO API
    let musicResponse;
    try {
      // Use the production URL for the callback in production
      let callbackUrl;
      if (process.env.NODE_ENV === 'production') {
        callbackUrl = `https://beatfoundry.vercel.app/api/foundries/${foundryId}/tracks/callback`;
      } else {
        // For development, use the server's URL
        const host = request.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        callbackUrl = `${protocol}://${host}/api/foundries/${foundryId}/tracks/callback`;
      }
      console.log(`[TRACKS] Callback URL for SUNO API: ${callbackUrl}`);
      
      console.log(`[TRACKS] Calling SUNO API to generate music`);
      musicResponse = await generateMusic(
        musicParams.lyrics || musicParams.prompt, // Use lyrics if available, otherwise use prompt
        musicParams.style,
        musicParams.title,
        instrumental, // Pass the instrumental parameter
        callbackUrl
      );
      console.log(`[TRACKS] SUNO API response:`, musicResponse);
      console.log(`[TRACKS] Task ID from SUNO API:`, musicResponse?.data?.task_id);
      console.log(`[TRACKS] Task ID from SUNO API:`, musicResponse?.data?.task_id);
      
      // Now that we have the taskId, create the placeholder track
      if (musicResponse?.data?.task_id || musicResponse?.data?.taskId) {
        try {
          const taskId = musicResponse?.data?.task_id || musicResponse?.data?.taskId;
          console.log(`[TRACKS] Creating placeholder track in Airtable with TaskId: "${taskId}"`);
          const placeholderTrack = await createTrack(
            foundryId,
            musicParams.title,
            musicParams.prompt,
            musicParams.lyrics,
            "pending", // This will be updated when the callback comes
            taskId // Save the taskId
          );
          console.log(`[TRACKS] Created placeholder track in Airtable:`, placeholderTrack);
          
          // Generate a cover image for the track
          try {
            console.log(`[TRACKS] Generating cover image for track: ${placeholderTrack.id}`);
            
            // Create a prompt for the cover image based on the music parameters
            const coverPrompt = `Album cover art for a ${musicParams.style} song titled "${musicParams.title}". ${
              musicParams.prompt ? `The music is described as: ${musicParams.prompt}` : ''
            }. Create a visually striking, professional album cover that captures the essence of the music.`;
            
            console.log(`[TRACKS] Cover image prompt: "${coverPrompt}"`);
            
            // Determine the base URL for the API call
            let baseUrl;
            if (process.env.NODE_ENV === 'production') {
              baseUrl = 'https://beatfoundry.vercel.app';
            } else {
              // For development, use the server's URL
              const host = request.headers.get('host');
              const protocol = host?.includes('localhost') ? 'http' : 'https';
              baseUrl = `${protocol}://${host}`;
            }
            
            console.log(`[TRACKS] Using base URL for image generation: ${baseUrl}`);
            
            const coverResponse = await fetch(`${baseUrl}/api/foundries/${foundryId}/images`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                trackId: placeholderTrack.id,
                prompt: coverPrompt,
                title: musicParams.title
              }),
            });
            
            if (!coverResponse.ok) {
              const errorText = await coverResponse.text();
              console.error(`[TRACKS] Error generating cover image: ${coverResponse.status}`);
              console.error(`[TRACKS] Error details: ${errorText}`);
            } else {
              const coverData = await coverResponse.json();
              console.log(`[TRACKS] Successfully generated cover image: ${coverData.cover_url}`);
              
              // Add this line to log the full response
              console.log(`[TRACKS] Cover image response:`, JSON.stringify(coverData, null, 2));
            }
          } catch (coverError) {
            console.error(`[TRACKS] Error generating cover image:`, coverError);
            // Continue anyway, the cover is optional
          }
        } catch (airtableError) {
          console.error(`[TRACKS] Error creating placeholder track in Airtable:`, airtableError);
          // Continue anyway, don't fail the request
        }
      } else {
        console.warn(`[TRACKS] No taskId found in SUNO API response, skipping placeholder track creation`);
      }
    } catch (musicError) {
      console.error(`[TRACKS] Error generating music with SUNO API:`, musicError);
      // Continue without music generation in case of error
    }
    
    // Return the combined response
    const responseData = {
      ...messageResponse,
      music_task_id: musicResponse?.data?.task_id || musicResponse?.data?.taskId,
      music_parameters: {
        prompt: musicParams.prompt,
        style: musicParams.style,
        title: musicParams.title,
        lyrics: musicParams.lyrics
      }
    };
    
    console.log(`[TRACKS] Returning response to client:`, responseData);
    console.log(`[TRACKS] Response includes music_task_id:`, responseData.music_task_id);
    console.log(`[TRACKS] Response includes music_task_id:`, responseData.music_task_id);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`[TRACKS] Error in POST /api/foundries/[id]/tracks:`, error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TRACKS] Returning mock data for development`);
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
