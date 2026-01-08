"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";

// Force dynamic rendering - this page needs to run client-side only
export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verificando enlace...");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a valid session (from the reset password link)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        // Check if we have tokens in the URL hash (PKCE flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (access_token && type === "recovery") {
          // Set the session using the recovery token
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: hashParams.get("refresh_token") || "",
          });

          if (setSessionError) {
            throw new Error(setSessionError.message);
          }

          if (data.session) {
            // Session established - show password reset form
            setStatus("form");
            setMessage("");
          } else {
            throw new Error("No se pudo establecer la sesión");
          }
        } else if (session) {
          // Already have a session - show form
          setStatus("form");
          setMessage("");
        } else {
          throw new Error("Enlace inválido o expirado. Por favor solicita un nuevo enlace de restablecimiento.");
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Error al verificar el enlace. Por favor intenta nuevamente."
        );
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw new Error(updateError.message || "Error al actualizar la contraseña");
      }

      // Success
      setStatus("success");
      setMessage("¡Contraseña restablecida exitosamente! Redirigiendo...");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Error al restablecer la contraseña. Por favor intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          {status === "loading" && (
            <>
              <div className="mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent dark:border-white"></div>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300">{message}</p>
            </>
          )}

          {status === "form" && (
            <>
              <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
                Restablecer contraseña
              </h1>

              {error && (
                <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Nueva contraseña *
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Confirmar contraseña *
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100"
                    placeholder="Confirma tu contraseña"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {loading ? "Restableciendo..." : "Restablecer contraseña"}
                </button>
              </form>
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
              <p className="text-lg text-green-700 dark:text-green-400 text-center">{message}</p>
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
              <p className="text-lg text-red-700 dark:text-red-400 mb-4 text-center">{message}</p>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-lg bg-black px-6 py-2 text-white hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
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

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

