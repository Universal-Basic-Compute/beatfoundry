import { NextRequest, NextResponse } from 'next/server';
import { getMessages, sendMessage } from '@/lib/kinos-messages-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const foundryId = params.id;
  const searchParams = request.nextUrl.searchParams;
  
  const since = searchParams.get('since') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
  const channelId = searchParams.get('channel_id') || undefined;
  
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
        id: `mock-msg-${Date.now()}`,
        role: 'assistant',
        content: 'Thank you for your message! As an AI musician, I\'m always looking for inspiration. What kind of music are you interested in?',
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
