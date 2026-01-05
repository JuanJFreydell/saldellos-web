import { NextResponse } from "next/server";

/**
 * Note: For PKCE flow, signup is done client-side using the Supabase client.
 * This endpoint is kept for potential server-side operations but the main
 * signup flow happens in SignUpModal.tsx using supabase.auth.signUp()
 */
export async function POST(request: Request) {
  try {
    // This endpoint is not used in the PKCE flow
    // Signup happens client-side in SignUpModal.tsx
    return NextResponse.json({
      message: "Signup should be done client-side using Supabase Auth with PKCE",
    }, { status: 200 });
  } catch (error) {
    console.error("Error in signup:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

