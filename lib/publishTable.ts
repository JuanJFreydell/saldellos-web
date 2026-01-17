import { supabaseAdmin } from '@/lib/supabase';

interface PublishTableConfig {
  countryId: string;
  categoryId: string;
  countryName: string;
  categoryName: string;
}

/**
 * Get the table name for a country+category combination
 */
export function getPublishTableName(countryId: string, categoryId: string): string {
  // Replace UUID dashes with underscores for valid table name
  const countryIdClean = countryId.replace(/-/g, '_');
  const categoryIdClean = categoryId.replace(/-/g, '_');
  return `listing_publish_${countryIdClean}_${categoryIdClean}`;
}

/**
 * Create a publish table if it doesn't exist
 * Uses the database function to create the table dynamically
 */
async function ensurePublishTableMetadata(countryId: string, categoryId: string): Promise<string> {
  const tableName = getPublishTableName(countryId, categoryId);
  
  // Check if metadata exists
  const { data: metadata } = await supabaseAdmin
    .from('listing_publish_metadata')
    .select('table_name')
    .eq('country_id', countryId)
    .eq('category_id', categoryId)
    .single();

  if (metadata) {
    return tableName; // Metadata already exists, table should exist
  }

  // Create the table using the database function
  const { data: createdTableName, error: createError } = await supabaseAdmin
    .rpc('create_publish_table', {
      p_country_id: countryId,
      p_category_id: categoryId,
    });

  if (createError) {
    console.error(`Error creating publish table ${tableName}:`, createError);
    // Continue anyway - table might already exist
  }

  // Insert metadata
  await supabaseAdmin
    .from('listing_publish_metadata')
    .insert({
      country_id: countryId,
      category_id: categoryId,
      table_name: tableName,
      last_rebuilt_at: null,
      rebuild_in_progress: false,
    });

  return tableName;
}

/**
 * Rebuild a specific publish table
 */
