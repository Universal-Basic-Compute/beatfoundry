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
  console.log(`Generating music with SUNO API: ${title}`);
  
  const requestBody: SunoGenerateRequest = {
    prompt,
    style,
    title,
    customMode: true,
    instrumental,
    model: 'V4',
    callBackUrl: callbackUrl
  };
  
  console.log('SUNO API request body:', JSON.stringify(requestBody));
  
  try {
    const response = await fetch(SUNO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('SUNO API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.msg || `Failed to generate music: ${response.status}`);
    }
    
    const data: SunoGenerateResponse = await response.json();
    console.log('SUNO API response data:', data);
    
    return data;
  } catch (error) {
    console.error('Error generating music with SUNO API:', error);
    throw error;
  }
}
