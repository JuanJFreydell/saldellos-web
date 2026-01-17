"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Header from "./components/Header";

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Component to update map view when center changes
const MapViewUpdater = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      return function MapViewUpdater({
        center,
        zoom,
      }: {
        center: [number, number];
        zoom: number;
      }) {
        const map = mod.useMap();
        useEffect(() => {
          if (map && center) {
            const timer = setTimeout(() => {
              try {
                map.setView(center, zoom, { animate: true });
              } catch (error) {
                console.error("Error updating map view:", error);
              }
            }, 100);
            return () => clearTimeout(timer);
          }
        }, [map, center, zoom]);
        return null;
      };
    }),
  { ssr: false }
);

interface ListingMetadata {
  listing_id: string;
  description: string;
  title: string;
  subcategory: string | null;
  category: string | null;
  price: string;
  thumbnail: string;
  coordinates: string | null;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
}

interface City {
  city_id: string;
  city_name: string;
}

interface Neighborhood {
  neighborhood_id: string;
  neighborhood_name: string;
}

interface Subcategory {
  subcategory_id: string;
  subcategory_name: string;
}

const COLOMBIA_NAME = "Colombia";
const DEFAULT_CATEGORY = "para la venta";

// Typewriter messages for second-hand goods
const TYPEWRITER_MESSAGES = [
  "¡Nuevos en tu casa!",
  "Usados pero con amor",
  "Casi nuevos, mejor precio",
  "De segunda, primera calidad",
  "Sobrados de rico",
  "De colección a tu alcance",
  "Segunda vida, primera opción",
];

