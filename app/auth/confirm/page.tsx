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
    const verifyEmail = async () => {
      try {
        // Get the token from URL hash (Supabase PKCE flow uses hash fragments)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (type === "signup" && access_token) {
          // Set the session using the access token
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token: hashParams.get("refresh_token") || "",
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data.user) {
            // Sync user with our users table
            try {
              await fetch("/api/auth/sync-user", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  supabaseUserId: data.user.id,
                  email: data.user.email,
                  firstNames: data.user.user_metadata?.first_names || null,
                  lastNames: data.user.user_metadata?.last_names || null,
                }),
              });
            } catch (syncError) {
              console.error("Error syncing user:", syncError);
            }

            setStatus("success");
            setMessage("¡Email confirmado exitosamente! Redirigiendo...");
            
            // Redirect to signin page after 2 seconds
            setTimeout(() => {
              router.push("/auth/signin?confirmed=true");
            }, 2000);
          }
        } else {
          throw new Error("Token inválido o faltante");
        }
      } catch (error) {
        console.error("Error verifying email:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Error al verificar tu email. Por favor intenta nuevamente."
        );
      }
    };

    verifyEmail();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800 text-center">
          {status === "loading" && (
            <>
              <div className="mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
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
                onClick={() => router.push("/auth/signin")}
                className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 transition-colors"
              >
                Volver a iniciar sesión
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
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

