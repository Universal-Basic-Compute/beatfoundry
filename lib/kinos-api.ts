const KINOS_API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = process.env.KINOS_BLUEPRINT_ID || 'beatfoundry'; // Use environment variable with fallback

export async function createKin(name: string, templateOverride?: string) {
  const url = `${KINOS_API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins`;
  
  console.log(`Making request to Kinos API: ${url}`);
  
  const requestBody: { name: string; template_override?: string } = {
    name,
  };
  
  if (templateOverride) {
    requestBody.template_override = templateOverride;
  }
  
  console.log('Request body:', JSON.stringify(requestBody));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Kinos API response status:', response.status);
    
    const data = await response.json();
    console.log('Kinos API response data:', data);
    
    if (!response.ok) {
      throw new Error(data.error || `Failed to create kin: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in createKin:', error);
    throw error;
  }
}
