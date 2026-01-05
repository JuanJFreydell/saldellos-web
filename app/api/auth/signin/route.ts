import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Note: For PKCE flow, sign-in should be done client-side
    // This endpoint is kept for consistency but the actual auth should happen in the modal
    // using the client-side Supabase client
    
    return NextResponse.json({
      message: "Por favor usa el cliente de Supabase en el frontend para iniciar sesión con PKCE",
    }, { status: 200 });
  } catch (error) {
    console.error("Error in signin:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

