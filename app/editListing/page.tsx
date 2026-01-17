"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api-client";
import MapPicker from "../components/MapPicker";

interface ListingData {
  listing_id: string;
  title: string;
  description: string;
  subcategory: string | null;
  category: string | null;
  price: string;
  thumbnail: string;
  coordinates: string | null;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
  pictureURLs: string[];
  address_line_1?: string | null;
  address_line_2?: string | null;
}

interface Country {
  country_id: string;
  country_name: string;
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

function EditListingContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Location data
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Loading states
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  const [formData, setFormData] = useState({
    listing_id: "",
    title: "",
    description: "",
    address_line_1: "",
    address_line_2: "",
    coordinates: "",
    price: "",
    country: "",
    country_id: "",
        city: "",
        city_id: "",
        neighborhood: "",
        neighborhood_id: "",
        subcategory_id: "",
    pictures: [""],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    } else if (user && listingId) {
      fetchInitialData();
    }
  }, [user, authLoading, router, listingId]);

  async function fetchInitialData() {
    if (!listingId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch countries and subcategories first
      const [countriesRes, subcategoriesRes] = await Promise.all([
        fetch("/api/locations/countries"),
        fetch("/api/locations/subcategories"), // Fetch subcategories for "para la venta"
      ]);

      if (!countriesRes.ok || !subcategoriesRes.ok) {
        throw new Error("Failed to fetch initial data");
      }

      const countriesData = await countriesRes.json();
      const subcategoriesData = await subcategoriesRes.json();
      setCountries(countriesData.countries || []);
      setSubcategories(subcategoriesData.subcategories || []);

      // Fetch listing data
      const response = await authenticatedFetch(`/api/manageListings?listing_id=${listingId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch listing");
      }

      const data = await response.json();
      const listing: ListingData = data.listing;

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Find country, city, neighborhood IDs based on names
      let countryId = "";
      let cityId = "";
      let neighborhoodId = "";
      let subcategoryId = "";

      // Find country ID
      if (listing.country) {
        const country = countriesData.countries.find(
          (c: Country) => c.country_name.toLowerCase() === listing.country!.toLowerCase()
        );
        if (country) {
          countryId = country.country_id;
          // Fetch cities for this country
          const citiesRes = await fetch(`/api/locations/cities?country_id=${countryId}`);
          if (citiesRes.ok) {
            const citiesData = await citiesRes.json();
            setCities(citiesData.cities || []);

            // Find city ID
            if (listing.city) {
              const city = citiesData.cities.find(
                (c: City) => c.city_name.toLowerCase() === listing.city!.toLowerCase()
              );
              if (city) {
                cityId = city.city_id;
                // Fetch neighborhoods for this city
                const neighborhoodsRes = await fetch(`/api/locations/neighborhoods?city_id=${cityId}`);
                if (neighborhoodsRes.ok) {
                  const neighborhoodsData = await neighborhoodsRes.json();
                  setNeighborhoods(neighborhoodsData.neighborhoods || []);

                  // Find neighborhood ID
                  if (listing.neighborhood) {
                    const neighborhood = neighborhoodsData.neighborhoods.find(
                      (n: Neighborhood) => n.neighborhood_name.toLowerCase() === listing.neighborhood!.toLowerCase()
                    );
                    if (neighborhood) {
                      neighborhoodId = neighborhood.neighborhood_id;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Find subcategory ID
      if (listing.subcategory) {
        const subcategory = subcategoriesData.subcategories.find(
          (s: Subcategory) => s.subcategory_name.toLowerCase() === listing.subcategory!.toLowerCase()
        );
        if (subcategory) {
          subcategoryId = subcategory.subcategory_id;
        }
      }

      setFormData({
        listing_id: listingId,
        title: listing.title || "",
        description: listing.description || "",
        address_line_1: listing.address_line_1 || "",
        address_line_2: listing.address_line_2 || "",
        coordinates: listing.coordinates || "",
        price: listing.price || "",
        country: listing.country || "",
        country_id: countryId,
        city: listing.city || "",
        city_id: cityId,
        neighborhood: listing.neighborhood || "",
        neighborhood_id: neighborhoodId,
        subcategory_id: subcategoryId,
        pictures: listing.pictureURLs && listing.pictureURLs.length > 0
          ? listing.pictureURLs
          : listing.thumbnail
            ? [listing.thumbnail]
            : [""],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el listado");
      console.error("Error fetching listing:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch cities when country is selected
  useEffect(() => {
    if (formData.country_id) {
      fetchCities(formData.country_id);
    } else {
      setCities([]);
      setNeighborhoods([]);
      setFormData((prev) => ({
        ...prev,
        city: "",
        city_id: "",
        neighborhood: "",
        neighborhood_id: "",
      }));
    }
  }, [formData.country_id]);

  // Fetch neighborhoods when city is selected
  useEffect(() => {
    if (formData.city_id) {
      fetchNeighborhoods(formData.city_id);
    } else {
      setNeighborhoods([]);
      setFormData((prev) => ({
        ...prev,
        neighborhood: "",
        neighborhood_id: "",
      }));
    }
  }, [formData.city_id]);


  async function fetchCities(countryId: string) {
    try {
      setLoadingCities(true);
      const response = await fetch(`/api/locations/cities?country_id=${countryId}`);
      if (!response.ok) throw new Error("Failed to fetch cities");
      const data = await response.json();
      setCities(data.cities || []);
    } catch (err) {
      console.error("Error fetching cities:", err);
    } finally {
      setLoadingCities(false);
    }
  }

  async function fetchNeighborhoods(cityId: string) {
    try {
      setLoadingNeighborhoods(true);
      const response = await fetch(`/api/locations/neighborhoods?city_id=${cityId}`);
      if (!response.ok) throw new Error("Failed to fetch neighborhoods");
      const data = await response.json();
      setNeighborhoods(data.neighborhoods || []);
    } catch (err) {
      console.error("Error fetching neighborhoods:", err);
    } finally {
      setLoadingNeighborhoods(false);
    }
  }


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "country") {
      const country = countries.find((c) => c.country_id === value);
      setFormData((prev) => ({
        ...prev,
        country: country?.country_name || "",
        country_id: value,
      }));
    } else if (name === "city") {
      const city = cities.find((c) => c.city_id === value);
      setFormData((prev) => ({
        ...prev,
        city: city?.city_name || "",
        city_id: value,
      }));
    } else if (name === "neighborhood") {
      const neighborhood = neighborhoods.find((n) => n.neighborhood_id === value);
      setFormData((prev) => ({
        ...prev,
        neighborhood: neighborhood?.neighborhood_name || "",
        neighborhood_id: value,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoChange = (index: number, value: string) => {
    const newPhotos = [...formData.pictures];
    newPhotos[index] = value;
    setFormData((prev) => ({ ...prev, pictures: newPhotos }));
  };

  const addPhotoField = () => {
    setFormData((prev) => ({ ...prev, pictures: [...prev.pictures, ""] }));
  };

  const removePhotoField = (index: number) => {
    if (formData.pictures.length > 1) {
      const newPhotos = formData.pictures.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, pictures: newPhotos }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Filter out empty photo URLs
      const validPhotos = formData.pictures.filter((photo) => photo.trim() !== "");

      // Build update payload - only include fields that have values
      const updatePayload: any = {
        listing_id: formData.listing_id,
      };

      if (formData.title.trim()) updatePayload.title = formData.title;
      if (formData.description.trim()) updatePayload.description = formData.description;
      if (formData.address_line_1.trim()) updatePayload.address_line_1 = formData.address_line_1;
      if (formData.address_line_2.trim()) updatePayload.address_line_2 = formData.address_line_2;
      if (formData.coordinates.trim()) updatePayload.coordinates = formData.coordinates;
      if (formData.price.trim()) updatePayload.price = formData.price;
      if (formData.subcategory_id) updatePayload.subcategory_id = formData.subcategory_id;
      if (validPhotos.length > 0) {
        updatePayload.thumbnail = validPhotos[0];
        updatePayload.pictures = validPhotos;
      }
      // Location fields - all must be provided together if any is being updated
      // Since they're required fields, always include them if they have values
      if (formData.country && formData.city && formData.neighborhood) {
        updatePayload.country = formData.country;
        updatePayload.city = formData.city;
        updatePayload.neighborhood = formData.neighborhood;
      } else if (formData.country || formData.city || formData.neighborhood) {
        // If any location field is provided but not all, show error
        throw new Error("País, ciudad y barrio son obligatorios cuando se actualiza la ubicación");
      }

      const response = await authenticatedFetch("/api/manageListings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el listado");
      }

      // Trigger cache rebuild asynchronously (don't wait for response)
      if (listingId) {
        authenticatedFetch("/api/rebuild-cache", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ listing_id: listingId }),
        }).catch(err => {
          console.error("Error triggering cache rebuild:", err);
          // Don't show error to user - rebuild happens in background
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/misListados");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  if (!authLoading && !user || !listingId) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black py-12 px-4">
      <main className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-800">
        <h1 className="mb-6 text-3xl font-semibold text-black dark:text-zinc-50">
          Editar listado
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 border border-green-400 text-green-700 px-4 py-3">
            ¡Listado actualizado exitosamente! Redirigiendo...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Título
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
              placeholder="Ingresa el título del listado"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
              placeholder="Describe tu listado"
            />
          </div>

          {/* Country */}
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              País
            </label>
            <select
              id="country"
              name="country"
              value={formData.country_id}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Selecciona un país</option>
              {countries.map((country) => (
                <option key={country.country_id} value={country.country_id}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Ciudad *
            </label>
            <select
              id="city"
              name="city"
              value={formData.city_id}
              onChange={handleInputChange}
              required
              disabled={!formData.country_id || loadingCities}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white disabled:bg-zinc-100"
            >
              <option value="">Selecciona una ciudad</option>
              {cities.map((city) => (
                <option key={city.city_id} value={city.city_id}>
                  {city.city_name}
                </option>
              ))}
            </select>
          </div>

          {/* Neighborhood */}
          <div>
            <label
              htmlFor="neighborhood"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Barrio *
            </label>
            <select
              id="neighborhood"
              name="neighborhood"
              value={formData.neighborhood_id}
              onChange={handleInputChange}
              required
              disabled={!formData.city_id || loadingNeighborhoods}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white disabled:bg-zinc-100"
            >
              <option value="">Selecciona un barrio</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.neighborhood_id} value={neighborhood.neighborhood_id}>
                  {neighborhood.neighborhood_name}
                </option>
              ))}
            </select>
          </div>

          {/* Address Line 1 */}
          <div>
            <label
              htmlFor="address_line_1"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Dirección línea 1
            </label>
            <input
              type="text"
              id="address_line_1"
              name="address_line_1"
              value={formData.address_line_1}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
              placeholder="Ingresa la dirección"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label
              htmlFor="address_line_2"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Dirección línea 2 (opcional)
            </label>
            <input
              type="text"
              id="address_line_2"
              name="address_line_2"
              value={formData.address_line_2}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
              placeholder="Apartamento, suite, etc. (opcional)"
            />
          </div>

          {/* Coordinates - Map Picker */}
          <div>
            <label
              htmlFor="coordinates"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Ubicación en el mapa
            </label>
            <MapPicker
              coordinates={formData.coordinates || ""}
              onCoordinatesChange={(coords) => {
                setFormData((prev) => ({
                  ...prev,
                  coordinates: coords,
                }));
              }}
            />
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Precio
            </label>
            <input
              type="text"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
              placeholder="Ingresa el precio"
            />
          </div>

          {/* Subcategory */}
          <div>
            <label
              htmlFor="subcategory_id"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tipo de artículo (Subcategoría)
            </label>
            <select
              id="subcategory_id"
              name="subcategory_id"
              value={formData.subcategory_id}
              onChange={handleInputChange}
              disabled={loadingSubcategories}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white disabled:bg-zinc-100"
            >
              <option value="">Seleccione un tipo de artículo</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                  {subcategory.subcategory_name}
                </option>
              ))}
            </select>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URLs de fotos
            </label>
            {formData.pictures.map((photo, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <input
                  type="url"
                  value={photo}
                  onChange={(e) => handlePhotoChange(index, e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                {formData.pictures.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhotoField(index)}
                    className="rounded-lg bg-white border border-black px-4 py-2 text-black hover:bg-zinc-50 transition-colors dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhotoField}
              className="mt-2 rounded-lg bg-white border border-black px-4 py-2 text-black hover:bg-zinc-50 transition-colors dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
            >
              Agregar otra foto
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/misListados")}
              className="rounded-lg bg-white border border-black px-6 py-3 font-medium text-black hover:bg-zinc-50 transition-colors dark:bg-black dark:border-white dark:text-white dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-lg">Cargando...</p>
        </div>
      }
    >
      <EditListingContent />
    </Suspense>
  );
}
