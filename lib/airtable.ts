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
