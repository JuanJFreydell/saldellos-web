import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authOptions } from "../auth/[...nextauth]/route";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
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

    // 2. Get user from database
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

    // 3. Check if requesting a single listing
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing_id");

    if (listingId) {
      // Fetch single listing with full details
      const { data: listing, error: listingError } = await supabaseAdmin
        .from("listings")
        .select("*")
        .eq("listing_id", listingId)
        .single();

      if (listingError || !listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 }
        );
      }

      // Verify ownership
      if (listing.owner_id !== user.user_id) {
        return NextResponse.json(
          { error: "Forbidden: You are not the owner of this listing" },
          { status: 403 }
        );
      }

      // Get metadata
      const { data: metadata, error: metaError } = await supabaseAdmin
        .from("listings_meta_data")
        .select("*")
        .eq("listing_id", listingId)
        .single();

      if (metaError) {
        console.error("Error fetching listing metadata:", metaError);
        return NextResponse.json(
          { error: "Failed to fetch listing metadata" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        listing: {
          ...listing,
          ...metadata,
          photos: metadata?.thumbnail ? [metadata.thumbnail] : [],
        },
      });
    }

    // 4. Get listings metadata for the authenticated user
    // First, get listing_ids owned by the user
    const { data: userListings, error: userListingsError } = await supabaseAdmin
      .from("listings")
      .select("listing_id")
      .eq("owner_id", user.user_id);

    if (userListingsError) {
      console.error("Error fetching user listings:", userListingsError);
      return NextResponse.json(
        { error: "Failed to fetch user listings" },
        { status: 500 }
      );
    }

    const listingIds = userListings?.map((listing) => listing.listing_id) || [];

    if (listingIds.length === 0) {
      return NextResponse.json({ listings: [] }, { status: 200 });
    }

    // Get metadata for those listings
    const { data: metadata, error: metadataError } = await supabaseAdmin
      .from("listings_meta_data")
      .select("*")
      .in("listing_id", listingIds)
      .order("listing_date", { ascending: false });

    if (metadataError) {
      console.error("Error fetching listings metadata:", metadataError);
      return NextResponse.json(
        { error: "Failed to fetch listings metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({ listings: metadata || [] }, { status: 200 });
  } catch (error) {
    console.error("Error in getListings endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

export async function DELETE(request: Request) {
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

    // 2. Get user from database
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

    // 3. Get listing_id from query parameters
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing_id");

    if (!listingId) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    // 4. Verify listing exists and user is the owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("listing_id, owner_id")
      .eq("listing_id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // 5. Verify user is the owner
    if (listing.owner_id !== user.user_id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this listing" },
        { status: 403 }
      );
    }

    // 6. Delete from listings_meta_data first
    const { error: metaDeleteError } = await supabaseAdmin
      .from("listings_meta_data")
      .delete()
      .eq("listing_id", listingId);

    if (metaDeleteError) {
      console.error("Error deleting listing meta data:", metaDeleteError);
      return NextResponse.json(
        { error: "Failed to delete listing meta data" },
        { status: 500 }
      );
    }

    // 7. Delete from listings table
    const { error: listingDeleteError } = await supabaseAdmin
      .from("listings")
      .delete()
      .eq("listing_id", listingId);

    if (listingDeleteError) {
      console.error("Error deleting listing:", listingDeleteError);
      return NextResponse.json(
        { error: "Failed to delete listing" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Listing deleted successfully",
        listing_id: listingId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in deleteListing endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    // 2. Get user from database
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

    // 3. Parse body - all fields optional except listing_id
    const body = (await request.json()) as Partial<CreateListingRequest> & {
      listing_id?: string;
    };

    const listingId = body.listing_id;

    if (!listingId) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    // 4. Verify listing exists and user is the owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("listing_id, owner_id")
      .eq("listing_id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.owner_id !== user.user_id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this listing" },
        { status: 403 }
      );
    }

    // 5. Build partial update payloads
    const listingUpdates: Record<string, unknown> = {};
    const metaUpdates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      listingUpdates.title = body.title;
      metaUpdates.title = body.title;
    }

    if (body.description !== undefined) {
      listingUpdates.description = body.description;
    }

    if (body.address !== undefined) {
      listingUpdates.address = body.address;
    }

    if (body.coordinates !== undefined) {
      metaUpdates.coordinates = body.coordinates;
    }

    if (body.price !== undefined) {
      metaUpdates.price = body.price;
    }

    if (body.category !== undefined) {
      metaUpdates.category = body.category;
    }

    if (body.photos && Array.isArray(body.photos) && body.photos.length > 0) {
      metaUpdates.thumbnail = body.photos[0];
    }

    if (
      Object.keys(listingUpdates).length === 0 &&
      Object.keys(metaUpdates).length === 0
    ) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // 6. Apply updates
    if (Object.keys(metaUpdates).length > 0) {
      const { error: metaUpdateError } = await supabaseAdmin
        .from("listings_meta_data")
        .update(metaUpdates)
        .eq("listing_id", listingId);

      if (metaUpdateError) {
        console.error("Error updating listing meta data:", metaUpdateError);
        return NextResponse.json(
          { error: "Failed to update listing meta data" },
          { status: 500 }
        );
      }
    }

    if (Object.keys(listingUpdates).length > 0) {
      const { error: listingUpdateError } = await supabaseAdmin
        .from("listings")
        .update(listingUpdates)
        .eq("listing_id", listingId);

      if (listingUpdateError) {
        console.error("Error updating listing:", listingUpdateError);
        return NextResponse.json(
          { error: "Failed to update listing" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Listing updated successfully",
        listing_id: listingId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in updateListing endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
