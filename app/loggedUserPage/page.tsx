"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/supabase/types/users";

export default function LoggedUserPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user) {
      fetchUserProfile();
    }
  }, [user, authLoading, router]);

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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-800">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            Perfil de usuario
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/listar")}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Crear listado
            </button>
            <button
              onClick={() => router.push("/misListados")}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Mis listados
            </button>
            <button
              onClick={() => router.push("/mensajes")}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Mensajes
            </button>
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="rounded-full bg-white border border-black px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Correo electrónico
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {user.email || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              ID de usuario
            </h2>
            <p className="text-lg text-black dark:text-zinc-50 font-mono text-sm">
              {user.id || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Nombres
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userProfile?.first_names || user.user_metadata?.first_names || "No proporcionado"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Apellidos
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userProfile?.last_names || user.user_metadata?.last_names || "No proporcionado"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Estado
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userProfile?.status || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Fecha de registro
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userProfile?.join_date
                ? new Date(userProfile.join_date).toLocaleDateString()
                : user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

