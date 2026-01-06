"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api-client";

interface ListingMetadata {
  listing_id: string;
  title: string;
  thumbnail: string;
  coordinates: string;
  price: string;
  listing_date: string;
  status: string;
  category: string;
}

export default function MisListadosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user) {
      fetchListings();
    }
  }, [user, authLoading, router]);

  async function fetchListings() {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch("/api/manageListings");
      
      if (!response.ok) {
        throw new Error("Error al cargar los listados");
      }
      
      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteListing(listingId: string) {
    try {
      const response = await authenticatedFetch(`/api/manageListings?listing_id=${listingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar el listado");
      }

      // Refresh the page to show updated listings
      router.refresh();
      fetchListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el listado");
      console.error("Error deleting listing:", err);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  if (!authLoading && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black py-12 px-4">
      <main className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            Mis listados
          </h1>
          <button
            onClick={() => router.push("/loggedUserPage")}
            className="rounded-full bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
          >
            Volver al perfil
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {listings.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Aún no tienes listados.
            </p>
            <button
              onClick={() => router.push("/listar")}
              className="mt-4 rounded-full bg-blue-500 px-6 py-2 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              Crea tu primer listado
            </button>
          </div>
        )}

        <div className="space-y-4">
          {listings.map((listing) => (
            <ListingCard 
              key={listing.listing_id} 
              listing={listing} 
              onDelete={handleDeleteListing}
              router={router}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function ListingCard({ 
  listing, 
  onDelete,
  router
}: { 
  listing: ListingMetadata; 
  onDelete: (listingId: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="rounded-lg bg-white shadow-md dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex flex-row">
        {/* Thumbnail */}
        <div className="w-48 h-48 shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {listing.thumbnail ? (
            <img
              src={listing.thumbnail}
              alt={listing.title}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">Sin imagen</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
                  {listing.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Tipo de artículo:</span> {listing.category || "N/A"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Estado:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        listing.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {listing.status === "active" ? "activo" : listing.status}
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ${listing.price}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  ID del listado:
                </span>
                <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                  {listing.listing_id}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Coordenadas:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {listing.coordinates}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Fecha de listado:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(listing.listing_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.push(`/editListing?listing_id=${listing.listing_id}`)}
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Editar listado
            </button>
            <button
              onClick={() => onDelete(listing.listing_id)}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Eliminar listado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

