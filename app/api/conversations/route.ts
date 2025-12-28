import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { authOptions } from "../auth/[...nextauth]/route";

//---- GET CONVERSATIONS ----
// takes userID (from session) and listingID (from query params)
// validates that the user is authorized
// checks if conversation exists between user and listing owner
// if exists, returns conversation_id
// if not, creates new conversation and returns conversation_id

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

    // 3. Get listing_id from query parameters
    const { searchParams } = new URL(request.url);
    const listing_id = searchParams.get("listing_id");

    if (!listing_id || listing_id.trim() === "") {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const userId = user.user_id.toString();
    const normalizedUserId = userId.trim();
    const normalizedListingId = listing_id.trim();

    // 4. Get listing to find the owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("owner_id, status")
      .eq("listing_id", normalizedListingId)
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
    const normalizedOwnerId = ownerId.trim();

    // Prevent users from messaging themselves
    if (normalizedUserId === normalizedOwnerId) {
      return NextResponse.json(
        { error: "You cannot message yourself" },
        { status: 400 }
      );
    }

    // 5. Check if conversation exists between current user and listing owner for this listing
    const { data: existingConversations, error: conversationSearchError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("listing_id", normalizedListingId);

    if (conversationSearchError) {
      console.error("Error searching for conversation:", conversationSearchError);
      return NextResponse.json(
        { error: "Failed to search for conversation" },
        { status: 500 }
      );
    }

    // Find conversation where both participants match (current user and listing owner)
    // Normalize participant IDs from database before comparison
    let conversation = existingConversations?.find((conv) => {
      const p1 = String(conv.participant_1 || "").trim();
      const p2 = String(conv.participant_2 || "").trim();
      
      // Check if both participants match (order doesn't matter)
      return (
        (p1 === normalizedUserId && p2 === normalizedOwnerId) ||
        (p1 === normalizedOwnerId && p2 === normalizedUserId)
      );
    });

    let conversationId: string;

    // 6. Create conversation if it doesn't exist
    if (!conversation) {
      const { data: newConversation, error: createConversationError } = await supabaseAdmin
        .from("conversations")
        .insert({
          participant_1: normalizedUserId,
          participant_2: normalizedOwnerId,
          listing_id: normalizedListingId,
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

      conversationId = newConversation.conversation_id.toString();
    } else {
      conversationId = conversation.conversation_id.toString();
    }

    return NextResponse.json(
      {
        success: true,
        conversation_id: conversationId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getConversations endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

