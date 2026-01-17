import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPublishTableName } from "@/lib/publishTable";

interface ListingsRequest {
  country: string;           // Required
  category: string;          // Required
  city?: string;              // Optional (requires country)
  neighborhood?: string;      // Optional (requires city)
  batch?: number;            // Optional, defaults to 1
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const adminClient = supabaseAdmin;
    const body: ListingsRequest = await request.json();
    const { country, category, city, neighborhood, batch = 1 } = body;

    // Validation
    if (!country || country.trim() === "") {
      return NextResponse.json(
        { error: "country parameter is required" },
        { status: 400 }
      );
    }

    if (!category || category.trim() === "") {
      return NextResponse.json(
        { error: "category parameter is required" },
        { status: 400 }
      );
    }

    if (batch < 1) {
      return NextResponse.json(
        { error: "batch must be >= 1" },
        { status: 400 }
      );
    }

    // Calculate pagination
    const limit = 100;
    const offset = (batch - 1) * limit;

    // Get country_id and category_id
    const { data: countryData, error: countryError } = await adminClient
      .from("countries")
      .select("country_id")
      .ilike("country_name", country.trim())
      .single();

    if (countryError || !countryData) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    const countryId = countryData.country_id.toString();

    const { data: categoryData, error: categoryError } = await adminClient
      .from("listing_categories")
      .select("category_id")
      .ilike("category_name", category.trim())
      .single();

    if (categoryError || !categoryData) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const categoryId = categoryData.category_id.toString();
    // Always use name-based table naming (new scheme)
    const tableName = getPublishTableName(country.trim(), category.trim());
    
    // Log the table name being used for debugging
    console.log(`Using publish table: ${tableName} for country="${country.trim()}" category="${category.trim()}"`);

    // Try to ensure the publish table exists (create if it doesn't)
    try {
      await adminClient.rpc('create_publish_table', {
        p_country_name: country.trim(),
        p_category_name: category.trim(),
      });
    } catch (rpcError: any) {
      // If function doesn't exist or has wrong signature, it means migration 018 hasn't been run
      if (rpcError.message?.includes('function create_publish_table') || rpcError.code === '42883') {
        console.error('ERROR: Database function create_publish_table with name-based parameters not found. Please run migration 018_update_publish_table_function_names.sql');
      }
      // Ignore other errors - table might already exist
      console.log('Note: Could not create publish table (might already exist):', rpcError);
    }

    // Build query on publish table
    let query = adminClient
      .from(tableName)
      .select("*")
      .eq("country_id", countryId)
      .eq("category_id", categoryId);

    // Apply city filter if provided
    if (city) {
      const { data: cityData, error: cityError } = await adminClient
        .from("listing_cities")
        .select("city_id")
        .ilike("city_name", city.trim())
        .eq("country_id", countryId)
        .single();

      if (cityError || !cityData) {
        return NextResponse.json(
          { error: "City not found in the specified country" },
          { status: 404 }
        );
      }

      query = query.eq("city_id", cityData.city_id.toString());
    }

    // Apply neighborhood filter if provided
    if (neighborhood) {
      if (!city) {
        return NextResponse.json(
          { error: "city is required when neighborhood is provided" },
          { status: 400 }
        );
      }

      const { data: neighborhoodData, error: neighborhoodError } = await adminClient
        .from("listing_neighborhoods")
        .select("neighborhood_id, city_id")
        .ilike("neighborhood_name", neighborhood.trim())
        .single();

      if (neighborhoodError || !neighborhoodData) {
        return NextResponse.json(
          { error: "Neighborhood not found" },
          { status: 404 }
        );
      }

      // Verify neighborhood belongs to city
      if (city) {
        const { data: cityData } = await adminClient
          .from("listing_cities")
          .select("city_id")
          .ilike("city_name", city.trim())
          .eq("country_id", countryId)
          .single();

        if (cityData?.city_id.toString() !== neighborhoodData.city_id.toString()) {
          return NextResponse.json(
            { error: "Neighborhood does not belong to the specified city" },
            { status: 400 }
          );
        }
      }

      query = query.eq("neighborhood_id", neighborhoodData.neighborhood_id.toString());
    }

    // Get total count - clone the query for count
    const countQuery = adminClient
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .eq("country_id", countryId)
      .eq("category_id", categoryId);

    if (city) {
      const { data: cityData } = await adminClient
        .from("listing_cities")
        .select("city_id")
        .ilike("city_name", city.trim())
        .eq("country_id", countryId)
        .single();

      if (cityData) {
        countQuery.eq("city_id", cityData.city_id.toString());
      }
    }

    if (neighborhood) {
      const { data: neighborhoodData } = await adminClient
        .from("listing_neighborhoods")
        .select("neighborhood_id")
        .ilike("neighborhood_name", neighborhood.trim())
        .single();

      if (neighborhoodData) {
        countQuery.eq("neighborhood_id", neighborhoodData.neighborhood_id.toString());
      }
    }

    const { count: total, error: countError } = await countQuery;

    if (countError) {
      // If table doesn't exist, return empty result (cache not built yet)
      if (countError.code === 'PGRST116' || countError.code === 'PGRST205' || countError.message.includes('does not exist') || countError.message.includes('schema cache')) {
        console.log(`Publish table ${tableName} does not exist yet. Returning empty results.`);
        return NextResponse.json({
          listings: [],
          batch,
          count: 0,
          total: 0,
        }, { status: 200 });
      }
      console.error("Error counting listings:", countError);
      return NextResponse.json(
        { error: "Failed to count listings" },
        { status: 500 }
      );
    }

    // Get paginated results
    const { data: listings, error: listingsError } = await query
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (listingsError) {
      // If table doesn't exist, return empty result (cache not built yet)
      if (listingsError.code === 'PGRST116' || listingsError.code === 'PGRST205' || listingsError.message.includes('does not exist') || listingsError.message.includes('schema cache')) {
        console.log(`Publish table ${tableName} does not exist yet. Returning empty results.`);
        return NextResponse.json({
          listings: [],
          batch,
          count: 0,
          total: 0,
        }, { status: 200 });
      }
      console.error("Error fetching listings:", listingsError);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    // Transform to match API response format (remove internal IDs)
    const transformedListings = (listings || []).map((listing: any) => ({
      listing_id: listing.listing_id,
      description: listing.description,
      title: listing.title,
      subcategory: listing.subcategory,
      category: listing.category,
      price: listing.price,
      thumbnail: listing.thumbnail,
      coordinates: listing.coordinates,
      neighborhood: listing.neighborhood,
      city: listing.city,
      country: listing.country,
    }));

    return NextResponse.json({
      listings: transformedListings,
      batch,
      count: transformedListings.length,
      total: total || 0,
    }, { status: 200 });

  } catch (error) {
    console.error("Error in getListings endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
