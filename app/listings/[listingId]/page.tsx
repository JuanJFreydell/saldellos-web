"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ListingData {
  listing_id: string;
  owner_id: string;
  title: string;
  description: string;
  address: string;
  neighborhood_id: string | null;
  listing_date: string;
  number_of_prints: string;
  number_of_visits: string;
  status: string;
}

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

interface ListingResponse {
  listing_id: string;
  listing_data: ListingData;
  listing_metadata: ListingMetadata;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;

  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  async function fetchListing() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/listingById?listing_id=${listingId}`
      );

      if (!response.ok) {
        throw new Error("No se pudo cargar el listado");
      }

      const data = await response.json();
      setListing(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al cargar el listado"
      );
      console.error("Error fetching listing:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Cargando...
        </p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="text-center">
          <p className="text-lg text-red-600 dark:text-red-400 mb-4">
            {error || "Listado no encontrado"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const { listing_data, listing_metadata } = listing;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Volver
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {listing_metadata.thumbnail ? (
                <img
                  src={listing_metadata.thumbnail}
                  alt={listing_metadata.title}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400">Sin imagen</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-4">
                {listing_metadata.title || listing_data.title}
              </h1>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  ${listing_metadata.price}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    listing_metadata.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {listing_metadata.status === "active" ? "Activo" : listing_metadata.status}
                </span>
              </div>
            </div>

            {/* Category and Date */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Categoría
                  </h3>
                  <p className="text-lg font-semibold text-black dark:text-zinc-50 capitalize">
                    {listing_metadata.category}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Fecha de publicación
                  </h3>
                  <p className="text-lg font-semibold text-black dark:text-zinc-50">
                    {new Date(listing_metadata.listing_date).toLocaleDateString("es-CO")}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                Descripción
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {listing_data.description || "No hay descripción disponible."}
              </p>
            </div>

            {/* Location Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                Ubicación
              </h2>
              <div className="space-y-3">
                {listing_data.address && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Dirección
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {listing_data.address}
                    </p>
                  </div>
                )}
                {listing_metadata.coordinates && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Coordenadas
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">
                      {listing_metadata.coordinates}
                    </p>
                  </div>
                )}
                {listing_data.neighborhood_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Barrio ID
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {listing_data.neighborhood_id}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                Estadísticas
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Impresiones
                  </h3>
                  <p className="text-2xl font-bold text-black dark:text-zinc-50">
                    {listing_data.number_of_prints || "0"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Visitas
                  </h3>
                  <p className="text-2xl font-bold text-black dark:text-zinc-50">
                    {listing_data.number_of_visits || "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Listing ID (for reference) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                ID del Listado
              </h3>
              <p className="text-gray-700 dark:text-gray-300 font-mono text-xs break-all">
                {listing.listing_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

