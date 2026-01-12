"use client";

import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup: restore scroll when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}/auth/reset-password`,
      });

      if (resetError) {
        throw new Error(resetError.message || "Error al enviar el email de restablecimiento");
      }

      // Success - show success message
      setSuccess(true);
      setError(null);
      
      // Don't close modal immediately - let user see the success message
      // They can close it manually or it will close after a delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
      }, 5000);
    } catch (err) {
      // On error, show error message but keep modal open
      setError(err instanceof Error ? err.message : "Ocurrió un error");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-zinc-800 mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="h-6 w-6"
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
        </button>

        <h1 className="mb-6 text-3xl font-semibold text-black dark:text-zinc-50">
          Restablecer contraseña
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 border border-green-400 text-green-700 px-4 py-3">
            <p className="font-semibold">¡Email enviado!</p>
            <p className="text-sm mt-1">
              Hemos enviado un enlace de restablecimiento de contraseña a <strong>{email}</strong>.
              Por favor, revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="forgot-password-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="forgot-password-email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white disabled:bg-zinc-100"
                placeholder="tu@email.com"
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Te enviaremos un enlace para restablecer tu contraseña a este email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
            </button>
          </form>
        )}

        {success && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-white border border-black px-6 py-3 font-medium text-black hover:bg-zinc-50 transition-colors dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}

