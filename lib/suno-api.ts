const SUNO_API_URL = 'https://apibox.erweima.ai/api/v1/generate';

type SunoGenerateRequest = {
  prompt: string;
  style?: string;
  title?: string;
  customMode: boolean;
  instrumental: boolean;
  model: 'V3_5' | 'V4';
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
  prompt: string,
  style: string,
  title: string,
  instrumental: boolean = false,
  callbackUrl: string
) {
  console.log(`[SUNO] Generating music with SUNO API: "${title}"`);
  console.log(`[SUNO] Parameters - Style: "${style}", Instrumental: ${instrumental}`);
  
  // Use the provided callback URL or fall back to the production URL if needed
  const finalCallbackUrl = callbackUrl || `https://beatsfoundry.vercel.app/api/foundries/${foundryId}/tracks/callback`;
  console.log(`[SUNO] Callback URL: ${finalCallbackUrl}`);
  console.log(`[SUNO] Prompt/Lyrics: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
  
  const requestBody: SunoGenerateRequest = {
    prompt,
    style,
    title,
    customMode: true,
    instrumental,
    model: 'V4',
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
    } catch (parseError) {
      console.error(`[SUNO] Error parsing response JSON:`, parseError);
      throw new Error(`Failed to parse response: ${responseText}`);
    }
    
    if (!response.ok) {
      console.error(`[SUNO] Error response from API:`, data);
      throw new Error(data.msg || `Failed to generate music: ${response.status}`);
    }
    
    console.log('[SUNO] API response data:', data);
    
    return data;
  } catch (error) {
    console.error('[SUNO] Error generating music with SUNO API:', error);
    throw error;
  }
}
