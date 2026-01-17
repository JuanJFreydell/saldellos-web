import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rebuildPublishTable } from "@/lib/publishTable";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth-server";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user profile from database
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    // 3. Check if requesting a single listing
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing_id");

    if (listingId) {
      // Verify ownership first
      const { data: listing, error: listingError } = await supabaseAdmin
        .from("listings")
        .select("owner_id")
        .eq("listing_id", listingId)
        .single();

      if (listingError || !listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 }
        );
      }

      if (listing.owner_id !== authUser.id) {
        return NextResponse.json(
          { error: "Forbidden: You are not the owner of this listing" },
          { status: 403 }
        );
      }

      // Use shared function to get full listing data
      const { getListingById } = await import("@/lib/getListingById");
      const listingData = await getListingById(listingId);

      if (!listingData) {
        return NextResponse.json(
          { error: "Failed to fetch listing data" },
          { status: 500 }
        );
      }

      return NextResponse.json({ listing: listingData });
    }

    // 4. Get listings for the authenticated user
    // TypeScript: supabaseAdmin is guaranteed to be non-null here due to early return above
    const adminClient = supabaseAdmin!;

    // Fetch listings with basic info, ordered by create_date
    const { data: userListings, error: userListingsError } = await adminClient
      .from("listings")
      .select("listing_id, title, thumbnail, price, create_date, status, subcategory_id")
      .eq("owner_id", authUser.id)
      .order("create_date", { ascending: false });

    if (userListingsError) {
      console.error("Error fetching user listings:", userListingsError);
      return NextResponse.json(
        { error: "Failed to fetch user listings" },
        { status: 500 }
      );
    }

    if (!userListings || userListings.length === 0) {
      return NextResponse.json({ listings: [] }, { status: 200 });
    }

    // Fetch additional data for each listing (addresses, categories)
    const listingsWithDetails = await Promise.all(
      userListings.map(async (listing) => {
        // Get address for coordinates
        const { data: address } = await adminClient
          .from("listing_addresses")
          .select("coordinates")
          .eq("listing_id", listing.listing_id)
          .single();

        // Get category
        let category = null;
        if (listing.subcategory_id) {
          const { data: subcategoryData } = await adminClient
            .from("listing_subcategories")
            .select("category_id")
            .eq("subcategory_id", listing.subcategory_id)
            .single();

          if (subcategoryData?.category_id) {
            const { data: categoryData } = await adminClient
              .from("listing_categories")
              .select("category_name")
              .eq("category_id", subcategoryData.category_id)
              .single();

            category = categoryData?.category_name || null;
          }
        }

        // Return format matching frontend expectations
        return {
          listing_id: listing.listing_id,
          title: listing.title,
          thumbnail: listing.thumbnail,
          coordinates: address?.coordinates || null,
          price: listing.price,
          listing_date: listing.create_date, // Map create_date to listing_date for frontend compatibility
          status: listing.status,
          category: category,
        };
      })
    );

    return NextResponse.json({ listings: listingsWithDetails }, { status: 200 });
  } catch (error) {
    console.error("Error in getListings endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface CreateListingRequest {
  owner_id: string;
  description: string;
  price: string;
  subcategory_id: string;
  title: string;
  thumbnail: string; // Thumbnail URL
  pictures?: string[]; // Array of photo URLs (optional)
  material_ids?: string[]; // Array of material IDs (optional)
  address_line_1: string;
  address_line_2?: string; // Optional
  neighborhood: string; // Neighborhood name (required)
  city: string; // City name (required)
  country: string; // Country name (required)
  coordinates: string;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // TypeScript: supabaseAdmin is guaranteed to be non-null here
    const adminClient = supabaseAdmin;

    // 2. Get user profile and validate active status
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    // 3. Parse and validate request body
    const body: CreateListingRequest = await request.json();

    // Validate required fields
    if (!body.owner_id || body.owner_id.trim() === "") {
      return NextResponse.json(
        { error: "owner_id is required" },
        { status: 400 }
      );
    }

    // Verify owner_id matches authenticated user
    if (body.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "owner_id must match authenticated user" },
        { status: 403 }
      );
    }

    if (!body.description || body.description.trim() === "") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!body.price || body.price.trim() === "") {
      return NextResponse.json(
        { error: "Price is required" },
        { status: 400 }
      );
    }

    if (!body.subcategory_id || body.subcategory_id.trim() === "") {
      return NextResponse.json(
        { error: "subcategory_id is required" },
        { status: 400 }
      );
    }

    if (!body.title || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!body.thumbnail || body.thumbnail.trim() === "") {
      return NextResponse.json(
        { error: "Thumbnail URL is required" },
        { status: 400 }
      );
    }

    if (!body.address_line_1 || body.address_line_1.trim() === "") {
      return NextResponse.json(
        { error: "address_line_1 is required" },
        { status: 400 }
      );
    }

    if (!body.coordinates || body.coordinates.trim() === "") {
      return NextResponse.json(
        { error: "Coordinates are required" },
        { status: 400 }
      );
    }

    if (!body.country || body.country.trim() === "") {
      return NextResponse.json(
        { error: "country is required" },
        { status: 400 }
      );
    }

    // Validation: city is required
    if (!body.city || body.city.trim() === "") {
      return NextResponse.json(
        { error: "city is required" },
        { status: 400 }
      );
    }

    // Validation: neighborhood is required
    if (!body.neighborhood || body.neighborhood.trim() === "") {
      return NextResponse.json(
        { error: "neighborhood is required" },
        { status: 400 }
      );
    }

    // 4. Validate hierarchy: country → city → neighborhood
    // All three are now required, so we validate the complete hierarchy

    // Get country_id
    const { data: countryData, error: countryError } = await adminClient
      .from("countries")
      .select("country_id")
      .ilike("country_name", body.country.trim())
      .single();

    if (countryError || !countryData) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    const countryId = countryData.country_id.toString();

    // Validate city belongs to country (city is now required)
    const { data: cityData, error: cityError } = await adminClient
      .from("listing_cities")
      .select("city_id")
      .ilike("city_name", body.city.trim())
      .eq("country_id", countryId)
      .single();

    if (cityError || !cityData) {
      return NextResponse.json(
        { error: "City not found in the specified country" },
        { status: 404 }
      );
    }

    const cityId = cityData.city_id.toString();

    // Validate neighborhood belongs to city (neighborhood is now required)
    const { data: neighborhoodData, error: neighborhoodError } = await adminClient
      .from("listing_neighborhoods")
      .select("neighborhood_id")
      .ilike("neighborhood_name", body.neighborhood.trim())
      .eq("city_id", cityId)
      .single();

    if (neighborhoodError || !neighborhoodData) {
      return NextResponse.json(
        { error: "Neighborhood not found in the specified city" },
        { status: 404 }
      );
    }

    const neighborhoodId = neighborhoodData.neighborhood_id.toString();

    // 5. Validate material_ids if provided
    const validMaterialIds: string[] = [];
    if (body.material_ids && Array.isArray(body.material_ids) && body.material_ids.length > 0) {
      // Check which material_ids exist in listing_standard_materials
      const { data: validMaterials, error: materialsError } = await adminClient
        .from("listing_standard_materials")
        .select("material_id")
        .in("material_id", body.material_ids);

      if (materialsError) {
        console.error("Error validating materials:", materialsError);
        return NextResponse.json(
          { error: "Failed to validate materials" },
          { status: 500 }
        );
      }

      if (validMaterials) {
        validMaterialIds.push(...validMaterials.map((m: any) => m.material_id));
      }
    }

    // 6. Generate listing_id
    const listingId = randomUUID();
    const createDate = new Date().toISOString();

    // 7. Create listing entry
    const { data: listingData, error: listingError } = await adminClient
      .from("listings")
      .insert({
        listing_id: listingId,
        owner_id: body.owner_id,
        description: body.description,
        price: body.price,
        create_date: createDate,
        subcategory_id: body.subcategory_id,
        title: body.title,
        status: "active",
        thumbnail: body.thumbnail,
      })
      .select()
      .single();

    if (listingError) {
      console.error("Error creating listing:", listingError);
      return NextResponse.json(
        { error: "Failed to create listing" },
        { status: 500 }
      );
    }

    // 8. Create listing_materials entries for valid materials
    if (validMaterialIds.length > 0) {
      const materialEntries = validMaterialIds.map((materialId) => ({
        listing_id: listingId,
        material_id: materialId,
      }));

      const { error: materialsInsertError } = await adminClient
        .from("listing_materials")
        .insert(materialEntries);

      if (materialsInsertError) {
        console.error("Error creating listing materials:", materialsInsertError);
        // Rollback: delete listing
        await adminClient
          .from("listings")
          .delete()
          .eq("listing_id", listingId);

        return NextResponse.json(
          { error: "Failed to create listing materials" },
          { status: 500 }
        );
      }
    }

    // 9. Create listing_photos entries if pictures provided
    if (body.pictures && Array.isArray(body.pictures) && body.pictures.length > 0) {
      const photoEntries = body.pictures.map((photoUrl, index) => ({
        listing_id: listingId,
        photo_url: photoUrl,
        photo_order: index,
      }));

      const { error: photosInsertError } = await adminClient
        .from("listing_photos")
        .insert(photoEntries);

      if (photosInsertError) {
        console.error("Error creating listing photos:", photosInsertError);
        // Rollback: delete listing, materials, and photos
        await adminClient
          .from("listing_materials")
          .delete()
          .eq("listing_id", listingId);
        await adminClient
          .from("listing_photos")
          .delete()
          .eq("listing_id", listingId);
        await adminClient
          .from("listings")
          .delete()
          .eq("listing_id", listingId);

        return NextResponse.json(
          { error: "Failed to create listing photos" },
          { status: 500 }
        );
      }
    }

    // 10. Create listing_address entry
    const { error: addressError } = await adminClient
      .from("listing_addresses")
      .insert({
        listing_id: listingId,
        address_line_1: body.address_line_1,
        address_line_2: body.address_line_2 || null,
        neighborhood_id: neighborhoodId,
        coordinates: body.coordinates,
      });

    if (addressError) {
      console.error("Error creating listing address:", addressError);
      // Rollback: delete listing, materials, and photos
      await adminClient
        .from("listing_materials")
        .delete()
        .eq("listing_id", listingId);
      await adminClient
        .from("listing_photos")
        .delete()
        .eq("listing_id", listingId);
      await adminClient
        .from("listings")
        .delete()
        .eq("listing_id", listingId);

      return NextResponse.json(
        { error: "Failed to create listing address" },
        { status: 500 }
      );
    }

    // Trigger rebuild of publish table asynchronously
    // Get category from subcategory
    const { data: subcategoryData } = await adminClient
      .from("listing_subcategories")
      .select("category_id")
      .eq("subcategory_id", body.subcategory_id)
      .single();

    if (subcategoryData) {
      const { data: categoryData } = await adminClient
        .from("listing_categories")
        .select("category_id, category_name")
        .eq("category_id", subcategoryData.category_id)
        .single();

      if (categoryData) {
        const { data: countryDataForRebuild } = await adminClient
          .from("countries")
          .select("country_id, country_name")
          .eq("country_id", countryId)
          .single();

        if (countryDataForRebuild) {
          // Rebuild asynchronously (don't wait)
          rebuildPublishTable({
            countryId: countryDataForRebuild.country_id.toString(),
            categoryId: categoryData.category_id.toString(),
            countryName: countryDataForRebuild.country_name,
            categoryName: categoryData.category_name,
          }).catch(err => {
            console.error('Background rebuild error after listing creation:', err);
          });
        }
      }
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
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user profile
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    if (userProfile.status !== "active") {
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
    if (listing.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this listing" },
        { status: 403 }
      );
    }

    // 6. Delete related data first (in order to respect foreign key constraints)
    // Delete photos
    const { error: photosDeleteError } = await supabaseAdmin
      .from("listing_photos")
      .delete()
      .eq("listing_id", listingId);

    if (photosDeleteError) {
      console.error("Error deleting listing photos:", photosDeleteError);
      // Continue with deletion even if photos deletion fails
    }

    // Delete materials
    const { error: materialsDeleteError } = await supabaseAdmin
      .from("listing_materials")
      .delete()
      .eq("listing_id", listingId);

    if (materialsDeleteError) {
      console.error("Error deleting listing materials:", materialsDeleteError);
      // Continue with deletion even if materials deletion fails
    }

    // Delete address
    const { error: addressDeleteError } = await supabaseAdmin
      .from("listing_addresses")
      .delete()
      .eq("listing_id", listingId);

    if (addressDeleteError) {
      console.error("Error deleting listing address:", addressDeleteError);
      // Continue with deletion even if address deletion fails
    }

    // 7. Delete from listings table (main table)
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
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user profile
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    if (userProfile.status !== "active") {
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

    if (listing.owner_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this listing" },
        { status: 403 }
      );
    }

    // 5. Build partial update payloads
    const listingUpdates: Record<string, unknown> = {};
    const addressUpdates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      listingUpdates.title = body.title;
    }

    if (body.description !== undefined) {
      listingUpdates.description = body.description;
    }

    if (body.price !== undefined) {
      listingUpdates.price = body.price;
    }

    if (body.thumbnail !== undefined) {
      listingUpdates.thumbnail = body.thumbnail;
    }

    if (body.address_line_1 !== undefined) {
      addressUpdates.address_line_1 = body.address_line_1;
    }

    if (body.address_line_2 !== undefined) {
      addressUpdates.address_line_2 = body.address_line_2;
    }

    if (body.coordinates !== undefined) {
      addressUpdates.coordinates = body.coordinates;
    }

    // Handle photos update
    if (body.pictures && Array.isArray(body.pictures) && body.pictures.length > 0) {
      // Delete existing photos and insert new ones
      await supabaseAdmin
        .from("listing_photos")
        .delete()
        .eq("listing_id", listingId);

      const photoEntries = body.pictures.map((photoUrl, index) => ({
        listing_id: listingId,
        photo_url: photoUrl,
        photo_order: index,
      }));

      const { error: photosInsertError } = await supabaseAdmin
        .from("listing_photos")
        .insert(photoEntries);

      if (photosInsertError) {
        console.error("Error updating listing photos:", photosInsertError);
        return NextResponse.json(
          { error: "Failed to update listing photos" },
          { status: 500 }
        );
      }

      // Update thumbnail to first photo
      listingUpdates.thumbnail = body.pictures[0];
    }

    // Handle neighborhood update if provided (requires hierarchy validation)
    if (body.neighborhood !== undefined || body.city !== undefined || body.country !== undefined) {
      // If any location field is being updated, all must be provided
      const country = body.country;
      const city = body.city;
      const neighborhood = body.neighborhood;

      // Validate that all location fields are provided when updating location
      if (country !== undefined || city !== undefined || neighborhood !== undefined) {
        if (!country || country.trim() === "") {
          return NextResponse.json(
            { error: "country is required when updating location" },
            { status: 400 }
          );
        }

        if (!city || city.trim() === "") {
          return NextResponse.json(
            { error: "city is required when updating location" },
            { status: 400 }
          );
        }

        if (!neighborhood || neighborhood.trim() === "") {
          return NextResponse.json(
            { error: "neighborhood is required when updating location" },
            { status: 400 }
          );
        }
      }

      // Now we know country, city, and neighborhood are all provided (non-null after validation)
      // Use type assertion since we've validated they exist
      const validatedCountry = country!;
      const validatedCity = city!;
      const validatedNeighborhood = neighborhood!;

      const { data: countryData } = await supabaseAdmin
        .from("countries")
        .select("country_id")
        .ilike("country_name", validatedCountry.trim())
        .single();

      if (!countryData) {
        return NextResponse.json(
          { error: "Country not found" },
          { status: 404 }
        );
      }

      const { data: cityData } = await supabaseAdmin
        .from("listing_cities")
        .select("city_id")
        .ilike("city_name", validatedCity.trim())
        .eq("country_id", countryData.country_id.toString())
        .single();

      if (!cityData) {
        return NextResponse.json(
          { error: "City not found in the specified country" },
          { status: 404 }
        );
      }

      const { data: neighborhoodData } = await supabaseAdmin
        .from("listing_neighborhoods")
        .select("neighborhood_id")
        .ilike("neighborhood_name", validatedNeighborhood.trim())
        .eq("city_id", cityData.city_id.toString())
        .single();

      if (!neighborhoodData) {
        return NextResponse.json(
          { error: "Neighborhood not found in the specified city" },
          { status: 404 }
        );
      }

      const neighborhoodId = neighborhoodData.neighborhood_id.toString();
      addressUpdates.neighborhood_id = neighborhoodId;
    }

    if (
      Object.keys(listingUpdates).length === 0 &&
      Object.keys(addressUpdates).length === 0 &&
      !(body.pictures && Array.isArray(body.pictures) && body.pictures.length > 0)
    ) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    // 6. Apply updates
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

    if (Object.keys(addressUpdates).length > 0) {
      const { error: addressUpdateError } = await supabaseAdmin
        .from("listing_addresses")
        .update(addressUpdates)
        .eq("listing_id", listingId);

      if (addressUpdateError) {
        console.error("Error updating listing address:", addressUpdateError);
        return NextResponse.json(
          { error: "Failed to update listing address" },
          { status: 500 }
        );
      }
    }

    // Trigger rebuild of publish table asynchronously
    // Get listing's subcategory to find category
    const { data: updatedListing } = await supabaseAdmin
      .from("listings")
      .select("subcategory_id")
      .eq("listing_id", listingId)
      .single();

    if (updatedListing?.subcategory_id) {
      const { data: subcategoryData } = await supabaseAdmin
        .from("listing_subcategories")
        .select("category_id")
        .eq("subcategory_id", updatedListing.subcategory_id)
        .single();

      if (subcategoryData) {
        const { data: categoryData } = await supabaseAdmin
          .from("listing_categories")
          .select("category_id, category_name")
          .eq("category_id", subcategoryData.category_id)
          .single();

        if (categoryData) {
          // Get country from listing address
          const { data: addressData } = await supabaseAdmin
            .from("listing_addresses")
            .select("neighborhood_id")
            .eq("listing_id", listingId)
            .single();

          if (addressData?.neighborhood_id) {
            const { data: neighborhoodData } = await supabaseAdmin
              .from("listing_neighborhoods")
              .select("city_id")
              .eq("neighborhood_id", addressData.neighborhood_id)
              .single();

            if (neighborhoodData?.city_id) {
              const { data: cityData } = await supabaseAdmin
                .from("listing_cities")
                .select("country_id")
                .eq("city_id", neighborhoodData.city_id)
                .single();

              if (cityData?.country_id) {
                const { data: countryData } = await supabaseAdmin
                  .from("countries")
                  .select("country_id, country_name")
                  .eq("country_id", cityData.country_id)
                  .single();

                if (countryData) {
                  // Rebuild asynchronously (don't wait)
                  rebuildPublishTable({
                    countryId: countryData.country_id.toString(),
                    categoryId: categoryData.category_id.toString(),
                    countryName: countryData.country_name,
                    categoryName: categoryData.category_name,
                  }).catch(err => {
                    console.error('Background rebuild error after listing update:', err);
                  });
                }
              }
            }
          }
        }
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
