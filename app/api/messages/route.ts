import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth-server";

//---- GET MESSAGES ----
// gets conversationIDs by user
// gets messages by conversation ID
// Returns a JSON object of conversations{messages{}}

export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user profile
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    const userId = authUser.id;

    // 3. Get all conversations where user is a participant
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [] }, { status: 200 });
    }

    // 4. For each conversation, get participant info, listing metadata, and messages
    // TypeScript: supabaseAdmin is guaranteed to be non-null here due to early return above
    const adminClient = supabaseAdmin!;
    
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        // Get both participants' user_ids
        const participant1Id = conversation.participant_1;
        const participant2Id = conversation.participant_2;
        const otherParticipantId =
          participant1Id === userId ? participant2Id : participant1Id;

        // Get current user's info
        const currentUserInfo = {
          user_id: authUser.id,
          first_names: userProfile.first_names,
          last_names: userProfile.last_names,
        };

        // Get other participant's user info
        let otherParticipant = null;
        if (otherParticipantId) {
          const { data: participantProfile } = await adminClient
            .from("user_profiles")
            .select("auth_user_id, first_names, last_names")
            .eq("auth_user_id", otherParticipantId)
            .single();
          otherParticipant = participantProfile
            ? {
                user_id: participantProfile.auth_user_id,
                first_names: participantProfile.first_names,
                last_names: participantProfile.last_names,
              }
            : null;
        }

        // Get listing metadata using the same logic as listingById
        let listingMetadata = null;
        if (conversation.listing_id) {
          try {
            const { getListingById } = await import("@/lib/getListingById");
            const listing = await getListingById(conversation.listing_id);
            if (listing) {
              // Return simplified metadata matching frontend expectations
              listingMetadata = {
                listing_id: listing.listing_id,
                title: listing.title,
                thumbnail: listing.thumbnail,
                price: listing.price,
                category: listing.category,
                coordinates: listing.coordinates,
                status: "active", // Assume active if listing exists
              };
            }
          } catch (err) {
            console.error("Error fetching listing metadata:", err);
            // Continue without metadata if fetch fails
          }
        }

        // Get all messages for this conversation, ordered by time_sent
        const { data: messages, error: messagesError } = await adminClient
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.conversation_id.toString())
          .order("time_sent", { ascending: true });

        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
        }

        // Number messages by creation time (1, 2, 3, ...)
        // Map messagebody/message_body (from DB) to messageBody (camelCase for frontend)
        const numberedMessages = (messages || []).map((message: any, index) => ({
          ...message,
          messageBody: message.messagebody || message.message_body || message.messageBody || "", // Handle all possible column name variations
          message_number: index + 1,
        }));

        return {
          conversation_id: conversation.conversation_id,
          listing_id: conversation.listing_id,
          participants: {
            current_user: currentUserInfo,
            other_participant: otherParticipant,
          },
          listing_metadata: listingMetadata,
          messages: numberedMessages,
        };
      })
    );

    return NextResponse.json(
      { conversations: conversationsWithDetails },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getMessages endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

//---- POST MESSAGES ----
// validates the user and takes conversation_id and messageBody
// verifies the user is a participant in the conversation
// creates a new message entry

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user profile
    const userProfile = await getUserProfile(authUser.id);

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found or inactive" }, { status: 404 });
    }

    // 3. Parse request body
    const body = await request.json();
    const { conversation_id, messageBody } = body;

    // 4. Validate required fields
    if (!conversation_id || conversation_id.trim() === "") {
      return NextResponse.json(
        { error: "conversation_id is required" },
        { status: 400 }
      );
    }

    if (!messageBody || messageBody.trim() === "") {
      return NextResponse.json(
        { error: "messageBody is required" },
        { status: 400 }
      );
    }

    const userId = authUser.id;
    const normalizedConversationId = conversation_id.trim();

    // 5. Verify user is a participant in the conversation
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("conversation_id", normalizedConversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user is participant_1 or participant_2
    const isParticipant = conversation.participant_1 === userId || conversation.participant_2 === userId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // 6. Create message entry
    // message_id is auto-generated by the database (UUID)
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: normalizedConversationId,
        sent_by: userId,
        message_body: messageBody.trim(),
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Message created successfully",
        message_id: message.message_id,
        conversation_id: normalizedConversationId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in postMessage endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
