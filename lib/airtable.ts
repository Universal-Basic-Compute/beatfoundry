import Airtable from 'airtable';

// Initialize Airtable with your API key
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.warn('Airtable API key or Base ID is missing. Using mock data instead.');
}

const base = new Airtable({ apiKey }).base(baseId || '');

// Get the FOUNDRIES table
const foundryTable = base('FOUNDRIES');

// Get the TRACKS table
const trackTable = base('TRACKS');

export async function getFoundries() {
  try {
    const records = await foundryTable.select().all();
    return records.map(record => ({
      id: record.id,
      name: record.get('Name') as string,
      description: record.get('Description') as string,
    }));
  } catch (error) {
    console.error('Error fetching foundries from Airtable:', error);
    throw error;
  }
}

export async function createFoundry(name: string, description: string) {
  try {
    const records = await foundryTable.create([
      {
        fields: {
          Name: name,
          Description: description,
          CreatedAt: new Date().toISOString(),
        },
      },
    ]);
    
    return {
      id: records[0].id,
      name: records[0].get('Name') as string,
      description: records[0].get('Description') as string,
      created_at: records[0].get('CreatedAt') as string,
      status: 'created',
    };
  } catch (error) {
    console.error('Error creating foundry in Airtable:', error);
    throw error;
  }
}

export async function foundryExists(name: string) {
  try {
    const records = await foundryTable
      .select({
        filterByFormula: `{Name} = '${name}'`,
        maxRecords: 1,
      })
      .all();
    
    if (records.length > 0) {
      return {
        exists: true,
        foundry: {
          id: records[0].id,
          name: records[0].get('Name') as string,
          description: records[0].get('Description') as string,
        },
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking if foundry exists in Airtable:', error);
    throw error;
  }
}

export async function getFoundryById(id: string) {
  try {
    const record = await foundryTable.find(id);
    return {
      id: record.id,
      name: record.get('Name') as string,
      description: record.get('Description') as string,
    };
  } catch (error) {
    console.error('Error fetching foundry by ID from Airtable:', error);
    throw error;
  }
}

export async function createTrack(
  foundryId: string,
  title: string,
  prompt: string,
  lyrics: string,
  audioUrl: string,
  taskId?: string // Add optional taskId parameter
) {
  console.log(`[AIRTABLE] Creating track in Airtable - Title: "${title}", FoundryId: ${foundryId}`);
  console.log(`[AIRTABLE] Track URL to be saved: "${audioUrl}"`);
  console.log(`[AIRTABLE] URL type: ${typeof audioUrl}`);
  console.log(`[AIRTABLE] URL length: ${audioUrl?.length || 0}`);
  if (taskId) {
    console.log(`[AIRTABLE] Task ID to be saved: "${taskId}"`);
  }
  
  try {
    console.log(`[AIRTABLE] Creating record in TRACKS table`);
    const fields: any = {
      Name: title,
      Prompt: prompt,
      Lyrics: lyrics,
      Url: audioUrl,
      CreatedAt: new Date().toISOString(),
      FoundryId: foundryId,
    };
    
    // Add TaskId field if provided
    if (taskId) {
      fields.TaskId = taskId;
    }
    
    const records = await trackTable.create([
      {
        fields: fields,
      },
    ]);
    
    console.log(`[AIRTABLE] Track created successfully with ID: ${records[0].id}`);
    console.log(`[AIRTABLE] Saved fields:`);
    console.log(`[AIRTABLE] - Name: ${records[0].get('Name')}`);
    console.log(`[AIRTABLE] - URL: ${records[0].get('Url')}`);
    console.log(`[AIRTABLE] - FoundryId: ${records[0].get('FoundryId')}`);
    if (taskId) {
      console.log(`[AIRTABLE] - TaskId: ${records[0].get('TaskId')}`);
    }
    
    return {
      id: records[0].id,
      name: records[0].get('Name') as string,
      prompt: records[0].get('Prompt') as string,
      lyrics: records[0].get('Lyrics') as string,
      url: records[0].get('Url') as string,
      createdAt: records[0].get('CreatedAt') as string,
      foundryId: records[0].get('FoundryId') as string,
      taskId: records[0].get('TaskId') as string,
    };
  } catch (error) {
    console.error('[AIRTABLE] Error creating track in Airtable:', error);
    throw error;
  }
}

export async function updateTrackByTaskId(taskId: string, audioUrl: string) {
  console.log(`[AIRTABLE] Updating track with TaskId: "${taskId}"`);
  console.log(`[AIRTABLE] New audio URL: "${audioUrl}"`);
  
  try {
    // Find the track with the matching TaskId
    const records = await trackTable
      .select({
        filterByFormula: `{TaskId} = '${taskId}'`,
        maxRecords: 1,
      })
      .all();
    
    if (records.length === 0) {
      console.log(`[AIRTABLE] No track found with TaskId: "${taskId}"`);
      return null;
    }
    
    const record = records[0];
    console.log(`[AIRTABLE] Found track to update: ${record.id}, Name: ${record.get('Name')}`);
    
    // Update the track with the new audio URL
    const updatedRecord = await trackTable.update([
      {
        id: record.id,
        fields: {
          Url: audioUrl,
        },
      },
    ]);
    
    console.log(`[AIRTABLE] Track updated successfully: ${updatedRecord[0].id}`);
    console.log(`[AIRTABLE] New URL: ${updatedRecord[0].get('Url')}`);
    
    return {
      id: updatedRecord[0].id,
      name: updatedRecord[0].get('Name') as string,
      prompt: updatedRecord[0].get('Prompt') as string,
      lyrics: updatedRecord[0].get('Lyrics') as string,
      url: updatedRecord[0].get('Url') as string,
      createdAt: updatedRecord[0].get('CreatedAt') as string,
      foundryId: updatedRecord[0].get('FoundryId') as string,
      taskId: updatedRecord[0].get('TaskId') as string,
    };
  } catch (error) {
    console.error('[AIRTABLE] Error updating track in Airtable:', error);
    throw error;
  }
}

export async function getTracksByFoundryId(foundryId: string) {
  console.log(`[AIRTABLE] Fetching tracks for foundry ID: ${foundryId}`);
  
  try {
    console.log(`[AIRTABLE] Querying TRACKS table with filter: {FoundryId} = '${foundryId}'`);
    const records = await trackTable
      .select({
        filterByFormula: `{FoundryId} = '${foundryId}'`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
      })
      .all();
    
    console.log(`[AIRTABLE] Found ${records.length} tracks for foundry ID: ${foundryId}`);
    
    const tracks = records.map(record => ({
      id: record.id,
      name: record.get('Name') as string,
      prompt: record.get('Prompt') as string,
      lyrics: record.get('Lyrics') as string,
      url: record.get('Url') as string,
      createdAt: record.get('CreatedAt') as string,
      foundryId: record.get('FoundryId') as string,
    }));
    
    console.log(`[AIRTABLE] Returning ${tracks.length} tracks`);
    return tracks;
  } catch (error) {
    console.error('[AIRTABLE] Error fetching tracks from Airtable:', error);
    throw error;
  }
}
