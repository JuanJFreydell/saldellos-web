"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState, FormEvent } from "react";

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

// City and neighborhood coordinates mapping
type NeighborhoodData = {
  coordinates: string;
  radius: number;
};

type CityData = {
  center: string;
  radius: number;
  neighborhoods: Record<string, NeighborhoodData>;
};

const LOCATIONS: Record<string, CityData> = {
  Bogota: {
    center: "4.7110,-74.0721",
    radius: 20, // City-wide radius in miles
    neighborhoods: {
      "Zona Rosa": { coordinates: "4.6700,-74.0550", radius: 2 },
      "Chapinero": { coordinates: "4.6500,-74.0600", radius: 3 },
      "Usaquen": { coordinates: "4.7000,-74.0300", radius: 4 },
      "La Candelaria": { coordinates: "4.5950,-74.0750", radius: 1.5 },
    },
  },
  Medellin: {
    center: "6.2476,-75.5658",
    radius: 15, // City-wide radius in miles
    neighborhoods: {
      "El Poblado": { coordinates: "6.2080,-75.5700", radius: 3 },
      "Laureles": { coordinates: "6.2500,-75.5900", radius: 2.5 },
      "Envigado": { coordinates: "6.1700,-75.5800", radius: 4 },
      "Sabaneta": { coordinates: "6.1500,-75.6000", radius: 2 },
    },
  },
};

const CATEGORIES = [
  "muebles",
  "decoracion",
  "electrodomesticos",
  "iluminacion",
  "textiles",
  "accesorios",
  "jardin",
  "cocina",
  "sala",
  "dormitorio",
];

export default function Home() {
  const [listings, setListings] = useState<ListingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allListings, setAllListings] = useState<ListingMetadata[]>([]);

  // Filter state
  const [city, setCity] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const itemsPerPage = 20;

  // Calculate pagination
  const totalPages = Math.ceil(allListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentListings = allListings.slice(startIndex, endIndex);
  const hasNextPage = currentPage < totalPages;

  // Get available neighborhoods based on selected city
  const availableNeighborhoods = city
    ? Object.keys(LOCATIONS[city]?.neighborhoods || {})
    : [];

  useEffect(() => {
    // Initial load with Bogota coordinates
    fetchListings("4.7110,-74.0721", 600);
  }, []);

  async function fetchListings(coordinates: string, radius: number) {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates,
          radius,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }

      const data = await response.json();
      const fetchedListings = data.listings || [];
      setListings(fetchedListings);
      setCurrentPage(1); // Reset to first page on new search
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();

    let coordinates: string;
    let radius: number;

    if (city && neighborhood) {
      // Use neighborhood coordinates and radius
      const cityData = LOCATIONS[city];
      if (cityData) {
        const neighborhoodData = cityData.neighborhoods[neighborhood];
        if (neighborhoodData) {
          coordinates = neighborhoodData.coordinates;
          radius = neighborhoodData.radius;
        } else {
          // Fallback to city center
          coordinates = cityData.center;
          radius = cityData.radius;
        }
      } else {
        coordinates = "4.7110,-74.0721";
        radius = 600;
      }
    } else if (city) {
      // Use city center coordinates and radius
      const cityData = LOCATIONS[city];
      if (cityData) {
        coordinates = cityData.center;
        radius = cityData.radius;
      } else {
        coordinates = "4.7110,-74.0721";
        radius = 600;
      }
    } else {
      // Default to Bogota
      coordinates = "4.7110,-74.0721";
      radius = 600;
    }

    fetchListings(coordinates, radius);
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Filter listings by category on the frontend (API doesn't filter by category)
  useEffect(() => {
    if (category) {
      const filtered = listings.filter(
        (listing) => listing.category.toLowerCase() === category.toLowerCase()
      );
      setAllListings(filtered);
    } else {
      setAllListings(listings);
    }
    setCurrentPage(1); // Reset to first page when filter changes
  }, [category, listings]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      {/* Header with Sign In */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Saldellos
          </h1>
          <button
            onClick={() => signIn("google", { callbackUrl: "/loggedUserPage" })}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Filters */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* City Dropdown */}
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  City
                </label>
                <select
                  id="city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setNeighborhood(""); // Reset neighborhood when city changes
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Cities</option>
                  <option value="Bogota">Bogota</option>
                  <option value="Medellin">Medellin</option>
                </select>
              </div>

              {/* Neighborhood Dropdown */}
              <div>
                <label
                  htmlFor="neighborhood"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Neighborhood
                </label>
                <select
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  disabled={!city}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                >
                  <option value="">All Neighborhoods</option>
                  {availableNeighborhoods.map((neigh) => (
                    <option key={neigh} value={neigh}>
                      {neigh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => {
                    const displayName = cat
                      .charAt(0)
                      .toUpperCase() + cat.slice(1);
                    return (
                      <option key={cat} value={cat}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Loading listings...
            </p>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && (
          <>
            {currentListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  No listings found.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {currentListings.map((listing) => (
                    <ListingCard key={listing.listing_id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center gap-4 py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages || 1}
                  </p>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className={`rounded-lg px-6 py-2 font-medium transition-colors ${
                      hasNextPage
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                    }`}
                  >
                    Next Page
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ListingCard({ listing }: { listing: ListingMetadata }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700">
        {listing.thumbnail ? (
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2 line-clamp-2">
          {listing.title}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${listing.price}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              listing.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            {listing.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="capitalize">{listing.category}</span>
          <span>•</span>
          <span>
            {new Date(listing.listing_date).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
