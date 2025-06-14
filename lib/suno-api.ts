const SUNO_API_URL = 'https://apibox.erweima.ai/api/v1/generate';

type SunoGenerateRequest = {
  prompt: string;
  style?: string;
  title?: string;
  customMode: boolean;
  instrumental: boolean;
  model: 'V4_5' | 'V4';
  negativeTags?: string;
  callBackUrl: string;
};

type SunoGenerateResponse = {
  code: number;
  msg: string;
  data: {
    task_id: string;
  };
};

export async function generateMusic(
  lyrics: string,  // This will be the prompt parameter for non-instrumental tracks
  style: string,   // This will contain style, sonorities, emotions (up to 1000 chars)
  title: string,
  instrumental: boolean = false,
  callbackUrl: string
) {
  console.log(`[SUNO] Generating music with SUNO API: "${title}"`);
  console.log(`[SUNO] Parameters - Style: "${style}", Instrumental: ${instrumental}`);
  
  // Always use the production URL in production environment
  let finalCallbackUrl;
  if (process.env.NODE_ENV === 'production') {
    // Extract the foundry ID from the provided callback URL
    const foundryIdMatch = callbackUrl.match(/\/foundries\/([^\/]+)\/tracks\/callback/);
    const foundryId = foundryIdMatch ? foundryIdMatch[1] : '';
    finalCallbackUrl = `https://beatfoundry.vercel.app/api/foundries/${foundryId}/tracks/callback`;
  } else {
    finalCallbackUrl = callbackUrl;
  }
  
  console.log(`[SUNO] Callback URL: ${finalCallbackUrl}`);
  
  // For non-instrumental tracks, lyrics go in the prompt field
  // For instrumental tracks, we'll use an empty string
  const promptContent = instrumental ? "" : lyrics;
  
  console.log(`[SUNO] Prompt/Lyrics: "${promptContent.substring(0, 100)}${promptContent.length > 100 ? '...' : ''}"`);
  console.log(`[SUNO] Style: "${style.substring(0, 100)}${style.length > 100 ? '...' : ''}"`);
  
  const requestBody: SunoGenerateRequest = {
    prompt: promptContent,
    style,
    title,
    customMode: true,
    instrumental,
    model: 'V4_5',  // Always use V4_5
    callBackUrl: finalCallbackUrl
  };
  
  console.log('[SUNO] API request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    console.log(`[SUNO] Sending request to ${SUNO_API_URL}`);
    const response = await fetch(SUNO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`[SUNO] API response status: ${response.status}`);
    
    // Log response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log(`[SUNO] Response headers:`, headers);
    
    const responseText = await response.text();
    console.log(`[SUNO] Raw response text: ${responseText}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[SUNO] API response data (parsed):', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`[SUNO] Error parsing response JSON:`, parseError);
      throw new Error(`Failed to parse response: ${responseText}`);
    }
    
    if (!response.ok) {
      console.error(`[SUNO] Error response from API:`, data);
      throw new Error(data.msg || `Failed to generate music: ${response.status}`);
    }
    
    // Log the task_id specifically since that's important for tracking
    if (data.data && data.data.task_id) {
      console.log(`[SUNO] Generated task_id: ${data.data.task_id}`);
    }
    
    return data;
  } catch (error) {
    console.error('[SUNO] Error generating music with SUNO API:', error);
    throw error;
  }
}
