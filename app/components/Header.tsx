"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import SignUpModal from "./SignUpModal";
import SignInModal from "./SignInModal";
import ForgotPasswordModal from "./ForgotPasswordModal";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Note: Modals should only close:
  // 1. When user manually closes them (onClose callback)
  // 2. When authentication succeeds (handled inside modals with onClose())
  // We do NOT auto-close on errors - modals stay open so user can retry

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 
          className="text-2xl font-semibold text-black dark:text-zinc-50 cursor-pointer"
          onClick={() => router.push("/")}
        >
          Saldellos
        </h1>
        {!loading && user ? (
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/mensajes")}
              className="rounded-full bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Mensajes
            </button>
            <button
              onClick={() => router.push("/loggedUserPage")}
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Mi Perfil
            </button>
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsSignUpOpen(true)}
              className="rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              Crear Cuenta
            </button>
            <button
              onClick={() => setIsSignInOpen(true)}
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Iniciar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onSwitchToSignIn={() => {
          setIsSignUpOpen(false);
          setIsSignInOpen(true);
        }}
      />
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSwitchToSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
        onForgotPassword={() => {
          setIsSignInOpen(false);
          setIsForgotPasswordOpen(true);
        }}
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </header>
  );
}

