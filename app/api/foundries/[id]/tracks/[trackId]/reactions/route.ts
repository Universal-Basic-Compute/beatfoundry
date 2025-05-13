import { NextRequest, NextResponse } from 'next/server';
import { getTrackReactions, updateTrackReactions, TrackReactions } from '@/lib/airtable';

// Get reactions for a track
export async function GET(request: NextRequest, { params }: any) {
  const { trackId } = await params;
  
  console.log(`[REACTIONS] Getting reactions for track ID: ${trackId}`);
  
  try {
    const reactions = await getTrackReactions(trackId);
    return NextResponse.json(reactions);
  } catch (error) {
    console.error(`[REACTIONS] Error getting reactions:`, error);
    return NextResponse.json(
      { error: 'Failed to get reactions' },
      { status: 500 }
    );
  }
}

// Add or update a reaction for a track
export async function POST(request: NextRequest, { params }: any) {
  const { trackId } = await params;
  
  console.log(`[REACTIONS] Adding/updating reaction for track ID: ${trackId}`);
  
  try {
    const body = await request.json();
    const { reaction } = body;
    
    if (!reaction) {
      console.error(`[REACTIONS] Invalid request body: missing reaction`);
      return NextResponse.json(
        { error: 'Invalid request body: missing reaction' },
        { status: 400 }
      );
    }
    
    // Get current reactions
    const currentReactions = await getTrackReactions(trackId);
    
    // Update the reaction count
    const updatedReactions: TrackReactions = {
      ...currentReactions,
      [reaction]: (currentReactions[reaction] || 0) + 1
    };
    
    console.log(`[REACTIONS] Updating reaction "${reaction}" for track ID: ${trackId}`);
    
    // Save the updated reactions
    const savedReactions = await updateTrackReactions(trackId, updatedReactions);
    
    return NextResponse.json(savedReactions);
  } catch (error) {
    console.error(`[REACTIONS] Error updating reaction:`, error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}
