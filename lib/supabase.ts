import { createClient } from '@supabase/supabase-js'
import type { User, InsertUser, UpdateUser } from '@/supabase/types/users'
import type { Listing } from '@/supabase/types/listings'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

// Client-side Supabase client (uses publishable key, respects RLS)
// This client automatically uses PKCE for authentication in the browser
// Only use this for public/unauthenticated operations and client-side auth
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Explicitly use PKCE flow
  }
})

// Server-side Supabase client (uses secret key, bypasses RLS)
// Use this in API routes and server components for authenticated operations
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
export const supabaseAdmin = secretKey 
  ? createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null





export async function createListing(listingData: Listing){
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_SECRET_KEY in .env.local')
  }
  const { data, error } = await supabaseAdmin
  .from('listings')
  .insert({
    listing_id: listingData.listing_id,
    owner_id: listingData.owner_id,
    title: listingData.title,
    description: listingData.description,
    neighborhood_id: listingData.neighborhood_id,
    listing_date: listingData.listing_date, // ISO timestamp string
    number_of_prints: listingData.number_of_prints,
    number_of_visits: listingData.number_of_visits,
    status: listingData.status
  })
  .select()
  .single()

if (error) {
  console.error('Error creating listing:', error)
  return null
}

return data
}


// email: profile.email,
// nextauth_id: user.id,
// first_names: givenName,
// last_names: familyName,
// status: 'active',

// Upsert user: checks if user exists by email, creates if not, updates if exists
// IMPORTANT: Use this in API routes or server components only (uses admin client)
export async function upsertUser(userData: {
  email: string;
  nextauth_id: string;
  first_names?: string | null;
  last_names?: string | null;  
  status?: string;
}): Promise<User | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_SECRET_KEY in .env.local')
  }

  // Check if user exists by email
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', userData.email)
    .single()

  if (existingUser) {
    // User exists - update with new info
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        first_names: userData.first_names ?? existingUser.first_names,
        last_names: userData.last_names ?? existingUser.last_names,
        nextauth_id: userData.nextauth_id,
        status: userData.status ?? existingUser.status,
      })
      .eq('user_id', existingUser.user_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return null
    }

    return data
  } else {
    // User doesn't exist - create new
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: userData.email,
        nextauth_id: userData.nextauth_id,
        first_names: userData.first_names ?? null,
        last_names: userData.last_names ?? null,
        status: userData.status ?? 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return null
    }

    return data
  }
}