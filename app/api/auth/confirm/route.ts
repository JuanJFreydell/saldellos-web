import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!token_hash || type !== "signup") {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent('Token inválido o faltante')}`
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent('Error de configuración del servidor')}`
      );
    }

    // Verify the email confirmation token
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash,
      type: "signup",
    });

    if (error) {
      console.error("Error verifying token:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent(error.message)}`
      );
    }

    if (data.user) {
      // Update user status to active in your users table
      try {
        await supabaseAdmin
          .from("users")
          .update({ status: "active" })
          .eq("email", data.user.email);
      } catch (dbError) {
        console.error("Error updating user status:", dbError);
        // Continue even if DB update fails
      }

      // Redirect to signin page with success message
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin?confirmed=true`
      );
    }

    // Default redirect
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
    );
  } catch (error) {
    console.error("Error in auth confirm:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/error`
    );
  }
}

