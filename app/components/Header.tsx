"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/supabase/types/users";
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  async function fetchUserProfile() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }

  const getInitials = () => {
    const firstName = userProfile?.first_names || user?.user_metadata?.first_names || "";
    const lastName = userProfile?.last_names || user?.user_metadata?.last_names || "";
    const email = user?.email || "";
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

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
                router.push("/");
              }}
              className="text-sm font-medium text-black dark:text-white hover:border-b-2 hover:border-black dark:hover:border-white transition-colors pb-1"
            >
              Buscar
            </a>
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
            {user ? (
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 rounded-full bg-white border border-black px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-xs font-semibold text-white">
                  {getInitials()}
                </div>
                <span>Mi Perfil</span>
              </button>
            ) : (
              <>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsSignInOpen(true);
                  }}
                  className="text-sm font-medium text-black dark:text-white hover:border-b-2 hover:border-black dark:hover:border-white transition-colors pb-1"
                >
                  Mi Perfil
                </a>
              </>
            )}
            {!user && (
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 z-50">
          <div className="flex justify-around items-stretch pt-2 pb-2">
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
              className="flex flex-col items-center justify-start flex-1 px-2 min-w-0"
            >
              <div className="h-6 w-6 flex items-center justify-center mb-1">
                <svg
                  className="h-6 w-6 text-black dark:text-white"
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
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight">Mensajes</span>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                router.push("/");
              }}
              className="flex flex-col items-center justify-start flex-1 px-2 min-w-0"
            >
              <div className="h-6 w-6 flex items-center justify-center mb-1">
                <svg
                  className="h-6 w-6 text-black dark:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight">Buscar</span>
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
              className="flex flex-col items-center justify-start flex-1 px-2 min-w-0"
            >
              <div className="h-6 w-6 flex items-center justify-center mb-1">
                <svg
                  className="h-6 w-6 text-black dark:text-white"
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
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight">Mis listados</span>
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
              className="flex flex-col items-center justify-start flex-1 px-2 min-w-0"
            >
              <div className="h-6 w-6 flex items-center justify-center mb-1">
                <svg
                  className="h-6 w-6 text-black dark:text-white"
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
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight">Crear Listado</span>
            </a>
            {user ? (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsProfileOpen(true);
                }}
                className="flex flex-col items-center justify-start flex-1 px-2 min-w-0"
              >
                <div className="h-6 w-6 flex items-center justify-center mb-1">
                  <svg
                    className="h-6 w-6 text-black dark:text-white"
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
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight">Mi Perfil</span>
              </a>
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignInOpen(true);
                }}
                className="flex flex-col items-center justify-start flex-1 px-2 min-w-0"
              >
                <div className="h-6 w-6 flex items-center justify-center mb-1">
                  <svg
                    className="h-6 w-6 text-black dark:text-white"
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
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight">Ingresar</span>
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

