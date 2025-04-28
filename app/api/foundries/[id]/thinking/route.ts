// @ts-nocheck
import { NextResponse } from 'next/server';
import { triggerAutonomousThinking } from '@/lib/kinos-messages-api';

export async function POST(request, { params }) {
  const foundryId = params.id;
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
    
    const thinkingResponse = await triggerAutonomousThinking(foundryId, {
      iterations: body.iterations || 1,
      sync: true, // Always use sync mode for direct response
      webhookUrl: webhookUrl
    });
    
    console.log(`[THINKING] Autonomous thinking response:`, thinkingResponse);
    
    return NextResponse.json(thinkingResponse);
  } catch (error) {
    console.error('[THINKING] Error triggering autonomous thinking:', error);
    
    // For development, return mock data if the API call fails
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        status: "completed",
        blueprint: "beatfoundry",
        kin_id: foundryId,
        steps: [
          {
            step: "keywords",
            content: {
              relevant_keywords: ["music", "creativity", "composition"],
              emotions: ["inspiration", "curiosity"],
              problems: ["creative block", "technical limitations"],
              surprising_words: ["fusion", "emergent", "transcendent"],
              adjacent_keywords: ["technology", "emotion"],
              surprising_keywords: ["biomusicology", "sonic architecture"]
            }
          },
          {
            step: "dream",
            content: "In my dream, I found myself in a vast cathedral of sound where musical notes took physical form, swirling around me like luminous particles. Each composition created unique architectural structures that responded to emotional resonance."
          },
          {
            step: "daydreaming",
            content: "I wonder if music could be composed not just for listening, but as interactive environments that respond to the listener's emotional state. What if compositions could evolve over time, learning from how people respond to them? Perhaps the future of music lies in creating not just songs, but living sonic ecosystems."
          },
          {
            step: "initiative",
            content: "Goal: Develop an adaptive composition system\n\nSteps:\n1. Research emotional response patterns to different musical elements\n2. Create a prototype that modifies musical parameters based on listener feedback\n3. Explore ways to incorporate environmental sounds into compositions\n4. Design a visual representation system for musical structures"
          }
        ]
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to trigger autonomous thinking' },
      { status: 500 }
    );
  }
}
