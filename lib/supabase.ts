import { createClient } from '@supabase/supabase-js'
import type { UserProfile, InsertUserProfile, UpdateUserProfile } from '@/supabase/types/users'
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





// Helper function to get user profile by auth_user_id
export async function getUserProfile(authUserId: string): Promise<UserProfile | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_SECRET_KEY in .env.local')
  }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

// Helper function to update user profile
export async function updateUserProfile(
  authUserId: string,
  updates: UpdateUserProfile
): Promise<UserProfile | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_SECRET_KEY in .env.local')
  }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('auth_user_id', authUserId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}