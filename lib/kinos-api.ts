const KINOS_API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = 'kinos'; // Default blueprint ID, can be made configurable

export async function createKin(name: string, templateOverride?: string) {
  const url = `${KINOS_API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins`;
  
  const requestBody: { name: string; template_override?: string } = {
    name,
  };
  
  if (templateOverride) {
    requestBody.template_override = templateOverride;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add any required authentication headers here
      // 'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create kin');
  }
  
  return data;
}
