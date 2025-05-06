import { NextRequest, NextResponse } from 'next/server';
import { getFoundryReactions, updateFoundryReactions, FoundryReactions } from '@/lib/airtable';

// Get reactions for a foundry
export async function GET(request: NextRequest, { params }: any) {
  const { id: foundryId } = params;
  
  console.log(`[REACTIONS] Getting reactions for foundry ID: ${foundryId}`);
  
  try {
    const reactions = await getFoundryReactions(foundryId);
    return NextResponse.json(reactions);
  } catch (error) {
    console.error(`[REACTIONS] Error getting foundry reactions:`, error);
    return NextResponse.json(
      { error: 'Failed to get foundry reactions' },
      { status: 500 }
    );
  }
}

// Add or update a reaction for a foundry
export async function POST(request: NextRequest, { params }: any) {
  const { id: foundryId } = params;
  
  console.log(`[REACTIONS] Adding/updating reaction for foundry ID: ${foundryId}`);
  
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
    const currentReactions = await getFoundryReactions(foundryId);
    
    // Update the reaction count
    const updatedReactions: FoundryReactions = {
      ...currentReactions,
      [reaction]: (currentReactions[reaction] || 0) + 1
    };
    
    console.log(`[REACTIONS] Updating reaction "${reaction}" for foundry ID: ${foundryId}`);
    
    // Save the updated reactions
    const savedReactions = await updateFoundryReactions(foundryId, updatedReactions);
    
    return NextResponse.json(savedReactions);
  } catch (error) {
    console.error(`[REACTIONS] Error updating foundry reaction:`, error);
    return NextResponse.json(
      { error: 'Failed to update foundry reaction' },
      { status: 500 }
    );
  }
}
