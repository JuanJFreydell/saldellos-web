"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api-client";
import Header from "../components/Header";

interface Participant {
  user_id: string;
  first_names: string | null;
  last_names: string | null;
}

interface Message {
  message_id: string;
  chat_id: string;
  sent_by: string;
  time_sent: string;
  messageBody: string;
  message_number: number;
}

interface Conversation {
  conversation_id: string;
  listing_id: string;
  participants: {
    current_user: Participant;
    other_participant: Participant | null;
  };
  listing_metadata: {
    listing_id: string;
    title: string;
    thumbnail: string;
    coordinates: string;
    price: string;
    listing_date: string;
    status: string;
    category: string;
  } | null;
  messages: Message[];
}

interface ConversationsResponse {
  conversations: Conversation[];
}

export default function MensagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }
    if (user) {
      fetchConversations();
    }
  }, [user, authLoading, router]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!user) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchConversations(true); // Silent polling - don't show loading spinner
    }, 5000); // Poll every 5 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  async function fetchConversations(silent = false) {
    try {
      // Only show loading spinner on initial load, not on polling updates
      if (!silent) {
      setLoading(true);
      }
      setError(null);

      const response = await authenticatedFetch("/api/messages");
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data: ConversationsResponse = await response.json();
      const newConversations = data.conversations || [];
      
      // Update conversations state
      setConversations(newConversations);

      // If a conversation is selected, update it with fresh data
      if (selectedConversation) {
        const updated = newConversations.find(
          (c) => c.conversation_id === selectedConversation.conversation_id
        );
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (err) {
      // Only show error on initial load, not on polling failures
      if (!silent) {
      setError(err instanceof Error ? err.message : "An error occurred");
      }
      console.error("Error fetching conversations:", err);
    } finally {
      if (!silent) {
      setLoading(false);
      }
    }
  }

  async function sendMessage() {
    if (!selectedConversation || !messageText.trim() || sending) {
      return;
    }

    const messageTextToSend = messageText.trim();
    const currentUserId = selectedConversation.participants.current_user.user_id;

    try {
      setSending(true);
      const response = await authenticatedFetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.conversation_id,
          messageBody: messageTextToSend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const responseData = await response.json();

      // Create the new message object to add to local state
      const newMessage: Message = {
        message_id: responseData.message_id,
        chat_id: selectedConversation.conversation_id,
        sent_by: currentUserId,
        time_sent: new Date().toISOString(),
        messageBody: messageTextToSend,
        message_number: selectedConversation.messages.length + 1,
      };

      // Update local state: add the new message to the selected conversation
      setSelectedConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
        };
      });

      // Also update the conversations list to keep it in sync
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversation_id === selectedConversation.conversation_id
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
              }
            : conv
        )
      );

      // Clear input
      setMessageText("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert(err instanceof Error ? err.message : "Error al enviar el mensaje. Por favor intenta de nuevo.");
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

  function getParticipantName(participant: Participant | null): string {
    if (!participant) return "Usuario desconocido";
    const firstName = participant.first_names || "";
    const lastName = participant.last_names || "";
    return `${firstName} ${lastName}`.trim() || "Usuario sin nombre";
  }

  function formatTime(timeString: string): string {
    try {
      const date = new Date(timeString);
      return date.toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeString;
    }
  }

  function getLastMessagePreview(conversation: Conversation): string {
    if (conversation.messages.length === 0) {
      return "Sin mensajes";
    }
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    return lastMessage.messageBody || "Mensaje sin contenido";
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Cargando conversaciones...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-lg text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchConversations()}
              className="rounded-lg bg-black px-6 py-2 text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="flex h-[calc(100vh-80px)] pb-16 md:pb-0">
        {/* Conversations List Panel */}
        <div className={`${
          selectedConversation ? "hidden md:block" : "block"
        } w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 overflow-y-auto`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              Conversaciones
            </h2>
          </div>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No tienes conversaciones aún
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {conversations.map((conversation) => {
                const otherParticipant = conversation.participants.other_participant;
                const isSelected =
                  selectedConversation?.conversation_id === conversation.conversation_id;

                return (
                  <button
                    key={conversation.conversation_id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 border-l-4 border-black dark:border-white"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {conversation.listing_metadata?.thumbnail ? (
                        <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={conversation.listing_metadata.thumbnail}
                          alt={conversation.listing_metadata.title}
                            className="max-w-full max-h-full object-contain"
                        />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                          <span className="text-gray-400 text-xs">Sin imagen</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-black dark:text-zinc-50 truncate">
                            {getParticipantName(otherParticipant)}
                          </p>
                          {conversation.messages.length > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 shrink-0">
                              {formatTime(
                                conversation.messages[conversation.messages.length - 1]
                                  .time_sent
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conversation.listing_metadata?.title || "Listado sin título"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {getLastMessagePreview(conversation)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversation View Panel */}
        <div className={`${
          selectedConversation ? "flex" : "hidden md:flex"
        } flex-1 flex-col bg-white dark:bg-zinc-800`}>
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden mb-3 flex items-center gap-2 text-black dark:text-white hover:opacity-70 transition-opacity"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="text-sm font-medium">Volver</span>
                </button>
                <div className="flex items-center gap-3">
                  {selectedConversation.listing_metadata?.thumbnail ? (
                    <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedConversation.listing_metadata.thumbnail}
                      alt={selectedConversation.listing_metadata.title}
                        className="max-w-full max-h-full object-contain"
                    />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Sin imagen</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-black dark:text-zinc-50">
                      {getParticipantName(selectedConversation.participants.other_participant)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedConversation.listing_metadata?.title || "Listado sin título"}
                    </p>
                  </div>
                  {selectedConversation.listing_metadata && (
                    <button
                      onClick={() =>
                        router.push(`/listings/${selectedConversation.listing_id}`)
                      }
                      className="text-sm text-black dark:text-white hover:underline"
                    >
                      Ver listado
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No hay mensajes aún. ¡Envía el primero!
                  </div>
                ) : (
                  selectedConversation.messages.map((message) => {
                    const isCurrentUser =
                      message.sent_by === selectedConversation.participants.current_user.user_id;
                    const sender = isCurrentUser
                      ? selectedConversation.participants.current_user
                      : selectedConversation.participants.other_participant;

                    return (
                      <div
                        key={message.message_id}
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isCurrentUser
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50"
                          }`}
                        >
                          {!isCurrentUser && (
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {getParticipantName(sender)}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.messageBody}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isCurrentUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {formatTime(message.time_sent)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    rows={2}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
                    className="rounded-lg bg-black px-6 py-2 text-white font-medium hover:bg-zinc-800 transition-colors disabled:bg-zinc-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    {sending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona una conversación para ver los mensajes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

