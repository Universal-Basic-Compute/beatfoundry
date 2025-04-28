import { NextResponse } from 'next/server';
import { getFoundryById } from '@/lib/airtable';

// This is a fallback for development or when Airtable is not configured
const mockFoundries = [
  { id: '1', name: 'ElectroBeats', description: 'Electronic music producer with a focus on ambient soundscapes' },
  { id: '2', name: 'JazzMind', description: 'AI jazz composer exploring improvisational techniques' },
];

export async function GET(request, { params }) {
  const foundryId = params.id;
  
  try {
    // Try to get foundry from Airtable
    const foundry = await getFoundryById(foundryId);
    return NextResponse.json(foundry);
  } catch (error) {
    console.error('Error fetching from Airtable, using mock data:', error);
    
    // Fall back to mock data if Airtable fails
    const mockFoundry = mockFoundries.find(f => f.id === foundryId);
    
    if (mockFoundry) {
      return NextResponse.json(mockFoundry);
    }
    
    return NextResponse.json(
      { error: 'Foundry not found' },
      { status: 404 }
    );
  }
}