function TypewriterTitle() {
  const [displayText, setDisplayText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentMessage = TYPEWRITER_MESSAGES[messageIndex];
    const typingSpeed = isDeleting ? 50 : 100; // Faster when deleting
    const pauseBeforeDelete = 2000; // Pause before starting to delete
    const pauseBeforeNext = 500; // Pause before starting next message

    if (!isDeleting && charIndex < currentMessage.length) {
      // Typing forward
      const timeout = setTimeout(() => {
        setDisplayText(currentMessage.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else if (!isDeleting && charIndex === currentMessage.length) {
      // Finished typing, wait then start deleting
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseBeforeDelete);
      return () => clearTimeout(timeout);
    } else if (isDeleting && charIndex > 0) {
      // Deleting
      const timeout = setTimeout(() => {
        setDisplayText(currentMessage.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else if (isDeleting && charIndex === 0) {
      // Finished deleting, move to next message
      const timeout = setTimeout(() => {
        setIsDeleting(false);
        setMessageIndex((messageIndex + 1) % TYPEWRITER_MESSAGES.length);
      }, pauseBeforeNext);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, isDeleting, messageIndex]);

  return (
    <div className="text-3xl md:text-6xl font-serif flex justify-center items-center py-10 min-h-[120px] md:min-h-[150px] px-4">
      <span className="text-black dark:text-zinc-50 text-center break-words">
        {displayText}
        <span className="animate-pulse">|</span>
      </span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingMetadata[]>([]);
  const [allListings, setAllListings] = useState<ListingMetadata[]>([]); // Store all unfiltered listings
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Location data from API
  const [colombiaId, setColombiaId] = useState<string>("");
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Filter state (using names for display, but we'll use IDs for API calls)
  const [selectedCity, setSelectedCity] = useState<string>(""); // city_name
  const [selectedCityId, setSelectedCityId] = useState<string>(""); // city_id
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(""); // neighborhood_name
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>(""); // neighborhood_id
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(""); // subcategory_name
  
  // Mobile dropdown state - only one can be open at a time
  const [openDropdown, setOpenDropdown] = useState<"city" | "neighborhood" | "subcategory" | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<"gallery" | "list" | "map">("gallery");

  // Check if there are more batches
  const hasMoreBatches = listings.length === 100;

  // Fetch Colombia's country_id and subcategories on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch Colombia
        const countriesResponse = await fetch("/api/locations/countries");
        if (!countriesResponse.ok) {
          throw new Error("Error al cargar países");
        }
        const countriesData = await countriesResponse.json();
        const colombia = countriesData.countries.find(
          (c: any) => c.country_name.toLowerCase() === COLOMBIA_NAME.toLowerCase()
        );
        if (colombia) {
          setColombiaId(colombia.country_id);
          // Fetch cities for Colombia
          fetchCities(colombia.country_id);
        } else {
          setError("Colombia no encontrada en la base de datos");
        }

        // Fetch subcategories for "para la venta"
        const subcategoriesResponse = await fetch("/api/locations/subcategories");
        if (!subcategoriesResponse.ok) {
          throw new Error("Error al cargar subcategorías");
        }
        const subcategoriesData = await subcategoriesResponse.json();
        setSubcategories(subcategoriesData.subcategories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los datos iniciales");
        console.error("Error fetching initial data:", err);
      }
    }
    fetchInitialData();
  }, []);

  // Fetch cities for Colombia
  async function fetchCities(countryId: string) {
    try {
      setLoadingCities(true);
      const response = await fetch(`/api/locations/cities?country_id=${countryId}`);
      if (!response.ok) {
        throw new Error("Error al cargar ciudades");
      }
      const data = await response.json();
      setCities(data.cities || []);
    } catch (err) {
      console.error("Error fetching cities:", err);
    } finally {
      setLoadingCities(false);
    }
  }

  // Fetch neighborhoods when city is selected
  useEffect(() => {
    if (selectedCityId) {
      async function fetchNeighborhoodsForCity() {
        try {
          setLoadingNeighborhoods(true);
          const response = await fetch(`/api/locations/neighborhoods?city_id=${selectedCityId}`);
          if (!response.ok) {
            throw new Error("Error al cargar barrios");
          }
          const data = await response.json();
          setNeighborhoods(data.neighborhoods || []);
        } catch (err) {
          console.error("Error fetching neighborhoods:", err);
        } finally {
          setLoadingNeighborhoods(false);
        }
      }
      fetchNeighborhoodsForCity();
    } else {
      setNeighborhoods([]);
    }
  }, [selectedCityId]);

  async function fetchListings(batch: number = 1, showLoading: boolean = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const requestBody: any = {
        country: COLOMBIA_NAME,
        category: DEFAULT_CATEGORY, // Always use "para la venta"
        batch,
      };

      if (selectedCity) {
        requestBody.city = selectedCity;
      }

      // Note: We don't include neighborhood in the API call anymore
      // Neighborhood filtering is done client-side

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Error al cargar los listados");
      }

      const data = await response.json();
      const fetchedListings = data.listings || [];
      
      // Store all listings (unfiltered) for client-side neighborhood filtering
      // Only update if we got results, or if it's the first batch
      if (fetchedListings.length > 0 || batch === 1) {
        setAllListings(fetchedListings);
        // Apply client-side filters (neighborhood and subcategory)
        applyClientSideFilters(fetchedListings);
      }
      
      setTotal(data.total || 0);
      setCurrentBatch(data.batch || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
      console.error("Error fetching listings:", err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  const handleCityToggle = (cityName: string, cityId: string) => {
    if (selectedCity === cityName) {
      // Unselect city
      setSelectedCity("");
      setSelectedCityId("");
      setSelectedNeighborhood("");
      setSelectedNeighborhoodId("");
    } else {
      // Select new city
      setSelectedCity(cityName);
      setSelectedCityId(cityId);
      setSelectedNeighborhood("");
      setSelectedNeighborhoodId("");
    }
  };

  const handleNeighborhoodToggle = (neighborhoodName: string, neighborhoodId: string) => {
    if (selectedNeighborhood === neighborhoodName) {
      setSelectedNeighborhood("");
      setSelectedNeighborhoodId("");
    } else {
      setSelectedNeighborhood(neighborhoodName);
      setSelectedNeighborhoodId(neighborhoodId);
    }
  };

  const handleSubcategoryToggle = (subcategoryName: string) => {
    if (selectedSubcategory === subcategoryName) {
      setSelectedSubcategory("");
    } else {
      setSelectedSubcategory(subcategoryName);
    }
  };

  // Apply client-side filters (neighborhood and subcategory) to listings
  const applyClientSideFilters = useCallback((listingsToFilter: ListingMetadata[]) => {
    let filtered = listingsToFilter;

    // Filter by neighborhood (client-side)
    if (selectedNeighborhood) {
      filtered = filtered.filter(
        (listing) => listing.neighborhood?.toLowerCase() === selectedNeighborhood.toLowerCase()
      );
    }

    // Filter by subcategory (client-side)
    if (selectedSubcategory) {
      filtered = filtered.filter(
        (listing) => listing.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      );
    }

    setListings(filtered);
  }, [selectedNeighborhood, selectedSubcategory]);

  // Initial load - fetch listings for Colombia
  useEffect(() => {
    if (colombiaId && initialLoad) {
      fetchListings(1).then(() => {
        setInitialLoad(false);
      });
    }
  }, [colombiaId, initialLoad]);

  // Auto-search when city filter changes (but not on initial load)
  // Neighborhood changes are handled client-side, so we don't need to fetch again
  useEffect(() => {
    if (initialLoad || !colombiaId) return; // Don't trigger search during initial load

    // Use a small delay to debounce rapid filter changes
    const timeoutId = setTimeout(() => {
      setCurrentBatch(1); // Reset to first batch
      fetchListings(1);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedCity]); // Only watch selectedCity, not selectedNeighborhood

  // Apply client-side filters when neighborhood or subcategory changes
  useEffect(() => {
    if (allListings.length > 0) {
      applyClientSideFilters(allListings);
    }
  }, [selectedNeighborhood, selectedSubcategory, allListings, applyClientSideFilters]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdown]);

  const handleNextBatch = () => {
    if (hasMoreBatches) {
      const nextBatch = currentBatch + 1;
      setCurrentBatch(nextBatch);
      fetchListings(nextBatch);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Listings are already filtered by neighborhood and subcategory in applyClientSideFilters
  // So we can use listings directly
  const filteredListings = listings;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <TypewriterTitle />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Filters - Mobile: Dropdowns, Desktop: Button Grid */}
        {/* Mobile: Horizontal Dropdowns */}
        
        <div className="md:hidden mb-6 relative">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {/* City Dropdown */}
            <div className="relative shrink-0 dropdown-container z-50">
              <button
                type="button"
                onClick={(e) => {
                  if (openDropdown === "city") {
                    setOpenDropdown(null);
                    setDropdownPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({ top: rect.bottom + 8, left: rect.left });
                    setOpenDropdown("city");
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <span>{selectedCity || "Ciudad"}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${openDropdown === "city" ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openDropdown === "city" && dropdownPosition && (
                <>
                  <div className="fixed inset-0 z-[998]" onClick={() => { setOpenDropdown(null); setDropdownPosition(null); }}></div>
                  <div 
                    className="fixed w-[280px] max-h-60 overflow-y-auto bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[999]"
                    style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
                  >
                  {loadingCities ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      Cargando ciudades...
                    </div>
                  ) : cities.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      No hay ciudades disponibles
                    </div>
                  ) : (
                    <div className="py-2">
                      {cities.map((city) => {
                        const isSelected = selectedCity === city.city_name;
                        return (
                          <button
                            key={city.city_id}
                            type="button"
                            onClick={() => {
                              handleCityToggle(city.city_name, city.city_id);
                              setOpenDropdown(null);
                              setDropdownPosition(null);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                              isSelected
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {city.city_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>

            {/* Neighborhood Dropdown */}
            <div className="relative shrink-0 dropdown-container z-50">
              <button
                type="button"
                onClick={(e) => {
                  if (!selectedCity) return;
                  if (openDropdown === "neighborhood") {
                    setOpenDropdown(null);
                    setDropdownPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({ top: rect.bottom + 8, left: rect.left });
                    setOpenDropdown("neighborhood");
                  }
                }}
                disabled={!selectedCity}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  !selectedCity
                    ? "bg-zinc-100 dark:bg-zinc-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    : "bg-zinc-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                <span>{selectedNeighborhood || "Barrio"}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${openDropdown === "neighborhood" ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openDropdown === "neighborhood" && selectedCity && dropdownPosition && (
                <>
                  <div className="fixed inset-0 z-[998]" onClick={() => { setOpenDropdown(null); setDropdownPosition(null); }}></div>
                  <div 
                    className="fixed w-[280px] max-h-60 overflow-y-auto bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[999]"
                    style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
                  >
                  {loadingNeighborhoods ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      Cargando barrios...
                    </div>
                  ) : neighborhoods.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      No hay barrios disponibles
                    </div>
                  ) : (
                    <div className="py-2">
                      {neighborhoods.map((neighborhood) => {
                        const isSelected = selectedNeighborhood === neighborhood.neighborhood_name;
                        return (
                          <button
                            key={neighborhood.neighborhood_id}
                            type="button"
                            onClick={() => {
                              handleNeighborhoodToggle(neighborhood.neighborhood_name, neighborhood.neighborhood_id);
                              setOpenDropdown(null);
                              setDropdownPosition(null);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                              isSelected
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {neighborhood.neighborhood_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>

            {/* Subcategory Dropdown */}
            <div className="relative shrink-0 dropdown-container z-50">
              <button
                type="button"
                onClick={(e) => {
                  if (openDropdown === "subcategory") {
                    setOpenDropdown(null);
                    setDropdownPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({ top: rect.bottom + 8, left: rect.left });
                    setOpenDropdown("subcategory");
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <span>{selectedSubcategory || "Subcategoría"}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${openDropdown === "subcategory" ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openDropdown === "subcategory" && dropdownPosition && (
                <>
                  <div className="fixed inset-0 z-[998]" onClick={() => { setOpenDropdown(null); setDropdownPosition(null); }}></div>
                  <div 
                    className="fixed w-[280px] max-h-60 overflow-y-auto bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[999]"
                    style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
                  >
                  {loadingSubcategories ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      Cargando subcategorías...
                    </div>
                  ) : subcategories.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      No hay subcategorías disponibles
                    </div>
                  ) : (
                    <div className="py-2">
                      {subcategories.map((subcategory) => {
                        const isSelected = selectedSubcategory === subcategory.subcategory_name;
                        return (
                          <button
                            key={subcategory.subcategory_id}
                            type="button"
                            onClick={() => {
                              handleSubcategoryToggle(subcategory.subcategory_name);
                              setOpenDropdown(null);
                              setDropdownPosition(null);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                              isSelected
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {subcategory.subcategory_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: Button Grid (Original Design) */}
        <div className="hidden md:flex md:h-[200px] md:flex-row justify-between bg-white dark:bg-black border border-transparent dark:border-zinc-600 rounded-lg shadow-md p-3 mb-8 overflow-clip">
          {/* City Section */}
          <div className="mb-6 w-1/4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Ciudad
            </h3>
            <div className="flex flex-wrap gap-2">
              {loadingCities ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Cargando ciudades...
                </p>
              ) : cities.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No hay ciudades disponibles
                </p>
              ) : (
                cities.map((city) => {
                  const isSelected = selectedCity === city.city_name;
                  return (
                    <button
                      key={city.city_id}
                      type="button"
                      onClick={() => handleCityToggle(city.city_name, city.city_id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          : "bg-white text-black border border-black hover:bg-zinc-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>{city.city_name}</span>
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
              )}
            </div>
          </div>

          {/* Neighborhood Section */}
          <div className="mb-6 w-1/4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Barrio
            </h3>
            <div className="flex flex-wrap gap-2">
              {!selectedCity ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Selecciona una ciudad para ver los barrios
                </p>
              ) : loadingNeighborhoods ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Cargando barrios...
                </p>
              ) : neighborhoods.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No hay barrios disponibles para esta ciudad
                </p>
              ) : (
                neighborhoods.map((neighborhood) => {
                  const isSelected = selectedNeighborhood === neighborhood.neighborhood_name;
                  return (
                    <button
                      key={neighborhood.neighborhood_id}
                      type="button"
                      onClick={() =>
                        handleNeighborhoodToggle(
                          neighborhood.neighborhood_name,
                          neighborhood.neighborhood_id
                        )
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          : "bg-white text-black border border-black hover:bg-zinc-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-800"                      }`}
                    >
                      <span>{neighborhood.neighborhood_name}</span>
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
              )}
            </div>
          </div>

          {/* Subcategory Section */}
          <div className="w-1/2 h-max">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tipo de artículo (Subcategoría)
            </h3>
            <div
              className="flex flex-wrap gap-2"
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                paddingRight: "4px"
              }}
            >
              {loadingSubcategories ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Cargando tipos de artículo...
                </p>
              ) : subcategories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No hay tipos de artículo disponibles
                </p>
              ) : (
                subcategories.map((subcategory) => {
                  const isSelected = selectedSubcategory === subcategory.subcategory_name;
                  return (
                    <button
                      key={subcategory.subcategory_id}
                      type="button"
                      onClick={() => handleSubcategoryToggle(subcategory.subcategory_name)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          : "bg-white text-black border border-black hover:bg-zinc-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-800"
                                              }`}
                    >
                      <span>{subcategory.subcategory_name}</span>
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
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 pb-5">
          <div>
            <div className="text-lg md:text-3xl font-bold dark:text-gray-400"> Lista tus muebles usados hoy </div>
            <div className="text-xs md:text-lg font-bold text-gray-500 dark:text-gray-400"> Mostrando los listados más recientes </div>
          </div>
          
          {/* View Mode Selector */}
          <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex items-center gap-1">
            <button
              onClick={() => setViewMode("gallery")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "gallery"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Vista de galería"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Vista de lista"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "map"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Vista de mapa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          </div>
        </div>


        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Cargando listados...
            </p>
          </div>
        )}

        {/* Listings Display */}
        {!loading && (
          <>
            {filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  No se encontraron listados.
                </p>
              </div>
            ) : (
              <>
                {viewMode === "gallery" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {filteredListings.map((listing) => (
                      <ListingCard key={listing.listing_id} listing={listing} />
                    ))}
                  </div>
                )}

                {viewMode === "list" && (
                  <div className="space-y-4 mb-8">
                    {filteredListings.map((listing) => (
                      <ListingRowCard key={listing.listing_id} listing={listing} />
                    ))}
                  </div>
                )}

                {viewMode === "map" && (
                  <ListingsMapView 
                    listings={filteredListings}
                    selectedCity={selectedCity}
                    selectedNeighborhood={selectedNeighborhood}
                  />
                )}

                {/* Pagination */}
                <div className="flex justify-center items-center gap-4 py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {filteredListings.length} de {total} listados
                    {total > 0 && ` (Lote ${currentBatch})`}
                  </p>
                  <button
                    onClick={handleNextBatch}
                    disabled={!hasMoreBatches}
                    className={`rounded-lg px-6 py-2 font-medium transition-colors ${
                      hasMoreBatches
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-zinc-300 text-gray-500 cursor-not-allowed dark:bg-zinc-700 dark:text-gray-500"
                    }`}
                  >
                    Cargar más
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

// Gallery View Card (current implementation)
function ListingCard({ listing }: { listing: ListingMetadata }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/listings/${listing.listing_id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="w-full bg-zinc-50 dark:bg-zinc-700 aspect-[4/3] min-h-[192px] max-h-[320px] flex items-center justify-center overflow-hidden">
        {listing.thumbnail ? (
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400">Sin imagen</span>
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
          {listing.subcategory && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
              {listing.subcategory}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {listing.city && <span>{listing.city}</span>}
          {listing.neighborhood && (
            <>
              {listing.city && <span>•</span>}
              <span>{listing.neighborhood}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// List View Row Card (small thumbnail, horizontal layout)
function ListingRowCard({ listing }: { listing: ListingMetadata }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/listings/${listing.listing_id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer flex flex-row"
    >
      {/* Small Thumbnail */}
      <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-50 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
        {listing.thumbnail ? (
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-xs">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-1 line-clamp-1">
            {listing.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            {listing.city && <span>{listing.city}</span>}
            {listing.neighborhood && (
              <>
                {listing.city && <span>•</span>}
                <span>{listing.neighborhood}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            ${listing.price}
          </span>
          {listing.subcategory && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
              {listing.subcategory}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Map View Component
function ListingsMapView({ 
  listings, 
  selectedCity, 
  selectedNeighborhood 
}: { 
  listings: ListingMetadata[];
  selectedCity: string;
  selectedNeighborhood: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([4.7110, -74.0721]); // Default to Bogotá
  const [mapZoom, setMapZoom] = useState(12);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState<string>("");

  // Geocode city/neighborhood when filters change
  useEffect(() => {
    const geocodeLocation = async () => {
      let addressString = "";
      
      if (selectedNeighborhood && selectedCity) {
        addressString = `${selectedNeighborhood}, ${selectedCity}, Colombia`;
      } else if (selectedCity) {
        addressString = `${selectedCity}, Colombia`;
      } else {
        // No filters, default to Bogotá
        setMapCenter([4.7110, -74.0721]);
        setMapZoom(12);
        setLastGeocodedAddress("");
        return;
      }

      // Only geocode if address changed
      if (addressString === lastGeocodedAddress) {
        return;
      }

      setLastGeocodedAddress(addressString);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`,
          {
            headers: {
              "User-Agent": "Saldellos App",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Geocoding failed");
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            setMapCenter([lat, lon]);
            setMapZoom(selectedNeighborhood ? 14 : 12); // Zoom in more for neighborhoods
          }
        }
      } catch (error) {
        console.error("Error geocoding location:", error);
        // Keep default Bogotá on error
      }
    };

    geocodeLocation();
  }, [selectedCity, selectedNeighborhood, lastGeocodedAddress]);

  // Load Leaflet on client side
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        const defaultIcon = L.default.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        L.default.Marker.prototype.options.icon = defaultIcon;
        setLeafletLoaded(true);
      }).catch((err) => {
        console.error("Error loading Leaflet:", err);
        setLeafletLoaded(true);
      });
    }
  }, []);

  const parseCoordinates = (coords: string | null): [number, number] | null => {
    if (!coords) return null;
    const parts = coords.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null;
  };

  if (!mounted || !leafletLoaded) {
    return (
      <div className="w-full h-[600px] rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-8">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Cargando mapa...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden mb-8">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
        key={`map-${mapCenter[0]}-${mapCenter[1]}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          minZoom={1}
          detectRetina={true}
        />
        <MapViewUpdater center={mapCenter} zoom={mapZoom} />
        {listings.map((listing) => {
          const coords = parseCoordinates(listing.coordinates);
          if (!coords) return null;
          
          return (
            <Marker key={listing.listing_id} position={coords}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-sm mb-1">{listing.title}</h3>
                  <p className="text-lg font-bold text-blue-600 mb-1">${listing.price}</p>
                  {listing.thumbnail && (
                    <img
                      src={listing.thumbnail}
                      alt={listing.title}
                      className="w-32 h-32 object-contain mb-2"
                    />
                  )}
                  <button
                    onClick={() => router.push(`/listings/${listing.listing_id}`)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver detalles
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
