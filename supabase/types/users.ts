// TypeScript types for the user_profiles table
// Note: auth_user_id references auth.users(id) from Supabase Auth
export interface UserProfile {
  auth_user_id: string; // UUID - references auth.users(id)
  status: string;
  join_date: string; // ISO timestamp string
  first_names: string | null;
  last_names: string | null;
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

export interface InsertUserProfile {
  auth_user_id: string;
  status?: string;
  join_date?: string;
  first_names?: string | null;
  last_names?: string | null;
}

export interface UpdateUserProfile {
  status?: string;
  first_names?: string | null;
  last_names?: string | null;
}

// Legacy type alias for backward compatibility during migration
export type User = UserProfile;
export type InsertUser = InsertUserProfile;
export type UpdateUser = UpdateUserProfile;
