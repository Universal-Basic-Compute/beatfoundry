const KINOS_API_BASE_URL = process.env.KINOS_API_BASE_URL || 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = process.env.KINOS_BLUEPRINT_ID || 'beatfoundry';

export async function sendChannelMessage(
  kinId: string,
  channelId: string,
  content: string,
  options?: {
    images?: string[];
    attachments?: string[];
    model?: string;
    historyLength?: number;
    mode?: 'creative' | 'balanced' | 'precise';
    addSystem?: string;
    addContext?: string[];
    minFiles?: number;
    maxFiles?: number;
  }
) {
  const url = `${KINOS_API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}/channels/${channelId}/messages`;
  
  console.log(`Sending message to channel: ${url}`);
  
  const requestBody: any = {
    content,
  };
  
  if (options?.images) requestBody.images = options.images;
  if (options?.attachments) requestBody.attachments = options.attachments;
  if (options?.model) requestBody.model = options.model;
  if (options?.historyLength) requestBody.history_length = options.historyLength;
  if (options?.mode) requestBody.mode = options.mode;
  if (options?.addSystem) requestBody.addSystem = options.addSystem;
  if (options?.addContext) requestBody.addContext = options.addContext;
  if (options?.minFiles) requestBody.min_files = options.minFiles;
  if (options?.maxFiles) requestBody.max_files = options.maxFiles;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to send channel message: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending channel message:', error);
    throw error;
  }
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type MessagesResponse = {
  messages: Message[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export async function getMessages(
  kinId: string, 
  options?: { 
    since?: string; 
    limit?: number; 
    offset?: number; 
    channelId?: string;
  }
) {
  const queryParams = new URLSearchParams();
  
  if (options?.since) queryParams.append('since', options.since);
  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (options?.offset) queryParams.append('offset', options.offset.toString());
  if (options?.channelId) queryParams.append('channel_id', options.channelId);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const url = `${KINOS_API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}/messages${queryString}`;
  
  console.log(`Fetching messages from: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch messages: ${response.status}`);
    }
    
    const data: MessagesResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

export async function triggerAutonomousThinking(
  kinId: string,
  options?: {
    iterations?: number;
    waitTime?: number;
    sync?: boolean;
    webhookUrl?: string;
  }
) {
  const url = `${KINOS_API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}/autonomous_thinking`;
  
  console.log(`Triggering autonomous thinking: ${url}`);
  
  const requestBody: any = {
    sync: false, // Default to async mode for real-time updates via webhook
  };
  
  if (options?.iterations) requestBody.iterations = options.iterations;
  if (options?.waitTime) requestBody.wait_time = options.waitTime;
  if (options?.sync !== undefined) requestBody.sync = options.sync;
  if (options?.webhookUrl) requestBody.webhook_url = options.webhookUrl;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to trigger autonomous thinking: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error triggering autonomous thinking:', error);
    throw error;
  }
}

export async function sendMessage(
  kinId: string, 
  content: string, 
  options?: {
    images?: string[];
    attachments?: string[];
    model?: string;
    historyLength?: number;
    mode?: 'creative' | 'balanced' | 'precise';
    addSystem?: string;
    addContext?: string[];
    minFiles?: number;
    maxFiles?: number;
    channelId?: string;
  }
) {
  const url = `${KINOS_API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}/messages`;
  
  console.log(`Sending message to: ${url}`);
  
  const requestBody: any = {
    content,
  };
  
  if (options?.images) requestBody.images = options.images;
  if (options?.attachments) requestBody.attachments = options.attachments;
  if (options?.model) requestBody.model = options.model;
  if (options?.historyLength) requestBody.history_length = options.historyLength;
  if (options?.mode) requestBody.mode = options.mode;
  if (options?.addSystem) requestBody.addSystem = options.addSystem;
  if (options?.addContext) requestBody.addContext = options.addContext;
  if (options?.minFiles) requestBody.min_files = options.minFiles;
  if (options?.maxFiles) requestBody.max_files = options.maxFiles;
  if (options?.channelId) requestBody.channel_id = options.channelId;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to send message: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}
