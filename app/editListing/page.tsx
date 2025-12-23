"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";

interface ListingData {
  listing_id: string;
  title: string;
  description: string;
  address: string;
  coordinates: string;
  price: string;
  category: string;
  photos: string[];
}

function EditListingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ListingData>({
    listing_id: "",
    title: "",
    description: "",
    address: "",
    coordinates: "",
    price: "",
    category: "",
    photos: [""],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && listingId) {
      fetchListingData();
    }
  }, [status, router, listingId]);

  async function fetchListingData() {
    if (!listingId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch full listing data
      const response = await fetch(`/api/manageListings?listing_id=${listingId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch listing");
      }

      const data = await response.json();
      const listing = data.listing;

      if (!listing) {
        throw new Error("Listing not found");
      }

      setFormData({
        listing_id: listingId,
        title: listing.title || "",
        description: listing.description || "",
        address: listing.address || "",
        coordinates: listing.coordinates || "",
        price: listing.price || "",
        category: listing.category || "",
        photos: listing.photos && listing.photos.length > 0 
          ? listing.photos 
          : listing.thumbnail 
            ? [listing.thumbnail] 
            : [""],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing");
      console.error("Error fetching listing:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (index: number, value: string) => {
    const newPhotos = [...formData.photos];
    newPhotos[index] = value;
    setFormData((prev) => ({ ...prev, photos: newPhotos }));
  };

  const addPhotoField = () => {
    setFormData((prev) => ({ ...prev, photos: [...prev.photos, ""] }));
  };

  const removePhotoField = (index: number) => {
    if (formData.photos.length > 1) {
      const newPhotos = formData.photos.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, photos: newPhotos }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Filter out empty photo URLs
      const validPhotos = formData.photos.filter((photo) => photo.trim() !== "");

      // Build update payload - only include fields that have values
      const updatePayload: any = {
        listing_id: formData.listing_id,
      };

      if (formData.title.trim()) updatePayload.title = formData.title;
      if (formData.description.trim()) updatePayload.description = formData.description;
      if (formData.address.trim()) updatePayload.address = formData.address;
      if (formData.coordinates.trim()) updatePayload.coordinates = formData.coordinates;
      if (formData.price.trim()) updatePayload.price = formData.price;
      if (formData.category.trim()) updatePayload.category = formData.category;
      if (validPhotos.length > 0) updatePayload.photos = validPhotos;

      const response = await fetch("/api/manageListings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update listing");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/misListados");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !listingId) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black py-12 px-4">
      <main className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <h1 className="mb-6 text-3xl font-semibold text-black dark:text-zinc-50">
          Edit Listing
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 border border-green-400 text-green-700 px-4 py-3">
            Listing updated successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter listing title"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Describe your listing"
            />
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter full address"
            />
          </div>

          {/* Coordinates */}
          <div>
            <label
              htmlFor="coordinates"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Coordinates (lat,lng)
            </label>
            <input
              type="text"
              id="coordinates"
              name="coordinates"
              value={formData.coordinates}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g., 40.7128,-74.0060"
            />
          </div>

          {/* Price */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Price
            </label>
            <input
              type="text"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter price"
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select a category</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="room">Room</option>
              <option value="studio">Studio</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photo URLs
            </label>
            {formData.photos.map((photo, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <input
                  type="url"
                  value={photo}
                  onChange={(e) => handlePhotoChange(index, e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://example.com/photo.jpg"
                />
                {formData.photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhotoField(index)}
                    className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhotoField}
              className="mt-2 rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 transition-colors"
            >
              Add Another Photo
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/misListados")}
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    }>
      <EditListingContent />
    </Suspense>
  );
}

