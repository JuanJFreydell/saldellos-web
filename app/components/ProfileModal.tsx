"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/supabase/types/users";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

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
    } finally {
      setLoading(false);
    }
  }

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      // Wait a moment for auth state to update via onAuthStateChange
      await new Promise(resolve => setTimeout(resolve, 200));
      // Force a router refresh to update all components
      router.refresh();
      // Navigate to home page and force a full reload to clear all cached state
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getInitials = () => {
    const firstName = userProfile?.first_names || user.user_metadata?.first_names || "";
    const lastName = userProfile?.last_names || user.user_metadata?.last_names || "";
    const email = user.email || "";
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getFullName = () => {
    const firstName = userProfile?.first_names || user.user_metadata?.first_names || "";
    const lastName = userProfile?.last_names || user.user_metadata?.last_names || "";
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    return "Usuario";
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-end bg-black/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full h-full md:w-full md:max-w-sm md:h-auto md:rounded-lg bg-white shadow-2xl dark:bg-zinc-800 overflow-hidden md:mt-16 md:mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - Desktop only */}
        <button
          onClick={onClose}
          className="hidden md:block absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

        {/* Mobile header with close button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Cuenta
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
        </div>

        <div className="overflow-y-auto h-full md:max-h-[calc(100vh-120px)]">
          {/* Header Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {user.email}
            </div>
            
            {/* Profile Picture */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-xl font-semibold text-white">
                  {getInitials()}
                </div>
                <button className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border-2 border-white dark:border-gray-800 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                  <svg
                    className="h-3 w-3 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                  Hola, {getFullName()}!
                </h2>
              </div>
            </div>

            {/* Manage Account Button */}
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 px-4 py-2.5 text-sm font-medium text-black dark:text-zinc-50 transition-colors"
            >
              Gestionar tu cuenta de Saldellos
            </button>
          </div>

          {/* Account Actions */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-4 py-3 text-sm font-medium text-black dark:text-zinc-50 transition-colors"
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
              <span>Cerrar sesión</span>
            </button>
          </div>

          {/* Account Information */}
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Información de la cuenta
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Estado
                  </p>
                  <p className="text-sm text-black dark:text-zinc-50">
                    {userProfile?.status || "Activo"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Fecha de registro
                  </p>
                  <p className="text-sm text-black dark:text-zinc-50">
                    {formatDate(userProfile?.join_date || user.created_at)}
                  </p>
                </div>
                {userProfile?.first_names || userProfile?.last_names ? (
                  <>
                    {userProfile.first_names && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Nombres
                        </p>
                        <p className="text-sm text-black dark:text-zinc-50">
                          {userProfile.first_names}
                        </p>
                      </div>
                    )}
                    {userProfile.last_names && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Apellidos
                        </p>
                        <p className="text-sm text-black dark:text-zinc-50">
                          {userProfile.last_names}
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

