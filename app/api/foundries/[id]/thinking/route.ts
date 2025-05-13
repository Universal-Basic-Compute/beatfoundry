// @ts-nocheck
import { NextResponse } from 'next/server';
import { triggerAutonomousThinking } from '@/lib/kinos-messages-api';

export async function POST(request, { params }) {
  const { id: foundryId } = await params;
  console.log(`[THINKING] Triggering autonomous thinking for foundry ID: ${foundryId}`);
  
  try {
    const body = await request.json();
    console.log(`[THINKING] Request body:`, body);
    
    // Get the base URL for webhooks
    let webhookUrl;
    if (process.env.NODE_ENV === 'production') {
      webhookUrl = `https://beatfoundry.vercel.app/api/foundries/${foundryId}/thinking/webhook`;
    } else {
      // For development, use the server's URL
      const host = request.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      webhookUrl = `${protocol}://${host}/api/foundries/${foundryId}/thinking/webhook`;
    }
    
    console.log(`[THINKING] Webhook URL: ${webhookUrl}`);
    console.log(`[THINKING] Webhook URL configured: ${webhookUrl}`);
    
    const thinkingResponse = await triggerAutonomousThinking(foundryId, {
      iterations: body.iterations || 1,
      sync: body.sync !== undefined ? body.sync : false, // Default to async mode
      webhookUrl: webhookUrl
    });
    
    console.log(`[THINKING] Autonomous thinking response:`, thinkingResponse);
    
    return NextResponse.json(thinkingResponse);
  } catch (error) {
    console.error('[THINKING] Error triggering autonomous thinking:', error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        status: "initiated",
        message: "Autonomous thinking initiated",
        kin_id: foundryId
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to trigger autonomous thinking' },
      { status: 500 }
    );
  }
}
