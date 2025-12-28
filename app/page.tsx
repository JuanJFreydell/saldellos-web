"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "./components/Header";

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
  const router = useRouter();
  const [listings, setListings] = useState<ListingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allListings, setAllListings] = useState<ListingMetadata[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

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
    fetchListings("4.7110,-74.0721", 600).then(() => {
      setInitialLoad(false);
    });
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

  const handleCityToggle = (selectedCity: string) => {
    if (city === selectedCity) {
      // Unselect city
      setCity("");
      setNeighborhood(""); // Clear neighborhood when city is unselected
    } else {
      // Select new city
      setCity(selectedCity);
      setNeighborhood(""); // Clear neighborhood when city changes
    }
  };

  const handleNeighborhoodToggle = (selectedNeighborhood: string) => {
    if (neighborhood === selectedNeighborhood) {
      setNeighborhood("");
    } else {
      setNeighborhood(selectedNeighborhood);
    }
  };

  const handleCategoryToggle = (selectedCategory: string) => {
    if (category === selectedCategory) {
      setCategory("");
    } else {
      setCategory(selectedCategory);
    }
  };

  const handleSearch = () => {
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

  // Auto-search when city or neighborhood filters change (but not on initial load)
  useEffect(() => {
    if (initialLoad) return; // Don't trigger search during initial load

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
  }, [city, neighborhood, initialLoad]);

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
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Filters - Button Based */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          {/* City Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Ciudad
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(LOCATIONS).map((cityName) => {
                const isSelected = city === cityName;
                return (
                  <button
                    key={cityName}
                    type="button"
                    onClick={() => handleCityToggle(cityName)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span>{cityName}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4"
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
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Neighborhood Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Barrio
            </h3>
            <div className="flex flex-wrap gap-2">
              {city ? (
                availableNeighborhoods.map((neigh) => {
                  const isSelected = neighborhood === neigh;
                  return (
                    <button
                      key={neigh}
                      type="button"
                      onClick={() => handleNeighborhoodToggle(neigh)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                      }`}
                    >
                      <span>{neigh}</span>
                      {isSelected && (
                        <svg
                          className="w-4 h-4"
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
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Selecciona una ciudad para ver los barrios
                </p>
              )}
            </div>
          </div>

          {/* Category Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Categoría
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span>{displayName}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4"
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
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/listings/${listing.listing_id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
    >
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
