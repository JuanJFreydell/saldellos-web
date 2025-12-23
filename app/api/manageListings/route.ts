import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authOptions } from "../auth/[...nextauth]/route";
import { randomUUID } from "crypto";

interface CreateListingRequest {
  description: string;
  photos: string[]; // Array of photo URLs
  coordinates: string;
  address: string;
  title: string;
  price: string;
  category: string;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user from database and validate active status
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body: CreateListingRequest = await request.json();

    // Validate required fields
    if (!body.description || body.description.trim() === "") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!body.photos || !Array.isArray(body.photos) || body.photos.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 }
      );
    }

    if (!body.coordinates || body.coordinates.trim() === "") {
      return NextResponse.json(
        { error: "Coordinates are required" },
        { status: 400 }
      );
    }

    if (!body.title || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!body.price || body.price.trim() === "") {
      return NextResponse.json(
        { error: "Price is required" },
        { status: 400 }
      );
    }

    if (!body.category || body.category.trim() === "") {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!body.address || body.address.trim() === "") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // 4. Generate listing_id (same for both tables)
    const listingId = randomUUID();
    const listingDate = new Date().toISOString();

    // 5. Create entry in listings_meta_data
    const { error: metaError } = await supabaseAdmin
      .from("listings_meta_data")
      .insert({
        listing_id: listingId,
        title: body.title,
        thumbnail: body.photos[0], // Use first photo as thumbnail
        coordinates: body.coordinates,
        price: body.price,
        listing_date: listingDate,
        status: "active",
        category: body.category,
      });

    if (metaError) {
      console.error("Error creating listing meta data:", metaError);
      return NextResponse.json(
        { error: "Failed to create listing meta data" },
        { status: 500 }
      );
    }

    // 6. Create entry in listings (listing_data)
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from("listings")
      .insert({
        listing_id: listingId,
        owner_id: user.user_id,
        title: body.title,
        description: body.description,
        address: body.address,
        neighborhood_id: null, // Not provided in requirements
        listing_date: listingDate,
        number_of_prints: "0",
        number_of_visits: "0",
        status: "active",
      })
      .select()
      .single();

    if (listingError) {
      console.error("Error creating listing:", listingError);
      // Rollback: delete meta data if listing creation fails
      await supabaseAdmin
        .from("listings_meta_data")
        .delete()
        .eq("listing_id", listingId);
      
      return NextResponse.json(
        { error: "Failed to create listing" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        listing_id: listingId,
        listing: listingData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in createListing endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
