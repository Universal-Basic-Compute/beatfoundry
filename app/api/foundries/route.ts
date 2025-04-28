import { NextResponse } from 'next/server';
import { getFoundries, createFoundry, foundryExists } from '@/lib/airtable';
import { createKin } from '@/lib/kinos-api';

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
    
    // Create the kin in Kinos Engine API
    let kinResponse;
    try {
      kinResponse = await createKin(body.name);
      console.log('Kin created successfully:', kinResponse);
    } catch (kinError: any) {
      // If the error is a 409 (already exists), we can still proceed with creating in Airtable
      if (kinError.message && kinError.message.includes('already exists')) {
        console.warn('Kin already exists in Kinos Engine, but not in Airtable. Proceeding with Airtable creation.');
      } else {
        // For other errors, we should stop and return the error
        console.error('Error creating kin in Kinos Engine:', kinError);
        return NextResponse.json(
          { error: 'Failed to create kin in Kinos Engine' },
          { status: 500 }
        );
      }
    }
    
    // Create new foundry in Airtable
    const newFoundry = await createFoundry(body.name, body.description);
    
    // If we have a successful kin response, include that data
    if (kinResponse) {
      return NextResponse.json({
        ...newFoundry,
        kin_id: kinResponse.id,
        blueprint_id: kinResponse.blueprint_id,
        kin_status: kinResponse.status
      }, { status: 201 });
    }
    
    return NextResponse.json(newFoundry, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/foundries:', error);
    
    // If all integrations fail, create a mock response for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('All integrations failed, using mock data');
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
    
    return NextResponse.json(
      { error: 'Failed to create foundry' },
      { status: 500 }
    );
  }
}