export async function rebuildPublishTable(config: PublishTableConfig): Promise<void> {
  const { countryId, categoryId, countryName, categoryName } = config;
  const tableName = await ensurePublishTableMetadata(countryId, categoryId);

  console.log(`Starting rebuild for ${tableName} (${countryName} - ${categoryName})`);

  // Mark as rebuilding
  await supabaseAdmin
    .from('listing_publish_metadata')
    .update({ rebuild_in_progress: true })
    .eq('country_id', countryId)
    .eq('category_id', categoryId);

  try {
    // 1. Clear existing data
    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .neq('listing_id', ''); // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      // PGRST116 is "relation does not exist" - that's okay for first build
      console.error(`Error clearing ${tableName}:`, deleteError);
    }

    // 2. Get all subcategories for this category
    const { data: subcategories, error: subcategoriesError } = await supabaseAdmin
      .from('listing_subcategories')
      .select('subcategory_id')
      .eq('category_id', categoryId);

    if (subcategoriesError) {
      throw new Error(`Failed to fetch subcategories: ${subcategoriesError.message}`);
    }

    const subcategoryIds = subcategories?.map(s => s.subcategory_id.toString()) || [];

    if (subcategoryIds.length === 0) {
      // No subcategories, mark as complete
      await supabaseAdmin
        .from('listing_publish_metadata')
        .update({ 
          rebuild_in_progress: false,
          last_rebuilt_at: new Date().toISOString(),
        })
        .eq('country_id', countryId)
        .eq('category_id', categoryId);
      console.log(`No subcategories found for ${categoryName}, skipping rebuild`);
      return;
    }

    // 3. Get all cities in country
    const { data: cities, error: citiesError } = await supabaseAdmin
      .from('listing_cities')
      .select('city_id')
      .eq('country_id', countryId);

    if (citiesError) {
      throw new Error(`Failed to fetch cities: ${citiesError.message}`);
    }

    const cityIds = cities?.map(c => c.city_id.toString()) || [];

    if (cityIds.length === 0) {
      await supabaseAdmin
        .from('listing_publish_metadata')
        .update({ 
          rebuild_in_progress: false,
          last_rebuilt_at: new Date().toISOString(),
        })
        .eq('country_id', countryId)
        .eq('category_id', categoryId);
      console.log(`No cities found for ${countryName}, skipping rebuild`);
      return;
    }

    // 4. Get neighborhoods in those cities
    const { data: neighborhoods, error: neighborhoodsError } = await supabaseAdmin
      .from('listing_neighborhoods')
      .select('neighborhood_id')
      .in('city_id', cityIds);

    if (neighborhoodsError) {
      throw new Error(`Failed to fetch neighborhoods: ${neighborhoodsError.message}`);
    }

    const neighborhoodIds = neighborhoods?.map(n => n.neighborhood_id.toString()) || [];

    if (neighborhoodIds.length === 0) {
      await supabaseAdmin
        .from('listing_publish_metadata')
        .update({ 
          rebuild_in_progress: false,
          last_rebuilt_at: new Date().toISOString(),
        })
        .eq('country_id', countryId)
        .eq('category_id', categoryId);
      console.log(`No neighborhoods found, skipping rebuild`);
      return;
    }

    // 5. Get listing_ids from addresses
    const { data: addresses, error: addressesError } = await supabaseAdmin
      .from('listing_addresses')
      .select('listing_id, neighborhood_id')
      .in('neighborhood_id', neighborhoodIds);

    if (addressesError) {
      throw new Error(`Failed to fetch addresses: ${addressesError.message}`);
    }

    const listingIds = addresses?.map(a => a.listing_id) || [];

    if (listingIds.length === 0) {
      await supabaseAdmin
        .from('listing_publish_metadata')
        .update({ 
          rebuild_in_progress: false,
          last_rebuilt_at: new Date().toISOString(),
        })
        .eq('country_id', countryId)
        .eq('category_id', categoryId);
      console.log(`No listings found, skipping rebuild`);
      return;
    }

    // 6. Get all active listings
    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select(`
        listing_id,
        description,
        title,
        price,
        thumbnail,
        subcategory_id
      `)
      .eq('status', 'active')
      .in('listing_id', listingIds)
      .in('subcategory_id', subcategoryIds);

    if (listingsError) {
      throw new Error(`Failed to fetch listings: ${listingsError.message}`);
    }

    if (!listings || listings.length === 0) {
      await supabaseAdmin
        .from('listing_publish_metadata')
        .update({ 
          rebuild_in_progress: false,
          last_rebuilt_at: new Date().toISOString(),
        })
        .eq('country_id', countryId)
        .eq('category_id', categoryId);
      console.log(`No active listings found, skipping rebuild`);
      return;
    }

    console.log(`Processing ${listings.length} listings for ${tableName}`);

    // 7. Transform listings (same logic as current API)
    const transformedListings = await Promise.all(
      listings.map(async (listing: any) => {
        // Get address data
        const { data: address } = await supabaseAdmin
          .from('listing_addresses')
          .select('coordinates, neighborhood_id')
          .eq('listing_id', listing.listing_id)
          .single();

        let neighborhood = null;
        let city = null;
        let country = null;
        let neighborhoodId = null;
        let cityId = null;

        if (address?.neighborhood_id) {
          neighborhoodId = address.neighborhood_id;
          const { data: neighborhoodData } = await supabaseAdmin
            .from('listing_neighborhoods')
            .select('neighborhood_name, city_id')
            .eq('neighborhood_id', address.neighborhood_id)
            .single();

          neighborhood = neighborhoodData?.neighborhood_name || null;
          cityId = neighborhoodData?.city_id || null;

          if (neighborhoodData?.city_id) {
            const { data: cityData } = await supabaseAdmin
              .from('listing_cities')
              .select('city_name, country_id')
              .eq('city_id', neighborhoodData.city_id)
              .single();

            city = cityData?.city_name || null;

            if (cityData?.country_id) {
              const { data: countryData } = await supabaseAdmin
                .from('countries')
                .select('country_name')
                .eq('country_id', cityData.country_id)
                .single();

              country = countryData?.country_name || null;
            }
          }
        }

        // Get subcategory and category
        let subcategory = null;
        let category = null;
        let subcategoryId = null;

        if (listing.subcategory_id) {
          subcategoryId = listing.subcategory_id;
          const { data: subcategoryData } = await supabaseAdmin
            .from('listing_subcategories')
            .select('subcategory_name, category_id')
            .eq('subcategory_id', listing.subcategory_id)
            .single();

          subcategory = subcategoryData?.subcategory_name || null;

          if (subcategoryData?.category_id) {
            const { data: categoryData } = await supabaseAdmin
              .from('listing_categories')
              .select('category_name')
              .eq('category_id', subcategoryData.category_id)
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
          country_id: countryId,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          city_id: cityId,
          neighborhood_id: neighborhoodId,
        };
      })
    );

    // 8. Insert into publish table
    if (transformedListings.length > 0) {
      // Insert in batches to avoid payload size limits
      const batchSize = 100;
      for (let i = 0; i < transformedListings.length; i += batchSize) {
        const batch = transformedListings.slice(i, i + batchSize);
        const { error: insertError } = await supabaseAdmin
          .from(tableName)
          .insert(batch);

        if (insertError) {
          // If table doesn't exist, we need to create it first
          if (insertError.code === 'PGRST116' || insertError.message.includes('does not exist')) {
            throw new Error(`Publish table ${tableName} does not exist. Please create it via migration first.`);
          }
          throw new Error(`Failed to insert into ${tableName}: ${insertError.message}`);
        }
      }
    }

    // 9. Update metadata
    await supabaseAdmin
      .from('listing_publish_metadata')
      .update({ 
        rebuild_in_progress: false,
        last_rebuilt_at: new Date().toISOString(),
      })
      .eq('country_id', countryId)
      .eq('category_id', categoryId);

    console.log(`Successfully rebuilt ${tableName} with ${transformedListings.length} listings`);

  } catch (error) {
    console.error(`Error rebuilding publish table ${tableName}:`, error);
    
    // Mark as not rebuilding on error
    await supabaseAdmin
      .from('listing_publish_metadata')
      .update({ rebuild_in_progress: false })
      .eq('country_id', countryId)
      .eq('category_id', categoryId);
    
    throw error;
  }
}

/**
 * Rebuild all publish tables (for scheduled job)
 */
export async function rebuildAllPublishTables(): Promise<void> {
  console.log('Starting rebuild of all publish tables');
  
  // Get Colombia + "para la venta" (current use case)
  const { data: colombia, error: colombiaError } = await supabaseAdmin
    .from('countries')
    .select('country_id, country_name')
    .ilike('country_name', 'Colombia')
    .single();

  if (colombiaError || !colombia) {
    console.error('Error fetching Colombia:', colombiaError);
    return;
  }

  const { data: category, error: categoryError } = await supabaseAdmin
    .from('listing_categories')
    .select('category_id, category_name')
    .ilike('category_name', 'para la venta')
    .single();

  if (categoryError || !category) {
    console.error('Error fetching category:', categoryError);
    return;
  }

  await rebuildPublishTable({
    countryId: colombia.country_id.toString(),
    categoryId: category.category_id.toString(),
    countryName: colombia.country_name,
    categoryName: category.category_name,
  });
}
