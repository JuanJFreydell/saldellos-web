import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get listing_id from query parameters
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing_id");

    if (!listingId) {
      return NextResponse.json(
        { error: "listing_id parameter is required" },
        { status: 400 }
      );
    }

    // Fetch listing data from listings table
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("listing_id", listingId)
      .single();

    if (listingError || !listingData) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Fetch listing metadata from listings_meta_data table
    const { data: listingMetadata, error: metadataError } = await supabaseAdmin
      .from("listings_meta_data")
      .select("*")
      .eq("listing_id", listingId)
      .single();

    if (metadataError || !listingMetadata) {
      return NextResponse.json(
        { error: "Listing metadata not found" },
        { status: 404 }
      );
    }

    // Combine both data sources
    return NextResponse.json(
      {
        listing_id: listingId,
        listing_data: listingData,
        listing_metadata: listingMetadata,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getListingById endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

