import { NextResponse } from 'next/server';
import { rebuildPublishTable } from '@/lib/publishTable';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Optional: Add authentication/authorization here
    // For now, you might want to add a secret key check
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { country, category } = body;

    if (!country || !category) {
      return NextResponse.json(
        { error: 'country and category are required' },
        { status: 400 }
      );
    }

    // Get country and category IDs
    const { data: countryData, error: countryError } = await supabaseAdmin
      .from('countries')
      .select('country_id, country_name')
      .ilike('country_name', country.trim())
      .single();

    if (countryError || !countryData) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('listing_categories')
      .select('category_id, category_name')
      .ilike('category_name', category.trim())
      .single();

    if (categoryError || !categoryData) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Rebuild asynchronously
    rebuildPublishTable({
      countryId: countryData.country_id.toString(),
      categoryId: categoryData.category_id.toString(),
      countryName: countryData.country_name,
      categoryName: categoryData.category_name,
    }).catch(error => {
      console.error('Error rebuilding publish table:', error);
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Rebuild started',
      country: countryData.country_name,
      category: categoryData.category_name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in rebuild API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
