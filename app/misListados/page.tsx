"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<ListingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchListings();
    }
  }, [status, router]);

  async function fetchListings() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/manageListings");
      
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      
      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteListing(listingId: string) {
    try {
      const response = await fetch(`/api/manageListings?listing_id=${listingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete listing");
      }

      // Refresh the page to show updated listings
      router.refresh();
      fetchListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
      console.error("Error deleting listing:", err);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black py-12 px-4">
      <main className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            My Listings
          </h1>
          <button
            onClick={() => router.push("/loggedUserPage")}
            className="rounded-full bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
          >
            Back to Profile
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
              You don't have any listings yet.
            </p>
            <button
              onClick={() => router.push("/listar")}
              className="mt-4 rounded-full bg-blue-500 px-6 py-2 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              Create Your First Listing
            </button>
          </div>
        )}

        <div className="space-y-4">
          {listings.map((listing) => (
            <ListingCard 
              key={listing.listing_id} 
              listing={listing} 
              onDelete={handleDeleteListing}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function ListingCard({ 
  listing, 
  onDelete 
}: { 
  listing: ListingMetadata; 
  onDelete: (listingId: string) => void;
}) {
  return (
    <div className="rounded-lg bg-white shadow-md dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex flex-row">
        {/* Thumbnail */}
        <div className="w-48 h-48 flex-shrink-0">
          {listing.thumbnail ? (
            <img
              src={listing.thumbnail}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">No Image</span>
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
                    <span className="font-medium">Category:</span> {listing.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        listing.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {listing.status}
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
                  Listing ID:
                </span>
                <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                  {listing.listing_id}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Coordinates:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {listing.coordinates}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Listed Date:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(listing.listing_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Remove Listing Button */}
          <div className="mt-4">
            <button
              onClick={() => onDelete(listing.listing_id)}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Remove Listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

