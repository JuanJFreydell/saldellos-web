import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { fileCount } = body; // Number of files to upload

    if (!fileCount || fileCount < 1 || fileCount > 10) {
      return NextResponse.json(
        { error: "fileCount must be between 1 and 10" },
        { status: 400 }
      );
    }

    // 3. Generate file paths for each file
    // The frontend will upload directly using the authenticated Supabase client
    const bucketName = 'listing-photos'; // Your bucket name
    const filePaths = [];

    for (let i = 0; i < fileCount; i++) {
      // Generate unique file path: user_id/timestamp_random_index.ext
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const filePath = `${authUser.id}/${timestamp}_${random}_${i}`;

      filePaths.push({
        path: filePath,
        // Public URL after upload (construct from bucket and path)
        publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`
      });
    }

    return NextResponse.json({
      filePaths: filePaths,
      bucketName: bucketName
    });

  } catch (error) {
    console.error("Error in upload endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

