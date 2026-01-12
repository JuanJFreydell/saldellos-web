"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import SignUpModal from "./SignUpModal";
import SignInModal from "./SignInModal";
import ForgotPasswordModal from "./ForgotPasswordModal";
import ProfileModal from "./ProfileModal";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Note: Modals should only close:
  // 1. When user manually closes them (onClose callback)
  // 2. When authentication succeeds (handled inside modals with onClose())
  // We do NOT auto-close on errors - modals stay open so user can retry

  return (
    <header className="shadow-sm border-b border-gray-200 dark:border-zinc-700">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 
          className="text-2xl font-semibold text-black dark:text-zinc-50 cursor-pointer"
          onClick={() => router.push("/")}
        >
          Saldellos
        </h1>
        {!loading && (
          <div className="hidden md:flex gap-6 flex-wrap items-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  router.push("/mensajes");
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="text-sm font-medium text-black dark:text-white hover:border-b-2 hover:border-black dark:hover:border-white transition-colors pb-1"
            >
              Mensajes
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  router.push("/misListados");
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="text-sm font-medium text-black dark:text-white hover:border-b-2 hover:border-black dark:hover:border-white transition-colors pb-1"
            >
              Mis listados
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  router.push("/listar");
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="text-sm font-medium text-black dark:text-white hover:border-b-2 hover:border-black dark:hover:border-white transition-colors pb-1"
            >
              Crear Listado
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  setIsProfileOpen(true);
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="text-sm font-medium text-black dark:text-white hover:border-b-2 hover:border-black dark:hover:border-white transition-colors pb-1"
            >
              Mi Perfil
            </a>
            {user ? (
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="flex items-center gap-2 rounded-full bg-white border border-black px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Cerrar sesión
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsSignUpOpen(true)}
                  className="hidden lg:flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Crear Cuenta
                </button>
                <button
                  onClick={() => setIsSignInOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-white border border-black px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="md:hidden">Ingresar</span>
                  <span className="hidden md:inline">Iniciar Sesión</span>
                </button>
              </>
            )}
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
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      {!loading && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-gray-700 z-50">
          <div className="flex justify-around items-center py-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  router.push("/mensajes");
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px]"
            >
              <svg
                className="h-6 w-6 text-black dark:text-white mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-xs text-gray-500 dark:text-gray-400">Mensajes</span>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  router.push("/misListados");
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px]"
            >
              <svg
                className="h-6 w-6 text-black dark:text-white mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <span className="text-xs text-gray-500 dark:text-gray-400">Mis listados</span>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  router.push("/listar");
                } else {
                  setIsSignInOpen(true);
                }
              }}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px]"
            >
              <svg
                className="h-6 w-6 text-black dark:text-white mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-xs text-gray-500 dark:text-gray-400">Crear Listado</span>
            </a>
            {user ? (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsProfileOpen(true);
                }}
                className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px]"
              >
                <svg
                  className="h-6 w-6 text-black dark:text-white mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400">Mi Perfil</span>
              </a>
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignInOpen(true);
                }}
                className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px]"
              >
                <svg
                  className="h-6 w-6 text-black dark:text-white mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400">Ingresar</span>
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

