import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: any) {
  const { id: foundryId } = params;
  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');
  
  console.log(`[STATUS] Checking music generation status for foundry ID: ${foundryId}, task ID: ${taskId}`);
  console.log(`[STATUS] Request URL: ${request.url}`);
  console.log(`[STATUS] SUNO_API_KEY exists: ${!!process.env.SUNO_API_KEY}`);
  
  if (!taskId) {
    console.log(`[STATUS] Error: taskId is required`);
    return NextResponse.json(
      { error: 'taskId is required' },
      { status: 400 }
    );
  }
  
  try {
    const statusUrl = `https://apibox.erweima.ai/api/v1/generate/record-info?taskId=${taskId}`;
    
    console.log(`[STATUS] Fetching status from: ${statusUrl}`);
    console.log(`[STATUS] Looking for taskId: ${taskId}`);
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
      },
    });
    
    console.log(`[STATUS] Status response status code: ${response.status}`);
    
    if (!response.ok) {
      console.error(`[STATUS] Error response from SUNO API: ${response.status}`);
      const errorText = await response.text();
      console.error(`[STATUS] Error details: ${errorText}`);
      return NextResponse.json(
        { error: `Failed to check music generation status: ${response.status}` },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    console.log(`[STATUS] Status check response:`, data);
    
    // Check for status in the correct location
    const status = data.data?.response?.status || data.data?.status;
    
    // If the status is SUCCESS, we can get the track URLs
    if (data.code === 200 && status === 'SUCCESS') {
      console.log(`[STATUS] Music generation completed successfully!`);
      
      // Check if we have track data in the response
      const trackData = data.data?.response?.sunoData;
      if (trackData && trackData.length > 0) {
        console.log(`[STATUS] Found ${trackData.length} tracks in response`);
        console.log(`[STATUS] First track audio URL: ${trackData[0].audioUrl || trackData[0].sourceAudioUrl}`);
        
        // We'll let the client handle saving these tracks
      }
      
      return NextResponse.json(data);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[STATUS] Error checking music generation status:', error);
    return NextResponse.json(
      { error: 'Failed to check music generation status' },
      { status: 500 }
    );
  }
}
