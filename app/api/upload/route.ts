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

    // 2. Parse request body - expect FormData with files
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 files allowed" },
        { status: 400 }
      );
    }

    // 3. Upload files to Supabase Storage using admin client (bypasses RLS)
    const bucketName = 'listing-photos';
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `${file.name} is not a valid image file` },
          { status: 400 }
        );
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `${file.name} is too large (maximum 5MB)` },
          { status: 400 }
        );
      }

      // Generate unique file path: user_id/timestamp_random_index.ext
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${authUser.id}/${timestamp}_${random}_${i}.${fileExt}`;

      // Convert File to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload file using admin client (bypasses RLS)
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Construct the public URL
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({
      uploadedUrls: uploadedUrls
    });

  } catch (error) {
    console.error("Error in upload endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

