import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authOptions } from "../auth/[...nextauth]/route";

//---- GET MESSAGES ----
// gets conversationIDs by user
// gets messages by conversation ID
// Returns a JSON object of conversations{messages{}}

export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    const userId = user.user_id.toString();

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
          user_id: user.user_id,
          first_names: user.first_names,
          last_names: user.last_names,
        };

        // Get other participant's user info
        let otherParticipant = null;
        if (otherParticipantId) {
          const { data: participantData } = await adminClient
            .from("users")
            .select("user_id, first_names, last_names")
            .eq("user_id", otherParticipantId)
            .single();
          otherParticipant = participantData
            ? {
                user_id: participantData.user_id,
                first_names: participantData.first_names,
                last_names: participantData.last_names,
              }
            : null;
        }

        // Get listing metadata
        let listingMetadata = null;
        if (conversation.listing_id) {
          const { data: metadata } = await adminClient
            .from("listings_meta_data")
            .select("*")
            .eq("listing_id", conversation.listing_id)
            .single();
          listingMetadata = metadata;
        }

        // Get all messages for this conversation, ordered by time_sent
        const { data: messages, error: messagesError } = await adminClient
          .from("messages")
          .select("*")
          .eq("chat_id", conversation.conversation_id.toString())
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
// validates the user and takes listing_id and message_body
// checks if conversation exists between current user and listing owner
// creates conversation if it doesn't exist
// creates a new message entry

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 2. Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { listing_id, messageBody } = body;

    // 4. Validate required fields
    if (!listing_id || listing_id.trim() === "") {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    if (!messageBody || messageBody.trim() === "") {
      return NextResponse.json(
        { error: "messageBody is required" },
        { status: 400 }
      );
    }

    const userId = user.user_id.toString();

    // 5. Get listing to find the owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("owner_id, status")
      .eq("listing_id", listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Check if listing is active
    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "Listing is not active" },
        { status: 400 }
      );
    }

    const ownerId = listing.owner_id.toString();

    // 6. Check if conversation exists between current user and listing owner for this listing
    // Search for conversations with this listing_id where either participant is the current user or owner
    const { data: existingConversations, error: conversationSearchError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("listing_id", listing_id);

    if (conversationSearchError) {
      console.error("Error searching for conversation:", conversationSearchError);
      return NextResponse.json(
        { error: "Failed to search for conversation" },
        { status: 500 }
      );
    }

    // Find conversation where both participants match (current user and listing owner)
    let conversation = existingConversations?.find(
      (conv) =>
        ((conv.participant_1 === userId && conv.participant_2 === ownerId) ||
          (conv.participant_1 === ownerId && conv.participant_2 === userId))
    );

    let conversationId: string;

    // 7. Create conversation if it doesn't exist
    // Only prevent creating NEW conversations with yourself, but allow replying to existing ones
    if (!conversation) {
      // Prevent users from creating new conversations with themselves
      if (userId === ownerId) {
        return NextResponse.json(
          { error: "You cannot message yourself" },
          { status: 400 }
        );
      }
      const { data: newConversation, error: createConversationError } = await supabaseAdmin
        .from("conversations")
        .insert({
          participant_1: userId,
          participant_2: ownerId,
          listing_id: listing_id,
        })
        .select()
        .single();

      if (createConversationError || !newConversation) {
        console.error("Error creating conversation:", createConversationError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      conversation = newConversation;
      conversationId = newConversation.conversation_id.toString();
    } else {
      conversationId = conversation.conversation_id.toString();
    }

    // 8. Create message entry
    const timeSent = new Date().toISOString();
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .insert({
        chat_id: conversationId,
        sent_by: userId,
        time_sent: timeSent,
        message_body: messageBody.trim(), // Use lowercase messagebody to match PostgreSQL column name
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
        conversation_id: conversationId,
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
