import { NextResponse } from 'next/server';
import { getFoundries, createFoundry, foundryExists } from '@/lib/airtable';

// This is a fallback for development or when Airtable is not configured
let mockFoundries = [
  { id: '1', name: 'ElectroBeats', description: 'Electronic music producer with a focus on ambient soundscapes' },
  { id: '2', name: 'JazzMind', description: 'AI jazz composer exploring improvisational techniques' },
];

export async function GET() {
  try {
    // Try to get foundries from Airtable
    const foundries = await getFoundries();
    return NextResponse.json(foundries);
  } catch (error) {
    console.error('Error fetching from Airtable, using mock data:', error);
    // Fall back to mock data if Airtable fails
    return NextResponse.json(mockFoundries);
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate required fields
  if (!body.name || !body.description) {
    return NextResponse.json(
      { error: 'Name and description are required' },
      { status: 400 }
    );
  }
  
  try {
    // Check if foundry already exists in Airtable
    const { exists, foundry } = await foundryExists(body.name);
    
    if (exists) {
      return NextResponse.json(
        { 
          error: "Foundry already exists", 
          status: 409, 
          existing_foundry: foundry 
        },
        { status: 409 }
      );
    }
    
    // Create new foundry in Airtable
    const newFoundry = await createFoundry(body.name, body.description);
    return NextResponse.json(newFoundry, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/foundries:', error);
    
    // If Airtable integration fails, create a mock response for development
    console.log('Airtable integration failed, using mock data');
    const mockFoundry = {
      id: Date.now().toString(),
      name: body.name,
      description: body.description,
      created_at: new Date().toISOString(),
      status: "created"
    };
    
    // Add to mock foundries array for this session
    mockFoundries.push({
      id: mockFoundry.id,
      name: mockFoundry.name,
      description: mockFoundry.description
    });
    
    return NextResponse.json(mockFoundry, { status: 201 });
  }
}
