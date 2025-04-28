import { NextResponse } from 'next/server';

// This would be replaced with your actual Airtable integration
const mockFoundries = [
  { id: '1', name: 'ElectroBeats', description: 'Electronic music producer with a focus on ambient soundscapes' },
  { id: '2', name: 'JazzMind', description: 'AI jazz composer exploring improvisational techniques' },
];

export async function GET() {
  // In a real implementation, this would fetch from Airtable
  return NextResponse.json(mockFoundries);
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
  
  // Check if foundry already exists (mock implementation)
  const exists = mockFoundries.some(foundry => foundry.name === body.name);
  
  if (exists) {
    const existing = mockFoundries.find(foundry => foundry.name === body.name);
    return NextResponse.json(
      { 
        error: "Foundry already exists", 
        status: 409, 
        existing_foundry: existing 
      },
      { status: 409 }
    );
  }
  
  // In a real implementation, this would create a record in Airtable
  const newFoundry = {
    id: Date.now().toString(),
    name: body.name,
    description: body.description,
    created_at: new Date().toISOString(),
    status: "created"
  };
  
  return NextResponse.json(newFoundry, { status: 201 });
}
