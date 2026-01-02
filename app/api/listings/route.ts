import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

    // Parse and validate request body
    const body: ListingsRequest = await request.json();
    const { country, category, city, neighborhood, batch = 1 } = body;

    // Validation: country is required
    if (!country || country.trim() === "") {
      return NextResponse.json(
        { error: "country parameter is required" },
        { status: 400 }
      );
    }

    // Validation: category is required
    if (!category || category.trim() === "") {
      return NextResponse.json(
        { error: "category parameter is required" },
        { status: 400 }
      );
    }

    // Validation: city requires country
    if (city && !country) {
      return NextResponse.json(
        { error: "country is required when city is provided" },
        { status: 400 }
      );
    }

    // Validation: neighborhood requires city
    if (neighborhood && !city) {
      return NextResponse.json(
        { error: "city is required when neighborhood is provided" },
        { status: 400 }
      );
    }

    // Validation: batch must be >= 1
    if (batch < 1) {
      return NextResponse.json(
        { error: "batch must be >= 1" },
        { status: 400 }
      );
    }

    // Calculate pagination
    const limit = 100;
    const offset = (batch - 1) * limit;

    // Get country_id
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

    // Get category_id
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

    // Get all subcategories for this category
    const { data: subcategories, error: subcategoriesError } = await adminClient
      .from("listing_subcategories")
      .select("subcategory_id")
      .eq("category_id", categoryId);

    if (subcategoriesError) {
      console.error("Error fetching subcategories:", subcategoriesError);
      return NextResponse.json(
        { error: "Failed to fetch subcategories" },
        { status: 500 }
      );
    }

    const subcategoryIds = subcategories?.map((s: any) => s.subcategory_id.toString()) || [];

    // If no subcategories exist for this category, return empty result
    if (subcategoryIds.length === 0) {
      return NextResponse.json({
        listings: [],
        batch,
        count: 0,
        total: 0,
      }, { status: 200 });
    }

    // Build filter chain based on hierarchy
    let listingIds: string[] = [];

    if (neighborhood) {
      // Filter by neighborhood (most specific)
      // 1. Find neighborhood by name
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

      // 2. Verify city matches if city was provided
      if (city) {
        const { data: cityData } = await adminClient
          .from("listing_cities")
          .select("city_id, city_name")
          .eq("city_id", neighborhoodData.city_id)
          .single();

        if (!cityData || cityData.city_name.toLowerCase() !== city.trim().toLowerCase()) {
          return NextResponse.json(
            { error: "Neighborhood does not belong to the specified city" },
            { status: 400 }
          );
        }
      }

      // 3. Get listing_ids from addresses in this neighborhood
      const { data: addresses } = await adminClient
        .from("listing_addresses")
        .select("listing_id")
        .eq("neighborhood_id", neighborhoodData.neighborhood_id.toString());

      listingIds = addresses?.map((a: any) => a.listing_id) || [];

    } else if (city) {
      // Filter by city
      // 1. Find city by name
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

      // 2. Get neighborhoods in this city
      const { data: neighborhoods } = await adminClient
        .from("listing_neighborhoods")
        .select("neighborhood_id")
        .eq("city_id", cityData.city_id.toString());

      const neighborhoodIds = neighborhoods?.map((n: any) => n.neighborhood_id.toString()) || [];

      if (neighborhoodIds.length === 0) {
        listingIds = [];
      } else {
        // 3. Get listing_ids from addresses in these neighborhoods
        const { data: addresses } = await adminClient
          .from("listing_addresses")
          .select("listing_id")
          .in("neighborhood_id", neighborhoodIds);

        listingIds = addresses?.map((a: any) => a.listing_id) || [];
      }

    } else {
      // Filter by country only
      // 1. Get cities in country
      const { data: cities } = await adminClient
        .from("listing_cities")
        .select("city_id")
        .eq("country_id", countryId);

      const cityIds = cities?.map((c: any) => c.city_id.toString()) || [];

      if (cityIds.length === 0) {
        listingIds = [];
      } else {
        // 2. Get neighborhoods in those cities
        const { data: neighborhoods } = await adminClient
          .from("listing_neighborhoods")
          .select("neighborhood_id")
          .in("city_id", cityIds);

        const neighborhoodIds = neighborhoods?.map((n: any) => n.neighborhood_id.toString()) || [];

        if (neighborhoodIds.length === 0) {
          listingIds = [];
        } else {
          // 3. Get listing_ids from addresses in those neighborhoods
          const { data: addresses } = await adminClient
            .from("listing_addresses")
            .select("listing_id")
            .in("neighborhood_id", neighborhoodIds);

          listingIds = addresses?.map((a: any) => a.listing_id) || [];
        }
      }
    }

    // If no listings match, return empty result
    if (listingIds.length === 0) {
      return NextResponse.json({
        listings: [],
        batch,
        count: 0,
        total: 0,
      }, { status: 200 });
    }

    // Get total count (for pagination info) - filter by category via subcategories
    const { count: totalCount, error: countError } = await adminClient
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .in("listing_id", listingIds)
      .in("subcategory_id", subcategoryIds);

    if (countError) {
      console.error("Error counting listings:", countError);
      return NextResponse.json(
        { error: "Failed to count listings" },
        { status: 500 }
      );
    }

    const total = totalCount || 0;

    // Get paginated listings ordered by title - filter by category via subcategories
    const { data: listings, error: listingsError } = await adminClient
      .from("listings")
      .select(`
        listing_id,
        description,
        title,
        price,
        thumbnail,
        subcategory_id
      `)
      .eq("status", "active")
      .in("listing_id", listingIds)
      .in("subcategory_id", subcategoryIds)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (listingsError) {
      console.error("Error fetching listings:", listingsError);
    return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        listings: [],
        batch,
        count: 0,
        total,
      }, { status: 200 });
    }

    // Transform listings with all related data
    const transformedListings = await Promise.all(
      listings.map(async (listing: any) => {
        // Get address data
        const { data: address } = await adminClient
          .from("listing_addresses")
          .select("coordinates, neighborhood_id")
          .eq("listing_id", listing.listing_id)
          .single();

        let neighborhood = null;
        let city = null;
        let country = null;

        if (address?.neighborhood_id) {
          const { data: neighborhoodData } = await adminClient
            .from("listing_neighborhoods")
            .select("neighborhood_name, city_id")
            .eq("neighborhood_id", address.neighborhood_id)
            .single();

          neighborhood = neighborhoodData?.neighborhood_name || null;

          if (neighborhoodData?.city_id) {
            const { data: cityData } = await adminClient
              .from("listing_cities")
              .select("city_name, country_id")
              .eq("city_id", neighborhoodData.city_id)
              .single();

            city = cityData?.city_name || null;

            if (cityData?.country_id) {
              const { data: countryData } = await adminClient
                .from("countries")
                .select("country_name")
                .eq("country_id", cityData.country_id)
                .single();

              country = countryData?.country_name || null;
            }
          }
        }

        // Get subcategory and category
        let subcategory = null;
        let category = null;

        if (listing.subcategory_id) {
          const { data: subcategoryData } = await adminClient
            .from("listing_subcategories")
            .select("subcategory_name, category_id")
            .eq("subcategory_id", listing.subcategory_id)
            .single();

          subcategory = subcategoryData?.subcategory_name || null;

          if (subcategoryData?.category_id) {
            const { data: categoryData } = await adminClient
              .from("listing_categories")
              .select("category_name")
              .eq("category_id", subcategoryData.category_id)
              .single();

            category = categoryData?.category_name || null;
          }
        }

        return {
          listing_id: listing.listing_id,
          description: listing.description,
          title: listing.title,
          subcategory,
          category,
          price: listing.price,
          thumbnail: listing.thumbnail,
          coordinates: address?.coordinates || null,
          neighborhood,
          city,
          country,
        };
      })
    );

    return NextResponse.json({
      listings: transformedListings,
      batch,
      count: transformedListings.length,
      total,
    }, { status: 200 });

  } catch (error) {
    console.error("Error in getListings endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
