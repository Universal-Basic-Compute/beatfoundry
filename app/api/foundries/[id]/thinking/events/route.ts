import { NextRequest } from 'next/server';
import thinkingEvents from '@/lib/thinking-events';

// This endpoint will provide Server-Sent Events (SSE) for real-time thinking updates
export async function GET(request: NextRequest, { params }: any) {
  const { id: foundryId } = params;
  console.log(`[EVENTS] Setting up SSE connection for foundry ID: ${foundryId}`);
  
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Function to send events to the client
      const sendEvent = (data: any) => {
        console.log(`[EVENTS] Sending thinking event to client:`, JSON.stringify(data, null, 2));
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Listen for thinking events for this foundry
      const eventHandler = (data: any) => {
        sendEvent(data);
      };
      
      // Add the event listener
      thinkingEvents.on(`thinking:${foundryId}`, eventHandler);
      
      // Send an initial connection event
      sendEvent({ 
        type: 'connection', 
        message: 'Connected to thinking events',
        foundryId,
        timestamp: new Date().toISOString()
      });
      
      // Store the event handler on the controller for cleanup
      (controller as any).eventHandler = eventHandler;
      (controller as any).foundryId = foundryId;
    },
    cancel(controller) {
      // Clean up the event listener when the client disconnects
      console.log(`[EVENTS] Client disconnected from SSE for foundry ID: ${(controller as any).foundryId}`);
      thinkingEvents.off(`thinking:${(controller as any).foundryId}`, (controller as any).eventHandler);
    }
  });
  
  // Return the stream with appropriate headers for SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
