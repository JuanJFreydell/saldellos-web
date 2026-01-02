"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/supabase/types/users";

export default function LoggedUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.email) {
      fetchUserData();
    }
  }, [status, session, router]);

  async function fetchUserData() {
    try {
      const response = await fetch("/api/user");
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            Perfil de usuario
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/listar")}
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Crear listado
            </button>
            <button
              onClick={() => router.push("/misListados")}
              className="rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              Mis listados
            </button>
            <button
              onClick={() => router.push("/mensajes")}
              className="rounded-full bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Mensajes
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
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
              {userData?.email || session.user?.email || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              ID de usuario
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.user_id || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Nombres
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.first_names || "No proporcionado"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Apellidos
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.last_names || "No proporcionado"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Estado
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.status || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Fecha de registro
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.join_date
                ? new Date(userData.join_date).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

