import { NextResponse } from 'next/server';
import { rebuildPublishTable } from '@/lib/publishTable';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth-server';

/**
 * Rebuild cache for a specific listing
 * Called by frontend after creating or updating a listing
 */
export async function POST(request: Request) {
  try {
    // Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { listing_id, country, category } = body;

    let countryData: { country_id: string; country_name: string } | null = null;
    let categoryData: { category_id: string; category_name: string } | null = null;

    // Option 1: If country and category are provided directly, use them
    if (country && category) {
      const { data: countryResult, error: countryError } = await supabaseAdmin
        .from('countries')
        .select('country_id, country_name')
        .ilike('country_name', country.trim())
        .single();

      if (countryError || !countryResult) {
        return NextResponse.json(
          { error: 'Country not found' },
          { status: 404 }
        );
      }

      const { data: categoryResult, error: categoryError } = await supabaseAdmin
        .from('listing_categories')
        .select('category_id, category_name')
        .ilike('category_name', category.trim())
        .single();

      if (categoryError || !categoryResult) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }

      countryData = countryResult;
      categoryData = categoryResult;
    }
    // Option 2: If listing_id is provided, look up country and category from listing
    else if (listing_id) {
      // Get listing's subcategory to find category
      const { data: listingData, error: listingError } = await supabaseAdmin
        .from('listings')
        .select('subcategory_id')
        .eq('listing_id', listing_id)
        .single();

      if (listingError || !listingData) {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }

      // Get category from subcategory
      const { data: subcategoryData, error: subcategoryError } = await supabaseAdmin
        .from('listing_subcategories')
        .select('category_id')
        .eq('subcategory_id', listingData.subcategory_id)
        .single();

      if (subcategoryError || !subcategoryData) {
        return NextResponse.json(
          { error: 'Subcategory not found' },
          { status: 404 }
        );
      }

      // Get category details
      const { data: categoryResult, error: categoryError } = await supabaseAdmin
        .from('listing_categories')
        .select('category_id, category_name')
        .eq('category_id', subcategoryData.category_id)
        .single();

      if (categoryError || !categoryResult) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }

      // Get country from listing address
      const { data: addressData, error: addressError } = await supabaseAdmin
        .from('listing_addresses')
        .select('neighborhood_id')
        .eq('listing_id', listing_id)
        .single();

      if (addressError || !addressData) {
        return NextResponse.json(
          { error: 'Listing address not found' },
          { status: 404 }
        );
      }

      // Get neighborhood -> city -> country
      const { data: neighborhoodData, error: neighborhoodError } = await supabaseAdmin
        .from('listing_neighborhoods')
        .select('city_id')
        .eq('neighborhood_id', addressData.neighborhood_id)
        .single();

      if (neighborhoodError || !neighborhoodData) {
        return NextResponse.json(
          { error: 'Neighborhood not found' },
          { status: 404 }
        );
      }

      const { data: cityData, error: cityError } = await supabaseAdmin
        .from('listing_cities')
        .select('country_id')
        .eq('city_id', neighborhoodData.city_id)
        .single();

      if (cityError || !cityData) {
        return NextResponse.json(
          { error: 'City not found' },
          { status: 404 }
        );
      }

      // Get country details
      const { data: countryResult, error: countryError } = await supabaseAdmin
        .from('countries')
        .select('country_id, country_name')
        .eq('country_id', cityData.country_id)
        .single();

      if (countryError || !countryResult) {
        return NextResponse.json(
          { error: 'Country not found' },
          { status: 404 }
        );
      }

      countryData = countryResult;
      categoryData = categoryResult;
    } else {
      return NextResponse.json(
        { error: 'Either listing_id or both country and category are required' },
        { status: 400 }
      );
    }

    // Trigger rebuild asynchronously (don't wait)
    rebuildPublishTable({
      countryId: countryData.country_id.toString(),
      categoryId: categoryData.category_id.toString(),
      countryName: countryData.country_name,
      categoryName: categoryData.category_name,
    }).catch(error => {
      console.error('Error rebuilding cache:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Cache rebuild started',
      country: countryData.country_name,
      category: categoryData.category_name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in rebuild-cache API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
