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
      fetchUserData(session.user.email);
    }
  }, [status, session, router]);

  async function fetchUserData(email: string) {
    try {
      const response = await fetch(`/api/user?email=${encodeURIComponent(email)}`);
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
        <p className="text-lg">Loading...</p>
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
            User Profile
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/listar")}
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Create Listing
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Email
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.email || session.user?.email || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              User ID
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.user_id || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              First Names
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.first_names || "Not provided"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Last Names
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.last_names || "Not provided"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Status
            </h2>
            <p className="text-lg text-black dark:text-zinc-50">
              {userData?.status || "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Join Date
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

