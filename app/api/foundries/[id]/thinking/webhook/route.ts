import { NextRequest, NextResponse } from 'next/server';
import thinkingEvents from '@/lib/thinking-events';

export async function POST(request: NextRequest, { params }: any) {
  const foundryId = params.id;
  console.log(`[WEBHOOK] Received thinking webhook for foundry ID: ${foundryId}`);
  
  try {
    const body = await request.json();
    console.log(`[WEBHOOK] Webhook body:`, JSON.stringify(body, null, 2));
    
    // Extract the thinking step data
    const step = body.step;
    const content = body.content;
    
    if (!step) {
      console.error(`[WEBHOOK] Invalid webhook data: missing step`);
      return NextResponse.json(
        { error: 'Invalid webhook data: missing step' },
        { status: 400 }
      );
    }
    
    // Emit an event with the foundry ID as the channel and the thinking step data
    const eventData = {
      foundryId,
      step,
      content,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[WEBHOOK] Emitting thinking event for foundry ${foundryId}, step: ${step}`);
    thinkingEvents.emit(`thinking:${foundryId}`, eventData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WEBHOOK] Error processing thinking webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
