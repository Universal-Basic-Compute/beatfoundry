import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { updateTrackCover } from '@/lib/airtable';

export async function POST(request: NextRequest, { params }: any) {
  const foundryId = params.id;
  
  console.log(`[IMAGES] Generating cover image for foundry ID: ${foundryId}`);
  
  try {
    const body = await request.json();
    console.log(`[IMAGES] Request body:`, JSON.stringify(body, null, 2));
    
    const { trackId, prompt, title } = body;
    
    if (!trackId || !prompt) {
      console.error(`[IMAGES] Invalid request body: missing trackId or prompt`);
      return NextResponse.json(
        { error: 'Invalid request body: missing trackId or prompt' },
        { status: 400 }
      );
    }
    
    // Generate a cover image using Ideogram API
    console.log(`[IMAGES] Generating cover image with prompt: "${prompt}"`);
    console.log(`[IMAGES] Using Kinos API URL: ${process.env.KINOS_API_BASE_URL || 'https://api.kinos-engine.ai/v2'}`);
    console.log(`[IMAGES] Using blueprint ID: ${process.env.KINOS_BLUEPRINT_ID || 'beatfoundry'}`);
    console.log(`[IMAGES] Using foundry ID: ${foundryId}`);
    
    const imageApiUrl = `${process.env.KINOS_API_BASE_URL || 'https://api.kinos-engine.ai/v2'}/blueprints/${process.env.KINOS_BLUEPRINT_ID || 'beatfoundry'}/kins/${foundryId}/images`;
    console.log(`[IMAGES] Full image API URL: ${imageApiUrl}`);
    
    try {
      const imageResponse = await fetch(imageApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KINOS_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: "ASPECT_1_1",
          model: "V_2A",
          magic_prompt_option: "AUTO"
        }),
      });
      
      console.log(`[IMAGES] Image API response status: ${imageResponse.status}`);
      
      // Log response headers
      const headers = {};
      imageResponse.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log(`[IMAGES] Response headers:`, headers);
      
      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error(`[IMAGES] Error response from Ideogram API: ${imageResponse.status}`);
        console.error(`[IMAGES] Error details: ${errorText}`);
        return NextResponse.json(
          { error: `Failed to generate cover image: ${imageResponse.status} - ${errorText}` },
          { status: 500 }
        );
      }
      
      const imageData = await imageResponse.json();
      console.log(`[IMAGES] Image generation response:`, JSON.stringify(imageData, null, 2));
      
      // Extract the image URL
      const imageUrl = imageData.data?.url;
      
      if (!imageUrl) {
        console.error(`[IMAGES] No image URL found in response:`, JSON.stringify(imageData, null, 2));
        return NextResponse.json(
          { error: 'No image URL found in response' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error(`[IMAGES] Error making request to image API:`, error);
      return NextResponse.json(
        { error: `Failed to make request to image API: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Create directory if it doesn't exist
    const coversDir = path.join(process.cwd(), 'public', 'images', 'covers');
    await mkdir(coversDir, { recursive: true });
    
    // Generate a safe filename from the title
    const safeTitle = title
      ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'cover';
    
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${safeTitle}_${timestamp}.jpg`;
    const filePath = path.join(coversDir, filename);
    const publicUrl = `/images/covers/${filename}`;
    
    console.log(`[IMAGES] Downloading image from ${imageUrl} to ${filePath}`);
    
    // Fetch the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error(`[IMAGES] Failed to download image: ${response.status}`);
      return NextResponse.json(
        { error: `Failed to download image: ${response.status}` },
        { status: 500 }
      );
    }
    
    // Get the image data as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write the file
    fs.writeFileSync(filePath, buffer);
    console.log(`[IMAGES] Image saved to ${filePath}`);
    
    // Update the track cover URL in Airtable
    const updatedTrack = await updateTrackCover(trackId, publicUrl);
    console.log(`[IMAGES] Updated track cover URL in Airtable: ${publicUrl}`);
    
    return NextResponse.json({
      success: true,
      track: updatedTrack,
      cover_url: publicUrl
    });
  } catch (error) {
    console.error(`[IMAGES] Error generating cover image:`, error);
    return NextResponse.json(
      { error: 'Failed to generate cover image' },
      { status: 500 }
    );
  }
}
