"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";

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

export default function ListarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Location data
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  const [formData, setFormData] = useState({
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
  });

  // File selection states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Fetch countries and subcategories on mount
  useEffect(() => {
    if (user) {
      fetchCountries();
      fetchSubcategories();
    }
  }, [user]);

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

  async function fetchCountries() {
    try {
      setLoadingCountries(true);
      const response = await fetch("/api/locations/countries");
      if (!response.ok) throw new Error("Error al cargar países");
      const data = await response.json();
      setCountries(data.countries || []);
    } catch (err) {
      console.error("Error fetching countries:", err);
      setError("Error al cargar países");
    } finally {
      setLoadingCountries(false);
    }
  }

  async function fetchCities(countryId: string) {
    try {
      setLoadingCities(true);
      const response = await fetch(`/api/locations/cities?country_id=${countryId}`);
      if (!response.ok) throw new Error("Error al cargar ciudades");
      const data = await response.json();
      setCities(data.cities || []);
    } catch (err) {
      console.error("Error fetching cities:", err);
      setError("Error al cargar ciudades");
    } finally {
      setLoadingCities(false);
    }
  }

  async function fetchNeighborhoods(cityId: string) {
    try {
      setLoadingNeighborhoods(true);
      const response = await fetch(`/api/locations/neighborhoods?city_id=${cityId}`);
      if (!response.ok) throw new Error("Error al cargar barrios");
      const data = await response.json();
      setNeighborhoods(data.neighborhoods || []);
    } catch (err) {
      console.error("Error fetching neighborhoods:", err);
      setError("Error al cargar barrios");
    } finally {
      setLoadingNeighborhoods(false);
    }
  }

  async function fetchSubcategories() {
    try {
      setLoadingSubcategories(true);
      // Fetch subcategories for "para la venta" category (no category_id needed)
      const response = await fetch("/api/locations/subcategories");
      if (!response.ok) throw new Error("Error al cargar subcategorías");
      const data = await response.json();
      setSubcategories(data.subcategories || []);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
      setError("Error al cargar subcategorías");
    } finally {
      setLoadingSubcategories(false);
    }
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] pb-16 md:pb-0">
          <p className="text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  // Don't render form if not authenticated
  if (!user) {
    return null;
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

  // File input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (files.length > 10) {
      setError("Máximo 10 imágenes permitidas");
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} no es una imagen válida`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError(`${file.name} es demasiado grande (máximo 5MB)`);
        return;
      }
      validFiles.push(file);
    });

    setSelectedFiles(validFiles);
    setError(null); // Clear any previous errors

    // Create previews
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Remove file handler
  const removeFile = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validate files
    if (selectedFiles.length === 0) {
      setError("Se requiere al menos una foto");
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Usuario no autenticado");
      setLoading(false);
      return;
    }

    // Validate that city and neighborhood are provided
    if (!formData.city || !formData.city_id) {
      setError("La ciudad es obligatoria");
      setLoading(false);
      return;
    }

    if (!formData.neighborhood || !formData.neighborhood_id) {
      setError("El barrio es obligatorio");
      setLoading(false);
      return;
    }

    // Get owner_id from authenticated user (already validated above)
    const ownerId = user.id;

    try {
      // Step 1: Get file paths from backend (validates user)
      const uploadResponse = await authenticatedFetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileCount: selectedFiles.length
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Error al obtener autorización de carga");
      }

      const { filePaths, bucketName } = await uploadResponse.json();

      // Step 2: Upload files directly to Supabase Storage using authenticated client
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const { path, publicUrl } = filePaths[i];

        // Determine file extension
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fullPath = `${path}.${fileExt}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fullPath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          throw new Error(`Error al subir ${file.name}: ${uploadError.message}`);
        }

        // Construct the public URL
        const finalPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fullPath}`;
        uploadedUrls.push(finalPublicUrl);
      }

      // Step 3: Create listing with uploaded image URLs
      const requestBody: any = {
        owner_id: ownerId,
        title: formData.title,
        description: formData.description,
        address_line_1: formData.address_line_1,
        coordinates: formData.coordinates,
        price: formData.price,
        subcategory_id: formData.subcategory_id,
        thumbnail: uploadedUrls[0], // First photo is thumbnail
        pictures: uploadedUrls,
        country: formData.country,
        city: formData.city,
        neighborhood: formData.neighborhood,
      };

      // Add optional fields
      if (formData.address_line_2.trim()) {
        requestBody.address_line_2 = formData.address_line_2;
      }

      const response = await authenticatedFetch("/api/manageListings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear el listado");
      }

      setSuccess(true);
      
      // Clean up preview URLs
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      
      // Reset form
      setSelectedFiles([]);
      setImagePreviews([]);
      setFormData({
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
      });

      // Redirect after success
      setTimeout(() => {
        router.push("/misListados");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="py-12 px-4 pb-16 md:pb-12">
        <main className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
              Crear nuevo listado
            </h1>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-100 border border-green-400 text-green-700 px-4 py-3">
              ¡Listado creado exitosamente! Redirigiendo...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Título *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
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
                Descripción *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
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
                País *
              </label>
              <select
                id="country"
                name="country"
                value={formData.country_id}
                onChange={handleInputChange}
                required
                disabled={loadingCountries}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white disabled:bg-zinc-100"
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
                Dirección línea 1 *
              </label>
              <input
                type="text"
                id="address_line_1"
                name="address_line_1"
                value={formData.address_line_1}
                onChange={handleInputChange}
                required
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

            {/* Coordinates */}
            <div>
              <label
                htmlFor="coordinates"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Coordenadas (lat,lng) *
              </label>
              <input
                type="text"
                id="coordinates"
                name="coordinates"
                value={formData.coordinates}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-gray-600 dark:text-white"
                placeholder="ej: 4.7110,-74.0721"
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Precio *
              </label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
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
                Tipo de artículo * (Subcategoría)
              </label>
              <select
                id="subcategory_id"
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleInputChange}
                required
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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Fotos * (se requiere al menos una, máximo 10)
              </label>
              
              {/* File input */}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Formatos aceptados: JPG, PNG, WebP. Tamaño máximo: 5MB por imagen.
              </p>

              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        aria-label="Eliminar imagen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Creando..." : "Crear listado"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/misListados")}
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-zinc-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}