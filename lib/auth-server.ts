import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";

/**
 * Get authenticated user from Supabase Auth token in request headers
 * Use this in API routes to verify authentication
 */
export async function getAuthenticatedUser(request: Request) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured");
  }

  // Get the authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify the token and get user
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get user profile for an authenticated user
 */
export async function getUserProfile(authUserId: string) {
  if (!supabaseAdmin) {
    throw new Error("Database not configured");
  }

  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !profile) {
    return null;
  }

  // Check if account is active
  if (profile.status !== "active") {
    return null;
  }

  return profile;
}

