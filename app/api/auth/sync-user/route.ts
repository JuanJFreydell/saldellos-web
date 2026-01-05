import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * This endpoint syncs a Supabase Auth user with the users table
 * Called after successful authentication to ensure user exists in our DB
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supabaseUserId, email, firstNames, lastNames } = body;

    if (!supabaseUserId || !email) {
      return NextResponse.json(
        { error: "supabaseUserId y email son requeridos" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Check if user exists by email
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (existingUser) {
      // User exists - update with Supabase Auth ID if needed
      if (existingUser.nextauth_id !== supabaseUserId) {
        await supabaseAdmin
          .from("users")
          .update({
            nextauth_id: supabaseUserId,
            status: "active", // Ensure status is active if they're signing in
          })
          .eq("user_id", existingUser.user_id);
      }
      return NextResponse.json({ success: true, user: existingUser });
    } else {
      // User doesn't exist - create new
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          email: email,
          nextauth_id: supabaseUserId,
          first_names: firstNames || null,
          last_names: lastNames || null,
          status: "active",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return NextResponse.json(
          { error: "Error al crear el usuario" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, user: newUser });
    }
  } catch (error) {
    console.error("Error in sync-user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

