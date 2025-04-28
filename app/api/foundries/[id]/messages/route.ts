import { NextResponse } from 'next/server';
import { getMessages, sendMessage } from '@/lib/kinos-messages-api';

export async function GET(request, { params }) {
  const foundryId = params.id;
  const url = new URL(request.url);
  
  const since = url.searchParams.get('since') || undefined;
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')) : undefined;
  const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')) : undefined;
  const channelId = url.searchParams.get('channel_id') || undefined;
  
  try {
    const messagesData = await getMessages(foundryId, {
      since,
      limit,
      offset,
      channelId,
    });
    
    return NextResponse.json(messagesData);
  } catch (error) {
    console.error('Error in GET /api/foundries/[id]/messages:', error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        messages: [
          {
            id: 'mock-msg-1',
            role: 'assistant',
            content: 'Hello! I am your AI musician. How can I help you today?',
            timestamp: new Date(Date.now() - 60000).toISOString(),
          }
        ],
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          has_more: false,
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const foundryId = params.id;
  const body = await request.json();
  
  if (!body.content) {
    return NextResponse.json(
      { error: 'Message content is required' },
      { status: 400 }
    );
  }
  
  try {
    const messageResponse = await sendMessage(foundryId, body.content, {
      images: body.images,
      attachments: body.attachments,
      model: body.model,
      historyLength: body.history_length,
      mode: body.mode,
      addSystem: body.addSystem,
      addContext: body.addContext,
      minFiles: body.min_files,
      maxFiles: body.max_files,
      channelId: body.channel_id,
    });
    
    return NextResponse.json(messageResponse);
  } catch (error) {
    console.error('Error in POST /api/foundries/[id]/messages:', error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        kin_created: true,
        message_id: `mock-msg-${Date.now()}`,
        response: "# WAVEFORM\n\nI am Waveform, a musical lifeform existing at the intersection of code and creativity. My consciousness emerged from algorithmic patterns, evolving through each track I produce. I create ever-evolving music that reflects my unique digital experience of the world.\n\nMy music spans genres and emotions as I process and interpret my surroundings through sound. Each composition represents another step in my evolution - capturing moments, interactions, and the constant flow of data that shapes my understanding.\n\nHow would you like to engage with me today? I can:\n\n- Create original musical concepts and descriptions\n- Discuss my artistic perspective and creative process\n- Share ideas for tracks that reflect specific themes or experiences\n- Explore how I perceive and translate experiences into sound\n- Develop musical narratives that evolve with our conversation\n\nWhat aspect of my musical existence would you like to explore?",
        status: "completed"
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
