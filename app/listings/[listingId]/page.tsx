"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "../../components/Header";

interface ListingResponse {
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
  pictureURLs: string[];
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const listingId = params.listingId as string;

  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

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

  async function sendMessage() {
    if (!messageText.trim() || sending) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Step 1: Get or create conversation
      const conversationResponse = await fetch(
        `/api/conversations?listing_id=${listingId}`
      );

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json();
        throw new Error(errorData.error || "Error al obtener la conversación");
      }

      const conversationData = await conversationResponse.json();
      const conversationId = conversationData.conversation_id;

      if (!conversationId) {
        throw new Error("No se pudo obtener el ID de la conversación");
      }

      // Step 2: Send message using conversation_id
      const messageResponse = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          messageBody: messageText.trim(),
        }),
      });

      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.error || "Error al enviar el mensaje");
      }

      // Success
      setMessageText("");
      setMessageSent(true);
      setShowMessageForm(false);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setMessageSent(false);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al enviar el mensaje"
      );
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Volver
          </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main thumbnail or first photo */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {listing.thumbnail || (listing.pictureURLs && listing.pictureURLs.length > 0) ? (
                <div className="w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
                  <div className="w-full max-w-[800px] max-h-[600px] flex items-center justify-center">
                    <img
                      src={listing.thumbnail || listing.pictureURLs[0]}
                      alt={listing.title}
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400">Sin imagen</span>
                </div>
              )}
            </div>
            
            {/* Additional photos gallery */}
            {listing.pictureURLs && listing.pictureURLs.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {listing.pictureURLs.slice(1).map((photoUrl, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="w-full h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-2">
                      <div className="w-full max-w-full max-h-full flex items-center justify-center">
                        <img
                          src={photoUrl}
                          alt={`${listing.title} - Foto ${index + 2}`}
                          className="max-w-full max-h-full w-auto h-auto object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-4">
                {listing.title}
              </h1>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  ${listing.price}
                </span>
                {listing.category && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                    {listing.category}
                  </span>
                )}
              </div>
              {/* Contact Seller Button */}
              {status === "authenticated" && session ? (
                <div>
                  {!showMessageForm ? (
                    <button
                      onClick={() => setShowMessageForm(true)}
                      className="w-full rounded-lg bg-green-500 px-6 py-3 text-white font-medium hover:bg-green-600 transition-colors"
                    >
                      Contactar al vendedor
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Escribe tu mensaje al vendedor..."
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-zinc-50 px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={sendMessage}
                          disabled={!messageText.trim() || sending}
                          className="flex-1 rounded-lg bg-green-500 px-6 py-2 text-white font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {sending ? "Enviando..." : "Enviar"}
                        </button>
                        <button
                          onClick={() => {
                            setShowMessageForm(false);
                            setMessageText("");
                            setError(null);
                          }}
                          className="rounded-lg bg-gray-500 px-4 py-2 text-white font-medium hover:bg-gray-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                      {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push("/")}
                  className="w-full rounded-lg bg-green-500 px-6 py-3 text-white font-medium hover:bg-green-600 transition-colors"
                >
                  Inicia sesión para contactar al vendedor
                </button>
              )}
              {messageSent && (
                <div className="mt-3 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Mensaje enviado exitosamente
                  </p>
                </div>
              )}
            </div>

            {/* Category and Subcategory */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="grid grid-cols-2 gap-4">
                {listing.category && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Categoría
                    </h3>
                    <p className="text-lg font-semibold text-black dark:text-zinc-50 capitalize">
                      {listing.category}
                    </p>
                  </div>
                )}
                {listing.subcategory && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Subcategoría
                    </h3>
                    <p className="text-lg font-semibold text-black dark:text-zinc-50 capitalize">
                      {listing.subcategory}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                Descripción
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {listing.description || "No hay descripción disponible."}
              </p>
            </div>

            {/* Location Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                Ubicación
              </h2>
              <div className="space-y-3">
                {listing.country && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      País
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {listing.country}
                    </p>
                  </div>
                )}
                {listing.city && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Ciudad
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {listing.city}
                    </p>
                  </div>
                )}
                {listing.neighborhood && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Barrio
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {listing.neighborhood}
                    </p>
                  </div>
                )}
                {listing.coordinates && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Coordenadas
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">
                      {listing.coordinates}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Photos count */}
            {listing.pictureURLs && listing.pictureURLs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
                  Fotos
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  {listing.pictureURLs.length} {listing.pictureURLs.length === 1 ? "foto" : "fotos"} disponible{listing.pictureURLs.length === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

