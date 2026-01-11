"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";

// Force dynamic rendering - this page needs to run client-side only
export const dynamic = 'force-dynamic';

function AuthConfirmContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verificando tu email...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First, check if Supabase has already established a session automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // Session already established (OAuth flow with auto-detection)
          setStatus("success");
          setMessage("¡Sesión iniciada exitosamente! Redirigiendo...");
          setTimeout(() => {
            router.push("/");
          }, 1500);
          return;
        }

        // If no session, try to get tokens from URL hash (PKCE flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        const error_description = hashParams.get("error_description");
        const error = hashParams.get("error");

        // Check for OAuth errors
        if (error) {
          throw new Error(error_description || error || "Error en la autenticación");
        }

        // Handle email confirmation or OAuth with tokens in hash
        if (access_token) {
          // Set the session using the access token
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || "",
          });

          if (setSessionError) {
            throw new Error(setSessionError.message);
          }

          if (data.user) {
            // User profile is automatically created by database trigger
            // No need to sync manually

            if (type === "signup") {
              setStatus("success");
              setMessage("¡Email confirmado exitosamente! Redirigiendo...");
            } else {
              setStatus("success");
              setMessage("¡Sesión iniciada exitosamente! Redirigiendo...");
            }
            
            // Redirect to home page after 2 seconds
            setTimeout(() => {
              router.push("/");
            }, 1500);
          } else {
            throw new Error("No se pudo establecer la sesión");
          }
        } else {
          // No tokens found - check if there's a code in query params (alternative OAuth flow)
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get("code");
          
          if (code) {
            // Exchange code for session (this should be handled by Supabase automatically)
            // But if not, we'll wait a moment and check session again
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session: newSession } } = await supabase.auth.getSession();
            
            if (newSession && newSession.user) {
              setStatus("success");
              setMessage("¡Sesión iniciada exitosamente! Redirigiendo...");
              setTimeout(() => {
                router.push("/");
              }, 1500);
            } else {
              throw new Error("No se pudo completar la autenticación. Por favor intenta nuevamente.");
            }
          } else {
            throw new Error("Token inválido o faltante. Por favor intenta iniciar sesión nuevamente.");
          }
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Error al verificar tu autenticación. Por favor intenta nuevamente."
        );
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800 text-center">
          {status === "loading" && (
            <>
              <div className="mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent dark:border-white"></div>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-4 text-green-500">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg text-green-700 dark:text-green-400">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-4 text-red-500">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-lg text-red-700 dark:text-red-400 mb-4">{message}</p>
              <button
                onClick={() => router.push("/")}
                className="rounded-lg bg-black px-6 py-2 text-white hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Volver al inicio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
          <Header />
          <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800 text-center">
              <div className="mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent dark:border-white"></div>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300">Cargando...</p>
            </div>
          </div>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  );
}

